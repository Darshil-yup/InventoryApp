from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import gspread
from google.oauth2.service_account import Credentials
import hashlib

# Configure logging at module level so logger is available everywhere
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Google Sheets Configuration - Single Workbook
WORKBOOK_ID = "1U4Pmo2b9VW4MCWMCDPlZhCRQNR4LZP6yDzXHCmKMlv8"  # Chicago Bifold workbook

# Sheet names within the workbook
SHEET_NAMES = {
    "parts": "Parts",  # Master parts list (1513 rows)
    "employees": "Employee",  # User list
    "projects": "Project",  # Project list
    "requisition": "Requisition Records ",  # Note: has trailing space!
    "receiving": "Receiving Records",
    "mto": "MTO Records",
    "inventory": "Inventory Records"
}

# ─────────────────────────────────────────────────────────────
# PERFORMANCE: Per-key TTL cache
# ─────────────────────────────────────────────────────────────
_cache: dict = {}
_cache_timestamps: dict = {}

def get_from_cache(key: str, ttl: int = 300):
    """Return cached value if within TTL, else None."""
    if key in _cache and key in _cache_timestamps:
        if datetime.now() - _cache_timestamps[key] < timedelta(seconds=ttl):
            return _cache[key]
    return None

def set_in_cache(key: str, value):
    """Store value in cache with current timestamp."""
    _cache[key] = value
    _cache_timestamps[key] = datetime.now()

def invalidate_cache(key: str):
    """Remove a key from cache after a write operation."""
    _cache.pop(key, None)
    _cache_timestamps.pop(key, None)

# ─────────────────────────────────────────────────────────────
# PERFORMANCE: Cached gspread client + workbook
# One auth per 30 minutes instead of one per request
# ─────────────────────────────────────────────────────────────
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = ROOT_DIR / 'service_account.json'
_CLIENT_TTL = 1800  # 30 minutes

def get_sheets_client():
    """Return a cached authorized gspread client (refreshes every 30 min)."""
    cached = get_from_cache("_gspread_client", ttl=_CLIENT_TTL)
    if cached is not None:
        return cached
    logger.info("Creating new gspread client (auth)...")
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    client = gspread.authorize(creds)
    set_in_cache("_gspread_client", client)
    return client

def get_workbook():
    """Return a cached workbook handle."""
    cached = get_from_cache("_workbook", ttl=_CLIENT_TTL)
    if cached is not None:
        return cached
    wb = get_sheets_client().open_by_key(WORKBOOK_ID)
    set_in_cache("_workbook", wb)
    return wb

def get_worksheet(sheet_key: str):
    """Get a worksheet — workbook is cached."""
    return get_workbook().worksheet(SHEET_NAMES[sheet_key])

# ─────────────────────────────────────────────────────────────
# PERFORMANCE: Parts lookup map — built once, cached 10 min
# O(1) lookups vs O(n) full-sheet scan per entry
# ─────────────────────────────────────────────────────────────
def get_parts_map() -> dict:
    """
    Return a dict: cbf_part_no -> {vendor_part_no, finish}.
    Cached 10 min; fetches the sheet only once per cache period.
    """
    cached = get_from_cache("_parts_map", ttl=600)
    if cached is not None:
        return cached
    logger.info("Building parts lookup map...")
    try:
        rows = get_worksheet("parts").get_all_values()
        parts_map = {}
        for row in rows[1:]:
            if len(row) > 2 and row[2]:
                parts_map[row[2]] = {
                    "vendor_part_no": row[3] if len(row) > 3 else "",
                    "finish":         row[4] if len(row) > 4 else "",
                }
        set_in_cache("_parts_map", parts_map)
        logger.info(f"Parts map built: {len(parts_map)} entries")
        return parts_map
    except Exception as e:
        logger.error(f"Error building parts map: {e}")
        return {}

def get_part_details(cbf_part_no: str) -> dict:
    """O(1) part lookup using the cached parts map."""
    return get_parts_map().get(cbf_part_no, {"vendor_part_no": "", "finish": ""})

# ─────────────────────────────────────────────────────────────
# PIN security: HMAC-SHA256 with server secret
# Backward-compatible: falls back to plaintext for old records
# ─────────────────────────────────────────────────────────────
import hmac as _hmac

