# backend/utils/email_utils.py

import random
from django.core.mail import send_mail
from django.conf import settings


def generate_6_digit_code():
    """Generate a random 6-digit verification code"""
    return str(random.randint(100000, 999999))


def send_verification_code_email(email, code):
    """
    Send verification code email to user
    
    Args:
        email (str): Recipient email address
        code (str): 6-digit verification code
    
    FIX: The verification link to the Next.js frontend is injected here
    to ensure the user can easily get back to the verification form.
    """
    subject = 'Verify Your CVD Detect Account'
    
    # 1. CONSTRUCT THE VERIFICATION LINK
    # This URL points to your Next.js page and includes the email as a query param.
    # This ensures the 404 is resolved as the link now matches your Next.js routing.
    verification_link = f"{settings.FRONTEND_URL}/auth/verify-email?email={email}"
    
    message = f"""
Hello,

Thank you for registering with CVD Detect!

Your verification code is: {code}

Please enter this code on the verification page to activate your account.
Click here to proceed: {verification_link}

This code will expire in 15 minutes.

If you didn't request this code, please ignore this email.

Best regards,
CVD Detect Team
    """
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Verify Your CVD Detect Account</h2>
                <p>Hello,</p>
                <p>Thank you for registering with CVD Detect! Please enter the code below on the verification page.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">Your verification code is:</p>
                    <h1 style="margin: 10px 0; font-size: 36px; letter-spacing: 8px; color: #2563eb;">{code}</h1>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #6b7280; font-size: 14px;">
                        Click the button below to go to the verification page:
                    </p>
                    <a href="{verification_link}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Go to Verification Page
                    </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes.</p>
                <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                    Best regards,<br>
                    CVD Detect Team
                </p>
            </div>
        </body>
    </html>
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending verification email: {e}")
        return False


def send_password_reset_email(email, reset_link):
    # This function remains unchanged as it already accepts a reset_link argument.
    subject = 'Reset Your CVD Detect Password'
    
    message = f"""
Hello,

You requested to reset your password for CVD Detect.

Click the link below to reset your password:
{reset_link}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email.

Best regards,
CVD Detect Team
    """
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Reset Your Password</h2>
                <p>Hello,</p>
                <p>You requested to reset your password for CVD Detect.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #6b7280; font-size: 14px;">If you didn't request this reset, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                    Best regards,<br>
                    CVD Detect Team
                </p>
            </div>
        </body>
    </html>
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False


def send_welcome_email(email, first_name):
    # This function remains unchanged.
    subject = 'Welcome to CVD Detect!'
    
    message = f"""
Hello {first_name},

Welcome to CVD Detect! Your account has been successfully verified.

You can now log in and start using our AI-powered cardiovascular disease detection system.

Best regards,
CVD Detect Team
    """
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Welcome to CVD Detect!</h2>
                <p>Hello {first_name},</p>
                <p>Welcome to CVD Detect! Your account has been successfully verified.</p>
                <p>You can now log in and start using our AI-powered cardiovascular disease detection system.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_URL}/auth/login" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Login Now</a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                    Best regards,<br>
                    CVD Detect Team
                </p>
            </div>
        </body>
    </html>
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending welcome email: {e}")
        return False
