import pytest
from httpx import AsyncClient

@pytest.mark.api
@pytest.mark.integration
async def test_hod_review_flow(client: AsyncClient, auth_tokens: dict):
    # 1. Student requests pass
    student_headers = {"Authorization": f"Bearer {auth_tokens['student']}"}
    req_res = await client.post("/api/student/leave", json={
        "reason": "Official hackathon participation outside college",
        "notes": "Verified by club coordinator"
    }, headers=student_headers)
    assert req_res.status_code == 200
    pass_id = req_res.json()["id"]

    # 2. HOD scans / looks up student
    hod_headers = {"Authorization": f"Bearer {auth_tokens['hod']}"}
    lookup_res = await client.get("/api/hod/scan-lookup?q=24TEST001", headers=hod_headers)
    assert lookup_res.status_code == 200
    assert lookup_res.json()["student"]["roll_number"] == "24TEST001"

    # 3. HOD approves request
    approve_res = await client.post(f"/api/hod/passes/{pass_id}/approve", json={
        "decision": "approve",
        "remarks": "Approved by HOD for hackathon"
    }, headers=hod_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

@pytest.mark.api
async def test_hod_absence_status_flow(client: AsyncClient, auth_tokens: dict):
    hod_headers = {"Authorization": f"Bearer {auth_tokens['hod']}"}
    # Check absence status
    status_res = await client.get("/api/hod/absence", headers=hod_headers)
    assert status_res.status_code == 200

    # Update absence
    update_res = await client.post("/api/hod/absence", json={
        "is_unavailable": True,
        "unavailable_reason": "Attending University Academic Council Meeting"
    }, headers=hod_headers)
    assert update_res.status_code == 200

@pytest.mark.api
async def test_mentor_allotment_listing(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    response = await client.get("/api/admin/mentors/assignments", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
