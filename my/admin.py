
from django.contrib import admin
from .models import TelegramUser

@admin.register(TelegramUser)
class TelegramUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'telegram_id', 'username', 'name', 'phone_number', 'balance')
    search_fields = ('name', 'phone_number', 'username')
