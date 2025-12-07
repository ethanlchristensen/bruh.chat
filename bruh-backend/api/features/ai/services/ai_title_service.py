import json
import logging
from functools import lru_cache

from asgiref.sync import sync_to_async

from api.features.ai.services.open_router_service import get_open_router_service
from api.features.conversations.services import ConversationService, MessageService

logger = logging.getLogger(__name__)


class TitleGenerationService:
    TITLE_SCHEMA = {
        "type": "json_schema",
        "json_schema": {
            "name": "conversation_title",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "A concise, descriptive title for the conversation (max 50 chars)",
                    }
                },
                "required": ["title"],
                "additionalProperties": False,
            },
        },
    }

    @staticmethod
    @sync_to_async
    def _get_user_title_settings(user) -> tuple[bool, int, str | None]:
        """Get user's title generation settings in a sync context"""
        try:
            profile = user.profile
            return (
                profile.auto_generate_titles,
                profile.title_generation_frequency,
                profile.default_aux_model,
            )
        except Exception as e:
            logger.error(f"Error accessing user profile: {str(e)}")
            return False, 4, None

    @staticmethod
    async def should_generate_title(user, conversation) -> bool:
        """Check if we should generate a title based on user settings and message count"""
        auto_generate, frequency, _ = await TitleGenerationService._get_user_title_settings(user)

        if not auto_generate:
            return False

        message_count = await MessageService.get_message_count(conversation=conversation)
        return message_count > 0 and message_count % frequency == 0

    @staticmethod
    async def generate_and_update_title(user, conversation):
        """
        Generate a title using structured outputs and broadcast update
        """
        try:
            (
                auto_generate,
                frequency,
                aux_model,
            ) = await TitleGenerationService._get_user_title_settings(user)

            if not auto_generate:
                logger.debug(f"Auto title generation disabled for user {user.id}")
                return

            if not aux_model:
                logger.warning(
                    f"No default_aux_model set for user {user.id}, skipping title generation"
                )
                return

            open_router_service = get_open_router_service()
            supports_structured = await open_router_service.supports_structured_outputs(
                model_id=aux_model, use_cache=True
            )

            if not supports_structured:
                logger.warning(
                    f"Model {aux_model} doesn't support structured outputs, skipping title generation"
                )
                return

            message_history = await MessageService.get_message_history_for_open_router(
                conversation=conversation
            )

            title_prompt = {
                "role": "user",
                "content": "Generate a concise, descriptive title (max 50 characters) that captures the essence of this conversation. Place emojis on either end of the title as well.",
            }

            messages = message_history + [title_prompt]

            response = await open_router_service.chat_with_structured_output(
                messages=messages,
                response_format=TitleGenerationService.TITLE_SCHEMA,
                model=aux_model,
                temperature=0.7,
                max_tokens=100,
            )

            content = response["choices"][0]["message"]["content"]
            title_data = json.loads(content)
            new_title = title_data["title"][:50]

            await ConversationService.update_conversation_title(
                conversation_id=conversation.id,
                user=user,
                title=new_title,
                broadcast=True,  # tell the conversation service to broadcast the update to the websocket for the given user
            )

            logger.info(f"Generated title for conversation {conversation.id}: {new_title}")

        except Exception as e:
            logger.error(
                f"Failed to generate title for conversation {conversation.id}: {str(e)}",
                exc_info=True,
            )


@lru_cache()
def get_title_generation_service() -> TitleGenerationService:
    return TitleGenerationService()
