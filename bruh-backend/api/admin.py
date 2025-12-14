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
from .features.users.models import Profile, UserAddedModel

admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(Profile)
admin.site.register(UserAddedModel)
admin.site.register(AIResponse)
admin.site.register(MessageAttachment)
admin.site.register(GeneratedImage)
admin.site.register(Reasoning)
admin.site.register(GeneratedReasoningImage)
