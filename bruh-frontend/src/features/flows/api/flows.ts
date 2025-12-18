import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import type { QueryConfig } from "@/lib/react-query";
import type {
  FlowNode,
  FlowExecutionRequest,
  NodeExecutionResult,
  FlowExecution,
} from "@/types/flow.types";
import type { Edge } from "@xyflow/react";
import { toast } from "sonner";

export interface Flow {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: Edge[];
  variables: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface FlowListItem {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedFlowList {
  items: FlowListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CreateFlowData {
  name: string;
  description?: string;
  nodes?: FlowNode[];
  edges?: Edge[];
  variables?: Record<string, any>;
}

export interface UpdateFlowData {
  name?: string;
  description?: string;
  nodes?: FlowNode[];
  edges?: Edge[];
  variables?: Record<string, any>;
}

export interface ValidationError {
  nodeId: string;
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  detail: string;
  errors: ValidationError[];
}

export interface FlowExecutionListItem {
  executionId: string;
  flowId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startTime: string;
  endTime?: string;
  totalExecutionTime?: number;
  error?: {
    message: string;
    nodeId?: string;
  };
}

export const getFlows = (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PaginatedFlowList> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.pageSize)
    searchParams.set("page_size", params.pageSize.toString());
  if (params?.search) searchParams.set("search", params.search);

  const queryString = searchParams.toString();
  const url = queryString ? `/flows/?${queryString}` : "/flows/";

  return api.get(url);
};

export const getFlow = (flowId: string): Promise<Flow> => {
  return api.get(`/flows/${flowId}`);
};

export const createFlow = (data: CreateFlowData): Promise<Flow> => {
  return api.post("/flows/", data);
};

export const updateFlow = ({
  flowId,
  data,
}: {
  flowId: string;
  data: UpdateFlowData;
}): Promise<Flow> => {
  return api.patch(`/flows/${flowId}`, data);
};

export const deleteFlow = (flowId: string): Promise<void> => {
  return api.delete(`/flows/${flowId}`);
};

export const duplicateFlow = (flowId: string): Promise<Flow> => {
  return api.post(`/flows/${flowId}/duplicate`);
};

export const useFlows = ({
  page = 1,
  pageSize = 20,
  search,
  queryConfig,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  queryConfig?: QueryConfig<typeof getFlows>;
} = {}) => {
  return useQuery({
    queryKey: ["flows", { page, pageSize, search }],
    queryFn: () => getFlows({ page, pageSize, search }),
    ...queryConfig,
  });
};

export const useFlow = ({
  flowId,
  queryConfig,
}: {
  flowId: string;
  queryConfig?: QueryConfig<typeof getFlow>;
}) => {
  return useQuery({
    queryKey: ["flows", flowId],
    queryFn: () => getFlow(flowId),
    staleTime: 0,
    refetchOnMount: true,
    ...queryConfig,
  });
};

export const useCreateFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flow created successfully");
    },
    onError: () => {
      toast.error("Failed to create flow");
    },
  });
};

export const useUpdateFlow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFlow,
    onSuccess: (_data, variables) => {
      const { flowId, data } = variables;

      queryClient.setQueryData<Flow>(["flows", flowId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          name: data.name ?? oldData.name,
          nodes: data.nodes ?? oldData.nodes,
          edges: data.edges ?? oldData.edges,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flow saved successfully");
    },
    onError: (error: any) => {
      console.log("Full error:", error);
      if (error instanceof ApiError && error.data?.errors) {
        const validationErrors = error.data.errors;
        const errorCount = validationErrors.length;
        const nodeCount = new Set(
          validationErrors.map((e: ValidationError) => e.nodeId),
        ).size;
        toast.error(
          `Validation failed: ${errorCount} error${errorCount > 1 ? "s" : ""} in ${nodeCount} node${nodeCount > 1 ? "s" : ""}`,
          {
            description:
              validationErrors
                .slice(0, 3)
                .map((e: ValidationError) => e.message)
                .join(", ") + (validationErrors.length > 3 ? "..." : ""),
            duration: 5000,
          },
        );
      } else {
        toast.error(
          "Failed to save flow. Your changes are still in the editor.",
        );
      }
      console.error("Save failed:", error);
    },
  });
};

