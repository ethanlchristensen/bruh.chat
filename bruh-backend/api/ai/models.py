from django.db import models
from django.contrib.auth.models import User

class UserAddedModels(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    model_id = models.CharField(max_length=350)
    model_name = models.CharField(max_length=350)