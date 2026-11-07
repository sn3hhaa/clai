"""Server-side LiveKit access tokens. The browser never sees the API key or secret."""

from __future__ import annotations

import json
import secrets
from datetime import timedelta

from livekit import api


def mint_participant_token(
    *,
    api_key: str,
    api_secret: str,
    agent_name: str,
    document_id: str,
    conversation_id: str,
    ttl_s: int,
) -> tuple[str, str]:
    """Return (jwt, room_name). The token also dispatches the Clai voice agent into the room,
    passing the document and conversation IDs as dispatch metadata."""
    room_name = f"clai-{conversation_id[:12]}-{secrets.token_hex(3)}"
    identity = f"user-{secrets.token_hex(4)}"
    metadata = json.dumps({"document_id": document_id, "conversation_id": conversation_id})
    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_name("You")
        .with_ttl(timedelta(seconds=ttl_s))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        .with_room_config(
            api.RoomConfiguration(agents=[api.RoomAgentDispatch(agent_name=agent_name, metadata=metadata)])
        )
    )
    return token.to_jwt(), room_name
