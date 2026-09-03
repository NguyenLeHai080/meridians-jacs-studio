import psycopg

try:
    conn = psycopg.connect("postgresql://jacs:jacs-dev-password@localhost:5432/jacs")
    res = conn.execute("SELECT version()").fetchone()
    print("PostgreSQL connection success:", res[0])
    conn.close()
except Exception as e:
    print("PostgreSQL connection error:", e)
