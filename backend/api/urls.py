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
    
    # 2FA endpoints
    path('auth/2fa/enable/', views.enable_2fa, name='enable_2fa'),
    path('auth/2fa/verify/', views.verify_2fa, name='verify_2fa'),
    path('auth/2fa/disable/', views.disable_2fa, name='disable_2fa'),
    path('auth/2fa/login-verify/', views.verify_2fa_login, name='verify_2fa_login'),
    
    # Scan endpoints
    path('scans/upload/', views.upload_scan, name='upload_scan'),
    path('scans/', views.get_user_scans, name='get_user_scans'),
    path('scans/<int:scan_id>/', views.get_scan_detail, name='get_scan_detail'),
    path('scans/<int:scan_id>/delete/', views.delete_scan, name='delete_scan'),
    path('scans/statistics/', views.get_scan_statistics, name='scan_statistics'),
]