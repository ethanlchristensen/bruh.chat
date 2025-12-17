from django.contrib import admin

from .features.ai.models import AIResponse
from .features.conversations.models import (
    Conversation,
    GeneratedImage,
    GeneratedReasoningImage,
    Message,
    MessageAttachment,
    Reasoning,
)
from .features.personas.models import Persona
from .features.users.models import Profile, UserAddedModel
from .features.flows.models import Flow, FlowExecution, FlowTemplate, NodeExecutionLog, NodeTemplate

# CORE MODELS
admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(Profile)
admin.site.register(UserAddedModel)

# AI FEATURES
admin.site.register(AIResponse)
admin.site.register(MessageAttachment)
admin.site.register(GeneratedImage)

# REASONING
admin.site.register(Reasoning)
admin.site.register(GeneratedReasoningImage)

# PERSONAS
admin.site.register(Persona)

# FLOWS
admin.site.register(Flow)
admin.site.register(FlowExecution)
admin.site.register(FlowTemplate)
admin.site.register(NodeExecutionLog)
admin.site.register(NodeTemplate)
