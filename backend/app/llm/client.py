"""
Provider-agnostic LLM client for DataSage.
Primary: Groq API
Fallback: HuggingFace Inference API (OpenAI-compatible)
"""

import json
import time
import logging
import asyncio
import httpx
from app.core.config import settings
from app.core.exceptions import LLMError

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.model = settings.LLM_MODEL
        self.timeout = 30

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 800,
        temperature: float = 0.3,
        expect_json: bool = False,
    ) -> str:
        """
        Make one LLM completion call.
        If expect_json=True, appends JSON instruction and validates output.
        Logs provider, model, estimated tokens, and latency.
        Retries once on rate limit (5s wait). Raises LLMError on failure.
        """
        if expect_json:
            system_prompt = (
                system_prompt
                + "\nRespond ONLY with valid JSON. No markdown. No explanation."
            )

        prompt_tokens = self._estimate_tokens(system_prompt + user_prompt)
        start = time.monotonic()

        try:
            if self.provider == "groq":
                response = await self._call_groq(
                    system_prompt, user_prompt, max_tokens, temperature
                )
            else:
                response = await self._call_huggingface(
                    system_prompt, user_prompt, max_tokens, temperature
                )
        except LLMError as e:
            if "rate" in str(e).lower():
                logger.warning("Rate limited, retrying in 5s...")
                await asyncio.sleep(5)
                try:
                    if self.provider == "groq":
                        response = await self._call_groq(
                            system_prompt, user_prompt, max_tokens, temperature
                        )
                    else:
                        response = await self._call_huggingface(
                            system_prompt, user_prompt, max_tokens, temperature
                        )
                except Exception:
                    raise
            else:
                raise

        elapsed_ms = (time.monotonic() - start) * 1000
        response_tokens = self._estimate_tokens(response)

        logger.info(
            f"LLM call: provider={self.provider} model={self.model} "
            f"prompt_tokens≈{prompt_tokens} response_tokens≈{response_tokens} "
            f"latency={elapsed_ms:.0f}ms"
        )

        if expect_json:
            response = self._clean_json(response)
            try:
                json.loads(response)
            except json.JSONDecodeError:
                raise LLMError("Invalid JSON response from LLM")

        return response

    async def _call_groq(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise LLMError("GROQ_API_KEY not configured")

        try:
            from groq import AsyncGroq

            client = AsyncGroq(api_key=api_key, timeout=self.timeout)
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content
        except Exception as e:
            error_str = str(e).lower()
            if "rate" in error_str or "429" in error_str:
                raise LLMError("Rate limit exceeded")
            if "timeout" in error_str or "timed out" in error_str:
                raise LLMError("LLM request timed out")
            raise LLMError(f"Groq API error: {type(e).__name__}")

    async def _call_huggingface(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        api_key = settings.HF_API_KEY
        if not api_key:
            raise LLMError("HF_API_KEY not configured")

        url = "https://api-inference.huggingface.co/models/" + self.model + "/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except httpx.TimeoutException:
            raise LLMError("LLM request timed out")
        except Exception as e:
            error_str = str(e).lower()
            if "rate" in error_str or "429" in error_str:
                raise LLMError("Rate limit exceeded")
            raise LLMError(f"HuggingFace API error: {type(e).__name__}")

    def _estimate_tokens(self, text: str) -> int:
        """Fast approximation: 1 token ≈ 4 characters."""
        return len(text) // 4

    def _truncate_to_token_budget(self, text: str, max_tokens: int) -> str:
        """If text exceeds token budget, truncate and add marker."""
        max_chars = max_tokens * 4
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + "\n... [truncated for context limit]"

    @staticmethod
    def _clean_json(text: str) -> str:
        """Strip markdown code fences from LLM response."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
