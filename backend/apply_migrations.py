import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def run():
    async with AsyncSessionLocal() as db:
        await db.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;"))
        await db.execute(text("ALTER TABLE visualizations ADD COLUMN IF NOT EXISTS image_url TEXT;"))
        await db.execute(text("ALTER TABLE visualizations ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;"))
        await db.commit()
        print("Migrations applied.")

if __name__ == "__main__":
    asyncio.run(run())
