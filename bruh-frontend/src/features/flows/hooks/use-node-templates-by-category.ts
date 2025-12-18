import { useMemo } from "react";
import { useNodeTemplates } from "../api/node-templates";
import { groupTemplatesByCategory } from "@/lib/node-template-utils";

export function useNodeTemplatesByCategory() {
  const { data: templates, isLoading, error } = useNodeTemplates();

  const groupedTemplates = useMemo(() => {
    if (!templates) return {};
    return groupTemplatesByCategory(templates);
  }, [templates]);

  return {
    templates,
    groupedTemplates,
    isLoading,
    error,
  };
}
