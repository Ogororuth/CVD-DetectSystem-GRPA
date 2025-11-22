"""
Test script for 2FA functionality
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_enable_2fa():
    """Test enabling 2FA"""
    print("\n" + "="*60)
    print("1. Testing Enable 2FA")
    print("="*60)
    
    # First, login to get access token
    login_data = {
        "email": "test@example.com",
        "password": "TestPass123!"
    }
    
    login_response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)
    
    if login_response.status_code != 200:
        print("❌ Login failed. Creating new user first...")
        # Register new user
        register_data = {
            "email": "test2fa@example.com",
            "password": "TestPass123!",
            "password_confirm": "TestPass123!",
            "first_name": "Test",
            "last_name": "2FA",
            "age": 25,
            "gender": "M",
            "country": "Kenya",
            "occupation": "Developer",
            "role": "student"
        }
        reg_response = requests.post(f"{BASE_URL}/auth/register/", json=register_data)
        if reg_response.status_code == 201:
            access_token = reg_response.json()['tokens']['access']
            print("✅ New user registered")
        else:
            print("❌ Registration failed:", reg_response.json())
            return None
    else:
        access_token = login_response.json()['tokens']['access']
        print("✅ Login successful")
    
    # Enable 2FA
    headers = {"Authorization": f"Bearer {access_token}"}
    enable_response = requests.post(f"{BASE_URL}/auth/2fa/enable/", headers=headers)
    
    print(f"\nStatus: {enable_response.status_code}")
    
    if enable_response.status_code == 200:
        data = enable_response.json()
        print("✅ 2FA Enable Response:")
        print(f"  Message: {data['message']}")
        print(f"  Secret: {data['secret']}")
        print(f"  Backup Codes: {data['backup_codes'][:2]}... (showing first 2)")
        print(f"\n  QR Code: {data['qr_code'][:50]}... (truncated)")
        print("\n📱 Scan the QR code with Google Authenticator or Authy")
        print(f"   Or manually enter secret: {data['secret']}")
        return access_token, data['secret']
    else:
        print("❌ Enable 2FA failed:", enable_response.json())
        return None


def test_verify_2fa(access_token):
    """Test verifying 2FA token"""
    print("\n" + "="*60)
    print("2. Testing Verify 2FA Token")
    print("="*60)
    
    # Ask user for token from authenticator app
    token = input("\nEnter the 6-digit code from your authenticator app: ")
    
    headers = {"Authorization": f"Bearer {access_token}"}
    verify_data = {"token": token}
    
    verify_response = requests.post(
        f"{BASE_URL}/auth/2fa/verify/",
        json=verify_data,
        headers=headers
    )
    
    print(f"\nStatus: {verify_response.status_code}")
    
    if verify_response.status_code == 200:
        print("✅ 2FA enabled successfully!")
        print(f"   {verify_response.json()['message']}")
        return True
    else:
        print("❌ 2FA verification failed:", verify_response.json())
        return False


def test_2fa_login():
    """Test login with 2FA"""
    print("\n" + "="*60)
    print("3. Testing Login with 2FA")
    print("="*60)
    
    # Try to login
    login_data = {
        "email": "test2fa@example.com",
        "password": "TestPass123!"
    }
    
    login_response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)
    
    print(f"\nStatus: {login_response.status_code}")
    
    if login_response.status_code == 200:
        data = login_response.json()
        if data.get('requires_2fa'):
            print("✅ 2FA is required (as expected)")
            print(f"   Message: {data['message']}")
            
            # Ask for 2FA token
            token = input("\nEnter 6-digit 2FA code: ")
            
            verify_data = {
                "email": "test2fa@example.com",
                "token": token
            }
            
            verify_response = requests.post(
                f"{BASE_URL}/auth/2fa/login-verify/",
                json=verify_data
            )
            
            print(f"\n2FA Login Status: {verify_response.status_code}")
            
            if verify_response.status_code == 200:
                print("✅ 2FA login successful!")
                print(f"   User: {verify_response.json()['user']['email']}")
                return True
            else:
                print("❌ 2FA login failed:", verify_response.json())
                return False
        else:
            print("⚠️  2FA not required (might not be enabled)")
    else:
        print("❌ Login failed:", login_response.json())
    
    return False


if __name__ == "__main__":
    print("="*60)
    print("CVD Detection System - 2FA Testing")
    print("="*60)
    
    # Test 1: Enable 2FA
    result = test_enable_2fa()
    
    if result:
        access_token, secret = result
        
        # Test 2: Verify and enable
        if test_verify_2fa(access_token):
            
            # Test 3: Login with 2FA
            test_2fa_login()
    
    print("\n" + "="*60)
    print("Testing Complete!")
    print("="*60)