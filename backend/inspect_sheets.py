#!/usr/bin/env python3
"""
Quick script to inspect Google Sheets structure and data
"""
import gspread
from google.oauth2.service_account import Credentials

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = 'service_account.json'
SHEET_ID = '1U4Pmo2b9VW4MCWMCDPlZhCRQNR4LZP6yDzXHCmKMlv8'

def inspect_workbook():
    # Authenticate
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    gc = gspread.authorize(creds)
    
    # Open workbook
    wb = gc.open_by_key(SHEET_ID)
    
    print("="*70)
    print(f"WORKBOOK: {wb.title}")
    print("="*70)
    
    # List all sheets
    sheets = wb.worksheets()
    print(f"\n📑 TOTAL SHEETS: {len(sheets)}")
    print("-"*70)
    
    for i, sheet in enumerate(sheets, 1):
        print(f"\n{i}. SHEET: '{sheet.title}'")
        print(f"   ID: {sheet.id}")
        print(f"   Rows: {sheet.row_count}, Columns: {sheet.col_count}")
        
        # Get data
        try:
            data = sheet.get_all_values()
            
            if not data:
                print(f"   ⚠️  Sheet is empty")
                continue
            
            # Show headers
            if data:
                headers = data[0]
                print(f"\n   📋 HEADERS ({len(headers)} columns):")
                for idx, header in enumerate(headers, 1):
                    print(f"      {idx}. {header}")
                
                # Show data row count
                data_rows = len(data) - 1
                print(f"\n   📊 DATA: {data_rows} rows (excluding header)")
                
                # Show first 3 sample rows
                if data_rows > 0:
                    print(f"\n   🔍 SAMPLE DATA (first 3 rows):")
                    for row_num, row in enumerate(data[1:4], 2):
                        print(f"\n      Row {row_num}:")
                        for idx, (header, value) in enumerate(zip(headers, row), 1):
                            display_value = value[:50] + "..." if len(value) > 50 else value
                            print(f"         {header}: {display_value}")
        
        except Exception as e:
            print(f"   ❌ Error reading sheet: {e}")
        
        print("-"*70)
    
    print("\n✅ Inspection complete!")

if __name__ == "__main__":
    inspect_workbook()
