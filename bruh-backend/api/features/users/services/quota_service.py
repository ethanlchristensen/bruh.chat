from django.utils import timezone


class QuotaExceededException(Exception):
    pass


class QuotaService:
    @staticmethod
    def check_and_increment_quota(user, source: str = "chat") -> bool:
        """
        Check the shared daily AI quota and increment it.
        source: 'chat' or 'flow' — used to track the per-source breakdown.
        The total (daily_ai_invocations_count) is the shared limit regardless of source.
        """
        if user.is_superuser:
            return True

        profile = user.profile

        # 0 = unlimited
        if profile.daily_ai_limit == 0:
            return True

        today = timezone.now().date()

        if profile.last_ai_invocation_date != today:
            profile.last_ai_invocation_date = today
            profile.daily_ai_invocations_count = 0
            profile.daily_flow_invocations_count = 0

        if profile.daily_ai_invocations_count >= profile.daily_ai_limit:
            raise QuotaExceededException(
                "Daily AI invocation limit reached. Please try again tomorrow."
            )

        profile.daily_ai_invocations_count += 1
        profile.total_ai_invocations_count += 1
        if source == "flow":
            profile.daily_flow_invocations_count += 1
            profile.total_flow_invocations_count += 1

        profile.save()
        return True

    @staticmethod
    def check_flow_quota(user, current_count: int) -> bool:
        if user.is_superuser:
            return True

        profile = user.profile

        # 0 = unlimited
        if profile.max_flows == 0:
            return True

        if current_count >= profile.max_flows:
            raise QuotaExceededException(
                f"Flow limit reached. You can have at most {profile.max_flows} flow{'s' if profile.max_flows != 1 else ''}."
            )

        return True
