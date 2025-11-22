"""
Custom JWT Authentication for Django REST Framework
"""
from rest_framework import authentication
from rest_framework import exceptions
from core.auth import get_user_from_token


class JWTAuthentication(authentication.BaseAuthentication):
    """
    Custom JWT authentication for DRF
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token)
        """
        # Get authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header:
            return None
        
        if not auth_header.startswith('Bearer '):
            return None
        
        # Extract token
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            raise exceptions.AuthenticationFailed('Invalid token header')
        
        # Get user from token
        user = get_user_from_token(token)
        
        if user is None:
            raise exceptions.AuthenticationFailed('Invalid or expired token')
        
        if not user.is_active:
            raise exceptions.AuthenticationFailed('User account is disabled')
        
        return (user, token)