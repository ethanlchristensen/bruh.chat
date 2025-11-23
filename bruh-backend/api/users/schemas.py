from ninja import Schema
from datetime import datetime
from typing import Optional


class ProfileSchema(Schema):
    bio: Optional[str] = None
    profile_image: Optional[str] = None

    @staticmethod
    def resolve_profile_image(obj):
        if hasattr(obj, '_image_full_url'):
            return obj._image_full_url
        
        if obj.profile_image:
            return obj.profile_image.url
        return None

class ProfileUpdateSchema(Schema):
    bio: Optional[str] = None

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
