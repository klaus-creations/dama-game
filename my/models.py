from django.db import models
from django.contrib.auth.models import User

class TelegramUser(models.Model):
    telegram_id = models.BigIntegerField(unique=True)
    username = models.CharField(max_length=150, blank=True)
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True)

    #def __str__(self):
        #return self.name

class GameSession(models.Model):
    player = models.ForeignKey(TelegramUser, on_delete=models.CASCADE)
    bet_amount = models.PositiveIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    game = models.ForeignKey('Game', on_delete=models.CASCADE, null=True)

    def __str__(self):
        return f"{self.player.name} - {self.bet_amount} at {self.timestamp}"

class Game(models.Model):
    game_id = models.BigIntegerField(unique=True)
    player1 = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name='games_as_player1')
    player2 = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name='games_as_player2', null=True)
    board = models.JSONField(default=dict)
    current_turn = models.CharField(max_length=10, default='red')
    status = models.CharField(max_length=20, default='waiting')  # 'waiting', 'active', 'finished'
    winner = models.ForeignKey(TelegramUser, on_delete=models.SET_NULL, null=True, related_name='won_games')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Game {self.game_id}: {self.player1.name} vs {self.player2.name if self.player2 else 'Waiting'}"
