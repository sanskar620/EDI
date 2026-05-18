import psycopg2

conn = psycopg2.connect(
    host='aws-1-ap-south-1.pooler.supabase.com',
    port=5432,
    database='postgres',
    user='postgres.qnndqowtocscumrijjts',
    password='Sansy_7626**',
    sslmode='require'
)
cur = conn.cursor()

# Check tables in public schema
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
tables = cur.fetchall()
print('Tables in PUBLIC schema:')
for t in tables:
    print(f'  - {t[0]}')

# Check row counts for key tables
print('\nRow counts:')
for t in ['users', 'hr_master_data', 'training_sessions']:
    try:
        cur.execute(f'SELECT COUNT(*) FROM {t}')
        print(f'  {t}: {cur.fetchone()[0]} rows')
    except:
        print(f'  {t}: NOT FOUND')

conn.close()
