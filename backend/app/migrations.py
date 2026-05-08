from pathlib import Path

import psycopg2

from app.db import DATABASE_URL


MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def run_migrations():
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                  version TEXT PRIMARY KEY,
                  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )

            for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
                version = path.name
                cursor.execute(
                    "SELECT 1 FROM schema_migrations WHERE version = %s",
                    (version,),
                )
                if cursor.fetchone():
                    continue

                cursor.execute(path.read_text())
                cursor.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s)",
                    (version,),
                )
                print(f"Applied migration {version}")


if __name__ == "__main__":
    run_migrations()
