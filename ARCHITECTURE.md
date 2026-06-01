# System Architecture & Design Decisions

This document outlines the architectural patterns, database schemas, and performance/security trade-offs implemented in the **Chicago Bifold Inventory App**.

---

## 1. Sheets-as-a-Database Pattern

The application utilizes **Google Sheets** as its primary persistent database. While unusual for traditional enterprise software, this architectural choice was driven by specific business constraints and operational requirements:

### Why Google Sheets?
1. **Zero Infrastructure Cost**: Running a standard cloud database (like PostgreSQL or MongoDB) incurs monthly costs. Using Google Sheets provides unlimited storage (within sheet row limits) for free.
2. **Immediate Visibility for Office Staff**: Warehouse operations are managed by inventory controllers who are highly fluent in Microsoft Excel and Google Sheets. Storing logs directly in a workbook allows administrative staff to view, filter, sort, and edit inventory data directly without needing a separate admin portal.
3. **No Database Administration**: Backups, replication, and cloud accessibility are handled natively by Google Drive.

### Technical Limitations & Mitigations
*   **API Latency**: Direct writes to Google Sheets can take 1.5s to 3s because of Google API network round-trips. 
    *   *Mitigation*: The mobile application provides immediate optimistic UI loading indicators, while the backend utilizes batch endpoint payloads so multiple log lines are added in a single write operation rather than serial individual calls.
*   **Google Sheets Quota Limits**: The Google Sheets API enforces a limit of 300 read/write operations per minute. Under heavy warehouse usage, this quota could be exhausted.
    *   *Mitigation*: The backend implements a robust caching proxy layer detailed below.

---

## 2. Database Worksheet Schema

The database consists of a single Google Sheets workbook with the ID `1U4Pmo2b9VW4MCWMCDPlZhCRQNR4LZP6yDzXHCmKMlv8`. It contains the following 7 worksheets:

### `Parts` (Master Parts List)
Contains details for all inventory parts.
*   **Columns**: `Part Type` (A), `Vendor` (B), `CBF Part No` (C), `Vendor Part No` (D), `Finish` (E), `Part Description` (F)

### `Employee` (Credentials database)
Stores authorized usernames and encrypted credentials.
*   **Columns**: `Employee Name` (A), `Credential` (B)

### `Project` (List of active client projects)
Tracks projects to log inventory against.
*   **Columns**: `Project Number` (A), `Project Name` (B), `Action` (C) *(where "open" or "close" status is declared)*

### `Requisition Records ` *(Note: trailing space in sheet name)*
Logs parts checked out for projects.
*   **Columns**: `Date and Time`, `Employee Name`, `Project`, `Part Number`, `Ven. Part No.`, `Finish`, `Required Quantity`

### `Receiving Records`
Logs parts received from suppliers.
*   **Columns**: `Date and Time`, `Employee Name`, `Project`, `Part Number`, `Ven. Part No.`, `Finish`, `Quantity`

### `MTO Records` (Make-To-Order tracking)
Tracks parts requirement counts for customized orders.
*   **Columns**: `Date and Time`, `Employee Name`, `Project`, `CBF Part Number`, `Ven. Part No.`, `Finish`, `Required Quantity`, `Pulled Quantity`, `Remaining Quantity`

### `Inventory Records` (Cycle Count Logs)
Stores inventory verification logs from the physical warehouse floor.
*   **Columns**: `Date and Time`, `Employee Name`, `Recording Type`, `Project`, `Part Number`, `Rack`, `Level`, `Bin`, `Quantity`

---

## 3. High-Performance Caching Layer

To overcome sheets API latency and quota limits, a custom in-memory caching mechanism is implemented in `backend/server.py`.

```
                    ┌────────────────────────┐
                    │  FastAPI Server Cache  │
                    │                        │
                    │   _cache (dictionary)  │
                    │   _cache_timestamps    │
                    └───────────┬────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
   TTL-Based Cache (300s)              Parts Lookup Map (600s)
   - Cached open_projects              - Pre-computes 1500+ parts
   - Cached employees_rows             - O(1) index of CBF Part No
   - Avoids Sheet read API calls        - Saves nested API scans
```

### per-key TTL Caching
Endpoints that fetch static or infrequently changing data check a local in-memory dictionary.
*   `open_projects` is cached for **5 minutes (300s)**.
*   `employees_rows` is cached for **5 minutes (300s)**.
*   When a POST request modifies a sheet (such as adding a user or updating PINs), the corresponding cache key is explicitly invalidated.

### O(1) Parts Map Pre-building
When logging a requisition, receiving, or MTO record, the client only uploads the `cbf_part_number`. The backend must resolve the corresponding `vendor_part_no` and `finish` from the master parts list.
*   *Inefficient approach*: Scan the 1,500+ rows of the `Parts` worksheet on every transaction.
*   *Caching approach*: The backend reads the entire `Parts` sheet once, builds an in-memory dictionary mapping `cbf_part_no -> {vendor_part_no, finish}`, and caches it for **10 minutes (600s)**. Resolving part details is reduced from an $O(n)$ sheets-read API call to an $O(1)$ memory lookup.

### gspread Client Reuse
Instead of re-authenticating with Google's OAuth servers on every REST request, the authorized `gspread.client` is cached and reused for **30 minutes (1800s)**, avoiding significant connection handshake overhead.

---

## 4. PIN Hashing & Security Design

To secure access to the app without adding complex OAuth/JWT configuration for warehouse tablets:

*   **HMAC-SHA256 Cryptography**: Employee logins require a name and a 4-digit PIN. The backend hashes input PINs using SHA256 keyed with a server-level `PIN_SECRET` environment variable.
*   **Database Confidentiality**: The spreadsheets' `Employee` sheet stores only the hashed signatures. If a spreadsheet is leaked, the employee PINs remain protected.
*   **Plaintext Backward Compatibility**: During the transition to HMAC-SHA256, legacy employee rows stored plaintext PINs. The login method uses a fallback comparison check:
    ```python
    def verify_pin(input_pin: str, stored: str) -> bool:
        hashed = hash_pin(input_pin)
        if hmac.compare_digest(hashed, stored):
            return True
        # Backward-compatibility fallback
        return stored == input_pin
    ```
    This prevents service disruption for pre-existing warehouse staff while securing new registrations.

---

## 5. Frontend Expo Mobile Setup

The frontend app leverages **React Native** and the **Expo SDK** for a smooth, high-fidelity experience:
*   **Expo Router**: File-system based routing utilizing bottom tabs navigation under `frontend/app/(tabs)`.
*   **AuthContext**: React context that manages authentication state, saves username/PIN securely on the device using Async Storage, and handles automatic login pings on app launch.
*   **Shelf Logging Layouts**: Interface designed with visual forms enabling scanning of `Rack`, `Level`, and `Bin` addresses (typical for warehouse inventory cycle counts).