PIN_SECRET = os.getenv("PIN_SECRET", "chicago-bifold-default-secret")

def hash_pin(pin: str) -> str:
    """HMAC-SHA256 hash of PIN using the server secret."""
    return _hmac.new(PIN_SECRET.encode(), pin.encode(), hashlib.sha256).hexdigest()

def verify_pin(input_pin: str, stored: str) -> bool:
    """
    Verify PIN — supports both HMAC-hashed and legacy plaintext stored values.
    """
    hashed = hash_pin(input_pin)
    if _hmac.compare_digest(hashed, stored):
        return True
    # Backward-compat: plaintext match for existing employees
    return stored == input_pin

# Create the main app without a prefix
app = FastAPI()

# Add CORS middleware to allow web browser requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ===== DATA MODELS =====

# User/Employee Models
class UserCreate(BaseModel):
    name: str
    pin: str  # 4-digit PIN

class User(BaseModel):
    name: str
    active: bool = True

class UserLogin(BaseModel):
    name: str
    pin: str

class PINChange(BaseModel):
    name: str
    current_pin: str
    new_pin: str

# Project Model
class ProjectCreate(BaseModel):
    project_number: str
    project_name: str

class Project(BaseModel):
    project_number: str
    project_name: str
    status: Optional[str] = None  # "open" or "close"

# Project Parts Model (for aggregated view of parts used in a project)
class ProjectPart(BaseModel):
    cbf_part_no: str
    vendor_part_no: str
    finish: str
    part_description: str
    mto_required: Optional[int] = 0
    mto_pulled: Optional[int] = 0
    receiving_qty: Optional[int] = 0
    requisition_qty: Optional[int] = 0


# Chicago Bifold Master Parts Model
class ChicagoBifoldPart(BaseModel):
    part_type: str
    vendor: str
    cbf_part_no: str
    vendor_part_no: str
    finish: str
    part_description: str

# Requisition Models
class RequisitionEntry(BaseModel):
    cbf_part_number: str
    quantity: int

class RequisitionCreate(BaseModel):
    employee_name: str
    project: str
    entries: List[RequisitionEntry]  # Batch support

class Requisition(BaseModel):
    date_time: str
    employee_name: str
    project: str
    cbf_part_number: str
    ven_part_no: str
    finish: str
    quantity: int

# Receiving Models
class ReceivingEntry(BaseModel):
    cbf_part_number: str
    quantity: int

class ReceivingCreate(BaseModel):
    employee_name: str
    project: str
    entries: List[ReceivingEntry]

class Receiving(BaseModel):
    date_time: str
    employee_name: str
    project: str
    cbf_part_number: str  # Sheet column: "Part Number"
    ven_part_no: str
    finish: str
    quantity: int

# MTO Models
class MTOEntry(BaseModel):
    cbf_part_number: str
    required_quantity: int
    pulled_quantity: int

class MTOCreate(BaseModel):
    employee_name: str
    project: str
    entries: List[MTOEntry]

class MTO(BaseModel):
    date_time: str
    employee_name: str
    project: str
    cbf_part_number: str  # Sheet column: "CBF Part Number"
    ven_part_no: str
    finish: str
    required_quantity: int
    pulled_quantity: int
    remaining_quantity: int

# Inventory Models
class InventoryEntry(BaseModel):
    cbf_part_number: str
    rack: str
    level: str
    bin: str
    quantity: int

class InventoryCreate(BaseModel):
    employee_name: str
    recording_date: str
    entries: List[InventoryEntry]

class InventoryRecord(BaseModel):
    date_time: str
    employee_name: str
    recording_date: str
    cbf_part_number: str
    vendor_part_no: str
    finish: str
    rack: str
    level: str
    bin: str
    quantity: int


# ===== API ENDPOINTS =====

@api_router.get("/")
async def root():
    return {"message": "Chicago Bifold Inventory API", "version": "2.0"}

