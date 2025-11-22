"""
Custom middleware for JWT authentication
"""
from django.utils.deprecation import MiddlewareMixin
from core.auth import get_user_from_token


class JWTAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware to authenticate users via JWT token in Authorization header
    """
    
    def process_request(self, request):
        """
        Extract JWT token from Authorization header and authenticate user
        """
        # Public endpoints that don't need JWT authentication
        public_paths = [
            '/api/auth/register/',
            '/api/auth/login/',
            '/api/auth/verify-email/',
            '/api/auth/resend-verification/',
            '/api/auth/forgot-password/',  
            '/api/auth/reset-password/',    
            '/api/auth/google/',
            '/api/auth/2fa/login-verify/',
            '/api/auth/refresh/',
            '/admin/',
        ]
        
        # Skip JWT check for public paths
        if any(request.path.startswith(path) for path in public_paths):
            return None
        
        # Get authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            # Extract token
            token = auth_header.split(' ')[1]
            
            # Get user from token
            user = get_user_from_token(token)
            
            if user:
                # Attach user to request
                request.user = user
        
        return None