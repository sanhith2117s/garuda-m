import pytest
from httpx import AsyncClient

@pytest.mark.api
async def test_get_colleges(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['super_admin']}"}
    response = await client.get("/api/admin/colleges", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1

@pytest.mark.api
async def test_get_departments(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    response = await client.get("/api/admin/departments", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1

@pytest.mark.api
async def test_get_semesters(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    response = await client.get("/api/admin/semesters", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1

@pytest.mark.api
async def test_get_sections(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    response = await client.get("/api/admin/sections", headers=headers)
    assert response.status_code == 200

@pytest.mark.api
async def test_student_directory_search(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    response = await client.get("/api/admin/directory/search?q=24TEST001", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["roll_number"] == "24TEST001"
    assert data["full_name"] == "John Doe"

@pytest.mark.api
async def test_announcements_crud(client: AsyncClient, auth_tokens: dict):
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    # List announcements
    list_res = await client.get("/api/announcements", headers=headers)
    assert list_res.status_code == 200

    # Create announcement
    create_payload = {
        "title": "Test Holiday Notice",
        "content": "Campus will remain closed on Friday for maintenance.",
        "target_role": "student"
    }
    create_res = await client.post("/api/announcements", json=create_payload, headers=headers)
    assert create_res.status_code == 200
    assert "created" in create_res.json()["message"].lower()

@pytest.mark.api
async def test_unauthorized_admin_access(client: AsyncClient, auth_tokens: dict):
    # Student attempting to create college (super_admin only)
    headers = {"Authorization": f"Bearer {auth_tokens['student']}"}
    create_payload = {
        "name": "Unauthorized College",
        "code": "UNAUTH"
    }
    response = await client.post("/api/admin/colleges", json=create_payload, headers=headers)
    assert response.status_code in [401, 403]
