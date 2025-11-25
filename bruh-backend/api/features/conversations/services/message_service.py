from asgiref.sync import sync_to_async

from ..models import Message, Conversation

class MessageService:
    @staticmethod
    @sync_to_async
    def create_message(conversation, role, content):
        return Message.objects.create(
            conversation=conversation,
            role=role,
            content=content
        )
    
    @staticmethod
    @sync_to_async
    def get_conversation_messages(conversation: Conversation, include_deleted=False):
        queryset = conversation.messages.all()
        if not include_deleted:
            queryset = queryset.filter(deleted=False)
        return list(queryset)
    
    @staticmethod
    @sync_to_async
    def get_message_history_for_open_router(conversation):
        messages = []
        for message in conversation.messages.filter(deleted=False).order_by("created_at"):
            messages.append({
                "role": message.role,
                "content": message.content
            })
        return messages