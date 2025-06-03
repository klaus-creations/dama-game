import json
from django.http import JsonResponse, HttpResponseForbidden
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from .models import TelegramUser, GameSession


# Register view for user registration via API
@csrf_exempt
def register(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            telegram_id = data.get("telegram_id")
            name = data.get("name")
            phone_number = data.get("phone_number")
            username = data.get("username", "")

            # Ensure required fields are provided
            if not telegram_id or not name or not phone_number:
                return JsonResponse({"status": "error", "message": "Missing required fields"})

            # Check if user already exists in the database
            if TelegramUser.objects.filter(telegram_id=telegram_id).exists():
                return JsonResponse({"status": "error", "message": "User already registered"})

            # Create a new user in the database
            TelegramUser.objects.create(
                telegram_id=telegram_id,
                name=name,
                phone_number=phone_number,
                username=username,
            )

            return JsonResponse({"status": "success", "message": "Registration successful"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)})

    return JsonResponse({"status": "error", "message": "Invalid method"})


# Dashboard view for showing the user's information and game options
def dashboard(request):
    telegram_id = request.GET.get('telegram_id')
    user_data = None

    if telegram_id:
        try:
            user_data = TelegramUser.objects.get(telegram_id=telegram_id)
        except TelegramUser.DoesNotExist:
            user_data = None

    # Render the existing index.html template and pass the user data to it
    return render(request, 'index.html', {'user': user_data})


# Start game view to handle the creation of a new game session
def start_game(request):
    if request.method == 'POST':
        telegram_id = request.POST.get('telegram_id')
        bet_amount = int(request.POST.get('bet_amount'))

        if not telegram_id or bet_amount <= 0:
            return JsonResponse({'error': 'Invalid data'}, status=400)

        try:
            user = TelegramUser.objects.get(telegram_id=telegram_id)
        except TelegramUser.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        if user.balance < bet_amount:
            return JsonResponse({'error': 'Insufficient balance'}, status=400)

        # Deduct balance and save session
        user.balance -= bet_amount
        user.save()

        GameSession.objects.create(player=user, bet_amount=bet_amount)

        return JsonResponse({'success': True, 'new_balance': user.balance})

    return JsonResponse({'error': 'Invalid request'}, status=400)


# A view to check if the logged-in user has access to their own dashboard
def telegram_dashboard(request, telegram_id):
    # Ensure the user accessing the dashboard is the one related to the telegram_id
    if request.user.is_authenticated and request.user.telegram_id != telegram_id:
        return HttpResponseForbidden("Access denied.")

    # Fetch the user by telegram_id
    try:
        user = TelegramUser.objects.get(telegram_id=telegram_id)
    except TelegramUser.DoesNotExist:
        return HttpResponseForbidden("User not found.")

    # Render the existing index.html template and pass the user data to it
    return render(request, 'index.html', {'user': user})


def game(request):
    telegram_id = request.GET.get('telegram_id')
    user_data = None

    if telegram_id:
       try:
          user_data = TelegramUser.objects.get(telegram_id=telegram_id)
       except TelegramUser.DoesNotExist:
          user_data = None

    return render(request, 'game.html')

def profile(request):
    return render(request, 'profile.html')


def about(request):
    return render(request, 'about.html')
