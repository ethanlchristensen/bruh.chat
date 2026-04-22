from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0036_profile_daily_ai_invocations_count_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="max_flows",
            field=models.IntegerField(default=0),
        ),
    ]
