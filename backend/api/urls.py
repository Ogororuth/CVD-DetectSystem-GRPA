"""
API URL Configuration
"""
from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/refresh/', views.refresh_token, name='refresh_token'),
    
    # User endpoints
    path('auth/me/', views.get_current_user, name='current_user'),
    path('auth/profile/', views.update_profile, name='update_profile'),
    path('auth/change-password/', views.change_password, name='change_password'),
]