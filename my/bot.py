from my.models import TelegramUser
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import django
import os
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pro.settings')
django.setup()


BOT_TOKEN = '7601166310:AAF8SCoFTJEGYPRq2H_Ge_geQHgyQIN8KGQ'
NGROK_URL = 'https://c4b3-102-213-69-222.ngrok-free.app'

bot = telebot.TeleBot(BOT_TOKEN)
user_states = {}

# Regex to validate Ethiopian phone numbers
def is_valid_ethiopian_phone(phone):
    return re.match(r'^(\+2519\d{8}|09\d{8})$', phone)

def get_main_menu(telegram_id=None):
    keyboard = InlineKeyboardMarkup(row_width=2)
    buttons = [
        InlineKeyboardButton(
            "🎮 Play",
            web_app=WebAppInfo(url=f"{NGROK_URL}/dashboard/{telegram_id}/" if telegram_id else f"{NGROK_URL}/dashboard/")
        ),
        InlineKeyboardButton("👤 My Info", callback_data="my_info"),
        InlineKeyboardButton("💰 Balance", callback_data="balance"),
        InlineKeyboardButton("🕹️ Option 4", callback_data="btn4"),
        InlineKeyboardButton("🎲 Option 5", callback_data="btn5"),
        InlineKeyboardButton("🔧 Option 6", callback_data="btn6"),
        InlineKeyboardButton("📊 Option 7", callback_data="btn7"),
        InlineKeyboardButton("📝 Option 8", callback_data="btn8"),
        InlineKeyboardButton("🎁 Option 9", callback_data="btn9"),
        InlineKeyboardButton("⚙️ Option 10", callback_data="btn10"),
    ]
    keyboard.add(*buttons)
    return keyboard

@bot.message_handler(commands=['start'])
def start(message):
    telegram_id = message.from_user.id
    try:
        user = TelegramUser.objects.get(telegram_id=telegram_id)
        menu = get_main_menu(telegram_id=telegram_id)
        bot.send_message(message.chat.id, "✅ You are already registered.", reply_markup=menu)
    except TelegramUser.DoesNotExist:
        user_states[telegram_id] = {'step': 'name'}
        bot.send_message(message.chat.id, "👋 Welcome! Please enter your name:")

@bot.message_handler(func=lambda message: message.from_user.id in user_states)
def register_flow(message):
    telegram_id = message.from_user.id
    state = user_states.get(telegram_id, {})

    if state.get('step') == 'name':
        state['name'] = message.text.strip()
        state['step'] = 'phone'
        bot.send_message(message.chat.id, "📞 Please enter your phone number (e.g. 0912345678 or +251912345678):")
    elif state.get('step') == 'phone':
        phone = message.text.strip()
        if not is_valid_ethiopian_phone(phone):
            bot.send_message(message.chat.id, "❌ Invalid phone number format. Please try again:")
            return

        TelegramUser.objects.create(
            telegram_id=telegram_id,
            username=message.from_user.username or "",
            name=state['name'],
            phone_number=phone,
            balance=0.00  # default balance
        )
        del user_states[telegram_id]

        menu = get_main_menu(telegram_id=telegram_id)
        bot.send_message(message.chat.id, "✅ Registration successful!", reply_markup=menu)

@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    telegram_id = call.from_user.id
    try:
        user = TelegramUser.objects.get(telegram_id=telegram_id)
    except TelegramUser.DoesNotExist:
        bot.answer_callback_query(call.id, "❌ Please register first.")
        return

    if call.data == "my_info":
        info = (
            f"👤 Name: {user.name}\n"
            f"📞 Phone: {user.phone_number}\n"
            f"🆔 Telegram ID: {user.telegram_id}"
        )
        bot.send_message(call.message.chat.id, info)

    elif call.data == "balance":
        balance_str = f"{user.balance:.2f}"
        bot.send_message(call.message.chat.id, f"💰 Your balance: {balance_str} Birr")

    else:
        bot.send_message(call.message.chat.id, f"ℹ️ You clicked: {call.data}")

print("Bot is running...")
bot.infinity_polling()
