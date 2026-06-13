import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()
db_url = os.getenv('DATABASE_URL')
if db_url and db_url.startswith('postgresql://'):
    db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')

async def main():
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, status, error_msg, created_at FROM sessions ORDER BY created_at DESC LIMIT 5;"))
        rows = res.fetchall()
        for r in rows:
            print(r)
    await engine.dispose()

asyncio.run(main())
