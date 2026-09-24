import asyncio
import pytest
from httpx import AsyncClient

@pytest.mark.load
@pytest.mark.integration
async def test_concurrent_pass_requests(client: AsyncClient, auth_tokens: dict):
    # Simultaneous pass requests from the same student
    student_headers = {"Authorization": f"Bearer {auth_tokens['student']}"}
    
    async def make_request(idx: int):
        return await client.post("/api/student/leave", json={
            "reason": f"Concurrent medical reason {idx}",
            "notes": "Emergency pass request"
        }, headers=student_headers)

    # Launch 5 simultaneous requests
    responses = await asyncio.gather(*[make_request(i) for i in range(5)], return_exceptions=True)
    
    status_codes = [r.status_code for r in responses if hasattr(r, "status_code")]
    # Exactly one should succeed with 200, others should be rejected with 400 (cycle duplicate)
    success_count = sum(1 for c in status_codes if c in [200, 201])
    rejected_count = sum(1 for c in status_codes if c in [400, 409])
    
    assert success_count == 1
    assert rejected_count == 4

@pytest.mark.load
async def test_concurrent_reads(client: AsyncClient, auth_tokens: dict):
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    
    async def fetch_colleges():
        return await client.get("/api/admin/colleges", headers=admin_headers)

    responses = await asyncio.gather(*[fetch_colleges() for _ in range(10)])
    for r in responses:
        assert r.status_code == 200
