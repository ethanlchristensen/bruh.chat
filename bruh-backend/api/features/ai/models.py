from django.db import models

from api.features.conversations.models import Message


class AIResponse(models.Model):
    """Stores raw API responses from OpenRouter for audit, debugging, and analytics"""

    PROVIDER_CHOICES = [
        ("openrouter", "OpenRouter"),
        ("ollama", "Ollama"),
    ]

    message = models.OneToOneField(
        Message, related_name="api_response", on_delete=models.CASCADE, null=True, blank=True
    )

    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES, default="openrouter")

    raw_payload = models.JSONField()

    request_id = models.CharField(max_length=255, db_index=True)
    model_used = models.CharField(max_length=100)
    finish_reason = models.CharField(max_length=50, null=True, blank=True)

    # usage stats (ollama & openrouter)
    prompt_tokens = models.IntegerField(null=True, blank=True)
    completion_tokens = models.IntegerField(null=True, blank=True)
    image_tokens = models.IntegerField(null=True, blank=True)
    reasoning_tokens = models.IntegerField(null=True, blank=True)
    total_tokens = models.IntegerField(null=True, blank=True)

    # cost stats (openrouter)
    estimated_prompt_cost = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )
    estimated_completion_cost = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )
    estimated_reasoning_cost = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )
    upstream_inference_cost = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )
    upstream_inference_prompt_cost = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )
    upstream_inference_completions_cost = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )

    cost = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    is_structured_output = models.BooleanField(default=False, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at", "model_used"]),
            models.Index(fields=["provider"]),
            models.Index(fields=["is_structured_output"]),
            models.Index(fields=["provider", "is_structured_output"]),
        ]

    def __str__(self):
        structured_flag = " [STRUCTURED]" if self.is_structured_output else ""
        return f"[{self.provider}] {self.model_used}{structured_flag} - {self.request_id[:10]}"
