from fastapi import Request
from fastapi.responses import JSONResponse

class DataSageException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

class SessionNotFoundException(DataSageException):
    def __init__(self, session_id: str):
        super().__init__(f"Session '{session_id}' not found.", 404)

class InvalidFileTypeException(DataSageException):
    def __init__(self, message: str = "Only CSV files (.csv) are accepted."):
        super().__init__(message, 422)

class FileTooLargeException(DataSageException):
    def __init__(self, size_mb: float, max_mb: int):
        super().__init__(
            f"File size {size_mb:.2f}MB exceeds the {max_mb}MB limit.", 413
        )

class StorageException(DataSageException):
    def __init__(self, detail: str):
        super().__init__(f"File storage failed: {detail}", 500)

class DatabaseException(DataSageException):
    def __init__(self, detail: str):
        super().__init__(f"Database operation failed: {detail}", 500)

class LLMError(DataSageException):
    def __init__(self, detail: str):
        super().__init__(f"LLM operation failed: {detail}", 500)

async def datasage_exception_handler(request: Request, exc: DataSageException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "type": type(exc).__name__,
            "status_code": exc.status_code
        }
    )
