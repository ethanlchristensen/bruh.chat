from ninja_extra import api_controller, route
from ninja_jwt.authentication import JWTAuth
from ninja import File, Form
from ninja.files import UploadedFile
from django.contrib.auth.models import User
from typing import List
from .schemas import UserSchema, ProfileSchema, UserUpdateSchema, ProfileUpdateSchema
from .permissons import IsAdmin
from .models import Profile

@api_controller("/users", auth=JWTAuth(), tags=["Users"])
class UserController:
    def _add_full_image_url(self, request, user):
        if hasattr(user, "profile") and user.profile.profile_image:
            user.profile._image_full_url = request.build_absolute_uri(user.profile.profile_image.url)
        return user

    @route.get("/me", response=UserSchema)
    def get_current_user(self, request):
        return self._add_full_image_url(request, request.user)
    
    @route.patch("/me", response=UserSchema)
    def update_current_user(self, request, data: UserUpdateSchema):
        user = request.user
        for attr, value in data.dict(exclude_unset=True).items():
            setattr(user, attr, value)
        user.save()

        return self._add_full_image_url(request, request.user)
    
    @route.patch("/me/profile", response=UserSchema)
    def update_current_user_profile(self, request, data: ProfileUpdateSchema):
        user = request.user
        profile = user.profile

        for attr, value in data.dict(exclude_unset=True).items():
            setattr(profile, attr, value)
        profile.save()

        return self._add_full_image_url(request, request.user)
    
    @route.post("/me/profile/image", response=UserSchema)
    def update_profile_image(self, request, profile_image: UploadedFile = File(...)): # type: ignore
        user = request.user
        profile = user.profile

        if profile.profile_image:
            profile.profile_image.delete(save=False)
        
        profile.profile_image = profile_image
        profile.save()

        return self._add_full_image_url(request, request.user)

    @route.get("/", response=List[UserSchema], permissions=[IsAdmin])
    def list_users(self, request):
        """List all users"""
        return User.objects.all()
    
    @route.get("/{user_id}", response=UserSchema, permissions=[IsAdmin])
    def get_user(self, request, user_id: int):
        """Get user by ID"""
        return User.objects.get(id=user_id)