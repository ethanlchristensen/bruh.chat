from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0038_profile_daily_flow_invocations_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='total_ai_invocations_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='profile',
            name='total_flow_invocations_count',
            field=models.IntegerField(default=0),
        ),
    ]
