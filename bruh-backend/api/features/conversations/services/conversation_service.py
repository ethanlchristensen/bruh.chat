from uuid import UUID
from asgiref.sync import sync_to_async
from django.db.models import Prefetch
from ..models import Conversation, Message

class ConversationService:
    @staticmethod
    @sync_to_async
    def create_conversation(user, title):
        return Conversation.objects.create(
            user=user,
            title=title
        )
    
    @staticmethod
    @sync_to_async
    def create_conversation_from_message(user, first_message: str):
        title = first_message[:50] if first_message else "New Conversation"
        if len(first_message) > 50:
            title += "..."
        
        return Conversation.objects.create(
            user=user,
            title=title
        )
    
    @staticmethod
    @sync_to_async
    def get_user_conversations(user, include_deleted=False):
        queryset = Conversation.objects.filter(user=user)
        if not include_deleted:
            queryset = queryset.filter(deleted=False)
        return list(queryset)
    
    @staticmethod
    @sync_to_async
    def get_conversation(conversation_id: UUID, user):
        return Conversation.objects.get(id=conversation_id, user=user)
    
    @staticmethod
    @sync_to_async
    def get_conversation_with_messages(conversation_id: UUID, user, include_deleted=False):
        queryset = Conversation.objects.prefetch_related(
            Prefetch(
                'messages',
                queryset=Message.objects.filter(deleted=False) if not include_deleted else Message.objects.all()
            )
        )
        return queryset.get(id=conversation_id, user=user)

    @staticmethod
    @sync_to_async
    def update_conversation_timestamp(conversation: Conversation):
        conversation.save(update_fields=["updated_at"])
