from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any, Literal, Union, Annotated
from datetime import datetime


class NodePosition(BaseModel):
    x: float
    y: float


class NodeHandle(BaseModel):
    id: str
    type: Literal["source", "target"]
    position: Literal["top", "right", "bottom", "left"]
    label: Optional[str] = None


# BASE NODE
class BaseNodeData(BaseModel):
    nodeType: Literal[
        "input",
        "llm",
        "output",
        "json_extractor",
        "conditional",
        "image_gen",
        "image_output",
        "text_transformer",
        "http_request",
        "variable_get",
        "variable_set",
        "delay",
        "merge",
        "code",
        "template",
    ]
    label: str
    description: Optional[str] = None
    status: Literal["idle", "running", "success", "error", "skipped", "cancelled"] = "idle"
    error: Optional[str] = None
    input: Optional[Any] = None
    output: Optional[Any] = None
    executionTime: Optional[int] = None
    lastExecuted: Optional[str] = None
    handles: List[NodeHandle]


# INPUT NODE
class InputNodeData(BaseNodeData):
    nodeType: Literal["input"] = "input"
    value: str = ""
    multiline: bool = False
    placeholder: Optional[str] = "Enter your input..."
    maxLength: Optional[int] = None
    variableName: Optional[str] = None

    @field_validator("maxLength")
    @classmethod
    def validate_max_length(cls, v):
        if v is not None and v <= 0:
            raise ValueError("maxLength must be positive")
        return v


# LLM NODE
class LLMNodeData(BaseNodeData):
    nodeType: Literal["llm"] = "llm"
    provider: Literal["ollama", "openrouter"]
    model: str
    systemPrompt: Optional[str] = None
    userPromptTemplate: str = "{{input}}"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    maxTokens: Optional[int] = Field(default=2000, gt=0)
    topP: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    topK: Optional[int] = Field(default=None, gt=0)
    stream: bool = True
    responseFormat: Optional[Literal["text", "json"]] = "text"
    maxRetries: int = Field(default=3, ge=0, le=10)
    retryDelay: int = Field(default=1000, ge=0)

    @field_validator("model")
    @classmethod
    def validate_model(cls, v):
        if not v or not v.strip():
            raise ValueError("model cannot be empty")
        return v

    @field_validator("userPromptTemplate")
    @classmethod
    def validate_prompt_template(cls, v):
        if not v or not v.strip():
            raise ValueError("userPromptTemplate cannot be empty")
        return v


# OUTPUT NODE
class OutputNodeData(BaseNodeData):
    nodeType: Literal["output"] = "output"
    format: Literal["text", "markdown", "json", "code"] = "text"
    language: Optional[str] = None
    copyable: bool = True
    downloadable: bool = False
    downloadFilename: Optional[str] = None

    @model_validator(mode="after")
    def validate_language(self):
        if self.format == "code" and not self.language:
            raise ValueError("language is required when format is code")
        return self


# JSON EXTRACTOR NODE
class JsonExtractionItem(BaseModel):
    key: str
    path: str
    fallback: Optional[Any] = None


class JsonExtractorNodeData(BaseNodeData):
    nodeType: Literal["json_extractor"] = "json_extractor"
    extractions: List[JsonExtractionItem] = []
    strictMode: bool = False
    outputFormat: Literal["object", "list", "flat", "singleValue"] = "singleValue"
    setAsVariables: bool = False


# CONDITIONAL NODE
class ConditionItem(BaseModel):
    id: str
    operator: Literal[
        "contains",
        "equals",
        "starts_with",
        "ends_with",
        "regex",
        "greater_than",
        "less_than",
        "equals_number",
        "is_empty",
        "is_not_empty",
        "length_greater_than",
        "length_less_than",
    ]
    value: str = ""
    outputHandle: str
    label: Optional[str] = None


class ConditionalNodeData(BaseNodeData):
    nodeType: Literal["conditional"] = "conditional"
    conditions: List[ConditionItem] = []
    defaultOutputHandle: str = "default"
    caseSensitive: bool = False

    @field_validator("conditions")
    @classmethod
    def validate_conditions(cls, v):
        if not v:
            raise ValueError("At least one condition is required")

        handles = [c.outputHandle for c in v]
        if len(handles) != len(set(handles)):
            raise ValueError("Duplicate output handles found")

        return v

    @field_validator("defaultOutputHandle")
    @classmethod
    def validate_default_handle(cls, v):
        if not v or not v.strip():
            raise ValueError("defaultOutputHandle cannot be empty")
        return v


# IMAGE GEN NODE
class ImageGenNodeData(BaseNodeData):
    nodeType: Literal["image_gen"] = "image_gen"
    provider: Literal["openrouter"]
    model: str
    promptTemplate: str = "{{input}}"
    aspectRatio: Literal[
        "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
    ] = "1:1"
    maxRetries: int = Field(default=3, ge=0, le=10)
    retryDelay: int = Field(default=1000, ge=0)

    @field_validator("model")
    @classmethod
    def validate_model(cls, v):
        if not v or not v.strip():
            raise ValueError("model cannot be empty")
        return v

    @field_validator("promptTemplate")
    @classmethod
    def validate_prompt_template(cls, v):
        if not v or not v.strip():
            raise ValueError("promptTemplate cannot be empty")
        return v


