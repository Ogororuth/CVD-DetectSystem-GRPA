"""
Serializers for API endpoints
"""
from core.models import Scan
import os
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'age', 'gender',
            'country', 'occupation', 'role'
        ]

    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs
    
    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("This email is already registered. Please sign in or use a different email.")
        return value.lower()
    
    def validate_age(self, value):
        """Validate age is reasonable"""
        if value < 13:
            raise serializers.ValidationError("You must be at least 13 years old to register.")
        if value > 120:
            raise serializers.ValidationError("Please enter a valid age.")
        return value
    
    def create(self, validated_data):
        """Create new user"""
        # Remove password_confirm as it's not a model field
        validated_data.pop('password_confirm')
        
        # Create user using the manager's create_user method
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data (responses)"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'age', 'gender', 'country', 'occupation', 'role',
            'primary_use_case', 'two_fa_enabled', 'email_verified',
            'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'last_login', 'email_verified']
    
    def get_full_name(self, obj):
        """Get user's full name"""
        return obj.get_full_name()


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        """Validate that new passwords match"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password": "Password fields didn't match."
            })
        return attrs


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'age', 'gender',
            'country', 'occupation', 'role', 'primary_use_case'
        ]
    
    def validate_age(self, value):
        """Validate age is reasonable"""
        if value < 13:
            raise serializers.ValidationError("Age must be at least 13.")
        if value > 120:
            raise serializers.ValidationError("Please enter a valid age.")
        return value


class Enable2FASerializer(serializers.Serializer):
    """Serializer for enabling 2FA"""
    pass  # No input needed, just trigger the enable


class Verify2FASerializer(serializers.Serializer):
    """Serializer for verifying 2FA token"""
    token = serializers.CharField(max_length=6, min_length=6)


class Disable2FASerializer(serializers.Serializer):
    """Serializer for disabling 2FA"""
    password = serializers.CharField(required=True, write_only=True)


class ScanSerializer(serializers.ModelSerializer):
    """Serializer for scan data with enhanced lead analysis"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    lead_analysis = serializers.SerializerMethodField()
    enhanced_interpretation = serializers.SerializerMethodField()
    
    class Meta:
        model = Scan
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'image_path', 'attention_map_path', 'report_path',
            'risk_level', 'confidence_score', 'prediction_result',
            'notes', 'processing_time', 'report_generated',
            'deleted_by_user', 'deleted_at', 'created_at', 'updated_at',
            'lead_analysis', 'enhanced_interpretation'
        ]
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at',
            'attention_map_path', 'report_path', 'report_generated',
            'deleted_by_user', 'deleted_at', 'lead_analysis', 'enhanced_interpretation'
        ]
    
    def get_user_name(self, obj):
        """Get user's full name"""
        return obj.user.get_full_name()
    
    def get_lead_analysis(self, obj):
        """Get lead analysis from prediction_result"""
        return obj.prediction_result.get('lead_analysis', {})
    
    def get_enhanced_interpretation(self, obj):
        """Get enhanced interpretation with lead insights"""
        return obj.prediction_result.get('interpretation', {})


class ScanUploadSerializer(serializers.Serializer):
    """Serializer for scan image upload"""
    image = serializers.ImageField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    
    def validate_image(self, value):
        """Validate image file"""
        # Check file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image file too large. Maximum size is 10MB.")
        
        # Check file extension
        valid_extensions = ['.jpg', '.jpeg', '.png', '.dcm', '.dicom']
        ext = os.path.splitext(value.name)[1].lower()
        
        if ext not in valid_extensions:
            raise serializers.ValidationError(
                f"Unsupported file type. Allowed types: {', '.join(valid_extensions)}"
            )
        
        return value


class ScanListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for scan list"""
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Scan
        fields = [
            'id', 'user_name', 'risk_level', 'confidence_score',
            'report_generated', 'created_at'
        ]
    
    def get_user_name(self, obj):
        return obj.user.get_full_name()