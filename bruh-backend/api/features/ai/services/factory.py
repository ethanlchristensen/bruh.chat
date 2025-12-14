from typing import Any, AsyncGenerator, List, Protocol

from .ollama_sevice import get_ollama_service
from .open_router_service import get_open_router_service


class AIServiceProtocol(Protocol):
    """The contract both services must fulfill"""

    async def validate_model_id(self, model_id: str) -> bool: ...

    async def format_message_payload(
        self, content: str, attachments: List[Any], model: str = None
    ) -> dict: ...

    async def chat_with_messages_stream(
        self,
        messages: list[dict],
        model: str = None,
        modalities: list[str] = None,
        image_config: dict = None,
    ) -> AsyncGenerator[str, None]: ...


def get_ai_service(provider: str) -> AIServiceProtocol:
    if provider == "ollama":
        return get_ollama_service()
    elif provider == "openrouter":
        return get_open_router_service()
    raise ValueError(f"Unknown AI provider: {provider}")
