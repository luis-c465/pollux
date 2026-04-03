export interface GeminiModel {
	id: string;
	name: string;
	description: string;
	supportsVision: boolean;
	supportsAttachments: boolean;
	maxTokens: number;
}

export const GEMINI_MODELS: readonly GeminiModel[] = [
	{
		id: "gemini-3-flash-preview",
		name: "Gemini 3 Flash",
		description: "Fast and efficient for most tasks",
		supportsVision: true,
		supportsAttachments: true,
		maxTokens: 1_048_576,
	},
	{
		id: "gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		description: "Fast and efficient for most tasks",
		supportsVision: true,
		supportsAttachments: true,
		maxTokens: 1_048_576,
	},
	{
		id: "gemini-2.5-pro",
		name: "Gemini 2.5 Pro",
		description: "Most capable model for complex reasoning",
		supportsVision: true,
		supportsAttachments: true,
		maxTokens: 1_048_576,
	},
	{
		id: "gemini-2.0-flash",
		name: "Gemini 2.0 Flash",
		description: "Previous generation model with fast responses",
		supportsVision: true,
		supportsAttachments: true,
		maxTokens: 1_048_576,
	},
];

export const DEFAULT_MODEL = "gemini-2.5-flash";

export const isGeminiModel = (modelId: string): boolean => {
	return GEMINI_MODELS.some((model) => model.id === modelId);
};
