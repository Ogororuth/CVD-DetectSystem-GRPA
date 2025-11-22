"""
Test script for PDF report generation
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
            print("⚠️  2FA is enabled")
            token = input("Enter 6-digit 2FA code: ")
            
            verify_response = requests.post(
                f"{BASE_URL}/auth/2fa/login-verify/",
                json={"email": data['email'], "token": token}
            )
            
            if verify_response.status_code == 200:
                access_token = verify_response.json()['tokens']['access']
                print("Login successful with 2FA")
                return access_token
            else:
                print("2FA verification failed")
                return None
        else:
            access_token = result['tokens']['access']
            print("Login successful")
            return access_token
    else:
        print(f"Login failed: {response.json()}")
        return None


def get_latest_scan(access_token):
    """Get the latest scan ID"""
    print("\n" + "="*60)
    print("Getting Latest Scan")
    print("="*60)
    
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(f"{BASE_URL}/scans/", headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        if result['count'] > 0:
            scan_id = result['scans'][0]['id']
            print(f"Found scan ID: {scan_id}")
            return scan_id
        else:
            print("No scans found. Upload a scan first.")
            return None
    else:
        print(f"Failed: {response.json()}")
        return None


def generate_report(access_token, scan_id):
    """Generate PDF report for scan"""
    print("\n" + "="*60)
    print(f"Generating Report for Scan #{scan_id}")
    print("="*60)
    
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.post(
        f"{BASE_URL}/scans/{scan_id}/generate-report/",
        headers=headers
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code in [200, 201]:
        result = response.json()
        print(f"{result['message']}")
        print(f"\nReport Details:")
        print(f"  Path: {result['report_path']}")
        print(f"  Report Generated: {result['scan']['report_generated']}")
        return result['report_path']
    else:
        print(f"Failed: {response.json()}")
        return None


def download_report(access_token, scan_id):
    """Download the generated PDF report"""
    print("\n" + "="*60)
    print(f"Downloading Report for Scan #{scan_id}")
    print("="*60)
    
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(
        f"{BASE_URL}/scans/{scan_id}/download-report/",
        headers=headers,
        stream=True
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        # Save to current directory
        filename = f"CVD_Report_Scan_{scan_id}.pdf"
        
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"Report downloaded successfully!")
        print(f"  Saved as: {filename}")
        print(f"\n📄 You can now open the PDF file to view the report.")
        return filename
    else:
        try:
            print(f"Failed: {response.json()}")
        except:
            print(f"Failed with status code: {response.status_code}")
        return None


def test_report_already_exists(access_token, scan_id):
    """Test generating report when it already exists"""
    print("\n" + "="*60)
    print("Testing Report Already Exists")
    print("="*60)
    
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.post(
        f"{BASE_URL}/scans/{scan_id}/generate-report/",
        headers=headers
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"{result['message']}")
        print("  (Report was already generated, returned existing report)")
    else:
        print(f"Unexpected response: {response.json()}")


if __name__ == "__main__":
    print("CVD Detection System - Report Generation Testing")

    
    # Step 1: Login
    access_token = login()
    
    if access_token:
        # Step 2: Get latest scan
        scan_id = get_latest_scan(access_token)
        
        if scan_id:
            # Step 3: Generate report
            report_path = generate_report(access_token, scan_id)
            
            if report_path:
                # Step 4: Download report
                download_report(access_token, scan_id)
                
                # Step 5: Try generating again (should return existing)
                test_report_already_exists(access_token, scan_id)
        else:
            print("\nNo scans available. Run test_scan_upload.py first to create a scan.")
    
    print("Testing Complete!")