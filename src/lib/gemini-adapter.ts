import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type {
	ChatModelAdapter,
	ChatModelRunResult,
	SourceMessagePart,
	ThreadMessage,
} from "@assistant-ui/react";
import { type ModelMessage, streamText } from "ai";

import { DEFAULT_MODEL, isGeminiModel } from "@/lib/gemini-models";
import { getGroundingEnabled } from "@/lib/settings";

const API_KEY_STORAGE_KEY = "gchat-api-key";
const MODEL_STORAGE_KEY = "gchat-model";
const SYSTEM_PROMPT_STORAGE_KEY = "gchat-system-prompt";

type DataUrlPayload = {
	mimeType: string;
	data: string;
};

type AiSdkFilePart = {
	type: "file";
	mediaType: string;
	data: Uint8Array;
};

type AiSdkTextPart = {
	type: "text";
	text: string;
};

type AiSdkMessagePart = AiSdkFilePart | AiSdkTextPart;

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
): AiSdkTextPart | null => {
	const text = data.trim();
	if (!text) {
		return null;
	}

	const label = filename ? `File: ${filename}\n` : "";
	return {
		text: `${label}${text}`,
		type: "text",
	};
};

const decodeBase64 = (value: string): Uint8Array => {
	const decoded = window.atob(value);
	const bytes = new Uint8Array(decoded.length);

	for (let index = 0; index < decoded.length; index += 1) {
		bytes[index] = decoded.charCodeAt(index);
	}

	return bytes;
};

const toAiSdkPart = (
	part: ThreadMessage["content"][number],
): AiSdkMessagePart | null => {
	if (part.type === "text") {
		const text = part.text.trim();
		if (!text) {
			return null;
		}

		return { type: "text", text };
	}

	if (part.type === "image") {
		const parsedDataUrl = parseDataUrl(part.image);
		if (!parsedDataUrl) {
			return null;
		}

		return {
			type: "file",
			mediaType: parsedDataUrl.mimeType,
			data: decodeBase64(parsedDataUrl.data),
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
			type: "file",
			mediaType: part.mimeType || parsedDataUrl.mimeType,
			data: decodeBase64(parsedDataUrl.data),
		};
	}

	return null;
};

const toAiSdkMessage = (message: ThreadMessage): ModelMessage | null => {
	if (message.role === "system") {
		return null;
	}

	if (message.role !== "user" && message.role !== "assistant") {
		return null;
	}

	const parts = message.content
		.map(toAiSdkPart)
		.filter((part) => part !== null);
	if (parts.length === 0) {
		return null;
	}

	if (parts.length === 1 && parts[0]?.type === "text") {
		return {
			role: message.role,
			content: parts[0].text,
		};
	}

	return {
		role: message.role,
		content: parts,
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
		const normalizedMessage = maybeApiError.message.toLowerCase();

		if (maybeApiError.status === 401 || maybeApiError.status === 403) {
			return "Invalid API key. Please check your key in Settings";
		}

		if (maybeApiError.status === 429) {
			return "Rate limit exceeded. Please wait a moment and try again";
		}

		if (
			normalizedMessage.includes("network") ||
			normalizedMessage.includes("failed to fetch") ||
			normalizedMessage.includes("load failed")
		) {
			return "Network error. Please check your internet connection";
		}

		if (normalizedMessage.includes("model")) {
			return "The selected model is unavailable. Please choose a different model in Settings";
		}

		if (normalizedMessage.includes("safety")) {
			return "This response was blocked by Gemini's safety filters";
		}

		return maybeApiError.message;
	}

	return "Something went wrong while contacting Gemini. Please try again.";
};

