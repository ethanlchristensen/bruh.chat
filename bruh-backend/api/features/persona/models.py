import uuid

from django.conf import settings
from django.db import models


class Persona(models.Model):
    PROVDER_CHOICES = [("openrouter", "OpenRouter"), ("ollama", "Ollama")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="personas",
        verbose_name="Owner",
        db_index=True,
    )
    name = models.CharField(
        max_length=100,
        help_text='A short, memorable name for the persona (e.g., "Sarcastic AI", "Helpful Assistant")',
    )
    description = models.TextField(
        blank=True, help_text="A brief description of what this persona is about."
    )
    instructions = models.TextField(
        blank=False,
        help_text="Detailed instructions for the LLM on how to behave as this persona.",
    )
    example_dialogue = models.TextField(
        blank=True,
        help_text="Provide an example dialogue to guide the persona's style and responses.",
    )
    model_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Optional: The ID of a specific model to use with this persona (e.g., "ollama/llama3", "openrouter/anthropic/claude-3-haiku")',
    )
    provider = models.CharField(max_length=20, choices=PROVDER_CHOICES, default="openrouter")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(
        default=False,
        help_text="If checked, this persona can be viewed and used by other users.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this persona is currently active and selectable.",
    )
    persona_image = models.ImageField(upload_to="persona_images/", blank=True, null=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Persona"
        verbose_name_plural = "Personas"

    def __str__(self):
        return f"{self.name} by {self.user.username}"

    @property
    def formatted_instructions(self):
        prompt_parts = [self.instructions]
        if self.example_dialogue:
            prompt_parts.append(
                "\nUtilize the sample dialogue to guide how you craft your response:\n"
                + self.example_dialogue
            )
        return "\n".join(prompt_parts)
