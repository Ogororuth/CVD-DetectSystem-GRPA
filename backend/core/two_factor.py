"""
Two-Factor Authentication utilities
"""
import pyotp
import qrcode
from io import BytesIO
import base64


def generate_totp_secret():
    """Generate a new TOTP secret for a user"""
    return pyotp.random_base32()


def get_totp_uri(user, secret):
    """
    Generate TOTP URI for QR code
    Format: otpauth://totp/CVD:user@email.com?secret=XXX&issuer=CVD
    """
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email,
        issuer_name='CVD Detection System'
    )


def generate_qr_code(totp_uri):
    """
    Generate QR code image from TOTP URI
    Returns base64 encoded image
    """
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"


def verify_totp_token(secret, token):
    """
    Verify a TOTP token against the secret
    Returns True if valid, False otherwise
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)


def generate_backup_codes(count=8):
    """
    Generate backup codes for 2FA recovery
    Returns list of backup codes
    """
    import secrets
    import string
    
    codes = []
    for _ in range(count):
        # Generate 8-character alphanumeric code
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        # Format as XXXX-XXXX
        formatted_code = f"{code[:4]}-{code[4:]}"
        codes.append(formatted_code)
    
    return codes