# This file will hold endpoints a non-registered tenant will use

#Examples:
# POST /public/tenants/requests (create pending tenant request)
# optional: GET /public/memberships (plan dropdown for the form)

from fastapi import APIRouter

router = APIRouter()