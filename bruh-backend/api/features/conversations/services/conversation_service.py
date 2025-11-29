import datetime
from uuid import UUID
from typing import Tuple

from asgiref.sync import sync_to_async
from django.db.models import Prefetch

from ..models import Conversation, Message
from ..broadcast import ConversationBroadcaster


class ConversationService:
    @staticmethod
    @sync_to_async
    def create_conversation(user, title):
        return Conversation.objects.create(user=user, title=title)

    @staticmethod
    @sync_to_async
    def create_conversation_from_message(user, first_message: str):
        title = first_message[:50] if first_message else "New Conversation"
        if len(first_message) > 50:
            title += "..."

        return Conversation.objects.create(user=user, title=title)

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
    def get_conversation_with_messages(
        conversation_id: UUID, user, include_deleted=False
    ):
        queryset = Conversation.objects.prefetch_related(
            Prefetch(
                "messages",
                queryset=(
                    Message.objects.filter(deleted=False)
                    if not include_deleted
                    else Message.objects.all()
                ),
            )
        )
        return queryset.get(id=conversation_id, user=user)

    @staticmethod
    @sync_to_async
    def update_conversation_timestamp(conversation: Conversation):
        conversation.save(update_fields=["updated_at"])

    @staticmethod
    @sync_to_async
    def mark_conversation_as_deleted(conversation_id: UUID, user) -> bool:
        conversation = Conversation.objects.get(id=conversation_id, user=user)

        if conversation is None:
            return False

        conversation.deleted = True
        conversation.deleted_at = datetime.datetime.now(datetime.timezone.utc)
        conversation.save(update_fields=["deleted", "deleted_at"])

        return True

    @staticmethod
    @sync_to_async
    def update_conversation_title(
        conversation_id: UUID, user, title: str, broadcast: bool = False
    ) -> Tuple[bool, Conversation | None]:
        conversation = Conversation.objects.get(id=conversation_id, user=user)

        if conversation is None:
            return False, None

        conversation.title = title[:50]
        conversation.save(update_fields=["title"])

        if broadcast: # should be false for api updates by the user since we update this ourselves in the ui
            ConversationBroadcaster.broadcast_title_update(
                user_id=user.id, conversation_id=conversation_id, new_title=title
            )

        return True, conversation