const mapFinishReasonToStatus = (
	finishReason: string | undefined,
): ChatModelRunResult["status"] => {
	if (finishReason === "stop") {
		return { type: "complete", reason: "stop" };
	}

	if (finishReason === "length") {
		return { type: "incomplete", reason: "length" };
	}

	if (finishReason === "content-filter") {
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

const toSourcePart = (source: {
	id?: unknown;
	sourceType?: unknown;
	title?: unknown;
	url?: unknown;
}): SourceMessagePart | null => {
	if (source.sourceType !== "url" || typeof source.url !== "string") {
		return null;
	}

	return {
		type: "source",
		sourceType: "url",
		id: typeof source.id === "string" ? source.id : `source-${source.url}`,
		url: source.url,
		title: typeof source.title === "string" ? source.title : undefined,
	};
};

const toSourceParts = (
	groundingChunks: readonly (
		| { web?: { uri?: string; title?: string } }
		| undefined
	)[],
): SourceMessagePart[] => {
	const seen = new Set<string>();
	const sources: SourceMessagePart[] = [];

	for (const chunk of groundingChunks) {
		const uri = chunk?.web?.uri;
		if (!uri || seen.has(uri)) {
			continue;
		}

		seen.add(uri);
		sources.push({
			type: "source",
			sourceType: "url",
			id: `source-${seen.size}`,
			url: uri,
			title: chunk.web?.title,
		});
	}

	return sources;
};

const mergeSourceParts = (
	current: SourceMessagePart[],
	next: SourceMessagePart[],
): SourceMessagePart[] => {
	if (next.length === 0) {
		return current;
	}

	const deduped = [...current];
	const seen = new Set(deduped.map((source) => source.url));

	for (const source of next) {
		if (seen.has(source.url)) {
			continue;
		}

		seen.add(source.url);
		deduped.push(source);
	}

	return deduped;
};

export const geminiAdapter: ChatModelAdapter = {
	run: async function* ({ abortSignal, context, messages }) {
		const apiKey = getStorageItem(API_KEY_STORAGE_KEY);
		if (!apiKey) {
			yield {
				content: [
					{
						type: "text",
						text: "Please set your Gemini API key in Settings",
					},
				],
				status: {
					type: "incomplete",
					reason: "error",
					error: {
						message: "Please set your Gemini API key in Settings",
					},
				},
			};
			return;
		}

		const selectedModel = resolveSelectedModel(context.config?.modelName);
		const systemInstruction = getStorageItem(SYSTEM_PROMPT_STORAGE_KEY)?.trim();
		const groundingEnabled = getGroundingEnabled();
		const aiMessages = messages
			.map((message) => toAiSdkMessage(message))
			.filter((content): content is ModelMessage => content !== null);

		const google = createGoogleGenerativeAI({ apiKey });

		let accumulatedText = "";
		let lastStatus: ChatModelRunResult["status"] | undefined;
		let sourceParts: SourceMessagePart[] = [];

		try {
			const stream = streamText({
				abortSignal,
				model: google(selectedModel),
				messages: aiMessages,
				...(groundingEnabled
					? {
							tools: {
								google_search: google.tools.googleSearch({}),
							},
						}
					: {}),
				...(systemInstruction
					? {
							system: systemInstruction,
						}
					: {}),
			});

			for await (const part of stream.fullStream) {
				if (part.type === "text-delta") {
					if (part.text) {
						accumulatedText += part.text;
					}

					yield {
						content: [{ type: "text", text: accumulatedText }],
						...(lastStatus ? { status: lastStatus } : {}),
					};
					continue;
				}

				if (part.type === "source") {
					const source = toSourcePart(part);
					if (source) {
						sourceParts = mergeSourceParts(sourceParts, [source]);
					}
					continue;
				}

				if (part.type === "finish-step") {
					const groundingChunks = (
						part.providerMetadata as {
							google?: {
								groundingMetadata?: {
									groundingChunks?: readonly (
										| { web?: { uri?: string; title?: string } }
										| undefined
									)[];
								};
							};
						}
					).google?.groundingMetadata?.groundingChunks;

					if (groundingChunks?.length) {
						sourceParts = mergeSourceParts(
							sourceParts,
							toSourceParts(groundingChunks),
						);
					}
					continue;
				}

				if (part.type === "finish") {
					lastStatus = mapFinishReasonToStatus(part.finishReason);
					continue;
				}

				if (part.type === "error") {
					throw part.error;
				}
			}

			if (sourceParts.length > 0) {
				yield {
					content: [{ type: "text", text: accumulatedText }, ...sourceParts],
					status: lastStatus ?? { type: "complete", reason: "stop" },
				};
			} else if (!lastStatus) {
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
