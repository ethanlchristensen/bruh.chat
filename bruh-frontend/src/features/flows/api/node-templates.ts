import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { QueryConfig } from "@/lib/react-query";
import type { NodeTemplate, NodeTemplateCategory } from "@/types/flow.types";

interface FetchTemplatesOptions {
  category?: NodeTemplateCategory;
  type?: "input" | "llm" | "output";
}

export const getNodeTemplates = (
  options: FetchTemplatesOptions = {},
): Promise<NodeTemplate[]> => {
  const params = new URLSearchParams();

  if (options.category) {
    params.append("category", options.category);
  }
  if (options.type) {
    params.append("type", options.type);
  }

  const queryString = params.toString();
  const url = queryString
    ? `/node-templates?${queryString}`
    : "/node-templates";

  return api.get<NodeTemplate[]>(url);
};

export const getNodeTemplateById = (
  templateId: string,
): Promise<NodeTemplate> => {
  return api.get<NodeTemplate>(`/node-templates/${templateId}`);
};

export const useNodeTemplates = ({
  category,
  type,
  queryConfig,
}: {
  category?: NodeTemplateCategory;
  type?: "input" | "llm" | "output";
  queryConfig?: QueryConfig<typeof getNodeTemplates>;
} = {}) => {
  return useQuery({
    queryKey: ["node-templates", { category, type }],
    queryFn: () => getNodeTemplates({ category, type }),
    staleTime: 5 * 60 * 1000,
    ...queryConfig,
  });
};

export const useNodeTemplate = ({
  templateId,
  queryConfig,
}: {
  templateId: string;
  queryConfig?: QueryConfig<typeof getNodeTemplateById>;
}) => {
  return useQuery({
    queryKey: ["node-templates", templateId],
    queryFn: () => getNodeTemplateById(templateId),
    staleTime: 5 * 60 * 1000,
    ...queryConfig,
  });
};
