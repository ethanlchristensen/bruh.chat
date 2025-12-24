from abc import ABC, abstractmethod
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class AIServiceBase(ABC):
    """Base class for AI service providers with shared functionality"""

    @abstractmethod
    async def chat_with_structured_output(
        self,
        messages: list[dict],
        response_format: dict,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        message_instance=None,
        **kwargs,
    ) -> dict:
        """
        Chat with structured JSON output

        Args:
            messages: List of message dicts
            response_format: JSON schema/format for structured output
            model: Model ID
            temperature: Optional temperature
            message_instance: Optional Message instance to link AIResponse to
        """
        raise NotImplementedError()

    async def generate_conversation_starters(
        self,
        topics: list[str],
        num_questions: int = 5,
        model: Optional[str] = None,
    ) -> dict:
        """
        Generate conversation starter questions across various topics using structured output

        Args:
            topics: List of topics to generate conversation starters about
            num_questions: Total number of starters to generate (default 5)
            model: Model ID (should support structured outputs)
        """
        topics_text = ", ".join(topics)

        prompt = f"""Generate {num_questions} engaging conversation starter questions across these topics: {topics_text}.
These questions will be displayed in a UI for users to click and start a new conversation.
Make them interesting, thought-provoking, and varied in style (some philosophical, some practical, some creative).
Mix the topics - don't focus on just one. Each question should stand alone and be immediately engaging.
These are conversation starters for a chat with an AI.
Ensure the question generated keeps this in mind as it will be the first message a user sends to start a chat with an AI model."""

        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant that generates engaging conversation starter questions.",
            },
            {"role": "user", "content": prompt},
        ]

        response_format = self._get_conversation_starters_schema()

        return await self.chat_with_structured_output(
            messages=messages,
            response_format=response_format,
            model=model or self.default_model,
            temperature=0.8,
        )

    @abstractmethod
    def _get_conversation_starters_schema(self) -> dict:
        """
        Get the provider-specific schema format for conversation starters
        """
        pass
