from typing import Any, AsyncGenerator, List, Tuple, Optional

from asgiref.sync import sync_to_async

from .base import AIServiceBase
from .ollama_sevice import get_ollama_service
from .open_router_service import get_open_router_service
from api.features.users.models import Profile


def get_ai_service(provider: str) -> AIServiceBase:
    """
    Factory function to get the appropriate AI service based on provider

    Args:
        provider: Either "ollama" or "openrouter"

    Returns:
        An instance of AIServiceBase (OllamaService or OpenRouterService)

    Raises:
        ValueError: If provider is unknown
    """
    if provider == "ollama":
        return get_ollama_service()
    elif provider == "openrouter":
        return get_open_router_service()
    raise ValueError(f"Unknown AI provider: {provider}")


async def get_user_aux_model(user) -> Tuple[str, str] | Tuple[None, None]:
    """Get user's default AUX model from their profile"""

    @sync_to_async
    def _get_model():
        if hasattr(user, "profile") and user.profile:
            profile: Profile = user.profile
            return profile.default_aux_model, profile.default_aux_model_provider
        return None, None

    return await _get_model()
