import base64
import re
import uuid
from typing import TYPE_CHECKING

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db import models

if TYPE_CHECKING:
    from django.db.models import QuerySet


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    if TYPE_CHECKING:
        messages: QuerySet["Message"]

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, related_name="messages", on_delete=models.CASCADE
    )
    role = models.CharField(max_length=50)
    content = models.TextField()
    model_id = models.TextField(max_length=350, null=True, blank=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    if TYPE_CHECKING:
        attachments: QuerySet["MessageAttachment"]
        generated_images: QuerySet["GeneratedImage"]

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:30]}"


class Reasoning(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.OneToOneField(Message, related_name="reasoning", on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    if TYPE_CHECKING:
        generated_reasoning_images: QuerySet["GeneratedReasoningImage"]


# MESSAGE ATTACHMENTS ##########
def sanitize_filename(filename: str) -> str:
    """Sanitize filename: alphanumeric only, spaces to underscores, collapse duplicates"""
    name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
    name = re.sub(r"_+", "_", re.sub(r"[^a-zA-Z0-9]+", "_", name)).strip("_")
    return f"{name}.{ext}" if ext else name


def message_attachment_upload_to(instance, filename):
    """Generate upload path with sanitized filename"""
    sanitized = sanitize_filename(filename)
    return f"message_attachments/{instance.message.created_at.strftime('%Y/%m/%d')}/{sanitized}"


class MessageAttachment(models.Model):
    """Stores file attachments for messages"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, related_name="attachments", on_delete=models.CASCADE)
    file = models.FileField(upload_to=message_attachment_upload_to)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()  # in bytes
    mime_type = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.file_name} - {self.message.id}"

    def save(self, *args, **kwargs):
        if self.file_name:
            self.file_name = sanitize_filename(self.file_name)
        super().save(*args, **kwargs)


### GENERATED IMAGES ##########
def generated_image_upload_to(instance, filename):
    """Generate upload path for AI-generated images"""
    return f"generated_images/{instance.message.created_at.strftime('%Y/%m/%d')}/{filename}"


def reasoning_image_upload_to(instance, filename):
    """Generate upload path for the AI-generated images in reasoing"""
    return f"reasoning_images/{instance.reasoning.created_at.strftime('%Y/%m/%d')}/{filename}"


class GeneratedImage(models.Model):
    """Stores AI-generated images"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, related_name="generated_images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to=generated_image_upload_to)
    prompt = models.TextField()
    model_used = models.CharField(max_length=350)
    aspect_ratio = models.CharField(max_length=10, null=True, blank=True)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.id} Generated image for message {self.message.id}"

    @staticmethod
    def save_from_base64(
        message: Message,
        base64_data: str,
        prompt: str,
        model_used: str,
        aspect_ratio: str | None = None,
    ):
        """Create a GeneratedImage from base64 data URL"""
        if "," in base64_data:
            format_prefix, base64_string = base64_data.split(",", 1)
        else:
            base64_string = base64_data

        image_data = base64.b64decode(base64_string)

        filename = f"{uuid.uuid4()}.png"

        generated_image = GeneratedImage(
            message=message,
            prompt=prompt,
            model_used=model_used,
            aspect_ratio=aspect_ratio,
        )

        generated_image.image.save(filename, ContentFile(image_data), save=True)

        return generated_image


class GeneratedReasoningImage(models.Model):
    """Stores AI Generated Images contained in reasoning steps"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reasoning = models.ForeignKey(
        Reasoning, related_name="generated_reasoning_images", on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to=reasoning_image_upload_to)
    model_used = models.CharField(max_length=350)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.id} Generated image in reasoning {self.reasoning.id}"

    @staticmethod
    def save_from_base64(
        reasoning: Reasoning,
        model_used: str,
        base64_data: str,
    ):
        """Create a GeneratedReasoningImage from base64 data URL"""
        if "," in base64_data:
            format_prefix, base64_string = base64_data.split(",", 1)
        else:
            base64_string = base64_data

        image_data = base64.b64decode(base64_string)

        filename = f"{uuid.uuid4()}.png"

        generated_reasoning_image = GeneratedReasoningImage(
            reasoning=reasoning, model_used=model_used
        )

        generated_reasoning_image.image.save(filename, ContentFile(image_data), save=True)

        return generated_reasoning_image
