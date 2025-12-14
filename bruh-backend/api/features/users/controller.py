# api/features/users/controller.py
from typing import List, Optional

from asgiref.sync import sync_to_async
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from ninja import File
from ninja.files import UploadedFile
from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth

from api.features.ai.services.ollama_sevice import get_ollama_service
from api.features.ai.services.open_router_service import get_open_router_service

from .permissons import IsAdmin
from .schemas import (
    AddModelSchema,
    BulkAddModelsSchema,
    BulkOperationResponseSchema,
    ProfileUpdateSchema,
    UserAddedModelSchema,
    UserRegistrationSchema,
    UserSchema,
    UserUpdateSchema,
)
from .services.user_helper_service import UserHelperService


@api_controller("/users", auth=JWTAuth(), tags=["Users"])
class UserController:
    def _add_full_image_url(self, request, user):
        if hasattr(user, "profile") and user.profile.profile_image:
            user.profile._image_full_url = request.build_absolute_uri(
                user.profile.profile_image.url
            )
        return user

    @route.get("/me", response=UserSchema)
    def get_current_user(self, request):
        return request.user

    @route.patch("/me", response=UserSchema)
    def update_current_user(self, request, data: UserUpdateSchema):
        user = request.user
        for attr, value in data.dict(exclude_unset=True).items():
            setattr(user, attr, value)
        user.save()

        return request.user

    @route.patch("/me/profile", response={200: UserSchema, 400: dict})
    async def update_current_user_profile(self, request, data: ProfileUpdateSchema):
        user = request.user
        profile = await sync_to_async(lambda: user.profile)()

        data_dict = data.dict(exclude_unset=True)

        # Get provider from data or use existing
        provider = data_dict.get("default_provider", profile.default_provider)

        # Validate default_model
        if "default_model" in data_dict and data_dict["default_model"]:
            if provider == "ollama":
                service = get_ollama_service()
            else:
                service = get_open_router_service()
            is_valid = await service.validate_model_id(data_dict["default_model"])

            if not is_valid:
                return 400, {
                    "detail": f"Invalid model ID for {provider}: {data_dict['default_model']}"
                }

        # Validate default_aux_model
        if "default_aux_model" in data_dict and data_dict["default_aux_model"]:
            if provider == "ollama":
                service = get_ollama_service()
            else:
                service = get_open_router_service()

            is_valid = await service.validate_model_id(data_dict["default_aux_model"])

            if not is_valid:
                return 400, {
                    "detail": f"Invalid auxiliary model ID for {provider}: {data_dict['default_aux_model']}"
                }

        for attr, value in data_dict.items():
            setattr(profile, attr, value)

        await sync_to_async(profile.save)()

        return 200, request.user

    @route.post("/me/profile/image", response=UserSchema)
    def update_profile_image(self, request, profile_image: UploadedFile = File(...)):  # type: ignore
        user = request.user
        profile = user.profile

        if profile.profile_image:
            profile.profile_image.delete(save=False)

        profile.profile_image = profile_image
        profile.save()

        return request.user

    @route.get("/", response=List[UserSchema], permissions=[IsAdmin])
    def list_users(self, request):
        return User.objects.all()

    @route.get("/{user_id}", response=UserSchema, permissions=[IsAdmin])
    def get_user(self, request, user_id: int):
        return User.objects.get(id=user_id)

    @route.get("/me/models", response=List[UserAddedModelSchema])
    def get_user_added_models(self, request, provider: Optional[str] = None):
        """Get list of models added by current user, optionally filtered by provider"""
        queryset = request.user.added_models.all()
        if provider:
            queryset = queryset.filter(provider=provider)
        return queryset

    @route.get("/me/models/available")
    async def get_user_available_models(self, request, provider: Optional[str] = None):
        """Get full details of user's available models from both providers"""
        return await UserHelperService.get_user_available_models(request.user, provider)

    @route.post("/me/models", response={201: UserAddedModelSchema, 400: dict})
    async def add_model(self, request, data: AddModelSchema):
        """Add a model to user's collection"""
        model, error = await UserHelperService.add_model_for_user(
            request.user, data.model_id, data.provider
        )
        if error:
            return 400, {"detail": error}
        return 201, model

    @route.post("/me/models/bulk", response=BulkOperationResponseSchema)
    async def bulk_add_models(self, request, data: BulkAddModelsSchema):
        """Add multiple models at once"""
        return await UserHelperService.bulk_add_models(request.user, data.model_ids, data.provider)

    @route.delete("/me/models", response={200: dict, 404: dict})
    async def remove_model(self, request, model_id: str, provider: str = "openrouter"):
        """Remove a model from user's collection"""
        success, error = await UserHelperService.remove_model_for_user(
            request.user, model_id, provider
        )
        if not success:
            return 404, {"detail": error}
        return 200, {"message": "Model removed successfully"}


@api_controller("/auth", tags=["Auth"])
class AuthController:
    @route.post("/register", response={201: UserSchema, 400: dict})
    def register_user(self, request, data: UserRegistrationSchema):
        """Public endpoint for user registration"""
        if User.objects.filter(username=data.username).exists():
            return 400, {"detail": "Username already exists"}

        if User.objects.filter(email=data.email).exists():
            return 400, {"detail": "Email already exists"}

        user = User.objects.create(
            username=data.username,
            email=data.email,
            password=make_password(data.password),
            first_name=data.first_name or "",
            last_name=data.last_name or "",
        )

        return 201, user
