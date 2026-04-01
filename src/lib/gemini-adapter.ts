import type {
	ChatModelAdapter,
	ChatModelRunResult,
	ThreadMessage,
} from "@assistant-ui/react";
import {
	type Content,
	FinishReason,
	GoogleGenAI,
	type Part,
} from "@google/genai";

import { DEFAULT_MODEL, isGeminiModel } from "@/lib/gemini-models";

const API_KEY_STORAGE_KEY = "gchat-api-key";
const MODEL_STORAGE_KEY = "gchat-model";
const SYSTEM_PROMPT_STORAGE_KEY = "gchat-system-prompt";

type DataUrlPayload = {
	mimeType: string;
	data: string;
};

const TEXT_FILE_MIME_PREFIXES = ["text/"];
const TEXT_FILE_MIME_TYPES = new Set([
	"application/json",
	"application/javascript",
	"text/javascript",
]);

const getStorageItem = (key: string) => {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
};

const parseDataUrl = (value: string): DataUrlPayload | null => {
	const match = value.match(/^data:([^;]+);base64,(.+)$/);
	if (!match) {
		return null;
	}

	const [, mimeType, data] = match;
	if (!mimeType || !data) {
		return null;
	}

	return { mimeType, data };
};

const isTextLikeMimeType = (mimeType: string): boolean => {
	return (
		TEXT_FILE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix)) ||
		TEXT_FILE_MIME_TYPES.has(mimeType)
	);
};

const toTextFilePart = (
	filename: string | undefined,
	data: string,
): Part | null => {
	const text = data.trim();
	if (!text) {
		return null;
	}

	const label = filename ? `File: ${filename}\n` : "";
	return {
		text: `${label}${text}`,
	};
};

const toGeminiPart = (part: ThreadMessage["content"][number]): Part | null => {
	if (part.type === "text") {
		const text = part.text.trim();
		if (!text) {
			return null;
		}

		return { text };
	}

	if (part.type === "image") {
		const parsedDataUrl = parseDataUrl(part.image);
		if (!parsedDataUrl) {
			return null;
		}

		return {
			inlineData: {
				mimeType: parsedDataUrl.mimeType,
				data: parsedDataUrl.data,
			},
		};
	}

	if (part.type === "file") {
		if (isTextLikeMimeType(part.mimeType)) {
			return toTextFilePart(part.filename, part.data);
		}

		const parsedDataUrl = parseDataUrl(part.data);
		if (!parsedDataUrl) {
			return null;
		}

		return {
			inlineData: {
				mimeType: part.mimeType || parsedDataUrl.mimeType,
				data: parsedDataUrl.data,
			},
		};
	}

	return null;
};

const toGeminiContent = (message: ThreadMessage): Content | null => {
	if (message.role === "system") {
		return null;
	}

	if (message.role !== "user" && message.role !== "assistant") {
		return null;
	}

	const parts = message.content
		.map(toGeminiPart)
		.filter((part) => part !== null);
	if (parts.length === 0) {
		return null;
	}

	return {
		role: message.role === "assistant" ? "model" : "user",
		parts,
	};
};

const resolveSelectedModel = (modelFromContext: string | undefined): string => {
	const selectedModel =
		modelFromContext ?? getStorageItem(MODEL_STORAGE_KEY) ?? DEFAULT_MODEL;
	return isGeminiModel(selectedModel) ? selectedModel : DEFAULT_MODEL;
};

const toErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		const maybeApiError = error as Error & { status?: number };

		if (maybeApiError.status === 401 || maybeApiError.status === 403) {
			return "Invalid API key. Please check your key in Settings.";
		}

		if (maybeApiError.status === 429) {
			return "Rate limit exceeded. Please wait a moment and try again.";
		}

		if (maybeApiError.message.toLowerCase().includes("model")) {
			return "The selected model is unavailable. Please choose a different model in Settings.";
		}

		if (maybeApiError.message.toLowerCase().includes("safety")) {
			return "This response was blocked by Gemini's safety filters.";
		}

		return maybeApiError.message;
	}

	return "Something went wrong while contacting Gemini. Please try again.";
};

const mapFinishReasonToStatus = (
	finishReason: FinishReason,
): ChatModelRunResult["status"] => {
	if (finishReason === FinishReason.STOP) {
		return { type: "complete", reason: "stop" };
	}

	if (finishReason === FinishReason.MAX_TOKENS) {
		return { type: "incomplete", reason: "length" };
	}

	if (
		finishReason === FinishReason.SAFETY ||
		finishReason === FinishReason.BLOCKLIST ||
		finishReason === FinishReason.PROHIBITED_CONTENT ||
		finishReason === FinishReason.SPII ||
		finishReason === FinishReason.IMAGE_SAFETY ||
		finishReason === FinishReason.IMAGE_PROHIBITED_CONTENT ||
		finishReason === FinishReason.RECITATION
	) {
		return {
			type: "incomplete",
			reason: "content-filter",
			error: {
				message: "This response was blocked by Gemini's safety filters.",
			},
		};
	}

	return { type: "incomplete", reason: "other" };
};

const isAbortError = (error: unknown): boolean => {
	return error instanceof Error && error.name === "AbortError";
};

export const geminiAdapter: ChatModelAdapter = {
	run: async function* ({ abortSignal, context, messages }) {
		const apiKey = getStorageItem(API_KEY_STORAGE_KEY);
		if (!apiKey) {
			throw new Error("Please set your Gemini API key in Settings.");
		}

		const selectedModel = resolveSelectedModel(context.config?.modelName);
		const systemInstruction = getStorageItem(SYSTEM_PROMPT_STORAGE_KEY)?.trim();
		const contents = messages
			.map((message) => toGeminiContent(message))
			.filter((content) => content !== null);

		const ai = new GoogleGenAI({ apiKey });

		let accumulatedText = "";
		let lastStatus: ChatModelRunResult["status"] | undefined;

		try {
			const stream = await ai.models.generateContentStream({
				model: selectedModel,
				contents,
				config: {
					abortSignal,
					...(systemInstruction
						? {
								systemInstruction,
							}
						: {}),
				},
			});

			for await (const chunk of stream) {
				if (chunk.text) {
					accumulatedText += chunk.text;
				}

				const finishReason = chunk.candidates?.[0]?.finishReason;
				if (finishReason) {
					lastStatus = mapFinishReasonToStatus(finishReason);
				}

				yield {
					content: [{ type: "text", text: accumulatedText }],
					...(lastStatus ? { status: lastStatus } : {}),
				};
			}

			if (!lastStatus) {
				yield {
					content: [{ type: "text", text: accumulatedText }],
					status: { type: "complete", reason: "stop" },
				};
			}
		} catch (error) {
			if (abortSignal.aborted || isAbortError(error)) {
				return;
			}

			const message = toErrorMessage(error);
			yield {
				content: [
					{
						type: "text",
						text: accumulatedText || message,
					},
				],
				status: {
					type: "incomplete",
					reason: "error",
					error: { message },
				},
			};
		}
	},
};
