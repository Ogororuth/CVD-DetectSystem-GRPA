"""
API Views for authentication and user management
"""
import requests
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
import os
from django.conf import settings
from django.core.files.storage import default_storage
from core.models import Scan
import uuid
from datetime import date, timedelta
from core.report_generator import ScanReportGenerator
from django.views.decorators.csrf import csrf_exempt
from utils.validators import validate_password_strength


from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
    Enable2FASerializer,
    Verify2FASerializer,
    Disable2FASerializer,
    ScanSerializer,
    ScanUploadSerializer,
    ScanListSerializer
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

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user
    POST /api/auth/register/
    """
    # Validate password strength before serializer
    password = request.data.get('password')
    if password:
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            return Response({'password': [error_msg]}, status=status.HTTP_400_BAD_REQUEST)

    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        user.is_active = False
        user.email_verified = False
        user.save(update_fields=['is_active', 'email_verified'])

        # Create verification code record
        from utils.email_utils import generate_6_digit_code, send_verification_code_email
        from core.models import EmailVerificationCode

        code = generate_6_digit_code()
        ev = EmailVerificationCode.objects.create(user=user, code=code)
        # Send email (this uses your SMTP credentials from env)
        send_verification_code_email(user.email, code)

        return Response({
            'message': 'User registered successfully. A verification code has been sent to your email.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    # If validation fails, return errors
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """
    Verify 6-digit email code
    POST /api/auth/verify-email/
    body: { "email": "...", "code": "123456" }
    """
    print(f"Verify email called with data: {request.data}")
    
    email = request.data.get('email')
    code = request.data.get('code')

    if not email or not code:
        return Response(
            {'error': 'Email and code are required.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found.'}, 
            status=status.HTTP_404_NOT_FOUND
        )

    # Find the latest matching code for this user
    from core.models import EmailVerificationCode
    ev = EmailVerificationCode.objects.filter(
        user=user, 
        code=code, 
        used=False
    ).order_by('-created_at').first()

    if not ev:
        return Response(
            {'error': 'Invalid code.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    if not ev.is_valid():
        return Response(
            {'error': 'Code expired.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # Mark as used and verify user
    ev.used = True
    ev.save(update_fields=['used'])

    user.email_verified = True
    user.is_active = True
    user.save(update_fields=['email_verified', 'is_active'])

    return Response(
        {'message': 'Email verified successfully.'}, 
        status=status.HTTP_200_OK
    )

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    """
    Resend verification code to user's email
    POST /api/auth/resend-verification/
    body: { "email": "..." }
    """
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if user.email_verified:
        return Response({'message': 'Email already verified.'}, status=status.HTTP_200_OK)

    from utils.email_utils import generate_6_digit_code, send_verification_code_email
    from core.models import EmailVerificationCode

    code = generate_6_digit_code()
    EmailVerificationCode.objects.create(user=user, code=code)
    send_verification_code_email(user.email, code)

    return Response({'message': 'Verification code resent.'}, status=status.HTTP_200_OK)

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
    
    # COMMENTED OUT - Temporarily disable email verification check
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

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    Send password reset code to user's email
    POST /api/auth/forgot-password/
    body: { "email": "user@example.com" }
    """
    email = request.data.get('email')
    
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        # Don't reveal if email exists (security)
        return Response({
            'message': 'If an account exists with this email, a reset code has been sent.'
        }, status=status.HTTP_200_OK)
    
    # Generate reset code
    from utils.email_utils import generate_6_digit_code, send_password_reset_email
    from core.models import PasswordResetCode
    
    code = generate_6_digit_code()
    
    # Delete any existing unused codes for this user
    PasswordResetCode.objects.filter(user=user, used=False).delete()
    
    # Create new reset code
    PasswordResetCode.objects.create(user=user, code=code)
    
    # Send email
    send_password_reset_email(user.email, code)
    
    return Response({
        'message': 'If an account exists with this email, a reset code has been sent.'
    }, status=status.HTTP_200_OK)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    Reset password using code
    POST /api/auth/reset-password/
    body: { "email": "...", "code": "123456", "new_password": "..." }
    """
    email = request.data.get('email')
    code = request.data.get('code')
    new_password = request.data.get('new_password')
    
    if not all([email, code, new_password]):
        return Response({
            'error': 'Email, code, and new password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate password strength
    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        return Response({'error': 'Invalid code'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Find valid reset code
    from core.models import PasswordResetCode
    reset_code = PasswordResetCode.objects.filter(
        user=user, 
        code=code, 
        used=False
    ).order_by('-created_at').first()
    
    if not reset_code:
        return Response({'error': 'Invalid code'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not reset_code.is_valid():
        return Response({'error': 'Code expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if new password is same as current password
    if user.check_password(new_password):
        return Response({
            'error': 'New password cannot be the same as your current password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Reset password
    user.set_password(new_password)
    user.save()
    
    # Mark code as used
    reset_code.used = True
    reset_code.save()
    
    return Response({
        'message': 'Password reset successfully'
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
    
    # Check if new password is same as current password
    if user.check_password(new_password):
        return Response({
        'error': 'New password cannot be the same as your current password'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Reset password
    user.set_password(new_password)
    user.save()


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
@permission_classes([AllowAny])
def google_auth(request):
    """
    Authenticate user with Google OAuth access token
    POST /api/auth/google/
    body: { "access_token": "google_access_token" }
    """
    print(f"Google auth request received")
    print(f"Request data: {request.data}")
    
    access_token = request.data.get('access_token')
    
    if not access_token:
        print("No access_token provided")
        return Response({'error': 'Google access token is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Verify the access token with Google
        print(f"Verifying token with Google: {access_token[:20]}...")
        google_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            params={'access_token': access_token}
        )

        print(f"Google API response status: {google_response.status_code}")
        
        if google_response.status_code != 200:
            print(f"Google API error: {google_response.text}")
            return Response(
                {'error': 'Invalid Google access token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        user_data = google_response.json()
        print(f"Google user data received: {user_data}")
        
        # Extract user information
        google_id = user_data.get('sub')
        email = user_data.get('email')
        first_name = user_data.get('given_name', '')
        last_name = user_data.get('family_name', '')

        if not email:
            print("No email in Google response")
            return Response(
                {'error': 'Email not provided by Google'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        print(f"Processing user: {email}")

        # User lookup/creation logic
        user = None
        try:
            # First try: Find by Google ID
            user = User.objects.get(google_oauth_id=google_id)
            print(f"Found existing user by Google ID: {user.email}")
        except User.DoesNotExist:
            try:
                # Second try: Find by email
                user = User.objects.get(email=email)
                print(f"Found existing user by email: {user.email}")
                # Link Google account if not already linked
                if not user.google_oauth_id:
                    user.google_oauth_id = google_id
                    user.email_verified = True
                    user.save()
                    print("Linked Google account to existing user")
            except User.DoesNotExist:
                # Third: Create new user
                print("Creating new user from Google data")
                user = User.objects.create_user(
                    email=email,
                    password=None,  # No password for Google users
                    first_name=first_name,
                    last_name=last_name,
                    google_oauth_id=google_id,
                    # Required fields with default values
                    age=25,  # Default age
                    gender='N',  # Prefer not to say
                    country='Unknown',
                    occupation='Not specified',
                    role='personal',
                    is_active=True,
                    email_verified=True,  # Google emails are verified
                )

        # Generate JWT tokens
        access_token_jwt = generate_access_token(user)
        refresh_token_str = generate_refresh_token(user)

        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        print(f"Google auth successful for user: {user.email}")

        return Response({
            'message': 'Google authentication successful',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': access_token_jwt,
                'refresh': refresh_token_str
            }
        }, status=status.HTTP_200_OK)

    except requests.RequestException as e:
        print(f"Request exception: {e}")
        return Response(
            {'error': 'Failed to verify Google token'}, 
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        print(f"General exception: {e}")
        return Response(
            {'error': f'Authentication failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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

# ==================== SCAN MANAGEMENT VIEWS ====================

# In your views.py, update the upload_scan function
# Find this section and replace it:

@csrf_exempt 
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_scan(request):
    """
    Upload medical scan image and run AI analysis
    POST /api/scans/upload/
    """
    serializer = ScanUploadSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    image_file = serializer.validated_data['image']
    notes = serializer.validated_data.get('notes', '')
    
    # Generate unique filename
    ext = os.path.splitext(image_file.name)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join('scans', filename)
    
    # Save the uploaded file
    saved_path = default_storage.save(filepath, image_file)
    full_image_path = os.path.join(settings.MEDIA_ROOT, saved_path)
    
    try:
        from core.ml_models.ecg_predictor import ECGPredictor
        
        predictor = ECGPredictor()
        prediction = predictor.predict(full_image_path)
        
        # IMPORTANT: Save the ENTIRE prediction result, not just selected fields
        # This ensures interpretability, lead_analysis, etc. are all preserved
        prediction_result = prediction  # Save complete result
        
        # Create scan record
        scan = Scan.objects.create(
            user=request.user,
            image_path=saved_path,
            attention_map_path=prediction.get('attention_map_path', ''),
            risk_level=prediction['risk_level'],
            confidence_score=prediction['confidence'],
            prediction_result=prediction_result,  # Complete result with all nested data
            notes=notes,
            processing_time=prediction.get('processing_time', 0),
            retention_until=date.today() + timedelta(days=7*365)
        )
        
        return Response({
            'message': 'Scan analyzed successfully',
            'scan': ScanSerializer(scan).data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        if default_storage.exists(saved_path):
            default_storage.delete(saved_path)
        
        import traceback
        error_details = traceback.format_exc()
        print(f"Analysis error: {str(e)}")
        print(f"Traceback: {error_details}")
        
        return Response({
            'error': f'Analysis failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_scans(request):
    """
    Get all scans for current user (excluding soft-deleted)
    GET /api/scans/
    """
    scans = Scan.objects.filter(
        user=request.user,
        deleted_by_user=False
    ).order_by('-created_at')
    
    serializer = ScanListSerializer(scans, many=True)
    
    return Response({
        'count': scans.count(),
        'scans': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_scan_detail(request, scan_id):
    """
    Get detailed information about a specific scan
    GET /api/scans/<id>/
    """
    try:
        scan = Scan.objects.get(
            id=scan_id,
            user=request.user,
            deleted_by_user=False
        )
    except Scan.DoesNotExist:
        return Response({
            'error': 'Scan not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ScanSerializer(scan)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_scan(request, scan_id):
    """
    Soft delete a scan
    DELETE /api/scans/<id>/delete/
    """
    try:
        scan = Scan.objects.get(
            id=scan_id,
            user=request.user,
            deleted_by_user=False
        )
    except Scan.DoesNotExist:
        return Response({
            'error': 'Scan not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    scan.soft_delete()
    
    return Response({
        'message': 'Scan removed from your history'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_scan_statistics(request):
    """
    Get scan statistics for current user
    GET /api/scans/statistics/
    """
    user_scans = Scan.objects.filter(
        user=request.user,
        deleted_by_user=False
    )
    
    total_scans = user_scans.count()
    
    risk_counts = {
        'low': user_scans.filter(risk_level='low').count(),
        'moderate': user_scans.filter(risk_level='moderate').count(),
        'high': user_scans.filter(risk_level='high').count()
    }
    
    week_ago = timezone.now() - timedelta(days=7)
    recent_scans = user_scans.filter(created_at__gte=week_ago).count()
    
    return Response({
        'total_scans': total_scans,
        'risk_distribution': risk_counts,
        'recent_scans_7days': recent_scans,
        'reports_generated': user_scans.filter(report_generated=True).count()
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_report(request, scan_id):
    """
    Generate PDF report for a scan
    POST /api/scans/<id>/generate-report/
    """
    try:
        scan = Scan.objects.get(
            id=scan_id,
            user=request.user,
            deleted_by_user=False
        )
    except Scan.DoesNotExist:
        return Response({
            'error': 'Scan not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if report already exists
    if scan.report_generated and scan.report_path:
        return Response({
            'message': 'Report already exists',
            'report_path': scan.report_path,
            'scan': ScanSerializer(scan).data
        }, status=status.HTTP_200_OK)
    
    # Generate report
    try:
        generator = ScanReportGenerator(scan)
        report_path = generator.generate_report()
        
        # Update scan record
        scan.report_path = report_path
        scan.report_generated = True
        scan.save(update_fields=['report_path', 'report_generated'])
        
        return Response({
            'message': 'Report generated successfully',
            'report_path': report_path,
            'scan': ScanSerializer(scan).data
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response({
            'error': f'Failed to generate report: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_report(request, scan_id):
    """
    Download PDF report for a scan
    GET /api/scans/<id>/download-report/
    """
    try:
        scan = Scan.objects.get(
            id=scan_id,
            user=request.user,
            deleted_by_user=False
        )
    except Scan.DoesNotExist:
        return Response({
            'error': 'Scan not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not scan.report_generated or not scan.report_path:
        return Response({
            'error': 'Report not generated yet. Generate it first.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Build full file path
    from django.http import FileResponse
    import os
    
    report_full_path = os.path.join(settings.MEDIA_ROOT, scan.report_path)
    
    if not os.path.exists(report_full_path):
        return Response({
            'error': 'Report file not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Return file for download
    response = FileResponse(
        open(report_full_path, 'rb'),
        content_type='application/pdf'
    )
    response['Content-Disposition'] = f'attachment; filename="CVD_Report_{scan_id}.pdf"'
    
    return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    Delete user account permanently
    POST /api/auth/delete-account/
    body: { "password": "user_password" }
    """
    password = request.data.get('password')
    
    if not password:
        return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify password
    if not request.user.check_password(password):
        return Response({'error': 'Incorrect password'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get user email for confirmation message
    user_email = request.user.email
    
    # Delete the user (this will cascade delete related data)
    request.user.delete()
    
    return Response({
        'message': f'Account {user_email} has been permanently deleted'
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([])
def debug_google_token(request):
    """Debug endpoint to test Google token verification"""
    try:
        access_token = request.data.get('access_token')
        
        if not access_token:
            return Response({'error': 'No access token provided'}, status=400)

        print(f"Debug: Testing Google token: {access_token[:20]}...")
        
        # Test the token with Google
        response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            params={'access_token': access_token}
        )
        
        print(f"Debug: Google API response status: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"Debug: Google user data: {user_data}")
            return Response({
                'status': 'valid',
                'user_data': user_data
            })
        else:
            print(f"Debug: Google API error: {response.text}")
            return Response({
                'status': 'invalid', 
                'google_status_code': response.status_code,
                'google_response': response.text
            }, status=400)
            
    except Exception as e:
        print(f"Debug: Exception: {str(e)}")
        return Response({'error': str(e)}, status=500)


# ==================== ADMIN VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_users(request):
    """Get all users (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)
    
    users = User.objects.all().order_by('-created_at')
    serializer = UserSerializer(users, many=True)
    return Response({'users': serializer.data}, status=200)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def admin_update_user(request, user_id):
    """Update user (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)
    
    try:
        user = User.objects.get(id=user_id)
        serializer = UpdateProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'User updated successfully', 'user': serializer.data}, status=200)
        return Response(serializer.errors, status=400)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    """Delete user (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)
    
    try:
        user = User.objects.get(id=user_id)
        if user.id == request.user.id:
            return Response({'error': 'Cannot delete your own account'}, status=400)
        user.delete()
        return Response({'message': 'User deleted successfully'}, status=200)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)