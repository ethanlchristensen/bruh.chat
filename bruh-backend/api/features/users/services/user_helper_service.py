from django.db import IntegrityError
from api.features.users.models import UserAddedModel
from api.features.ai.services.open_router_service import get_open_router_service
from typing import List, Dict, Any
from asgiref.sync import sync_to_async


class UserHelperService:
    
    @staticmethod
    async def add_model_for_user(user, model_id: str) -> tuple[UserAddedModel | None, str | None]:
        """
        Add a model to user's collection
        Returns (model_instance, error_message)
        """
        service = get_open_router_service()
        is_valid = await service.validate_model_id(model_id)
        
        if not is_valid:
            return None, "Invalid model ID - model not found in OpenRouter"
        
        try:
            model, created = await sync_to_async(UserAddedModel.objects.get_or_create)(
                user=user,
                model_id=model_id
            )
            if not created:
                return None, "Model already added"
            return model, None
        except IntegrityError:
            return None, "Failed to add model"

    @staticmethod
    async def remove_model_for_user(user, model_id: str) -> tuple[bool, str | None]:
        """
        Remove a model from user's collection
        Returns (success, error_message)
        """
        def _delete():
            deleted_count, _ = UserAddedModel.objects.filter(
                user=user,
                model_id=model_id
            ).delete()
            return deleted_count
        
        deleted_count = await sync_to_async(_delete)()
        
        if deleted_count == 0:
            return False, "Model not found in your collection"
        return True, None

    @staticmethod
    async def get_user_added_model_ids(user) -> List[str]:
        """
        Get list of model IDs added by user
        """
        return await sync_to_async(list)(
            UserAddedModel.objects.filter(user=user)
            .values_list('model_id', flat=True)
        )

    @staticmethod
    async def get_user_available_models(user) -> List[Dict]:
        """
        Get full model details for user's added models from OpenRouter
        """
        user_model_ids = await UserHelperService.get_user_added_model_ids(user)
        if not user_model_ids:
            return []
        
        service = get_open_router_service()
        return await service.get_models_by_ids(user_model_ids)

    @staticmethod
    async def bulk_add_models(user, model_ids: List[str]) -> Dict[str, Any]:
        """
        Add multiple models at once with validation
        Returns dict with 'added', 'skipped', and 'invalid' counts/lists
        """
        service = get_open_router_service()
        valid_ids, invalid_ids = await service.validate_model_ids(model_ids)
        
        added = 0
        skipped = 0
        
        for model_id in valid_ids:
            try:
                _, created = await sync_to_async(UserAddedModel.objects.get_or_create)(
                    user=user,
                    model_id=model_id
                )
                if created:
                    added += 1
                else:
                    skipped += 1
            except IntegrityError:
                skipped += 1
        
        return {
            "added": added,
            "skipped": skipped,
            "invalid": invalid_ids
        }