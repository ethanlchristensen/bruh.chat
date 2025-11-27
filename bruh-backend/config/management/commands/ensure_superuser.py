from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os


class Command(BaseCommand):
    help = 'Creates a superuser if none exist'

    def handle(self, *args, **options):
        User = get_user_model()
        
        if not User.objects.filter(is_superuser=True).exists():
            username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
            email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
            password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin')
            
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created successfully'))
        else:
            self.stdout.write(self.style.SUCCESS('Superuser already exists'))