import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.append(str(backend_dir))

# Import the FastAPI application
import server

# Create test client
client = TestClient(server.app)

# Helper class to mock gspread worksheets in-memory
class MockWorksheet:
    def __init__(self, title, data):
        self.title = title
        self.data = [list(map(str, row)) for row in data]
        self.appended_rows = []
        self.updated_cells = []

    def get_all_values(self):
        return [list(row) for row in self.data]

    def append_row(self, row):
        row_str = list(map(str, row))
        self.appended_rows.append(row_str)
        self.data.append(row_str)

    def update_cell(self, row, col, val):
        val_str = str(val)
        self.updated_cells.append((row, col, val_str))
        
        # Ensure row list exists
        while len(self.data) < row:
            self.data.append([])
            
        r = self.data[row - 1]
        # Ensure column index exists in row
        while len(r) < col:
            r.append("")
        r[col - 1] = val_str


# Mock data representing initial sheet rows
MOCK_DATABASE = {
    "parts": [
        ["Part Type", "Vendor", "CBF Part No", "Vendor Part No", "Finish", "Part Description"],
        ["Locking Pivot", "Hettich", "CBF-001", "VEND-101", "Chrome", "Heavy duty pivot hinge"],
        ["Bifold Roller", "Hafele", "CBF-002", "VEND-102", "Satin", "Quiet nylon roller"]
    ],
    "employees": [
        ["Employee Name", "Credential"],
        ["Darshil", "3312"],  # Legacy plaintext PIN
        ["Alice", server.hash_pin("1234")]  # HMAC-hashed PIN
    ],
    "projects": [
        ["Project Number", "Project Name", "Action"],
        ["PRJ-101", "Chicago Tower Bifold installation", "open"],
        ["PRJ-102", "O'Hare Terminals Prep", "open"],
        ["PRJ-103", "Downtown Bifold Maintenance", "close"]
    ],
    "requisition": [
        ["Date and Time", "Employee Name", "Project", "Part Number", "Ven. Part No.", "Finish", "Required Quantity"]
    ],
    "receiving": [
        ["Date and Time", "Employee Name", "Project", "Part Number", "Ven. Part No.", "Finish", "Quantity"]
    ],
    "mto": [
        ["Date and Time", "Employee Name", "Project", "CBF Part Number", "Ven. Part No.", "Finish", "Required Quantity", "Pulled Quantity", "Remaining Quantity"]
    ],
    "inventory": [
        ["Date and Time", "Employee Name", "Recording Type", "Project", "Part Number", "Rack", "Level", "Bin", "Quantity"]
    ]
}


@pytest.fixture(autouse=True)
def setup_mock_sheets():
    """Fixture to mock gspread sheets access globally for each test run."""
    # Reset in-memory database copies
    worksheets = {
        key: MockWorksheet(server.SHEET_NAMES[key], list(val))
        for key, val in MOCK_DATABASE.items()
    }

    # Clear server cache to prevent cross-test leakage
    server._cache.clear()
    server._cache_timestamps.clear()

    # Function to intercept sheet retrieval calls
    def mock_get_worksheet(sheet_key):
        return worksheets[sheet_key]

    with patch('server.get_worksheet', side_effect=mock_get_worksheet) as mock_ws, \
         patch('server.get_workbook') as mock_wb, \
         patch('server.get_sheets_client') as mock_client:
        yield worksheets


# ===== 1. Root and Connectivity Tests =====

def test_api_root():
    response = client.get("/api/")
    assert response.status_code == 200
    json_data = response.json()
    assert "Chicago Bifold Inventory API" in json_data["message"]
    assert json_data["version"] == "2.0"


# ===== 2. Authentication & Employee Tests =====

def test_get_employees(setup_mock_sheets):
    response = client.get("/api/employees")
    assert response.status_code == 200
    users = response.json()
    assert len(users) == 2
    assert users[0]["name"] == "Darshil"
    assert users[1]["name"] == "Alice"


def test_login_legacy_plaintext_success(setup_mock_sheets):
    # Tests verification of legacy plaintext PIN ("3312" for Darshil)
    payload = {"name": "Darshil", "pin": "3312"}
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True, "name": "Darshil"}


def test_login_hmac_success(setup_mock_sheets):
    # Tests verification of HMAC hashed PIN ("1234" for Alice)
    payload = {"name": "Alice", "pin": "1234"}
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json() == {"success": True, "name": "Alice"}


def test_login_wrong_pin(setup_mock_sheets):
    payload = {"name": "Alice", "pin": "wrong"}
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid PIN"


def test_login_employee_not_found(setup_mock_sheets):
    payload = {"name": "Unknown", "pin": "9999"}
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "Employee not found"


def test_register_employee_success(setup_mock_sheets):
    ws_employees = setup_mock_sheets["employees"]
    payload = {"name": "Bob", "pin": "5678"}
    response = client.post("/api/auth/register", json=payload)
    
    assert response.status_code == 200
    assert response.json() == {"success": True, "name": "Bob"}
    
    # Assert row was appended to mock DB
    assert len(ws_employees.appended_rows) == 1
    appended = ws_employees.appended_rows[0]
    assert appended[0] == "Bob"
    # PIN should be HMAC hashed
    assert appended[1] == server.hash_pin("5678")


