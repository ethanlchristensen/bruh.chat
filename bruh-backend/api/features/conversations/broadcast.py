from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from uuid import UUID
import logging

logger = logging.getLogger(__name__)


class ConversationBroadcaster:
    @staticmethod
    def broadcast_to_user(
        user_id: int, update_type: str, data: dict, conversation_id: UUID | None = None
    ):
        """Broadcast any update to a specific user"""
        channel_layer = get_channel_layer()

        if not channel_layer:
            logger.error("Channel Layer was none. Not broadcasting update.")
            return

        message = {
            "type": "conversation_update",  # Method name on consumer
            "update_type": update_type,
            "data": data,
        }

        if conversation_id:
            message["conversation_id"] = str(conversation_id)

        async_to_sync(channel_layer.group_send)(f"user_{user_id}", message)

    @staticmethod
    def broadcast_title_update(user_id: int, conversation_id: UUID, new_title: str):
        """Broadcast title update"""
        ConversationBroadcaster.broadcast_to_user(
            user_id=user_id,
            update_type="title_updated",
            conversation_id=conversation_id,
            data={"new_title": new_title},
        )

    @staticmethod
    def broadcast_new_message(user_id: int, conversation_id: UUID, message_data: dict):
        """Broadcast new message"""
        ConversationBroadcaster.broadcast_to_user(
            user_id=user_id,
            update_type="new_message",
            conversation_id=conversation_id,
            data=message_data,
        )
