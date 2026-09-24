import pytest
from httpx import AsyncClient

@pytest.mark.api
@pytest.mark.integration
async def test_gate_scan_endpoint(client: AsyncClient, db_session):
    # Scan with roll number
    payload = {
        "roll_number": "24TEST001",
        "scan_type": "regular"
    }
    response = await client.post("/api/gate/scan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "roll_number" in data or "name" in data or "valid" in data

@pytest.mark.api
async def test_gate_scan_missing_identifier(client: AsyncClient):
    payload = {}
    response = await client.post("/api/gate/scan", json=payload)
    assert response.status_code == 400

@pytest.mark.api
async def test_gate_analytics(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    response = await client.get("/api/gate/analytics", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_students" in data or "summary" in data

@pytest.mark.api
async def test_gate_history(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['security']}"}
    response = await client.get("/api/gate/history", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.api
async def test_public_pass_types(client: AsyncClient):
    response = await client.get("/api/gate/pass-types")
    assert response.status_code == 200
