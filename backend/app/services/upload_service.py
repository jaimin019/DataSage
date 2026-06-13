from fastapi import UploadFile
import pandas as pd
import io
from app.core.config import settings
from app.core.exceptions import InvalidFileTypeException, FileTooLargeException, StorageException
from app.schemas.upload import DatasetMetadata, ColumnInfo
from supabase import create_client, Client

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

async def validate_file(file: UploadFile) -> None:
    if file.content_type != "text/csv" and not file.filename.endswith(".csv"):
        raise InvalidFileTypeException()
    
    file.file.seek(0, 2)
    size_bytes = file.file.tell()
    file.file.seek(0)
    
    size_mb = size_bytes / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise FileTooLargeException(size_mb=size_mb, max_mb=settings.MAX_FILE_SIZE_MB)

async def save_to_supabase(file: UploadFile, session_id: str) -> str:
    try:
        file.file.seek(0)
        file_bytes = file.file.read()
        file.file.seek(0)
        
        file_path = f"{session_id}/{file.filename}"
        
        res = supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
            file=file_bytes,
            path=file_path,
            file_options={"content-type": "text/csv"}
        )
        
        return file_path
    except Exception as e:
        raise StorageException(str(e))

async def get_csv_metadata(file: UploadFile) -> DatasetMetadata:
    file.file.seek(0)
    file_bytes = file.file.read()
    file.file.seek(0)
    
    try:
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding='latin-1')
    except pd.errors.EmptyDataError:
        raise InvalidFileTypeException(message="CSV file is empty")
    except Exception as e:
        raise InvalidFileTypeException(message=f"Could not read CSV: {str(e)}")
        
    row_count = len(df)
    col_count = len(df.columns)
    file_size_bytes = len(file_bytes)
    
    columns = []
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        null_pct = float(null_count / row_count) if row_count > 0 else 0.0
        
        sample_values = df[col].dropna().head(3).tolist()
        
        columns.append(ColumnInfo(
            name=str(col),
            dtype=str(df[col].dtype),
            null_count=null_count,
            null_pct=null_pct,
            sample_values=sample_values
        ))
        
    return DatasetMetadata(
        filename=file.filename,
        row_count=row_count,
        col_count=col_count,
        file_size_bytes=file_size_bytes,
        columns=columns,
        cleaned_filename=derive_cleaned_filename(file.filename)
    )

import re
from pathlib import Path

def derive_cleaned_filename(original_name: str) -> str:
    """
    Single source of truth for cleaned filename.
    Called once at upload time. Result stored in DB.
    Never recomputed anywhere else.
    """
    stem = Path(original_name).stem          # strip extension
    safe = stem.lower().strip()              # lowercase
    safe = re.sub(r'[^a-z0-9]+', '_', safe) # replace non-alphanumeric with _
    safe = re.sub(r'_+', '_', safe)          # collapse multiple underscores
    safe = safe.strip('_')                   # strip leading/trailing underscores
    if not safe:
        safe = 'data'                        # fallback if name was all special chars
    return f"cleaned_{safe}.csv"