def test_register_employee_exists(setup_mock_sheets):
    payload = {"name": "Alice", "pin": "9999"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Employee already exists"


def test_change_pin_success(setup_mock_sheets):
    ws_employees = setup_mock_sheets["employees"]
    payload = {
        "name": "Alice",
        "current_pin": "1234",
        "new_pin": "9999"
    }
    response = client.put("/api/auth/change-pin", json=payload)
    assert response.status_code == 200
    assert response.json()["message"] == "PIN updated successfully"
    
    # Alice was row index 3 in mock data (excluding header it is index 2, so row 3 in 1-based indexing)
    # Check updated cells: (row, col, value)
    assert (3, 2, server.hash_pin("9999")) in ws_employees.updated_cells


def test_change_pin_incorrect_current(setup_mock_sheets):
    payload = {
        "name": "Alice",
        "current_pin": "wrong",
        "new_pin": "9999"
    }
    response = client.put("/api/auth/change-pin", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Current PIN is incorrect"


# ===== 3. Project & Master Parts List Tests =====

def test_get_projects_filtering(setup_mock_sheets):
    response = client.get("/api/projects")
    assert response.status_code == 200
    projects = response.json()
    
    # Assert only open projects (PRJ-101, PRJ-102) are returned, PRJ-103 (close) is filtered out
    assert len(projects) == 2
    assert projects[0]["project_number"] == "PRJ-101"
    assert projects[1]["project_number"] == "PRJ-102"
    assert all(proj["status"] == "open" for proj in projects)


def test_get_chicago_bifold_parts(setup_mock_sheets):
    response = client.get("/api/chicago-bifold")
    assert response.status_code == 200
    parts = response.json()
    assert len(parts) == 2
    assert parts[0]["cbf_part_no"] == "CBF-001"
    assert parts[1]["cbf_part_no"] == "CBF-002"
    assert parts[0]["part_description"] == "Heavy duty pivot hinge"


def test_get_chicago_bifold_part_detail(setup_mock_sheets):
    response = client.get("/api/chicago-bifold/CBF-002")
    assert response.status_code == 200
    part = response.json()
    assert part["cbf_part_no"] == "CBF-002"
    assert part["vendor_part_no"] == "VEND-102"
    assert part["finish"] == "Satin"


def test_get_chicago_bifold_part_detail_not_found(setup_mock_sheets):
    response = client.get("/api/chicago-bifold/CBF-999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Part not found"


# ===== 4. Requisition, Receiving, MTO & Inventory Logs Tests =====

def test_create_requisition(setup_mock_sheets):
    ws_req = setup_mock_sheets["requisition"]
    payload = {
        "employee_name": "Darshil",
        "project": "PRJ-101",
        "entries": [
            {"cbf_part_number": "CBF-001", "quantity": 10},
            {"cbf_part_number": "CBF-002", "quantity": 5}
        ]
    }
    response = client.post("/api/requisition", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["count"] == 2
    
    # Assert correct columns appended:
    # Date, Employee, Project, Part Number, Vendor Part No, Finish, Required Qty
    assert len(ws_req.appended_rows) == 2
    
    row1 = ws_req.appended_rows[0]
    assert row1[1] == "Darshil"
    assert row1[2] == "PRJ-101"
    assert row1[3] == "CBF-001"
    assert row1[4] == "VEND-101"  # Resolved from parts cache map
    assert row1[5] == "Chrome"
    assert row1[6] == "10"


def test_create_receiving(setup_mock_sheets):
    ws_recv = setup_mock_sheets["receiving"]
    payload = {
        "employee_name": "Alice",
        "project": "PRJ-102",
        "entries": [
            {"cbf_part_number": "CBF-002", "quantity": 25}
        ]
    }
    response = client.post("/api/receiving", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["count"] == 1
    
    assert len(ws_recv.appended_rows) == 1
    row = ws_recv.appended_rows[0]
    assert row[1] == "Alice"
    assert row[2] == "PRJ-102"
    assert row[3] == "CBF-002"
    assert row[4] == "VEND-102"
    assert row[5] == "Satin"
    assert row[6] == "25"


def test_create_mto(setup_mock_sheets):
    ws_mto = setup_mock_sheets["mto"]
    payload = {
        "employee_name": "Darshil",
        "project": "PRJ-101",
        "entries": [
            {"cbf_part_number": "CBF-001", "required_quantity": 30, "pulled_quantity": 10}
        ]
    }
    response = client.post("/api/mto", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    
    # Assert correct columns appended (Remaining Qty is calculated: 30 - 10 = 20)
    assert len(ws_mto.appended_rows) == 1
    row = ws_mto.appended_rows[0]
    assert row[1] == "Darshil"
    assert row[2] == "PRJ-101"
    assert row[3] == "CBF-001"
    assert row[4] == "VEND-101"
    assert row[5] == "Chrome"
    assert row[6] == "30"
    assert row[7] == "10"
    assert row[8] == "20"  # Calculated remaining quantity


def test_create_inventory(setup_mock_sheets):
    ws_inv = setup_mock_sheets["inventory"]
    payload = {
        "employee_name": "Alice",
        "recording_date": "2026-06-01",
        "entries": [
            {"cbf_part_number": "CBF-001", "rack": "A", "level": "2", "bin": "15", "quantity": 100}
        ]
    }
    response = client.post("/api/inventory", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    
    # Assert correct columns appended:
    # date and time | employee name | recording type | project | part number | rack | level | bin | quantity
    assert len(ws_inv.appended_rows) == 1
    row = ws_inv.appended_rows[0]
    assert row[1] == "Alice"
    assert row[2] == "Cycle Count"
    assert row[3] == ""  # Project defaults to empty string
    assert row[4] == "CBF-001"
    assert row[5] == "A"
    assert row[6] == "2"
    assert row[7] == "15"
    assert row[8] == "100"
