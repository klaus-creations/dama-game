# Generated by Django 5.2.1 on 2025-05-13 17:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('my', '0003_telegramuser_balance'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegramuser',
            name='language',
            field=models.CharField(default='en', max_length=10),
        ),
    ]
