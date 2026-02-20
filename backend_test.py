#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Google Sheets Inventory System
Tests all endpoints with various scenarios including edge cases
"""

import requests
import json
import sys
from datetime import datetime
import time

# Get backend URL from frontend env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return "http://localhost:8001"
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_BASE = f"{BASE_URL}/api"

print(f"Testing backend at: {API_BASE}")

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def add_pass(self, test_name):
        self.passed += 1
        print(f"✅ PASS: {test_name}")
        
    def add_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ FAIL: {test_name} - {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")
        return self.failed == 0

results = TestResults()

def test_api_endpoint(method, endpoint, data=None, expected_status=200, test_name=""):
    """Generic API test function"""
    try:
        url = f"{API_BASE}{endpoint}"
        
        if method.upper() == "GET":
            response = requests.get(url, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        if response.status_code != expected_status:
            results.add_fail(test_name, f"Expected status {expected_status}, got {response.status_code}")
            return None
            
        try:
            json_data = response.json()
            results.add_pass(test_name)
            return json_data
        except json.JSONDecodeError:
            results.add_fail(test_name, "Response is not valid JSON")
            return None
            
    except requests.exceptions.RequestException as e:
        results.add_fail(test_name, f"Request failed: {str(e)}")
        return None
    except Exception as e:
        results.add_fail(test_name, f"Unexpected error: {str(e)}")
        return None

# Test 1: Basic connectivity
print("\n🔍 Testing Basic Connectivity...")
test_api_endpoint("GET", "/", test_name="Root endpoint connectivity")

# Test 2: Parts Endpoints
print("\n🔍 Testing Parts Endpoints...")

# Test GET /api/parts
parts_data = test_api_endpoint("GET", "/parts", test_name="GET /api/parts")
if parts_data is not None:
    if isinstance(parts_data, list):
        results.add_pass("Parts endpoint returns array")
        print(f"   Found {len(parts_data)} existing parts")
    else:
        results.add_fail("Parts endpoint format", "Expected array, got different type")

# Test POST /api/parts with valid data
current_time = datetime.now().strftime("%Y-%m-%d")
valid_part = {
    "part_name": "Test Bearing 123",
    "quantity": 50,
    "transaction_type": "Import",
    "date": current_time,
    "supplier": "ABC Suppliers Ltd",
    "price": 25.99,
    "notes": "High quality bearing for industrial use"
}

created_part = test_api_endpoint("POST", "/parts", data=valid_part, test_name="POST /api/parts with valid data")
if created_part:
    # Verify the created part has all expected fields
    expected_fields = ["part_name", "quantity", "transaction_type", "date", "supplier", "price", "notes"]
    missing_fields = [field for field in expected_fields if field not in created_part]
    if not missing_fields:
        results.add_pass("Created part has all required fields")
    else:
        results.add_fail("Created part fields", f"Missing fields: {missing_fields}")

# Test POST /api/parts with minimal data
minimal_part = {
    "part_name": "Minimal Part",
    "quantity": 1,
    "transaction_type": "Export",
    "date": current_time
}

test_api_endpoint("POST", "/parts", data=minimal_part, test_name="POST /api/parts with minimal data")

# Test POST /api/parts with missing required fields
invalid_part = {
    "quantity": 10,
    "transaction_type": "Import"
    # Missing part_name
}

test_api_endpoint("POST", "/parts", data=invalid_part, expected_status=422, test_name="POST /api/parts with missing required field")

# Test GET /api/parts/recent
recent_parts = test_api_endpoint("GET", "/parts/recent?limit=5", test_name="GET /api/parts/recent with limit")
if recent_parts is not None:
    if isinstance(recent_parts, list):
        results.add_pass("Recent parts endpoint returns array")
        if len(recent_parts) <= 5:
            results.add_pass("Recent parts respects limit parameter")
        else:
            results.add_fail("Recent parts limit", f"Expected max 5 items, got {len(recent_parts)}")
    else:
        results.add_fail("Recent parts format", "Expected array")

# Test 3: Accounts Endpoints
print("\n🔍 Testing Accounts Endpoints...")

# Test GET /api/accounts
accounts_data = test_api_endpoint("GET", "/accounts", test_name="GET /api/accounts")
if accounts_data is not None:
    if isinstance(accounts_data, list):
        results.add_pass("Accounts endpoint returns array")
        print(f"   Found {len(accounts_data)} existing accounts")
    else:
        results.add_fail("Accounts endpoint format", "Expected array")

# Test POST /api/accounts with valid data
valid_account = {
    "account_name": "Tech Solutions Inc",
    "contact_person": "John Smith",
    "email": "john.smith@techsolutions.com",
    "phone": "+1-555-0123",
    "notes": "Primary supplier for electronic components"
}

created_account = test_api_endpoint("POST", "/accounts", data=valid_account, test_name="POST /api/accounts with valid data")
if created_account:
    expected_fields = ["account_name", "contact_person", "email", "phone", "notes"]
    missing_fields = [field for field in expected_fields if field not in created_account]
    if not missing_fields:
        results.add_pass("Created account has all required fields")
    else:
        results.add_fail("Created account fields", f"Missing fields: {missing_fields}")

# Test POST /api/accounts with minimal data
minimal_account = {
    "account_name": "Minimal Account"
}

test_api_endpoint("POST", "/accounts", data=minimal_account, test_name="POST /api/accounts with minimal data")

# Test POST /api/accounts with missing required field
invalid_account = {
    "contact_person": "Jane Doe",
    "email": "jane@example.com"
    # Missing account_name
}

test_api_endpoint("POST", "/accounts", data=invalid_account, expected_status=422, test_name="POST /api/accounts with missing required field")

# Test 4: Addresses Endpoints
print("\n🔍 Testing Addresses Endpoints...")

# Test GET /api/addresses
addresses_data = test_api_endpoint("GET", "/addresses", test_name="GET /api/addresses")
if addresses_data is not None:
    if isinstance(addresses_data, list):
        results.add_pass("Addresses endpoint returns array")
        print(f"   Found {len(addresses_data)} existing addresses")
    else:
        results.add_fail("Addresses endpoint format", "Expected array")

# Test POST /api/addresses with valid data
valid_address = {
    "name": "Main Warehouse",
    "street": "123 Industrial Blvd",
    "city": "Manufacturing City",
    "state": "California",
    "country": "USA",
    "postal_code": "90210"
}

created_address = test_api_endpoint("POST", "/addresses", data=valid_address, test_name="POST /api/addresses with valid data")
if created_address:
    expected_fields = ["name", "street", "city", "state", "country", "postal_code"]
    missing_fields = [field for field in expected_fields if field not in created_address]
    if not missing_fields:
        results.add_pass("Created address has all required fields")
    else:
        results.add_fail("Created address fields", f"Missing fields: {missing_fields}")

# Test POST /api/addresses with minimal data
minimal_address = {
    "name": "Minimal Address"
}

test_api_endpoint("POST", "/addresses", data=minimal_address, test_name="POST /api/addresses with minimal data")

# Test POST /api/addresses with missing required field
invalid_address = {
    "street": "456 Test St",
    "city": "Test City"
    # Missing name
}

test_api_endpoint("POST", "/addresses", data=invalid_address, expected_status=422, test_name="POST /api/addresses with missing required field")

# Test 5: Data Persistence Verification
print("\n🔍 Testing Data Persistence...")

# Verify that created data persists by fetching all records again
time.sleep(1)  # Small delay to ensure data is written

# Check if our test part exists
parts_after = test_api_endpoint("GET", "/parts", test_name="Verify parts persistence")
if parts_after:
    test_part_found = any(part.get("part_name") == "Test Bearing 123" for part in parts_after)
    if test_part_found:
        results.add_pass("Created part persists in database")
    else:
        results.add_fail("Parts persistence", "Created part not found in subsequent GET request")

# Check if our test account exists
accounts_after = test_api_endpoint("GET", "/accounts", test_name="Verify accounts persistence")
if accounts_after:
    test_account_found = any(account.get("account_name") == "Tech Solutions Inc" for account in accounts_after)
    if test_account_found:
        results.add_pass("Created account persists in database")
    else:
        results.add_fail("Accounts persistence", "Created account not found in subsequent GET request")

# Check if our test address exists
addresses_after = test_api_endpoint("GET", "/addresses", test_name="Verify addresses persistence")
if addresses_after:
    test_address_found = any(address.get("name") == "Main Warehouse" for address in addresses_after)
    if test_address_found:
        results.add_pass("Created address persists in database")
    else:
        results.add_fail("Addresses persistence", "Created address not found in subsequent GET request")

# Test 6: Edge Cases and Error Handling
print("\n🔍 Testing Edge Cases...")

# Test with invalid JSON
try:
    response = requests.post(f"{API_BASE}/parts", data="invalid json", headers={"Content-Type": "application/json"}, timeout=10)
    if response.status_code == 422:
        results.add_pass("Invalid JSON handled correctly")
    else:
        results.add_fail("Invalid JSON handling", f"Expected 422, got {response.status_code}")
except Exception as e:
    results.add_fail("Invalid JSON test", f"Request failed: {str(e)}")

# Test with invalid data types
invalid_types_part = {
    "part_name": "Test Part",
    "quantity": "not_a_number",  # Should be int
    "transaction_type": "Import",
    "date": current_time
}

test_api_endpoint("POST", "/parts", data=invalid_types_part, expected_status=422, test_name="POST /api/parts with invalid data types")

# Test recent parts with different limits
test_api_endpoint("GET", "/parts/recent?limit=1", test_name="GET /api/parts/recent with limit=1")
test_api_endpoint("GET", "/parts/recent?limit=100", test_name="GET /api/parts/recent with large limit")

# Final Results
print("\n" + "="*60)
print("BACKEND API TESTING COMPLETE")
success = results.summary()

if success:
    print("\n🎉 All tests passed! Backend APIs are working correctly.")
    sys.exit(0)
else:
    print(f"\n⚠️  {results.failed} test(s) failed. Check the details above.")
    sys.exit(1)