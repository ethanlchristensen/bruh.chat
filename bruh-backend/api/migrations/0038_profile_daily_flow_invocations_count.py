from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0037_profile_max_flows"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="daily_flow_invocations_count",
            field=models.IntegerField(default=0),
        ),
    ]
