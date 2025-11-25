from django.contrib import admin
from .features.conversations.models import Conversation, Message
from .features.users.models import Profile
from .features.ai.models import UserAddedModels, OpenRouterResponse

admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(Profile)
admin.site.register(UserAddedModels)
admin.site.register(OpenRouterResponse)