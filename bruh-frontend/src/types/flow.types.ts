export type NodeType = "input" | "llm" | "output";

export type NodeStatus = "idle" | "running" | "success" | "error";

export type NodeExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type Provider = "ollama" | "openrouter";

export interface NodePosition {
  x: number;
  y: number;
}

export type HandleType = "source" | "target";

export interface NodeHandle {
  id: string;
  type: HandleType;
  position: "top" | "right" | "bottom" | "left";
  label?: string;
}

export interface BaseNodeData {
  label: string;
  description?: string;
  status: NodeStatus;
  error?: string;
  input?: unknown;
  output?: unknown;
  executionTime?: number;
  lastExecuted?: string;

  // Index signature for React Flow compatibility
  [key: string]: unknown;
}

export interface InputNodeData extends BaseNodeData {
  value: string;
  multiline: boolean;
  placeholder?: string;
  maxLength?: number;
  variableName?: string;
}

export interface LLMNodeData extends BaseNodeData {
  provider: Provider;
  model: string;
  systemPrompt?: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stream: boolean;
  responseFormat?: "text" | "json";
  maxRetries: number;
  retryDelay: number;
}

export interface JSONExtractorNodeData extends BaseNodeData {
  label: string;
  extractions: Array<{
    key: string;
    path: string;
    fallback: string | null;
  }>;
  strictMode: boolean;
  outputFormat: "object" | "array";
  output?: any;
  executionTime?: number;
}

export interface OutputNodeData extends BaseNodeData {
  format: "text" | "markdown" | "json" | "code";
  language?: string;
  copyable: boolean;
  downloadable: boolean;
  downloadFilename?: string;
}

export type NodeData = InputNodeData | LLMNodeData | OutputNodeData;

export interface FlowNode {
  id: string;
  type: NodeType;
  position: NodePosition;
  data: NodeData;

  selected?: boolean;
  dragging?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  label?: string;
  lastDataPassed?: unknown;
  lastPassedAt?: string;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ExecutionContext {
  flowId: string;
  executionId: string;
  variables: Record<string, unknown>;
  nodeResults: Map<string, NodeExecutionResult>;
}

export interface NodeExecutionResult {
  nodeId: string;
  nodeType: NodeType;
  status: NodeExecutionStatus;

  input?: unknown;
  output?: unknown;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };

  startTime: string;
  endTime?: string;
  executionTime?: number;
}

export interface FlowExecutionResult {
  flowId: string;
  executionId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";

  startTime: string;
  endTime?: string;
  totalExecutionTime?: number;

  nodeResults: NodeExecutionResult[];
  finalOutput?: unknown;

  error?: {
    message: string;
    nodeId?: string;
    details?: unknown;
  };
}

export const DEFAULT_NODE_CONFIG = {
  input: {
    value: "",
    multiline: false,
    placeholder: "Enter your input...",
    // handles: [
    //   { id: 'output', type: 'source' as const, position: 'right' as const }
    // ]
  },
  llm: {
    provider: "ollama" as Provider,
    model: "",
    userPromptTemplate: "{{input}}",
    temperature: 0.7,
    maxTokens: 2000,
    stream: true,
    maxRetries: 3,
    retryDelay: 1000,
    // handles: [
    //   { id: 'input', type: 'target' as const, position: 'left' as const },
    //   { id: 'output', type: 'source' as const, position: 'right' as const }
    // ]
  },
  output: {
    format: "text" as const,
    copyable: true,
    downloadable: false,
    // handles: [
    //   { id: 'input', type: 'target' as const, position: 'left' as const }
    // ]
  },
} as const;

export interface ValidationError {
  nodeId: string;
  field: string;
  message: string;
}

export interface FlowValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

export type NodeTemplateCategory =
  | "input_output"
  | "processing"
  | "logic"
  | "integration";

export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  type: NodeType;
  icon: string;
  color: string;
  defaultConfig: Partial<NodeData>;
  category: NodeTemplateCategory;
  isPremium: boolean;
}

export interface CreateNodeFromTemplateRequest {
  templateId: string;
  position: NodePosition;
  customConfig?: Partial<NodeData>;
}

export interface FlowExecutionRequest {
  initialInput?: Record<string, any>;
  variables?: Record<string, any>;
}

export interface FlowExecution {
  executionId: string;
  flowId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startTime: string;
  endTime?: string;
  totalExecutionTime?: number;
  nodeResults: NodeExecutionResult[];
  finalOutput?: any;
  error?: {
    message: string;
    nodeId?: string;
    details?: any;
  };
}
