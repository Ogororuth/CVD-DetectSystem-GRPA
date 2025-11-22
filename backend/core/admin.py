"""
Admin configuration for core models
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Scan, UserPreference


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model"""
    
    list_display = ('email', 'first_name', 'last_name', 'role', 'age', 'country', 'is_active', 'created_at')
    list_filter = ('role', 'gender', 'is_active', 'email_verified', 'two_fa_enabled')
    search_fields = ('email', 'first_name', 'last_name', 'country', 'occupation')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'password')
        }),
        ('Personal Info', {
        'fields': ('first_name', 'last_name', 'age', 'gender', 'country', 'occupation')
        }),
        ('Role & Usage', {
            'fields': ('role', 'primary_use_case')
        }),
        ('OAuth', {
            'fields': ('google_oauth_id', 'apple_oauth_id'),
            'classes': ('collapse',)
        }),
        ('Security', {
            'fields': ('two_fa_enabled', 'two_fa_secret', 'email_verified')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'age', 'gender', 'country', 'occupation', 'role', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login')


@admin.register(Scan)
class ScanAdmin(admin.ModelAdmin):
    """Admin interface for Scan model"""
    
    list_display = ('id', 'user', 'risk_level', 'confidence_score', 'report_generated', 'deleted_by_user', 'created_at')
    list_filter = ('risk_level', 'report_generated', 'deleted_by_user', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'notes')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Files', {
            'fields': ('image_path', 'attention_map_path', 'report_path')
        }),
        ('Analysis Results', {
            'fields': ('risk_level', 'confidence_score', 'prediction_result', 'processing_time')
        }),
        ('Report', {
            'fields': ('report_generated', 'notes')
        }),
        ('Soft Delete', {
            'fields': ('deleted_by_user', 'deleted_at', 'retention_until')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    actions = ['mark_as_deleted', 'restore_scans']
    
    def mark_as_deleted(self, request, queryset):
        """Admin action to soft delete scans"""
        count = queryset.update(deleted_by_user=True)
        self.message_user(request, f'{count} scan(s) marked as deleted.')
    mark_as_deleted.short_description = "Mark selected scans as deleted"
    
    def restore_scans(self, request, queryset):
        """Admin action to restore soft-deleted scans"""
        count = queryset.update(deleted_by_user=False, deleted_at=None)
        self.message_user(request, f'{count} scan(s) restored.')
    restore_scans.short_description = "Restore selected scans"


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    """Admin interface for UserPreference model"""
    
    list_display = ('user', 'theme', 'email_notifications_enabled', 'scan_completion_notifications')
    list_filter = ('theme', 'email_notifications_enabled')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('UI Preferences', {
            'fields': ('theme', 'dashboard_layout')
        }),
        ('Notifications', {
            'fields': ('email_notifications_enabled', 'scan_completion_notifications', 'weekly_summary_enabled')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')