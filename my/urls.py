
from django.urls import path
from . import views

urlpatterns = [
    path('api/register/', views.register, name='register'),

    path('', views.dashboard, name='dashboard'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('dashboard/<int:telegram_id>/', views.telegram_dashboard, name='telegram_dashboard'),

    path('start-game/', views.start_game, name='start_game'),
    path('game/', views.game, name='game'),

    path('profile/', views.profile, name='profile'),

    path('about/', views.about, name='about'),
]

