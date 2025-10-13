"""
Test script for scan upload functionality
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def login():
    """Login to get access token"""
    print("="*60)
    print("Logging in...")
    print("="*60)
    
    data = {
        "email": "test@example.com",
        "password": "TestPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login/", json=data)
    
    if response.status_code == 200:
        result = response.json()
        if result.get('requires_2fa'):
            print("⚠️  2FA is enabled for this account")
            token = input("Enter 6-digit 2FA code: ")
            
            verify_response = requests.post(
                f"{BASE_URL}/auth/2fa/login-verify/",
                json={"email": data['email'], "token": token}
            )
            
            if verify_response.status_code == 200:
                access_token = verify_response.json()['tokens']['access']
                print("✅ Login successful with 2FA")
                return access_token
            else:
                print("❌ 2FA verification failed")
                return None
        else:
            access_token = result['tokens']['access']
            print("✅ Login successful")
            return access_token
    else:
        print(f"❌ Login failed: {response.json()}")
        return None


def test_upload_scan(access_token):
    """Test uploading a scan image"""
    print("\n" + "="*60)
    print("Testing Scan Upload")
    print("="*60)
    
    # Create a dummy image file for testing
    # In real use, you'd use an actual medical image
    from PIL import Image
    import io
    
    # Create a simple test image (100x100 red square)
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    files = {
        'image': ('test_scan.jpg', img_bytes, 'image/jpeg')
    }
    
    data = {
        'notes': 'Test scan upload from Python script'
    }
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    response = requests.post(
        f"{BASE_URL}/scans/upload/",
        files=files,
        data=data,
        headers=headers
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 201:
        result = response.json()
        print("✅ Scan uploaded successfully!")
        print(f"\nScan Details:")
        print(f"  ID: {result['scan']['id']}")
        print(f"  Risk Level: {result['scan']['risk_level']}")
        print(f"  Confidence: {result['scan']['confidence_score']}")
        print(f"  Processing Time: {result['scan']['processing_time']}s")
        print(f"  Notes: {result['scan']['notes']}")
        return result['scan']['id']
    else:
        print(f"❌ Upload failed: {response.json()}")
        return None


def test_get_scans(access_token):
    """Test getting all scans"""
    print("\n" + "="*60)
    print("Testing Get All Scans")
    print("="*60)
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    response = requests.get(f"{BASE_URL}/scans/", headers=headers)
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Found {result['count']} scan(s)")
        
        for scan in result['scans']:
            print(f"\n  Scan #{scan['id']}:")
            print(f"    Risk: {scan['risk_level']}")
            print(f"    Confidence: {scan['confidence_score']}")
            print(f"    Date: {scan['created_at']}")
    else:
        print(f"❌ Failed: {response.json()}")


def test_get_scan_detail(access_token, scan_id):
    """Test getting scan details"""
    print("\n" + "="*60)
    print(f"Testing Get Scan Detail (ID: {scan_id})")
    print("="*60)
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    response = requests.get(f"{BASE_URL}/scans/{scan_id}/", headers=headers)
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        scan = response.json()
        print("✅ Scan details retrieved")
        print(f"\n  Full prediction result:")
        print(f"  {json.dumps(scan['prediction_result'], indent=2)}")
    else:
        print(f"❌ Failed: {response.json()}")


def test_get_statistics(access_token):
    """Test getting scan statistics"""
    print("\n" + "="*60)
    print("Testing Get Statistics")
    print("="*60)
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    response = requests.get(f"{BASE_URL}/scans/statistics/", headers=headers)
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        stats = response.json()
        print("✅ Statistics retrieved")
        print(f"\n  Total Scans: {stats['total_scans']}")
        print(f"  Risk Distribution:")
        print(f"    - Low: {stats['risk_distribution']['low']}")
        print(f"    - Moderate: {stats['risk_distribution']['moderate']}")
        print(f"    - High: {stats['risk_distribution']['high']}")
        print(f"  Recent (7 days): {stats['recent_scans_7days']}")
    else:
        print(f"❌ Failed: {response.json()}")


def test_delete_scan(access_token, scan_id):
    """Test soft deleting a scan"""
    print("\n" + "="*60)
    print(f"Testing Delete Scan (ID: {scan_id})")
    print("="*60)
    
    confirm = input(f"\nAre you sure you want to delete scan #{scan_id}? (y/n): ")
    
    if confirm.lower() != 'y':
        print("❌ Deletion cancelled")
        return
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    response = requests.delete(f"{BASE_URL}/scans/{scan_id}/delete/", headers=headers)
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Scan deleted from your history")
    else:
        print(f"❌ Failed: {response.json()}")


if __name__ == "__main__":
    print("="*60)
    print("CVD Detection System - Scan Upload Testing")
    print("="*60)
    
    # Login
    access_token = login()
    
    if access_token:
        # Test 1: Upload scan
        scan_id = test_upload_scan(access_token)
        
        if scan_id:
            # Test 2: Get all scans
            test_get_scans(access_token)
            
            # Test 3: Get scan detail
            test_get_scan_detail(access_token, scan_id)
            
            # Test 4: Get statistics
            test_get_statistics(access_token)
            
            # Test 5: Delete scan (optional)
            # test_delete_scan(access_token, scan_id)
    
    print("\n" + "="*60)
    print("Testing Complete!")
    print("="*60)