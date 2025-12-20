import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { OllamaStatusIndicator } from "./ollama-status-indicator";
import { ModelProviderSection } from "./model-provider-section";
import type { ModelProvider } from "../types";

type ProviderModelsDropdownProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  expandedProviders: Set<string>;
  onToggleProvider: (provider: string) => void;
  filteredModels: Record<string, any[]> | undefined;
  isLoading: boolean;
  selectedModelId?: string;
  onModelSelect: (modelId: string, provider: string) => void;
  onClose: () => void;
  structuredOutputOnly: boolean;
  imageOnly: boolean;
  ollamaStatus: { running: boolean } | undefined;
  provider: ModelProvider;
};

export const ProviderModelsDropdown = ({
  searchQuery,
  onSearchChange,
  expandedProviders,
  onToggleProvider,
  filteredModels,
  isLoading,
  selectedModelId,
  onModelSelect,
  onClose,
  structuredOutputOnly,
  imageOnly,
  ollamaStatus,
  provider,
}: ProviderModelsDropdownProps) => {
  const title = imageOnly
    ? "Image Models"
    : structuredOutputOnly
      ? "Structured Output Models"
      : "Select Model";

  return (
    <div className="absolute bottom-full mb-2 left-0 w-96 bg-popover border rounded-lg shadow-lg z-50 flex flex-col max-h-128">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Browse models by provider
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {(provider === "ollama" || provider === "both") && !imageOnly && (
          <OllamaStatusIndicator status={ollamaStatus} />
        )}

        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search models or providers..."
        />
      </div>

      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-4 text-sm text-center text-muted-foreground">
            Loading...
          </div>
        ) : !filteredModels || Object.keys(filteredModels).length === 0 ? (
          <div className="p-4 text-sm text-center text-muted-foreground">
            No models found
          </div>
        ) : (
          <div className="p-1">
            {Object.entries(filteredModels).map(([providerName, models]) => (
              <ModelProviderSection
                key={providerName}
                providerName={providerName}
                models={models}
                isExpanded={expandedProviders.has(providerName)}
                onToggle={() => onToggleProvider(providerName)}
                selectedModelId={selectedModelId}
                onModelSelect={onModelSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
