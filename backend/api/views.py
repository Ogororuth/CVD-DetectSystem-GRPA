"""
API Views for authentication and user management
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
    Enable2FASerializer,
    Verify2FASerializer,
    Disable2FASerializer
)
from core.auth import generate_access_token, generate_refresh_token, get_user_from_token
from core.two_factor import (
    generate_totp_secret,
    get_totp_uri,
    generate_qr_code,
    verify_totp_token,
    generate_backup_codes
)

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user
    POST /api/auth/register/
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate tokens
        access_token = generate_access_token(user)
        refresh_token = generate_refresh_token(user)
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': access_token,
                'refresh': refresh_token
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Login user with email and password
    POST /api/auth/login/
    """
    serializer = UserLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email'].lower()
    password = serializer.validated_data['password']
    
    # Authenticate user
    user = authenticate(request, username=email, password=password)
    
    if user is None:
        return Response({
            'error': 'Invalid email or password'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    if not user.is_active:
        return Response({
            'error': 'Account is inactive'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if 2FA is enabled
    if user.two_fa_enabled:
        return Response({
            'message': '2FA required',
            'requires_2fa': True,
            'email': user.email
        }, status=status.HTTP_200_OK)
    
    # Generate tokens
    access_token = generate_access_token(user)
    refresh_token = generate_refresh_token(user)
    
    # Update last login
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    
    return Response({
        'message': 'Login successful',
        'user': UserSerializer(user).data,
        'tokens': {
            'access': access_token,
            'refresh': refresh_token
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Refresh access token using refresh token
    POST /api/auth/refresh/
    """
    refresh_token = request.data.get('refresh_token')
    
    if not refresh_token:
        return Response({
            'error': 'Refresh token is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = get_user_from_token(refresh_token)
    
    if user is None:
        return Response({
            'error': 'Invalid or expired refresh token'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Generate new access token
    new_access_token = generate_access_token(user)
    
    return Response({
        'access': new_access_token
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Get current authenticated user
    GET /api/auth/me/
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update user profile
    PUT/PATCH /api/auth/profile/
    """
    serializer = UpdateProfileSerializer(
        request.user,
        data=request.data,
        partial=request.method == 'PATCH'
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(request.user).data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password
    POST /api/auth/change-password/
    """
    serializer = ChangePasswordSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    
    # Check old password
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({
            'old_password': 'Wrong password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Set new password
    user.set_password(serializer.validated_data['new_password'])
    user.save()
    
    return Response({
        'message': 'Password changed successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    Logout user (client should delete tokens)
    POST /api/auth/logout/
    """
    # In JWT, logout is handled on client side by deleting tokens
    # But we can log it server-side for analytics
    return Response({
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_2fa(request):
    """
    Enable 2FA for user - Generate QR code
    POST /api/auth/2fa/enable/
    """
    user = request.user
    
    if user.two_fa_enabled:
        return Response({
            'error': '2FA is already enabled'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate new secret
    secret = generate_totp_secret()
    
    # Save secret (temporarily, until verified)
    user.two_fa_secret = secret
    user.save(update_fields=['two_fa_secret'])
    
    # Generate QR code
    totp_uri = get_totp_uri(user, secret)
    qr_code = generate_qr_code(totp_uri)
    
    # Generate backup codes
    backup_codes = generate_backup_codes()
    
    return Response({
        'message': '2FA setup initiated. Scan QR code with authenticator app.',
        'qr_code': qr_code,
        'secret': secret,  # Also provide secret for manual entry
        'backup_codes': backup_codes
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_2fa(request):
    """
    Verify 2FA token and complete setup
    POST /api/auth/2fa/verify/
    """
    serializer = Verify2FASerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    token = serializer.validated_data['token']
    
    if not user.two_fa_secret:
        return Response({
            'error': '2FA setup not initiated. Call enable endpoint first.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify token
    if not verify_totp_token(user.two_fa_secret, token):
        return Response({
            'error': 'Invalid token. Please try again.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Enable 2FA
    user.two_fa_enabled = True
    user.save(update_fields=['two_fa_enabled'])
    
    return Response({
        'message': '2FA enabled successfully!'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """
    Disable 2FA for user
    POST /api/auth/2fa/disable/
    """
    serializer = Disable2FASerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    
    if not user.two_fa_enabled:
        return Response({
            'error': '2FA is not enabled'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify password before disabling
    if not user.check_password(serializer.validated_data['password']):
        return Response({
            'error': 'Incorrect password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Disable 2FA
    user.two_fa_enabled = False
    user.two_fa_secret = None
    user.save(update_fields=['two_fa_enabled', 'two_fa_secret'])
    
    return Response({
        'message': '2FA disabled successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_2fa_login(request):
    """
    Verify 2FA token during login
    POST /api/auth/2fa/login-verify/
    """
    email = request.data.get('email')
    token = request.data.get('token')
    
    if not email or not token:
        return Response({
            'error': 'Email and token are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not user.two_fa_enabled:
        return Response({
            'error': '2FA is not enabled for this user'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify token
    if not verify_totp_token(user.two_fa_secret, token):
        return Response({
            'error': 'Invalid token'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate tokens
    access_token = generate_access_token(user)
    refresh_token_str = generate_refresh_token(user)
    
    # Update last login
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    
    return Response({
        'message': '2FA verification successful',
        'user': UserSerializer(user).data,
        'tokens': {
            'access': access_token,
            'refresh': refresh_token_str
        }
    }, status=status.HTTP_200_OK)