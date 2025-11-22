"""
API URL Configuration
"""
from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/verify-email/', views.verify_email, name='verify_email'),  # MOVE HERE
    path('auth/resend-verification/', views.resend_verification, name='resend_verification'),  # MOVE HERE
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/refresh/', views.refresh_token, name='refresh_token'),
    path('auth/google/', views.google_auth, name='google_auth'),
    
    # User endpoints
    path('auth/me/', views.get_current_user, name='current_user'),
    path('auth/profile/', views.update_profile, name='update_profile'),
    path('auth/change-password/', views.change_password, name='change_password'),
    path('auth/forgot-password/', views.forgot_password, name='forgot_password'),
    path('auth/reset-password/', views.reset_password, name='reset_password'),
    path('auth/delete-account/', views.delete_account, name='delete_account'),
    path('auth/debug-google/', views.debug_google_token, name='debug_google_token'),
    
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
    path('scans/<int:scan_id>/generate-report/', views.generate_report, name='generate_report'),
    path('scans/<int:scan_id>/download-report/', views.download_report, name='download_report'),
    path('scans/statistics/', views.get_scan_statistics, name='scan_statistics'),
    
    # Admin endpoints
    path('admin/users/', views.admin_get_users, name='admin_get_users'),
    path('admin/users/<int:user_id>/', views.admin_update_user, name='admin_update_user'),
    path('admin/users/<int:user_id>/delete/', views.admin_delete_user, name='admin_delete_user'),
]