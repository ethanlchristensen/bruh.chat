from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0014_reasoning_generatedreasoningimage"),
    ]

    operations = [
        migrations.AddField(
            model_name="reasoning",
            name="message",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="reasoning",
                to="api.message",
                null=True,
            ),
        ),
    ]
