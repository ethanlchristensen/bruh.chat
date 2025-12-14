from datetime import datetime
from typing import List, Optional

from ninja import Schema


class ProfileSchema(Schema):
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    default_model: Optional[str] = None
    default_aux_model: Optional[str] = None
    default_provider: Optional[str] = None
    auto_generate_titles: Optional[bool] = None
    title_generation_frequency: Optional[int] = None

    @staticmethod
    def resolve_profile_image(obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None


class ProfileUpdateSchema(Schema):
    bio: Optional[str] = None
    default_model: Optional[str] = None
    default_aux_model: Optional[str] = None
    default_provider: Optional[str] = None
    auto_generate_titles: Optional[bool] = None
    title_generation_frequency: Optional[int] = None


class UserSchema(Schema):
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_staff: bool
    is_superuser: bool
    date_joined: datetime
    profile: Optional[ProfileSchema] = None


class UserUpdateSchema(Schema):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserAddedModelSchema(Schema):
    id: int
    model_id: str
    provider: str  # NEW
    added_at: datetime


class AddModelSchema(Schema):
    model_id: str
    provider: str = "openrouter"  # NEW


class BulkAddModelsSchema(Schema):
    model_ids: List[str]
    provider: str = "openrouter"  # NEW


class RemoveModelSchema(Schema):
    model_id: str
    provider: str = "openrouter"  # NEW


class BulkOperationResponseSchema(Schema):
    added: int
    skipped: int
    invalid: List[str] = []  # NEW - show which models were invalid


class UserRegistrationSchema(Schema):
    username: str
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
