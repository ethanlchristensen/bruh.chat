from django.urls import path

from api.features.users.consumers import UserConsumer

websocket_urlpatterns = [
    path("ws/user/", UserConsumer.as_asgi())  # type: ignore[misc]
]
