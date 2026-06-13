import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL')
if db_url and db_url.startswith('postgresql://'):
    db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')

statements = [
    "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS suggested_questions JSONB DEFAULT '[]'::jsonb;"
]

async def run_migration():
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        for stmt in statements:
            try:
                await conn.execute(text(stmt))
                print(f"Executed: {stmt}")
            except Exception as e:
                print(f"Failed: {stmt} -> {e}")
    await engine.dispose()
    print("Migration complete")

if __name__ == "__main__":
    asyncio.run(run_migration())
