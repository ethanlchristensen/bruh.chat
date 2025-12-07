from asgiref.sync import sync_to_async
from django.db.models import Prefetch

from ..models import Conversation, Message, MessageAttachment, GeneratedImage


class MessageService:
    @staticmethod
    @sync_to_async
    def create_message(conversation, role, content):
        return Message.objects.create(conversation=conversation, role=role, content=content)

    @staticmethod
    @sync_to_async
    def get_conversation_messages(conversation: Conversation, include_deleted=False):
        queryset = conversation.messages.select_related("reasoning").all()
        if not include_deleted:
            queryset = queryset.filter(deleted=False)
        return list(queryset)

    @staticmethod
    @sync_to_async
    def get_message_history_for_open_router(
        conversation,
        include_user_images: bool = True,
        max_generated_images: int = 1,
    ):
        """
        Build message history for OpenRouter API with intelligent image handling.

        Args:
            conversation: The conversation object
            include_user_images: Whether to include user-uploaded images
            max_generated_images: Maximum number of recent generated images to include
                                 (0 = none, -1 = all, N = last N images)
        """
        from api.features.ai.services.open_router_service import get_open_router_service

        messages = []
        generated_image_count = 0

        db_messages = (
            conversation.messages.filter(deleted=False)
            .prefetch_related(
                Prefetch(
                    "attachments",
                    queryset=MessageAttachment.objects.filter(mime_type__startswith="image/"),
                ),
                "generated_images",
                "reasoning__generated_reasoning_images",
            )
            .order_by("created_at")
        )

        if max_generated_images > 0:
            total_generated_images = sum(
                1
                for msg in db_messages
                if msg.role == "assistant" and msg.generated_images.exists()
            )
            skip_until_image = max(0, total_generated_images - max_generated_images)
        else:
            skip_until_image = float("inf")

        open_router_service = get_open_router_service()

        for message in db_messages:
            if message.role == "user":
                if include_user_images and message.attachments.exists():
                    content_parts = []

                    if message.content and message.content.strip():
                        content_parts.append({"type": "text", "text": message.content})

                    for attachment in message.attachments.all():
                        if attachment.mime_type.startswith("image/"):
                            attachment.file.seek(0)
                            base64_image = open_router_service.encode_image_to_base64(
                                attachment.file
                            )
                            content_parts.append(
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{attachment.mime_type};base64,{base64_image}"
                                    },
                                }
                            )

                    messages.append({"role": message.role, "content": content_parts})
                else:
                    messages.append({"role": message.role, "content": message.content})

            elif message.role == "assistant":
                has_generated_images = message.generated_images.exists()

                include_images = False
                if has_generated_images and max_generated_images != 0:
                    if max_generated_images == -1:
                        include_images = True
                    elif generated_image_count >= skip_until_image:
                        include_images = True
                    generated_image_count += 1

                if include_images:
                    content_parts = []

                    if message.content and message.content.strip():
                        content_parts.append({"type": "text", "text": message.content})

                    for gen_image in message.generated_images.all():
                        gen_image.image.seek(0)
                        base64_image = open_router_service.encode_image_to_base64(gen_image.image)
                        content_parts.append(
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{base64_image}"},
                            }
                        )

                    for gen_reasoning_image in message.generated_reasoning_images.all():
                        gen_reasoning_image.image.seek(0)
                        base64_image = open_router_service.encode_image_to_base64(
                            gen_reasoning_image.image
                        )
                        content_parts.append(
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{base64_image}"},
                            }
                        )

                    messages.append({"role": message.role, "content": content_parts})
                else:
                    messages.append({"role": message.role, "content": message.content})

        return messages

    @staticmethod
    @sync_to_async
    def get_message_count(conversation) -> int:
        """Get the total number of non-deleted messages in a conversation"""
        return conversation.messages.filter(deleted=False).count()