class ImageOutputNodeData(BaseNodeData):
    nodeType: Literal["image_output"] = "image_output"
    alt: Optional[str] = "Generated image"
    maxWidth: Optional[int] = Field(default=None, gt=0, le=2048)
    maxHeight: Optional[int] = Field(default=None, gt=0, le=2048)
    showPrompt: bool = True
    downloadable: bool = True
    downloadFilename: Optional[str] = None


# TRANSFORMER NODE
class TransformOperation(BaseModel):
    id: str
    type: Literal[
        "trim",
        "uppercase",
        "lowercase",
        "capitalize",
        "replace",
        "regex_replace",
        "split",
        "join",
        "substring",
        "prefix",
        "suffix",
        "remove_whitespace",
    ]
    enabled: bool = True
    config: Optional[Dict[str, Any]] = None


class TextTransformerNodeData(BaseNodeData):
    nodeType: Literal["text_transformer"] = "text_transformer"
    operations: List[TransformOperation] = []

    @field_validator("operations")
    @classmethod
    def validate_operations(cls, v):
        if not v:
            raise ValueError("At least one operation is required")
        return v


# HTTP NODE
class HttpRequestNodeData(BaseNodeData):
    nodeType: Literal["http_request"] = "http_request"
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    url: str
    headers: Dict[str, str] = {}
    queryParams: Dict[str, str] = {}
    body: Optional[str] = None
    bodyType: Literal["json", "form", "text", "none"] = "json"
    timeout: int = Field(default=30000, ge=1000, le=300000)
    followRedirects: bool = True
    maxRetries: int = Field(default=3, ge=0, le=10)
    retryDelay: int = Field(default=1000, ge=0)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        if not v or not v.strip():
            raise ValueError("url cannot be empty")
        return v


# VARIABLE NODES
class VariableGetNodeData(BaseNodeData):
    nodeType: Literal["variable_get"] = "variable_get"
    variableName: str
    fallbackValue: Optional[Any] = None

    @field_validator("variableName")
    @classmethod
    def validate_variable_name(cls, v):
        if not v or not v.strip():
            raise ValueError("variableName cannot be empty")
        return v


class VariableSetNodeData(BaseNodeData):
    nodeType: Literal["variable_set"] = "variable_set"
    variableName: str
    valueSource: Literal["input", "static"] = "input"
    staticValue: Optional[Any] = None

    @field_validator("variableName")
    @classmethod
    def validate_variable_name(cls, v):
        if not v or not v.strip():
            raise ValueError("variableName cannot be empty")
        return v


# MERGE NODE
class MergeNodeData(BaseNodeData):
    nodeType: Literal["merge"] = "merge"
    mergeStrategy: Literal["object", "flatten", "array", "concat", "first", "last"] = "object"
    waitForAll: bool = True
    timeout: Optional[int] = Field(default=30000, ge=1000, le=300000)


# CODE EXECUTION NODE
class CodeNodeData(BaseNodeData):
    nodeType: Literal["code"] = "code"
    language: Literal["python"] = "python"
    code: str = "return input;"
    timeout: int = Field(default=5000, ge=100, le=30000)

    @field_validator("code")
    @classmethod
    def validate_code(cls, v):
        if not v or not v.strip():
            raise ValueError("code cannot be empty")
        return v


# TEMPLATE NODE
class TemplateNodeData(BaseNodeData):
    nodeType: Literal["template"] = "template"
    template: str
    variables: Dict[str, Any] = {}
    escapeHtml: bool = False

    @field_validator("template")
    @classmethod
    def validate_template(cls, v):
        if not v or not v.strip():
            raise ValueError("template cannot be empty")
        return v


# DELAY NODE
class DelayNodeData(BaseNodeData):
    nodeType: Literal["delay"] = "delay"
    delayMs: int = Field(ge=0, le=60000)
    passThrough: bool = True


class FlowNode(BaseModel):
    id: str
    type: Literal[
        "input",
        "llm",
        "output",
        "json_extractor",
        "conditional",
        "image_gen",
        "image_output",
        "text_transformer",
        "http_request",
        "variable_get",
        "variable_set",
        "delay",
        "merge",
        "code",
        "template",
    ]
    position: NodePosition
    data: Annotated[
        Union[
            InputNodeData,
            LLMNodeData,
            OutputNodeData,
            JsonExtractorNodeData,
            ConditionalNodeData,
            ImageGenNodeData,
            ImageOutputNodeData,
            TextTransformerNodeData,
            HttpRequestNodeData,
            VariableGetNodeData,
            VariableSetNodeData,
            DelayNodeData,
            MergeNodeData,
            CodeNodeData,
            TemplateNodeData,
        ],
        Field(discriminator="nodeType"),
    ]
    selected: Optional[bool] = False
    dragging: Optional[bool] = False

    @field_validator("id")
    @classmethod
    def validate_id(cls, v):
        if not v or not v.strip():
            raise ValueError("node id cannot be empty")
        return v

    @model_validator(mode="before")
    @classmethod
    def populate_node_type(cls, data):
        """Populate nodeType in data from type field if missing"""
        if isinstance(data, dict):
            node_type = data.get("type")
            node_data = data.get("data", {})

            if isinstance(node_data, dict) and "nodeType" not in node_data and node_type:
                node_data["nodeType"] = node_type
                data["data"] = node_data

        return data

    class ConfigDict:
        from_attributes = True


