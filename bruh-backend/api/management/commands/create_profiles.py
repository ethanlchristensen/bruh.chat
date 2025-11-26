from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from api.features.users.models import Profile


class Command(BaseCommand):
    help = "Create profiles for users that don't have one"

    def handle(self, *args, **kwargs):
        users_without_profiles = User.objects.filter(profile__isnull=True)
        uesrs_with_profiles = User.objects.filter(profile__isnull=False).count()

        if len(users_without_profiles) == 0:
            self.stdout.write(self.style.SUCCESS("All users currently have a profile!"))
            return

        self.stdout.write(
            self.style.WARNING(
                f"There are {uesrs_with_profiles}/{User.objects.count()} users with profiles"
            )
        )

        count = 0

        for user in users_without_profiles:
            Profile.objects.create(user=user)
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully created {count} profiles"))
