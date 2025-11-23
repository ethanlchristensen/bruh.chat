from django.contrib import admin
from .conversations.models import Conversation, Message
from .users.models import Profile

admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(Profile)