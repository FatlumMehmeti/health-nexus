from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.auth_utils import get_current_user
from app.db import SessionLocal
from app.schemas.enrollment import (
    EnrollmentCreateRequest,
    EnrollmentStatusRead,
    EnrollmentOperationalStatus,
)
from app.services.enrollment_service import (
    ActorContext,
    EnrollmentServiceError,
    create_enrollment,
    transition_enrollment,
    get_enrollment_scoped,
    list_enrollments_scoped,
    get_operational_status,
)
from app.models.enrollment import EnrollmentStatus


router = APIRouter(
    prefix="/enrollments",
    tags=["Enrollments"],
)


def get_db():
    """
    Provide a transactional SQLAlchemy session for the request lifecycle.

    Yields:
        An active SQLAlchemy Session instance.

    Ensures:
        The session is properly closed after request processing.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _actor_from_user_payload(payload: Dict[str, Any]) -> ActorContext:
    """
    Build an ActorContext from the authenticated user payload.

    Args:
        payload: Decoded JWT payload containing user identity and role.

    Returns:
        An ActorContext instance used by the service layer for
        authorization and auditing decisions.
    """
    user_id = payload.get("user_id")
    role = payload.get("role") or ""
    return ActorContext(user_id=user_id, role=str(role))


def _error_response(exc: EnrollmentServiceError) -> JSONResponse:
    """
    Convert a service-layer exception into a standardized JSON error response.

    Args:
        exc: EnrollmentServiceError raised by the service layer.

    Returns:
        JSONResponse formatted according to the application's
        error contract.
    """
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@router.post("", response_model=EnrollmentStatusRead, status_code=201)
def create_enrollment_endpoint(
    payload: EnrollmentCreateRequest,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Create a new enrollment record.

    Args:
        payload: EnrollmentCreateRequest containing tenant, patient,
            and plan identifiers.
        db: Active SQLAlchemy session.
        user: Authenticated user payload provided by dependency injection.

    Returns:
        EnrollmentStatusRead representing the created enrollment.

    Raises:
        Returns a structured JSON error if the service layer
        raises EnrollmentServiceError.
    """
    actor = _actor_from_user_payload(user)
    try:
        enrollment = create_enrollment(
            db,
            tenant_id=payload.tenant_id,
            patient_user_id=payload.patient_user_id,
            user_tenant_plan_id=payload.user_tenant_plan_id,
            actor=actor,
        )

        return EnrollmentStatusRead(
            id=enrollment.id,
            status=enrollment.status.value
            if isinstance(enrollment.status, EnrollmentStatus)
            else str(enrollment.status),
            activated_at=enrollment.activated_at.isoformat()
            if enrollment.activated_at
            else None,
            cancelled_at=enrollment.cancelled_at.isoformat()
            if enrollment.cancelled_at
            else None,
            expires_at=enrollment.expires_at.isoformat()
            if enrollment.expires_at
            else None,
            updated_at=enrollment.updated_at.isoformat()
            if hasattr(enrollment, "updated_at") and enrollment.updated_at
            else None,
        )
    except EnrollmentServiceError as exc:
        return _error_response(exc)


