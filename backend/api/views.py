"""
API Views for authentication and user management
"""
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

# ==================== SCAN MANAGEMENT VIEWS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_scan(request):
    """
    Upload medical scan image
    POST /api/scans/upload/
    """
    serializer = ScanUploadSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    image = serializer.validated_data['image']
    notes = serializer.validated_data.get('notes', '')
    
    # Generate unique filename
    ext = os.path.splitext(image.name)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join('scans', filename)
    
    # Save image
    saved_path = default_storage.save(filepath, image)
    
    # For now, create dummy prediction results (no ML model yet)
    import random
    risk_levels = ['low', 'moderate', 'high']
    dummy_risk = random.choice(risk_levels)
    dummy_confidence = round(random.uniform(0.6, 0.95), 2)
    
    dummy_prediction = {
        'risk_level': dummy_risk,
        'confidence': dummy_confidence,
        'regions': [
            {'id': 1, 'attention': 0.42, 'description': 'Region of interest 1'},
            {'id': 2, 'attention': 0.28, 'description': 'Region of interest 2'},
            {'id': 3, 'attention': 0.19, 'description': 'Region of interest 3'}
        ],
        'note': 'This is a dummy prediction. ML model not integrated yet.'
    }
    
    # Create scan record
    scan = Scan.objects.create(
        user=request.user,
        image_path=saved_path,
        risk_level=dummy_risk,
        confidence_score=dummy_confidence,
        prediction_result=dummy_prediction,
        notes=notes,
        processing_time=round(random.uniform(1.0, 3.0), 2),
        retention_until=date.today() + timedelta(days=7*365)
    )
    
    return Response({
        'message': 'Scan uploaded successfully',
        'scan': ScanSerializer(scan).data
    }, status=status.HTTP_201_CREATED)


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