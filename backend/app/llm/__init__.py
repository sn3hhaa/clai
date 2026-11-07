"""LLM gateway (OpenRouter, OpenAI-compatible). One call per question; JSON output.

Failures (missing key, timeout, rate limit, invalid JSON) raise LLMUnavailable so the
agent can fall back to an extractive answer instead of inventing text.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Protocol

import httpx

log = logging.getLogger("clai.llm")


class LLMUnavailable(Exception):
    pass


class LLM(Protocol):
    name: str

    def complete_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]: ...


class OpenRouterLLM:
    def __init__(self, *, api_key: str, model: str, base_url: str, timeout_s: float, max_retries: int):
        self.name = model
        self._model = model
        self._max_retries = max_retries
        self._client = httpx.Client(
            base_url=base_url,
            timeout=httpx.Timeout(timeout_s, connect=10.0),
            headers={
                "Authorization": f"Bearer {api_key}",
                # Optional attribution headers documented by OpenRouter.
                "HTTP-Referer": "https://github.com/sn3hhaa/clai",
                "X-Title": "Clai",
            },
        )

    def complete_json(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        body = {
            "model": self._model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0.1,
            "max_tokens": 700,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": "clai_answer", "strict": True, "schema": schema},
            },
        }
        last_error = "unknown error"
        for attempt in range(self._max_retries + 1):
            try:
                response = self._client.post("/chat/completions", json=body)
            except httpx.HTTPError as exc:
                last_error = f"network error: {type(exc).__name__}"
            else:
                if response.status_code == 200:
                    return _parse(response.json())
                last_error = f"HTTP {response.status_code}"
                # Daily free-tier exhaustion and auth errors won't recover by retrying.
                if response.status_code in (400, 401, 402, 403, 404):
                    break
                if response.status_code == 429 and "per-day" in response.text.lower():
                    last_error = "free-tier daily limit reached"
                    break
            if attempt < self._max_retries:
                time.sleep(1.5 * (attempt + 1))
        log.warning("LLM unavailable: %s", last_error)
        raise LLMUnavailable(last_error)

    def close(self) -> None:
        self._client.close()


def _parse(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMUnavailable("malformed completion") from exc
    if not isinstance(content, str):
        raise LLMUnavailable("empty completion")
    # Some models wrap JSON in prose or code fences despite response_format.
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        raise LLMUnavailable("completion was not JSON")
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise LLMUnavailable("completion was not valid JSON") from exc
    if not isinstance(data, dict):
        raise LLMUnavailable("completion JSON was not an object")
    return data
