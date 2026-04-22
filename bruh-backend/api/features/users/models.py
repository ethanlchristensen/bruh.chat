from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserAddedModel(models.Model):
    PROVDER_CHOICES = [("openrouter", "OpenRouter"), ("ollama", "Ollama")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="added_models")
    model_id = models.CharField(max_length=350)
    provider = models.CharField(max_length=20, choices=PROVDER_CHOICES, default="openrouter")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "model_id", "provider"]
        ordering = ["-added_at"]

    def __str__(self):
        return f"{self.user.username} - {self.provider}/{self.model_id}"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True)
    profile_image = models.ImageField(upload_to="profile_images/", blank=True, null=True)
    default_model = models.TextField(blank=True, null=True)
    default_provider = models.TextField(blank=True, null=True)
    default_aux_model = models.TextField(blank=True, null=True)
    default_aux_model_provider = models.TextField(blank=True, null=True)

    # User Approval
    is_approved = models.BooleanField(default=False)

    # AI Invocation Limits
    daily_ai_limit = models.IntegerField(default=100)
    last_ai_invocation_date = models.DateField(null=True, blank=True)
    daily_ai_invocations_count = models.IntegerField(default=0)  # total (chat + flow)
    daily_flow_invocations_count = models.IntegerField(default=0)  # flow-only subset

    # Flow Limits (0 = unlimited)
    max_flows = models.IntegerField(default=0)

    # ai title generation
    auto_generate_titles = models.BooleanField(
        default=False, help_text="Automatically generate conversation titles using AI"
    )
    title_generation_frequency = models.PositiveIntegerField(
        default=4, help_text="Generate title every N messages (e.g., 4 = every 4th message)"
    )

    def __str__(self):
        return f"{self.user.username}'s profile"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
