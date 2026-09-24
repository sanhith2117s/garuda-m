import pytest
from httpx import AsyncClient

@pytest.mark.api
@pytest.mark.unit
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.api
async def test_login_success(client: AsyncClient):
    response = await client.post("/api/auth/login", json={
        "identifier": "superadmin",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "super_admin"
    assert data["token_type"] == "bearer"

@pytest.mark.api
async def test_login_invalid_password(client: AsyncClient):
    response = await client.post("/api/auth/login", json={
        "identifier": "superadmin",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Incorrect" in response.json()["detail"] or "Invalid" in response.json()["detail"]

@pytest.mark.api
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post("/api/auth/login", json={
        "identifier": "doesnotexist",
        "password": "password123"
    })
    assert response.status_code == 401

@pytest.mark.api
async def test_student_login(client: AsyncClient):
    response = await client.post("/api/auth/login", json={
        "identifier": "24TEST001",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "student"

@pytest.mark.api
async def test_change_password_success(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    payload = {
        "old_password": "password123",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123"
    }
    response = await client.post("/api/auth/change-password", json=payload, headers=headers)
    assert response.status_code == 200
    assert "updated" in response.json()["message"].lower()

@pytest.mark.api
async def test_change_password_mismatch(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    payload = {
        "old_password": "password123",
        "new_password": "newpassword123",
        "confirm_password": "differentpassword"
    }
    response = await client.post("/api/auth/change-password", json=payload, headers=headers)
    assert response.status_code == 400
