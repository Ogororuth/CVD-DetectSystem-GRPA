"""
Core models for CVD Detection System
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom user manager"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user"""
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model"""
    
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('N', 'Prefer not to say'),
    ]
    
    ROLE_CHOICES = [
        ('researcher', 'Researcher'),
        ('student', 'Student'),
        ('healthcare', 'Healthcare Professional'),
        ('personal', 'Personal Use'),
        ('technical', 'Technical Evaluation'),
        ('other', 'Other'),
    ]
    
    # Basic fields
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    
    # Registration fields
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    country = models.CharField(max_length=100)
    occupation = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    primary_use_case = models.CharField(max_length=50, blank=True, null=True)
    
    # OAuth fields
    google_oauth_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    apple_oauth_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    
    # 2FA fields
    two_fa_enabled = models.BooleanField(default=False)
    two_fa_secret = models.CharField(max_length=32, blank=True, null=True)
    
    # Email verification fields
    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=100, blank=True, null=True)
    verification_token_expires = models.DateTimeField(blank=True, null=True)
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(blank=True, null=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'age', 'gender', 'country', 'occupation', 'role']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def get_short_name(self):
        return self.first_name.split()[0] if self.first_name else self.email


class Scan(models.Model):
    """Medical scan model"""
    
    RISK_LEVELS = [
        ('low', 'Low Risk'),
        ('moderate', 'Moderate Risk'),
        ('high', 'High Risk'),
    ]
    
    # Relationships
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scans')
    
    # File paths
    image_path = models.CharField(max_length=500)
    attention_map_path = models.CharField(max_length=500, blank=True, null=True)
    report_path = models.CharField(max_length=500, blank=True, null=True)
    
    # Prediction results
    risk_level = models.CharField(max_length=20, choices=RISK_LEVELS)
    confidence_score = models.FloatField()
    prediction_result = models.JSONField()  # Stores detailed results
    
    # Metadata
    notes = models.TextField(blank=True, null=True)
    processing_time = models.FloatField(help_text="Processing time in seconds")
    
    # Report generation
    report_generated = models.BooleanField(default=False)
    
    # Soft delete
    deleted_by_user = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    
    # Data retention
    retention_until = models.DateField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'scans'
        verbose_name = 'Scan'
        verbose_name_plural = 'Scans'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['deleted_by_user']),
        ]
    
    def __str__(self):
        return f"Scan #{self.id} - {self.user.first_name} {self.user.last_name} ({self.risk_level})"
    
    def soft_delete(self):
        """Soft delete - hide from user view"""
        self.deleted_by_user = True
        self.deleted_at = timezone.now()
        self.save()
    
    def restore(self):
        """Restore soft-deleted scan"""
        self.deleted_by_user = False
        self.deleted_at = None
        self.save()


class UserPreference(models.Model):
    """User preferences and settings"""
    
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # UI Preferences
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='auto')
    
    # Notifications
    email_notifications_enabled = models.BooleanField(default=True)
    scan_completion_notifications = models.BooleanField(default=True)
    weekly_summary_enabled = models.BooleanField(default=False)
    
    # Display preferences
    dashboard_layout = models.CharField(max_length=20, default='default')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_preferences'
        verbose_name = 'User Preference'
        verbose_name_plural = 'User Preferences'
    
    def __str__(self):
        return f"Preferences for {self.user.email}"