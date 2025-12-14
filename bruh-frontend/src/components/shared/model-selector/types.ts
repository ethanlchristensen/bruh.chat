export type ModelSelectorVariant = "user-models" | "by-provider";
export type ModelProvider = "openrouter" | "ollama" | "both";

export type ModelSelectorProps = {
  selectedModelId: string | undefined;
  onModelSelect: (modelId: string, provider: string) => void;
  variant?: ModelSelectorVariant;
  structuredOutputOnly?: boolean;
  provider?: ModelProvider;
};

export type Model = {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  size?: number;
  provider: string;
};
