from django.contrib.auth.models import User
from django.db import models

from api.features.conversations.models import Message

class OpenRouterResponse(models.Model):
    """Stores raw API responses from OpenRouter for audit, debugging, and analytics"""

    message = models.OneToOneField(
        Message, related_name="api_response", on_delete=models.CASCADE, null=True, blank=True
    )

    raw_payload = models.JSONField()

    request_id = models.CharField(max_length=255, db_index=True)
    model_used = models.CharField(max_length=100)
    finish_reason = models.CharField(max_length=50, null=True, blank=True)

    prompt_tokens = models.IntegerField(null=True, blank=True)
    completion_tokens = models.IntegerField(null=True, blank=True)
    total_tokens = models.IntegerField(null=True, blank=True)

    estimated_prompt_cost = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    estimated_completion_cost = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    estimated_image_cost = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at", "model_used"]),
        ]

    def __str__(self):
        return f"{self.model_used} - {self.request_id[:10]}"