@router.get("/{enrollment_id}", response_model=EnrollmentStatusRead)
def get_enrollment_endpoint(
    enrollment_id: int,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Retrieve a single enrollment by its identifier.

    Args:
        enrollment_id: Primary key of the enrollment.
        db: Active SQLAlchemy session.
        user: Authenticated user payload.

    Returns:
        EnrollmentStatusRead for the requested enrollment.

    Raises:
        Returns a structured JSON error if access is denied
        or the enrollment is not found.
    """
    actor = _actor_from_user_payload(user)
    try:
        enrollment = get_enrollment_scoped(
            db,
            enrollment_id=enrollment_id,
            actor=actor,
        )

        return EnrollmentStatusRead(
            id=enrollment.id,
            status=enrollment.status.value
            if isinstance(enrollment.status, EnrollmentStatus)
            else str(enrollment.status),
            activated_at=enrollment.activated_at.isoformat()
            if enrollment.activated_at
            else None,
            cancelled_at=enrollment.cancelled_at.isoformat()
            if enrollment.cancelled_at
            else None,
            expires_at=enrollment.expires_at.isoformat()
            if enrollment.expires_at
            else None,
            updated_at=enrollment.updated_at.isoformat()
            if hasattr(enrollment, "updated_at") and enrollment.updated_at
            else None,
        )
    except EnrollmentServiceError as exc:
        return _error_response(exc)


@router.get("", response_model=list[EnrollmentStatusRead])
def list_enrollments_endpoint(
    tenant_id: int = Query(...),
    patient_user_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    List enrollments scoped to a tenant, optionally filtered by patient.

    Args:
        tenant_id: Identifier of the tenant whose enrollments are requested.
        patient_user_id: Optional patient user identifier for additional filtering.
        db: Active SQLAlchemy session.
        user: Authenticated user payload.

    Returns:
        A list of EnrollmentStatusRead objects visible to the caller.

    Raises:
        Returns a structured JSON error if authorization fails.
    """
    actor = _actor_from_user_payload(user)
    try:
        enrollments = list_enrollments_scoped(
            db,
            tenant_id=tenant_id,
            actor=actor,
            patient_user_id=patient_user_id,
        )

        return [
            EnrollmentStatusRead(
                id=e.id,
                status=e.status.value
                if isinstance(e.status, EnrollmentStatus)
                else str(e.status),
                activated_at=e.activated_at.isoformat()
                if e.activated_at
                else None,
                cancelled_at=e.cancelled_at.isoformat()
                if e.cancelled_at
                else None,
                expires_at=e.expires_at.isoformat()
                if e.expires_at
                else None,
                updated_at=e.updated_at.isoformat()
                if hasattr(e, "updated_at") and e.updated_at
                else None,
            )
            for e in enrollments
        ]
    except EnrollmentServiceError as exc:
        return _error_response(exc)


@router.post("/{enrollment_id}/transition", response_model=EnrollmentStatusRead)
def transition_enrollment_endpoint(
    enrollment_id: int,
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Transition an enrollment to a new status.

    Args:
        enrollment_id: Identifier of the enrollment to transition.
        body: Request body containing 'target_status' and optional 'reason'.
        db: Active SQLAlchemy session.
        user: Authenticated user payload.

    Returns:
        EnrollmentStatusRead reflecting the updated enrollment state.

    Raises:
        Returns a validation error if target_status is missing or invalid.
        Returns a structured JSON error for service-level failures.
    """
    actor = _actor_from_user_payload(user)

    target_status_value = body.get("target_status")
    reason = body.get("reason")

    if target_status_value is None:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "target_status is required",
                    "details": {},
                }
            },
        )

    try:
        EnrollmentStatus(target_status_value)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid target_status value",
                    "details": {"target_status": target_status_value},
                }
            },
        )

    try:
        enrollment = transition_enrollment(
            db,
            enrollment_id=enrollment_id,
            target_status=target_status_value,
            actor=actor,
            reason=reason,
            system=False,
        )

        return EnrollmentStatusRead(
            id=enrollment.id,
            status=enrollment.status.value
            if isinstance(enrollment.status, EnrollmentStatus)
            else str(enrollment.status),
            activated_at=enrollment.activated_at.isoformat()
            if enrollment.activated_at
            else None,
            cancelled_at=enrollment.cancelled_at.isoformat()
            if enrollment.cancelled_at
            else None,
            expires_at=enrollment.expires_at.isoformat()
            if enrollment.expires_at
            else None,
            updated_at=enrollment.updated_at.isoformat()
            if hasattr(enrollment, "updated_at") and enrollment.updated_at
            else None,
        )
    except EnrollmentServiceError as exc:
        return _error_response(exc)


@router.get("/{enrollment_id}/status", response_model=EnrollmentOperationalStatus)
def enrollment_operational_status_endpoint(
    enrollment_id: int,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Retrieve the operational status of an enrollment.

    Args:
        enrollment_id: Identifier of the enrollment.
        db: Active SQLAlchemy session.
        user: Authenticated user payload.

    Returns:
        EnrollmentOperationalStatus describing the current
        operational state of the enrollment.

    Raises:
        Returns a structured JSON error if access is denied
        or the enrollment does not exist.
    """
    actor = _actor_from_user_payload(user)
    try:
        status_payload = get_operational_status(
            db,
            enrollment_id=enrollment_id,
            actor=actor,
        )
        return EnrollmentOperationalStatus(**status_payload)
    except EnrollmentServiceError as exc:
        return _error_response(exc)