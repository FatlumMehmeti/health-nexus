"""Notification helper – creates a row in the notifications table."""

from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType


def create_notification(
    db: Session,
    *,
    user_id: int,
    tenant_id: int,
    notification_type: NotificationType,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        tenant_id=tenant_id,
        type=notification_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notification)
    # Caller is responsible for db.commit()
    return notification
