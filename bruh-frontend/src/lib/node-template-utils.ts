import type {
  NodeTemplate,
  FlowNode,
  NodePosition,
  NodeData,
  InputNodeData,
  LLMNodeData,
  OutputNodeData,
} from "@/types/flow.types";

/**
 * Create a node instance from a template
 * @param template - The node template to instantiate
 * @param position - Position on the canvas
 * @param customConfig - Optional config overrides
 * @returns A new FlowNode instance
 */
export function createNodeFromTemplate(
  template: NodeTemplate,
  position: NodePosition,
  customConfig?: Partial<NodeData>,
): FlowNode {
  const nodeId = generateNodeId(template.type);

  // Merge template default config with custom config
  const nodeData = {
    ...template.defaultConfig,
    ...customConfig,
  } as NodeData;

  return {
    id: nodeId,
    type: template.type,
    position,
    data: nodeData,
    selected: false,
    dragging: false,
  };
}

/**
 * Generate a unique node ID
 */
function generateNodeId(type: string): string {
  const randomId = Math.random().toString(36).substring(2, 10);
  return `${type}-${randomId}`;
}

/**
 * Group templates by category
 */
export function groupTemplatesByCategory(
  templates: NodeTemplate[],
): Record<string, NodeTemplate[]> {
  return templates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, NodeTemplate[]>,
  );
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    input_output: "Input / Output",
    processing: "Processing",
    logic: "Logic & Control",
    integration: "Integrations",
  };

  return categoryMap[category] || category;
}

/**
 * Get template icon color class (for Tailwind)
 */
export function getTemplateColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    pink: "bg-pink-500",
    indigo: "bg-indigo-500",
  };

  return colorMap[color] || "bg-gray-500";
}

/**
 * Validate if a template can be added to the flow
 * (e.g., check premium status, user permissions)
 */
export function canUseTemplate(
  template: NodeTemplate,
  userIsPremium: boolean = false,
): { canUse: boolean; reason?: string } {
  if (template.isPremium && !userIsPremium) {
    return {
      canUse: false,
      reason: "This node requires a premium subscription",
    };
  }

  return { canUse: true };
}

/**
 * Get default node data for a specific node type
 * Useful for creating nodes programmatically
 */
export function getDefaultNodeData(type: "input" | "llm" | "output"): NodeData {
  const baseHandles = getDefaultHandles(type);

  switch (type) {
    case "input":
      return {
        label: "Input",
        value: "",
        multiline: false,
        placeholder: "Enter your input...",
        status: "idle",
        handles: baseHandles,
      } as InputNodeData;

    case "llm":
      return {
        label: "LLM",
        provider: "ollama",
        model: "",
        userPromptTemplate: "{{input}}",
        temperature: 0.7,
        maxTokens: 2000,
        stream: true,
        maxRetries: 3,
        retryDelay: 1000,
        status: "idle",
        handles: baseHandles,
      } as LLMNodeData;

    case "output":
      return {
        label: "Output",
        format: "text",
        copyable: true,
        downloadable: false,
        status: "idle",
        handles: baseHandles,
      } as OutputNodeData;
  }
}

/**
 * Get default handles for a node type
 */
function getDefaultHandles(type: "input" | "llm" | "output") {
  switch (type) {
    case "input":
      return [
        { id: "output", type: "source" as const, position: "right" as const },
      ];
    case "output":
      return [
        { id: "input", type: "target" as const, position: "left" as const },
      ];
    case "llm":
      return [
        { id: "input", type: "target" as const, position: "left" as const },
        { id: "output", type: "source" as const, position: "right" as const },
      ];
  }
}

/**
 * Filter templates by search query
 */
export function filterTemplates(
  templates: NodeTemplate[],
  query: string,
): NodeTemplate[] {
  if (!query.trim()) {
    return templates;
  }

  const lowerQuery = query.toLowerCase();

  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Sort templates by display order and name
 */
export function sortTemplates(templates: NodeTemplate[]): NodeTemplate[] {
  return [...templates].sort((a, b) => {
    // Sort by category first (input_output, processing, logic, integration)
    const categoryOrder = [
      "input_output",
      "processing",
      "logic",
      "integration",
    ];
    const categoryCompare =
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    // Then by name
    return a.name.localeCompare(b.name);
  });
}
