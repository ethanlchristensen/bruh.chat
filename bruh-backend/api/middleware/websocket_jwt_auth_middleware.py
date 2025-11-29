from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser, User
from urllib.parse import parse_qs
from ninja_jwt.tokens import AccessToken
from jwt.exceptions import InvalidTokenError


@database_sync_to_async
def get_user_from_token(token_string):
    """Validate JWT token and return user"""
    try:
        access_token = AccessToken(token_string)
        user_id = access_token.payload.get('user_id')
        if user_id:
            return User.objects.get(id=user_id)
    except (InvalidTokenError, User.DoesNotExist):
        pass
    return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Custom middleware to authenticate WebSocket connections via JWT token"""
    
    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        if token:
            scope['user'] = await get_user_from_token(token) # type ignore
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)