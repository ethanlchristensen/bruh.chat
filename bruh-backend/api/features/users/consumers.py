import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class UserConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        if not user or not user.is_authenticated:
            await self.close()
            return

        # Each user gets their own channel based on user ID
        self.user_group_name = f"user_{user.id}"

        # Join user's personal group
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    # Receive different types of updates
    async def conversation_update(self, event):
        """Handle any conversation-related update"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": event["update_type"],
                    "conversation_id": event.get("conversation_id"),
                    "data": event["data"],
                }
            )
        )

    async def user_update(self, event):
        """Handle user-specific updates"""
        await self.send(text_data=json.dumps({"type": event["update_type"], "data": event["data"]}))
