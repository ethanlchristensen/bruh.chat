from django.contrib import admin

from .features.ai.models import OpenRouterResponse
from .features.conversations.models import Conversation, Message
from .features.users.models import Profile, UserAddedModel

admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(Profile)
admin.site.register(UserAddedModel)
admin.site.register(OpenRouterResponse)
