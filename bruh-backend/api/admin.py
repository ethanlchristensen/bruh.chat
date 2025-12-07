from django.contrib import admin

from .features.ai.models import OpenRouterResponse
from .features.conversations.models import (
    Conversation,
    Message,
    MessageAttachment,
    GeneratedImage,
    Reasoning,
    GeneratedReasoningImage,
)
from .features.users.models import Profile, UserAddedModel

admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(Profile)
admin.site.register(UserAddedModel)
admin.site.register(OpenRouterResponse)
admin.site.register(MessageAttachment)
admin.site.register(GeneratedImage)
admin.site.register(Reasoning)
admin.site.register(GeneratedReasoningImage)
