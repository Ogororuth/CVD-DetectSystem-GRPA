"""
Authentication utilities for JWT token generation and validation
"""
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    """
    Custom JWT Authentication for Django REST Framework
    """
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None
        
        try:
            # Expected format: "Bearer <token>"
            parts = auth_header.split()
            
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                raise AuthenticationFailed('Invalid authorization header format')
            
            token = parts[1]
            
            # Validate token and get user
            user = get_user_from_token(token)
            
            if user is None:
                raise AuthenticationFailed('Invalid or expired token')
            
            if not user.is_active:
                raise AuthenticationFailed('User account is disabled')
            
            return (user, token)
            
        except Exception as e:
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')

def generate_access_token(user):
    """Generate JWT access token"""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(seconds=settings.JWT_ACCESS_TOKEN_LIFETIME),
        'iat': datetime.utcnow(),
        'type': 'access'
    }
    
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token


def generate_refresh_token(user):
    """Generate JWT refresh token"""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'exp': datetime.utcnow() + timedelta(seconds=settings.JWT_REFRESH_TOKEN_LIFETIME),
        'iat': datetime.utcnow(),
        'type': 'refresh'
    }
    
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token


def decode_token(token):
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_user_from_token(token):
    """Get user from JWT token"""
    payload = decode_token(token)
    if not payload:
        return None
    
    try:
        user = User.objects.get(id=payload['user_id'])
        return user
    except User.DoesNotExist:
        return None