class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
    animated: Optional[bool] = False
    label: Optional[str] = None
    lastDataPassed: Optional[Any] = None
    lastPassedAt: Optional[str] = None

    @field_validator("id", "source", "target")
    @classmethod
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("field cannot be empty")
        return v


class FlowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""
    nodes: List[FlowNode] = []
    edges: List[FlowEdge] = []
    variables: Dict[str, Any] = {}

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError("name cannot be empty")
        return v.strip()

    @model_validator(mode="after")
    def validate_edges(self):
        node_ids = {node.id for node in self.nodes}

        for edge in self.edges:
            if edge.source not in node_ids:
                raise ValueError(f'Edge source "{edge.source}" references non-existent node')
            if edge.target not in node_ids:
                raise ValueError(f'Edge target "{edge.target}" references non-existent node')

        return self


class FlowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    nodes: Optional[List[FlowNode]] = None
    edges: Optional[List[FlowEdge]] = None
    variables: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_edges_if_present(self):
        if self.nodes is not None and self.edges is not None:
            node_ids = {node.id for node in self.nodes}

            for edge in self.edges:
                if edge.source not in node_ids:
                    raise ValueError(f'Edge source "{edge.source}" references non-existent node')
                if edge.target not in node_ids:
                    raise ValueError(f'Edge target "{edge.target}" references non-existent node')

        return self


class FlowResponse(BaseModel):
    id: str
    name: str
    description: str
    nodes: List[FlowNode]
    edges: List[FlowEdge]
    variables: Dict[str, Any]
    createdAt: datetime
    updatedAt: datetime
    version: int

    class ConfigDict:
        from_attributes = True


class NodeExecutionResult(BaseModel):
    nodeId: str
    nodeType: Literal[
        "input",
        "llm",
        "output",
        "json_extractor",
        "conditional",
        "image_gen",
        "image_output",
        "text_transformer",
        "http_request",
        "variable_get",
        "variable_set",
        "delay",
        "merge",
        "code",
        "template",
    ]
    status: Literal["idle", "running", "success", "error", "skipped", "cancelled"]
    input: Optional[Any] = None
    output: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    startTime: Optional[str] = None
    executionTime: Optional[int] = None
    matchedCondition: Optional[str] = None
    outputHandle: Optional[str] = None
    skipReason: Optional[str] = None


class FlowExecutionRequest(BaseModel):
    flowId: str
    initialInput: Optional[Dict[str, Any]] = {}
    variables: Optional[Dict[str, Any]] = {}


class FlowExecutionResponse(BaseModel):
    flowId: str
    executionId: str
    status: Literal["pending", "running", "completed", "failed", "cancelled"]
    startTime: datetime
    endTime: Optional[datetime] = None
    totalExecutionTime: Optional[int] = None
    nodeResults: List[NodeExecutionResult] = []
    finalOutput: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None

    class ConfigDict:
        from_attributes = True


class ExecutionStatusUpdate(BaseModel):
    executionId: str
    status: Literal["pending", "running", "completed", "failed", "cancelled"]
    nodeId: Optional[str] = None
    nodeStatus: Optional[Literal["idle", "running", "success", "error", "skipped"]] = None
    output: Optional[Any] = None
    error: Optional[str] = None
    timestamp: str


class ValidationError(BaseModel):
    nodeId: str
    field: str
    message: str


class FlowValidationResult(BaseModel):
    valid: bool
    errors: List[ValidationError] = []
    warnings: List[str] = []


class FlowListItem(BaseModel):
    id: str
    name: str
    description: str
    nodeCount: int
    executionCount: int
    createdAt: datetime
    updatedAt: datetime

    class ConfigDict:
        from_attributes = True


class PaginatedFlowList(BaseModel):
    items: List[FlowListItem]
    total: int
    page: int
    pageSize: int
    hasNext: bool
    hasPrev: bool


# NODE TEMPLATES
class NodeTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    type: Literal[
        "input",
        "llm",
        "output",
        "json_extractor",
        "conditional",
        "image_gen",
        "image_output",
        "text_transformer",
        "http_request",
        "variable_get",
        "variable_set",
        "delay",
        "merge",
        "code",
        "template",
    ]
    icon: str
    color: str
    defaultConfig: Dict[str, Any]
    category: str
    isPremium: bool

    class ConfigDict:
        from_attributes = True


class CreateNodeFromTemplateRequest(BaseModel):
    templateId: str
    position: Dict[str, float]
    customConfig: Optional[Dict[str, Any]] = None
