from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserAddedModel(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="added_models")
    model_id = models.CharField(max_length=350)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'model_id']
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.username} - {self.model_id}"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True)
    profile_image = models.ImageField(upload_to="profile_images/", blank=True, null=True)
    default_model = models.TextField(blank=True, null=True)
    default_aux_model = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
