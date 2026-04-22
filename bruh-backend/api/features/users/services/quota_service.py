from django.utils import timezone
from api.features.users.models import Profile

class QuotaExceededException(Exception):
    pass

class QuotaService:
    @staticmethod
    def check_and_increment_quota(user) -> bool:
        if user.is_superuser:
            return True
            
        profile = user.profile
        today = timezone.now().date()
        
        if profile.last_ai_invocation_date != today:
            profile.last_ai_invocation_date = today
            profile.daily_ai_invocations_count = 0
            
        if profile.daily_ai_invocations_count >= profile.daily_ai_limit:
            raise QuotaExceededException("Daily AI invocation limit reached. Please try again tomorrow.")
            
        profile.daily_ai_invocations_count += 1
        profile.save()
        return True
