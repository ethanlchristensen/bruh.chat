import { useState, useMemo } from "react";
import { Check, ChevronDown, ChevronRight, Plus, Search, X } from "lucide-react";
import { useUserAvailableModels, useOpenRouterModelsByProvider, useAddModel } from "../api/models";

type ModelSelectorProps = {
  selectedModelId: string | undefined;
  onModelSelect: (modelId: string) => void;
};

export const ModelSelector = ({
  selectedModelId,
  onModelSelect,
}: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());

  const { data: userModels, isLoading: isLoadingUserModels } = useUserAvailableModels();
  const { data: modelsByProvider, isLoading: isLoadingAll, refetch: fetchAllModels } = useOpenRouterModelsByProvider();
  const addModelMutation = useAddModel();

  const selectedModel = userModels?.find((m) => m.id === selectedModelId);

  const handleShowAddModels = () => {
    setShowAddModel(true);
    setIsOpen(false);
    fetchAllModels();
  };

  const handleAddModel = (modelId: string) => {
    addModelMutation.mutate(modelId, {
      onSuccess: () => {
        onModelSelect(modelId);
        setShowAddModel(false);
        setSearchQuery("");
        setExpandedProviders(new Set());
      },
    });
  };

  const toggleProvider = (provider: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  // filter models on search
  const filteredModelsByProvider = useMemo(() => {
    if (!modelsByProvider || !searchQuery.trim()) {
      return modelsByProvider;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, any[]> = {};

    Object.entries(modelsByProvider).forEach(([provider, models]) => {
      const matchingModels = (models as any[]).filter((model) => {
        const nameMatch = model.name?.toLowerCase().includes(query);
        const providerMatch = provider.toLowerCase().includes(query);
        const descMatch = model.description?.toLowerCase().includes(query);
        return nameMatch || providerMatch || descMatch;
      });

      if (matchingModels.length > 0) {
        filtered[provider] = matchingModels;
      }
    });

    return filtered;
  }, [modelsByProvider, searchQuery]);

  // expand providers when searching
  useMemo(() => {
    if (searchQuery.trim() && filteredModelsByProvider) {
      setExpandedProviders(new Set(Object.keys(filteredModelsByProvider)));
    }
  }, [searchQuery, filteredModelsByProvider]);

  if (isLoadingUserModels) {
    return <div className="text-sm text-muted-foreground">Loading models...</div>;
  }

  // add model interface
  if (!userModels || userModels.length === 0) {
    return (
      <div className="relative">
        <button
          onClick={handleShowAddModels}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          Add a model
        </button>

        {showAddModel && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowAddModel(false)}
            />
            <div className="absolute bottom-full mb-2 left-0 w-96 bg-popover border rounded-lg shadow-lg z-50 flex flex-col max-h-128">
              <div className="p-3 border-b space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Add Models</h3>
                    <p className="text-xs text-muted-foreground">
                      Choose a model to get started
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModel(false)}
                    className="p-1 hover:bg-accent rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search models or providers..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              
              <div className="overflow-y-auto flex-1">
                {isLoadingAll ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    Loading...
                  </div>
                ) : !filteredModelsByProvider || Object.keys(filteredModelsByProvider).length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    No models found
                  </div>
                ) : (
                  <div className="p-1">
                    {Object.entries(filteredModelsByProvider).map(([provider, models]) => {
                      const isExpanded = expandedProviders.has(provider);
                      const modelCount = (models as any[]).length;

                      return (
                        <div key={provider} className="mb-1">
                          <button
                            onClick={() => toggleProvider(provider)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent rounded font-medium"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span>{provider}</span>
                              <span className="text-xs text-muted-foreground">
                                ({modelCount})
                              </span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="ml-6 mt-1 space-y-0.5">
                              {(models as any[]).map((model) => (
                                <button
                                  key={model.id}
                                  onClick={() => handleAddModel(model.id)}
                                  disabled={addModelMutation.isPending}
                                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent disabled:opacity-50"
                                >
                                  <div className="font-medium">{model.name}</div>
                                  {model.description && (
                                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                      {model.description}
                                    </div>
                                  )}
                                  {model.context_length && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      Context: {model.context_length.toLocaleString()} tokens
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-accent min-w-[200px]"
      >
        <span className="flex-1 text-left truncate">
          {selectedModel ? selectedModel.name : "Select a model"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full mb-2 left-0 w-full min-w-[250px] bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-1">
              {userModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelSelect(model.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{model.name}</div>
                    {model.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {model.description}
                      </div>
                    )}
                  </div>
                  {selectedModelId === model.id && (
                    <Check className="h-4 w-4 ml-2 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t p-1">
              <button
                onClick={handleShowAddModels}
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add more models
              </button>
            </div>
          </div>
        </>
      )}

      {showAddModel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowAddModel(false)}
          />
          <div className="absolute bottom-full mb-2 left-0 w-96 bg-popover border rounded-lg shadow-lg z-50 flex flex-col max-h-128">
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Add Models</h3>
                  <p className="text-xs text-muted-foreground">
                    Expand to browse models by provider
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModel(false)}
                  className="p-1 hover:bg-accent rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models or providers..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1">
              {isLoadingAll ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  Loading...
                </div>
              ) : !filteredModelsByProvider || Object.keys(filteredModelsByProvider).length === 0 ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  No models found
                </div>
              ) : (
                <div className="p-1">
                  {Object.entries(filteredModelsByProvider).map(([provider, models]) => {
                    const isExpanded = expandedProviders.has(provider);
                    const modelCount = (models as any[]).length;

                    return (
                      <div key={provider} className="mb-1">
                        <button
                          onClick={() => toggleProvider(provider)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent rounded font-medium"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>{provider}</span>
                            <span className="text-xs text-muted-foreground">
                              ({modelCount})
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="ml-6 mt-1 space-y-0.5">
                            {(models as any[]).map((model) => (
                              <button
                                key={model.id}
                                onClick={() => handleAddModel(model.id)}
                                disabled={addModelMutation.isPending}
                                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent disabled:opacity-50"
                              >
                                <div className="font-medium">{model.name}</div>
                                {model.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {model.description}
                                  </div>
                                )}
                                {model.context_length && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Context: {model.context_length.toLocaleString()} tokens
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};