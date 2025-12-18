import { useState, useMemo } from "react";
import { useNodeTemplatesByCategory } from "../hooks/use-node-templates-by-category";
import {
  groupTemplatesByCategory,
  getCategoryDisplayName,
  getTemplateColorClass,
  filterTemplates,
} from "@/lib/node-template-utils";
import { getLucideIcon } from "@/lib/icon-utils";
import type { NodeTemplate } from "@/types/flow.types";

interface NodeTemplateSelectorProps {
  onSelectTemplate: (template: NodeTemplate) => void;
}

export function NodeTemplateSelector({
  onSelectTemplate,
}: NodeTemplateSelectorProps) {
  const { groupedTemplates, templates, isLoading, error } =
    useNodeTemplatesByCategory();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroupedTemplates = useMemo(() => {
    if (!templates) return {};

    const filtered = filterTemplates(templates, searchQuery);
    return groupTemplatesByCategory(filtered);
  }, [templates, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">
            Failed to load templates
          </p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const displayTemplates = searchQuery
    ? filteredGroupedTemplates
    : groupedTemplates;

  return (
    <>
      <div className="p-4 border-b border-border sticky top-0 bg-background z-10">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
      </div>

      <div className="p-4 overflow-y-auto bg-background h-full">
        {Object.keys(displayTemplates).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No templates found</p>
          </div>
        ) : (
          Object.entries(displayTemplates).map(
            ([category, categoryTemplates]) => (
              <div key={category} className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {getCategoryDisplayName(category)}
                </h3>
                <div className="space-y-2">
                  {categoryTemplates.map((template) => {
                    const Icon = getLucideIcon(template.icon);

                    return (
                      <button
                        key={template.id}
                        onClick={() => onSelectTemplate(template)}
                        className="w-full text-left p-3 rounded-lg border border-border hover:border-input hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/reactflow",
                            JSON.stringify(template),
                          );
                          e.dataTransfer.effectAllowed = "move";
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-md ${getTemplateColorClass(template.color)} flex items-center justify-center shrink-0`}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {template.name}
                              </span>
                              {template.isPremium && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 rounded">
                                  PRO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ),
          )
        )}
      </div>
    </>
  );
}
