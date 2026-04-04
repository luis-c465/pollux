export interface GeminiModel {
	id: string;
	name: string;
	provider: string;
	group: string;
	description: string;
	supportsVision: boolean;
	supportsAttachments: boolean;
	supportsThinking: boolean;
	thinkingType?: "budget" | "level";
	maxTokens: number;
	contextWindow: number;
}

export const GEMINI_MODELS: readonly GeminiModel[] = [
	{
		id: "gemini-3-flash-preview",
		name: "Gemini 3 Flash",
		provider: "Google",
		group: "Gemini 3",
		description: "Fast and efficient for most tasks",
		supportsVision: true,
		supportsAttachments: true,
		supportsThinking: true,
		thinkingType: "level",
		maxTokens: 1_048_576,
		contextWindow: 1_048_576,
	},
	{
		id: "gemini-3.1-flash-lite-preview",
		name: "Gemini 3.1 Flash Lite",
		provider: "Google",
		group: "Gemini 3",
		description: "Lightweight model for fast utility tasks",
		supportsVision: true,
		supportsAttachments: true,
		supportsThinking: false,
		maxTokens: 1_048_576,
		contextWindow: 1_048_576,
	},
	{
		id: "gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		provider: "Google",
		group: "Gemini 2.5",
		description: "Fast and efficient for most tasks",
		supportsVision: true,
		supportsAttachments: true,
		supportsThinking: true,
		thinkingType: "budget",
		maxTokens: 1_048_576,
		contextWindow: 1_048_576,
	},
	{
		id: "gemini-2.5-pro",
		name: "Gemini 2.5 Pro",
		provider: "Google",
		group: "Gemini 2.5",
		description: "Most capable model for complex reasoning",
		supportsVision: true,
		supportsAttachments: true,
		supportsThinking: true,
		thinkingType: "budget",
		maxTokens: 1_048_576,
		contextWindow: 1_048_576,
	},
	{
		id: "gemini-2.0-flash",
		name: "Gemini 2.0 Flash",
		provider: "Google",
		group: "Gemini 2.0",
		description: "Previous generation model with fast responses",
		supportsVision: true,
		supportsAttachments: true,
		supportsThinking: false,
		maxTokens: 1_048_576,
		contextWindow: 1_048_576,
	},
];

export const DEFAULT_MODEL = "gemini-2.5-flash";

export const isGeminiModel = (modelId: string): boolean => {
	return GEMINI_MODELS.some((model) => model.id === modelId);
};

export const getGeminiModel = (modelId: string): GeminiModel | undefined => {
	return GEMINI_MODELS.find((model) => model.id === modelId);
};
