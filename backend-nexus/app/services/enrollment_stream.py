import asyncio
import json
from typing import Any


class EnrollmentStream:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        async with self._lock:
            self._subscribers.add(queue)
        return queue

    async def unsubscribe(
        self, queue: asyncio.Queue[dict[str, Any]]
    ) -> None:
        async with self._lock:
            self._subscribers.discard(queue)

    async def publish_enrollment_changed(
        self, *, enrollment_id: int, tenant_id: int
    ) -> None:
        payload = {
            "enrollment_id": enrollment_id,
            "tenant_id": tenant_id,
        }
        async with self._lock:
            subscribers = list(self._subscribers)

        for queue in subscribers:
            await queue.put(payload)


enrollment_stream = EnrollmentStream()


def dispatch_enrollment_changed(*, enrollment_id: int, tenant_id: int) -> None:
    try:
        asyncio.get_running_loop().create_task(
            enrollment_stream.publish_enrollment_changed(
                enrollment_id=enrollment_id,
                tenant_id=tenant_id,
            )
        )
    except RuntimeError:
        asyncio.run(
            enrollment_stream.publish_enrollment_changed(
                enrollment_id=enrollment_id,
                tenant_id=tenant_id,
            )
        )


def format_sse_message(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"