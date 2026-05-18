import os
from supabase import create_client

url = 'https://qnndqowtocscumrijjts.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubmRxb3d0b2NzY3VtcmlqanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTI0NjcsImV4cCI6MjA5MTAyODQ2N30.GtOtvoaeWU6tv1X8nrxaVjwgf5S1jroOaUGm7oBJ3a4'

supabase = create_client(url, key)

# Check hr_master_data
print('HR Master Data:')
result = supabase.table('hr_master_data').select('*').execute()
if result.data:
    print(f"  Columns: {list(result.data[0].keys())}")
    for row in result.data:
        print(f"  {row}")
else:
    print("  No data found")

print("\nUsers table:")
result2 = supabase.table('users').select('*').execute()
if result2.data:
    print(f"  Columns: {list(result2.data[0].keys())}")
    for row in result2.data:
        print(f"  ID: {row.get('id')} | EmpID: {row.get('employee_id')} | Name: {row.get('full_name')} | Mobile: {row.get('mobile_number')} | Role: {row.get('role')}")
else:
    print("  No data found")
