import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL')
if db_url and db_url.startswith('postgresql://'):
    db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)

async def run_migration():
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.execute(text('DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;'))
        await conn.execute(text("CREATE POLICY \"Allow public uploads\" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'datasage-uploads');"))
        res = await conn.execute(text("SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'INSERT';"))
        for row in res:
            print(dict(row._mapping))
    await engine.dispose()
    print('Storage RLS insert fix complete')

asyncio.run(run_migration())
