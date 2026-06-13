from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.core.config import settings
from fastapi.concurrency import run_in_threadpool
import logging
import time

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Simple TTL Cache for tokens (caches user_id for 60 seconds)
# This prevents exhausting the threadpool or getting rate-limited by Supabase
# when the frontend polls /status every second.
class TokenCache:
    def __init__(self, ttl_seconds=60):
        self.cache = {}
        self.ttl = ttl_seconds

    def get(self, token: str):
        if token in self.cache:
            user_id, expiry = self.cache[token]
            if time.time() < expiry:
                return user_id
            else:
                del self.cache[token]
        return None

    def set(self, token: str, user_id: str):
        self.cache[token] = (user_id, time.time() + self.ttl)

token_cache = TokenCache(ttl_seconds=60)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> str:
    """
    FastAPI dependency. Validates the Supabase JWT token from the
    Authorization: Bearer {token} header.

    Returns the user_id (UUID string) on success.
    Raises HTTP 401 on any failure.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # 1. Check local cache first (instant)
    cached_user_id = token_cache.get(token)
    if cached_user_id:
        return cached_user_id

    try:
        # 2. Fallback to Supabase API (network call)
        # We run this in a threadpool so it doesn't block the async event loop
        user_response = await run_in_threadpool(supabase.auth.get_user, token)
        
        if not user_response.user or not user_response.user.id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject claim.",
            )
            
        user_id = user_response.user.id
        
        # 3. Save to cache
        token_cache.set(token, user_id)
        
        return user_id

    except Exception as e:
        error_msg = str(e).lower()
        if "expired" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired.",
                headers={"X-Token-Expired": "true"},
            )
            
        logger.warning(f"JWT validation failed via Supabase: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

# Convenience alias — use this in every protected route
CurrentUser = Depends(get_current_user)
