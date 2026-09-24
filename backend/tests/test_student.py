import pytest
from httpx import AsyncClient

@pytest.mark.api
@pytest.mark.integration
async def test_get_student_dashboard(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['student']}"}
    response = await client.get("/api/student/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "profile" in data
    assert data["profile"]["roll_number"] == "24TEST001"
    assert data["profile"]["full_name"] == "John Doe"
    assert "stats" in data

@pytest.mark.api
@pytest.mark.integration
async def test_request_gate_pass_success(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['student']}"}
    payload = {
        "reason": "Medical emergency and doctor consultation",
        "notes": "Parent informed and confirmed"
    }
    response = await client.post("/api/student/leave", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["reason"] == "Medical emergency and doctor consultation"
    assert data["student_id"] == 1

@pytest.mark.api
async def test_duplicate_pending_pass_rejection(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['student']}"}
    payload = {
        "reason": "First request for medical",
        "notes": "First submission"
    }
    res1 = await client.post("/api/student/leave", json=payload, headers=headers)
    assert res1.status_code == 200

    # Attempt second request in the same cycle
    res2 = await client.post("/api/student/leave", json=payload, headers=headers)
    assert res2.status_code == 400
    assert "already" in res2.json()["detail"].lower()
