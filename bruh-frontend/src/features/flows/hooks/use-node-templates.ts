import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { NodeTemplate, NodeTemplateCategory } from "@/types/flow.types";
import { getNodeTemplates, getNodeTemplateById } from "../api/node-templates";

interface UseNodeTemplatesOptions {
  category?: NodeTemplateCategory;
  type?: "input" | "llm" | "output";
}

export function useNodeTemplates(
  options: UseNodeTemplatesOptions = {},
): UseQueryResult<NodeTemplate[], Error> {
  return useQuery({
    queryKey: ["nodeTemplates", options],
    queryFn: () => getNodeTemplates(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNodeTemplate(
  templateId: string,
  enabled: boolean = true,
): UseQueryResult<NodeTemplate, Error> {
  return useQuery({
    queryKey: ["nodeTemplate", templateId],
    queryFn: () => getNodeTemplateById(templateId),
    enabled: enabled && !!templateId,
    staleTime: 5 * 60 * 1000,
  });
}
