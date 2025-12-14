from typing import Any, Dict, List

from asgiref.sync import sync_to_async
from django.db import IntegrityError

from api.features.ai.services.factory import get_ai_service
from api.features.users.models import UserAddedModel


class UserHelperService:
    @staticmethod
    async def add_model_for_user(
        user, model_id: str, provider: str = "openrouter"
    ) -> tuple[UserAddedModel | None, str | None]:
        """
        Add a model to user's collection (unified interface for both providers)
        Returns (model_instance, error_message)
        """
        service = get_ai_service(provider)

        # Both services now use validate_model_id()
        is_valid = await service.validate_model_id(model_id)

        if not is_valid:
            return None, f"Invalid model ID '{model_id}' - model not found in {provider}"

        try:
            model, created = await sync_to_async(UserAddedModel.objects.get_or_create)(
                user=user, model_id=model_id, provider=provider
            )
            if not created:
                return None, "Model already added"
            return model, None
        except IntegrityError:
            return None, "Failed to add model"

    @staticmethod
    async def remove_model_for_user(
        user, model_id: str, provider: str = "openrouter"
    ) -> tuple[bool, str | None]:
        """
        Remove a model from user's collection
        Returns (success, error_message)
        """

        def _delete():
            deleted_count, _ = UserAddedModel.objects.filter(
                user=user, model_id=model_id, provider=provider
            ).delete()
            return deleted_count

        deleted_count = await sync_to_async(_delete)()

        if deleted_count == 0:
            return False, "Model not found in your collection"
        return True, None

    @staticmethod
    async def get_user_added_model_ids(user, provider: str = None) -> List[Dict[str, str]]:
        """
        Get list of model IDs added by user
        Returns list of dicts with model_id and provider
        """
        queryset = UserAddedModel.objects.filter(user=user)
        if provider:
            queryset = queryset.filter(provider=provider)

        return await sync_to_async(list)(queryset.values("model_id", "provider"))

    @staticmethod
    async def get_user_available_models(user, provider: str = None) -> Dict[str, List[Dict]]:
        """
        Get full model details for user's added models from both providers
        Returns dict with 'openrouter' and 'ollama' keys (unified interface)
        """
        user_models = await UserHelperService.get_user_added_model_ids(user, provider)

        result = {"openrouter": [], "ollama": []}

        if not user_models:
            return result

        # Group by provider
        openrouter_ids = [m["model_id"] for m in user_models if m["provider"] == "openrouter"]
        ollama_ids = [m["model_id"] for m in user_models if m["provider"] == "ollama"]

        # Both services now use get_models_by_ids()
        if openrouter_ids:
            openrouter_service = get_ai_service("openrouter")
            result["openrouter"] = await openrouter_service.get_models_by_ids(openrouter_ids)

        if ollama_ids:
            ollama_service = get_ai_service("ollama")
            result["ollama"] = await ollama_service.get_models_by_ids(ollama_ids)

        return result

    @staticmethod
    async def bulk_add_models(
        user, model_ids: List[str], provider: str = "openrouter"
    ) -> Dict[str, Any]:
        """
        Add multiple models at once with validation (unified interface)
        Returns dict with 'added', 'skipped', and 'invalid' counts/lists
        """
        service = UserHelperService._get_service(provider)

        # Both services now use validate_model_ids()
        valid_ids, invalid_ids = await service.validate_model_ids(model_ids)

        added = 0
        skipped = 0

        for model_id in valid_ids:
            try:
                _, created = await sync_to_async(UserAddedModel.objects.get_or_create)(
                    user=user, model_id=model_id, provider=provider
                )
                if created:
                    added += 1
                else:
                    skipped += 1
            except IntegrityError:
                skipped += 1

        return {"added": added, "skipped": skipped, "invalid": invalid_ids}