@api_router.get("/debug/sheets")
async def debug_sheets():
    """List all worksheet names and row counts in the workbook (for diagnosing sheet name issues)"""
    try:
        wb = get_workbook()
        result = []
        for ws in wb.worksheets():
            try:
                rows = ws.get_all_values()
                result.append({
                    "title": ws.title,
                    "row_count": len(rows),
                    "header": rows[0] if rows else [],
                    "sample_row": rows[1] if len(rows) > 1 else []
                })
            except Exception as e:
                result.append({"title": ws.title, "error": str(e)})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== AUTHENTICATION ENDPOINTS =====
@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Verify employee name and PIN"""
    try:
        # Use cached employee rows for speed
        cached = get_from_cache("employees_rows", ttl=300)
        if cached is not None:
            rows = cached
        else:
            sheet = get_worksheet("employees")
            rows = sheet.get_all_values()
            set_in_cache("employees_rows", rows)

        # Column indices: Name=0, Credential=1
        for row in rows[1:]:  # Skip header
            if len(row) >= 2 and row[0] == credentials.name:
                stored_pin = row[1]
                if verify_pin(credentials.pin, stored_pin):
                    return {"success": True, "name": credentials.name}
                else:
                    raise HTTPException(status_code=401, detail="Invalid PIN")

        raise HTTPException(status_code=404, detail="Employee not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/register")
async def register(user: UserCreate):
    """Register a new employee with HMAC-hashed PIN"""
    try:
        sheet = get_worksheet("employees")
        rows = sheet.get_all_values()
        for row in rows[1:]:
            if len(row) >= 1 and row[0] == user.name:
                raise HTTPException(status_code=400, detail="Employee already exists")

        # Store HMAC-hashed PIN (plaintext visible in sheets is the hash)
        row = [user.name, hash_pin(user.pin)]
        sheet.append_row(row)
        invalidate_cache("employees_rows")

        return {"success": True, "name": user.name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/auth/change-pin")
async def change_pin(pin_change: PINChange):
    """Change employee PIN (verifies old PIN, stores new HMAC-hashed PIN)"""
    try:
        sheet = get_worksheet("employees")
        rows = sheet.get_all_values()

        for idx, row in enumerate(rows[1:], start=2):
            if len(row) >= 2 and row[0] == pin_change.name:
                if not verify_pin(pin_change.current_pin, row[1]):
                    raise HTTPException(status_code=401, detail="Current PIN is incorrect")

                # Store new HMAC-hashed PIN
                sheet.update_cell(idx, 2, hash_pin(pin_change.new_pin))
                invalidate_cache("employees_rows")
                return {"success": True, "message": "PIN updated successfully"}

        raise HTTPException(status_code=404, detail="Employee not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing PIN: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== EMPLOYEE ENDPOINTS =====
@api_router.get("/employees", response_model=List[User])
async def get_employees():
    """Get all employees for dropdown (cached 5 min)"""
    cached = get_from_cache("employees_rows", ttl=300)
    if cached is not None:
        rows = cached
    else:
        try:
            rows = get_worksheet("employees").get_all_values()
            set_in_cache("employees_rows", rows)
        except Exception as e:
            logger.error(f"Error fetching employees: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    employees = []
    for row in rows[1:]:
        if len(row) >= 1 and row[0]:
            employees.append(User(name=row[0], active=True))
    return employees

# ===== PROJECT ENDPOINTS =====
@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    """Get all open projects for dropdown"""
    # Check cache first
    cached_data = get_from_cache("open_projects")
    if cached_data is not None:
        logger.info("Returning cached projects")
        return cached_data
    
    try:
        sheet = get_worksheet("projects")
        rows = sheet.get_all_values()
        
        projects = []
        for row in rows[1:]:  # Skip header
            if len(row) >= 2 and row[0]:
                # Read status from column 3 (index 2) - "Action" column
                status = row[2].strip().lower() if len(row) >= 3 else 'open'
                
                # Only include projects with status "open"
                if status == 'open':
                    projects.append(Project(
                        project_number=row[0],
                        project_name=row[1],
                        status=status
                    ))
        
        # Store in cache
        set_in_cache("open_projects", projects)
        logger.info(f"Cached {len(projects)} open projects")
        return projects
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/projects/{project_number}/parts", response_model=List[ProjectPart])
async def get_project_parts(project_number: str):
    """Get all parts used in a project from transaction history"""
    try:
        # Dictionary to aggregate parts: cbf_part_no -> part data
        parts_map = {}
        
        # Fetch from MTO Records
        try:
            mto_sheet = get_worksheet("mto")
            mto_rows = mto_sheet.get_all_values()
            # Columns: Date, Employee, Project, CBF Part Number, Ven. Part No., Finish, Required Qty, Pulled Qty, Remaining
            for row in mto_rows[1:]:  # Skip header
                if len(row) >= 9 and row[2] == project_number:  # Match project
                    cbf_part = row[3]
                    if cbf_part not in parts_map:
                        parts_map[cbf_part] = {
                            "cbf_part_no": cbf_part,
                            "vendor_part_no": row[4] if len(row) > 4 else "",
                            "finish": row[5] if len(row) > 5 else "",
                            "part_description": "",
                            "mto_required": 0,
                            "mto_pulled": 0,
                            "receiving_qty": 0,
                            "requisition_qty": 0,
                        }
                    # Aggregate MTO quantities (sum all entries)
                    parts_map[cbf_part]["mto_required"] += int(row[6]) if row[6] else 0
                    parts_map[cbf_part]["mto_pulled"] += int(row[7]) if row[7] else 0
        except Exception as e:
            logger.warning(f"Error fetching MTO records: {e}")
        
        # Fetch from Receiving Records
        try:
            recv_sheet = get_worksheet("receiving")
            recv_rows = recv_sheet.get_all_values()
            # Columns: Date, Employee, Project, Part Number, Ven. Part No., Finish, Quantity
            for row in recv_rows[1:]:  # Skip header
                if len(row) >= 7 and row[2] == project_number:
                    cbf_part = row[3]
                    if cbf_part not in parts_map:
                        parts_map[cbf_part] = {
                            "cbf_part_no": cbf_part,
                            "vendor_part_no": row[4] if len(row) > 4 else "",
                            "finish": row[5] if len(row) > 5 else "",
                            "part_description": "",
                            "mto_required": 0,
                            "mto_pulled": 0,
                            "receiving_qty": 0,
                            "requisition_qty": 0,
                        }
                    parts_map[cbf_part]["receiving_qty"] += int(row[6]) if row[6] else 0
        except Exception as e:
            logger.warning(f"Error fetching Receiving records: {e}")
        
        # Fetch from Requisition Records
        try:
            req_sheet = get_worksheet("requisition")
            req_rows = req_sheet.get_all_values()
            # Columns: Date, Employee, Project, Part Number, Ven. Part No., Finish, Required Quantity
            for row in req_rows[1:]:  # Skip header
                if len(row) >= 7 and row[2] == project_number:
                    cbf_part = row[3]
                    if cbf_part not in parts_map:
                        parts_map[cbf_part] = {
                            "cbf_part_no": cbf_part,
                            "vendor_part_no": row[4] if len(row) > 4 else "",
                            "finish": row[5] if len(row) > 5 else "",
                            "part_description": "",
                            "mto_required": 0,
                            "mto_pulled": 0,
                            "receiving_qty": 0,
                            "requisition_qty": 0,
                        }
                    parts_map[cbf_part]["requisition_qty"] += int(row[6]) if row[6] else 0
        except Exception as e:
            logger.warning(f"Error fetching Requisition records: {e}")
        
        # Enrich with part descriptions from master parts list
        try:
            parts_sheet = get_worksheet("parts")
            parts_rows = parts_sheet.get_all_values()
            # Create lookup map: cbf_part_no -> description
            parts_desc_map = {}
            for row in parts_rows[1:]:
                if len(row) >= 6 and row[2]:
                    parts_desc_map[row[2]] = row[5]  # part_description
            
            # Enrich parts_map with descriptions
            for cbf_part in parts_map:
                if cbf_part in parts_desc_map:
                    parts_map[cbf_part]["part_description"] = parts_desc_map[cbf_part]
        except Exception as e:
            logger.warning(f"Error enriching part descriptions: {e}")
        
        # Convert to list of ProjectPart objects
        result = [ProjectPart(**data) for data in parts_map.values()]
        
        return result
    except Exception as e:
        logger.error(f"Error fetching project parts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== CHICAGO BIFOLD (PARTS) ENDPOINTS =====
@api_router.get("/chicago-bifold", response_model=List[ChicagoBifoldPart])
async def get_chicago_bifold_parts():
    """Get all parts from master list"""
    # Check cache first
    cached_data = get_from_cache("chicago_bifold_parts")
    if cached_data is not None:
        logger.info("Returning cached Chicago Bifold parts")
        return cached_data
    
    try:
        sheet = get_worksheet("parts")
        rows = sheet.get_all_values()
        
        parts = []
        for row in rows[1:]:  # Skip header
            if len(row) >= 6 and row[2]:  # Has CBF Part No
                parts.append(ChicagoBifoldPart(
                    part_type=row[0] if len(row) > 0 else "",
                    vendor=row[1] if len(row) > 1 else "",
                    cbf_part_no=row[2],
                    vendor_part_no=row[3] if len(row) > 3 else "",
                    finish=row[4] if len(row) > 4 else "",
                    part_description=row[5] if len(row) > 5 else ""
                ))
        
        # Store in cache
        set_in_cache("chicago_bifold_parts", parts)
        logger.info(f"Cached {len(parts)} Chicago Bifold parts")
        return parts
    except Exception as e:
        logger.error(f"Error fetching Chicago Bifold parts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chicago-bifold/{cbf_part_no}")
async def get_chicago_bifold_part(cbf_part_no: str):
    """Get details for a specific CBF part number"""
    try:
        sheet = get_worksheet("parts")
        rows = sheet.get_all_values()
        
        for row in rows[1:]:
            if len(row) > 2 and row[2] == cbf_part_no:
                return ChicagoBifoldPart(
                    part_type=row[0] if len(row) > 0 else "",
                    vendor=row[1] if len(row) > 1 else "",
                    cbf_part_no=row[2],
                    vendor_part_no=row[3] if len(row) > 3 else "",
                    finish=row[4] if len(row) > 4 else "",
                    part_description=row[5] if len(row) > 5 else ""
                )
        
        raise HTTPException(status_code=404, detail="Part not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching part: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== REQUISITION ENDPOINTS =====
@api_router.post("/requisition")
async def create_requisition(req: RequisitionCreate):
    """Create requisition record(s)"""
    try:
        sheet = get_worksheet("requisition")
        current_time = datetime.now().strftime("%d/%m/%Y")
        
        created_records = []
        for entry in req.entries:
            # Get part details
            details = get_part_details(entry.cbf_part_number)
            
            # EXACT columns: Date and Time, Employee Name, Project, Part Number, Ven. Part No., Finish, Required Quantity
            row = [
                current_time,
                req.employee_name,
                req.project,
                entry.cbf_part_number,  # Column: "Part Number"
                details["vendor_part_no"],  # Column: "Ven. Part No."
                details["finish"],  # Column: "Finish"
                str(entry.quantity)  # Column: "Required Quantity"
            ]
            
            sheet.append_row(row)
            
            created_records.append(Requisition(
                date_time=current_time,
                employee_name=req.employee_name,
                project=req.project,
                cbf_part_number=entry.cbf_part_number,
                ven_part_no=details["vendor_part_no"],
                finish=details["finish"],
                quantity=entry.quantity
            ))
        
        return {"success": True, "count": len(created_records), "records": created_records}
    except Exception as e:
        logger.error(f"Error creating requisition: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== RECEIVING ENDPOINTS =====
@api_router.post("/receiving")
async def create_receiving(rec: ReceivingCreate):
    """Create receiving record(s)"""
    try:
        sheet = get_worksheet("receiving")
        current_time = datetime.now().strftime("%d/%m/%Y")
        
        created_records = []
        for entry in rec.entries:
            # Get part details
            details = get_part_details(entry.cbf_part_number)
            
            # EXACT columns: Date and Time, Employee Name, Project, Part Number, Ven. Part No., Finish, Quantity
            row = [
                current_time,
                rec.employee_name,
                rec.project,
                entry.cbf_part_number,  # Column: "Part Number"
                details["vendor_part_no"],
                details["finish"],
                str(entry.quantity)
            ]
            
            sheet.append_row(row)
            
            created_records.append(Receiving(
                date_time=current_time,
                employee_name=rec.employee_name,
                project=rec.project,
                cbf_part_number=entry.cbf_part_number,
                ven_part_no=details["vendor_part_no"],
                finish=details["finish"],
                quantity=entry.quantity
            ))
        
        return {"success": True, "count": len(created_records), "records": created_records}
    except Exception as e:
        logger.error(f"Error creating receiving: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== MTO ENDPOINTS =====
@api_router.post("/mto")
async def create_mto(mto: MTOCreate):
    """Create MTO record(s)"""
    try:
        sheet = get_worksheet("mto")
        current_time = datetime.now().strftime("%d/%m/%Y")
        
        created_records = []
        for entry in mto.entries:
            # Get part details
            details = get_part_details(entry.cbf_part_number)
            
            # Calculate remaining
            remaining = entry.required_quantity - entry.pulled_quantity
            
            # EXACT columns: Date and Time, Employee Name, Project, CBF Part Number, Ven. Part No., Finish, Required Quantity, Pulled Quantity, Remaining Quantity
            row = [
                current_time,
                mto.employee_name,
                mto.project,
                entry.cbf_part_number,  # Column: "CBF Part Number"
                details["vendor_part_no"],
                details["finish"],
                str(entry.required_quantity),
                str(entry.pulled_quantity),
                str(remaining)
            ]
            
            sheet.append_row(row)
            
            created_records.append(MTO(
                date_time=current_time,
                employee_name=mto.employee_name,
                project=mto.project,
                cbf_part_number=entry.cbf_part_number,
                ven_part_no=details["vendor_part_no"],
                finish=details["finish"],
                required_quantity=entry.required_quantity,
                pulled_quantity=entry.pulled_quantity,
                remaining_quantity=remaining
            ))
        
        return {"success": True, "count": len(created_records), "records": created_records}
    except Exception as e:
        logger.error(f"Error creating MTO: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== INVENTORY ENDPOINTS =====
@api_router.post("/inventory")
async def create_inventory(inv: InventoryCreate):
    """Create inventory record(s)"""
    try:
        sheet = get_worksheet("inventory")
        # Use today's date as 'date and time' (col 0) — what the dropdown uses to group records
        current_time = datetime.now().strftime("%d/%m/%Y")
        
        created_records = []
        for entry in inv.entries:
            details = get_part_details(entry.cbf_part_number)
            
            # Match exact sheet column order:
            # date and time | employee name | recording type | project | part number |
            # rack | level | bin | quantity
            recording_type = getattr(inv, 'recording_type', 'Cycle Count')
            project = getattr(inv, 'project', '')
            row = [
                current_time,               # date and time
                inv.employee_name,          # employee name
                recording_type,             # recording type
                project,                    # project
                entry.cbf_part_number,      # part number
                entry.rack,                 # rack
                entry.level,                # level
                entry.bin,                  # bin
                str(entry.quantity)         # quantity
            ]
            
            sheet.append_row(row)
            
            created_records.append(InventoryRecord(
                date_time=current_time,
                employee_name=inv.employee_name,
                recording_date=current_time,
                cbf_part_number=entry.cbf_part_number,
                vendor_part_no=details.get("vendor_part_no", ""),
                finish=details.get("finish", ""),
                rack=entry.rack,
                level=entry.level,
                bin=entry.bin,
                quantity=entry.quantity
            ))
        
        return {"success": True, "count": len(created_records), "records": created_records}
    except Exception as e:
        logger.error(f"Error creating inventory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== INVENTORY QUERY ENDPOINTS =====
@api_router.get("/inventory/dates")
async def get_inventory_dates():
    """Get list of unique entry dates from inventory records"""
    import re
    DATE_RE = re.compile(r'^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$|^\d{4}[/\-]\d{2}[/\-]\d{2}$')
    try:
        sheet = get_worksheet("inventory")
        rows = sheet.get_all_values()
        if len(rows) < 2:  # no data rows
            return []

        # The sheet header is: date and time | employee name | recording type | project |
        #                        part number | rack | level | bin | quantity
        # Dates live in col 0 ('date and time')
        header = [h.strip().lower() for h in rows[0]]
        date_col = next((i for i, h in enumerate(header)
                         if h in ("date and time", "date", "date/time", "datetime")), 0)
        logger.info(f"Using date column index {date_col} ('{rows[0][date_col]}')")

        dates = set()
        for row in rows[1:]:
            if len(row) > date_col and row[date_col]:
                val = row[date_col].strip()
                if DATE_RE.match(val):
                    dates.add(val)

        logger.info(f"Found {len(dates)} unique dates")

        def sort_key(d):
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"):
                try:
                    return datetime.strptime(d, fmt)
                except ValueError:
                    pass
            return datetime.min

        return sorted(list(dates), key=sort_key, reverse=True)
    except Exception as e:
        logger.error(f"Error fetching inventory dates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/inventory/by-date")
async def get_inventory_by_date(date: str):
    """Get all inventory records for a specific date (pass date as ?date=DD/MM/YYYY)"""
    try:
        sheet = get_worksheet("inventory")
        rows = sheet.get_all_values()
        if len(rows) < 2:
            return []

        # Resolve columns from header dynamically
        header = [h.strip().lower() for h in rows[0]]
        def col(names, fallback):
            for name in names:
                if name in header:
                    return header.index(name)
            return fallback

        c_date  = col(["date and time", "date", "date/time"], 0)
        c_rec   = col(["recording type", "recording_type", "type"], 2)
        c_proj  = col(["project"], 3)
        c_part  = col(["part number", "cbf part number", "cbf_part_number"], 4)
        c_rack  = col(["rack"], 5)
        c_level = col(["level"], 6)
        c_bin   = col(["bin"], 7)
        c_qty   = col(["quantity"], 8)

        inventory_items = []
        for row in rows[1:]:
            if len(row) > c_date and row[c_date].strip() == date.strip():
                def safe(idx, default=""):
                    return row[idx].strip() if len(row) > idx else default
                inventory_items.append({
                    "cbf_part_no":    safe(c_part),
                    "vendor_part_no": "",  # not in existing sheet
                    "finish":         "",  # not in existing sheet
                    "recording_type": safe(c_rec),
                    "project":        safe(c_proj),
                    "rack":           safe(c_rack),
                    "level":          safe(c_level),
                    "bin":            safe(c_bin),
                    "quantity":       int(safe(c_qty, "0") or 0),
                })

        return inventory_items
    except Exception as e:
        logger.error(f"Error fetching inventory by date: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ─────────────────────────────────────────────────────────────
# STARTUP: Pre-warm caches in background so first request is instant
# ─────────────────────────────────────────────────────────────
import asyncio
import concurrent.futures

def _prewarm_parts():
    try:
        get_parts_map()
        logger.info("✓ Parts map pre-warmed")
    except Exception as e:
        logger.warning(f"Parts pre-warm failed (non-fatal): {e}")

def _prewarm_projects():
    try:
        rows = get_worksheet("projects").get_all_values()
        projects_list = []
        for row in rows[1:]:
            if len(row) >= 2 and row[0]:
                status = row[2].strip().lower() if len(row) >= 3 else 'open'
                if status == 'open':
                    projects_list.append(Project(
                        project_number=row[0],
                        project_name=row[1],
                        status=status
                    ))
        set_in_cache("open_projects", projects_list)
        logger.info(f"✓ Projects pre-warmed ({len(projects_list)} open)")
    except Exception as e:
        logger.warning(f"Projects pre-warm failed (non-fatal): {e}")

def _prewarm_employees():
    try:
        rows = get_worksheet("employees").get_all_values()
        set_in_cache("employees_rows", rows)
        logger.info(f"✓ Employees pre-warmed ({len(rows)-1} records)")
    except Exception as e:
        logger.warning(f"Employees pre-warm failed (non-fatal): {e}")

@app.on_event("startup")
async def startup_prewarm():
    """
    Pre-warm all caches in parallel background threads at server start.
    This means the FIRST user request is also fast (no cold-start penalty).
    """
    logger.info("Pre-warming caches in background...")
    loop = asyncio.get_event_loop()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=3)
    # Fire all three concurrently, don't await — server starts immediately
    loop.run_in_executor(executor, _prewarm_parts)
    loop.run_in_executor(executor, _prewarm_projects)
    loop.run_in_executor(executor, _prewarm_employees)

# Include the router in the main app
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
