"""
Quick API test script for authentication endpoints
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_register():
    """Test user registration"""
    print("\n1. Testing Registration...")
    
    data = {
        "email": "test@example.com",
        "password": "TestPass123!",
        "password_confirm": "TestPass123!",
        "first_name": "John",
        "last_name": "Doe",
        "age": 25,
        "gender": "M",
        "country": "Kenya",
        "occupation": "Software Developer",
        "role": "student"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register/", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        print("✅ Registration successful!")
        return response.json()
    else:
        print("❌ Registration failed!")
        return None


def test_login():
    """Test user login"""
    print("\n2. Testing Login...")
    
    data = {
        "email": "test@example.com",
        "password": "TestPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login/", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Login successful!")
        return response.json()
    else:
        print("❌ Login failed!")
        return None


def test_get_current_user(access_token):
    """Test getting current user with JWT token"""
    print("\n3. Testing Get Current User...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(f"{BASE_URL}/auth/me/", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Get current user successful!")
        return True
    else:
        print("❌ Get current user failed!")
        return False


def test_update_profile(access_token):
    """Test profile update"""
    print("\n4. Testing Profile Update...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    data = {
        "first_name": "Jane",
        "primary_use_case": "research"
    }
    
    response = requests.patch(f"{BASE_URL}/auth/profile/", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Profile update successful!")
        return True
    else:
        print("❌ Profile update failed!")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("CVD Detection System - Authentication API Tests")
    print("=" * 60)
    
    # Test 1: Register
    register_response = test_register()
    
    if register_response:
        access_token = register_response['tokens']['access']
        
        # Test 2: Get current user (with token from registration)
        test_get_current_user(access_token)
        
        # Test 3: Update profile
        test_update_profile(access_token)
    
    # Test 4: Login (separate flow)
    login_response = test_login()
    
    if login_response:
        access_token = login_response['tokens']['access']
        test_get_current_user(access_token)
    
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)