export const useDeleteFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFlow,
    onMutate: async (flowId) => {
      await queryClient.cancelQueries({ queryKey: ["flows"] });

      const previousFlows = queryClient.getQueryData<PaginatedFlowList>([
        "flows",
      ]);

      queryClient.setQueriesData<PaginatedFlowList>(
        { queryKey: ["flows"] },
        (old) => {
          if (!old || !old.items) return old;
          return {
            ...old,
            items: old.items.filter((flow) => flow.id !== flowId),
            total: old.total - 1,
          };
        },
      );

      return { previousFlows };
    },
    onSuccess: () => {
      toast.success("Flow deleted successfully");
    },
    onError: (_, __, context) => {
      if (context?.previousFlows) {
        queryClient.setQueryData(["flows"], context.previousFlows);
      }
      toast.error("Failed to delete flow");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
};

export const useDuplicateFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duplicateFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flow duplicated successfully");
    },
    onError: () => {
      toast.error("Failed to duplicate flow");
    },
  });
};

export const executeFlow = ({
  flowId,
  data,
}: {
  flowId: string;
  data: FlowExecutionRequest;
}): Promise<FlowExecution> => {
  return api.post(`/flows/${flowId}/execute`, {
    ...data,
    flowId,
  });
};

export const getFlowExecution = (
  executionId: string,
): Promise<FlowExecution> => {
  return api.get(`/flow-executions/${executionId}`);
};

export const cancelFlowExecution = (executionId: string): Promise<void> => {
  return api.post(`/flow-executions/${executionId}/cancel`);
};

export const getFlowExecutionLogs = (
  executionId: string,
): Promise<NodeExecutionResult[]> => {
  return api.get(`/flow-executions/${executionId}/logs`);
};

export const useExecuteFlow = () => {
  return useMutation({
    mutationFn: async (params: {
      flowId: string;
      data: FlowExecutionRequest;
    }) => {
      try {
        const result = await executeFlow(params);
        return result;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Flow execution started");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to start execution");
    },
  });
};

export const useFlowExecution = (
  executionId: string | null,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["flow-executions", executionId],
    queryFn: async () => {
      try {
        const result = await getFlowExecution(executionId!);
        return result;
      } catch (error) {
        console.error("Execution fetch error:", error);
        throw error;
      }
    },
    enabled: enabled && !!executionId,
    refetchInterval: (query) => {
      const data = query.state.data;

      if (data?.status === "running" || data?.status === "pending") {
        return 1000;
      }
      return false;
    },
    staleTime: 0,
    retry: 1,
  });
};

export const useCancelFlowExecution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelFlowExecution,
    onSuccess: (_, executionId) => {
      queryClient.invalidateQueries({
        queryKey: ["flow-executions", executionId],
      });
      toast.success("Execution cancelled");
    },
    onError: () => {
      toast.error("Failed to cancel execution");
    },
  });
};

// Executions
export const getFlowExecutions = ({
  flowId,
  limit = 10,
  status,
}: {
  flowId: string;
  limit?: number;
  status?: string;
}): Promise<FlowExecutionListItem[]> => {
  const params = new URLSearchParams();
  params.set("limit", limit.toString());
  if (status) params.set("status", status);

  return api.get(`/flows/${flowId}/executions?${params.toString()}`);
};

export const useFlowExecutions = ({
  flowId,
  limit = 10,
  status,
  queryConfig,
}: {
  flowId: string;
  limit?: number;
  status?: string;
  queryConfig?: QueryConfig<typeof getFlowExecutions>;
}) => {
  return useQuery({
    queryKey: ["flows", flowId, "executions", { limit, status }],
    queryFn: () => getFlowExecutions({ flowId, limit, status }),
    ...queryConfig,
  });
};
