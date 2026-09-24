from locust import HttpUser, task, between
import random

STUDENT_ROLLS = [
    "25551A05A101", "25551A05A102", "25551A05B101", "25551A05B102",
    "25551A05C101", "25551A05C102", "25551A05D101", "25551A05D102"
]

class StudentUser(HttpUser):
    wait_time = between(1, 2)
    weight = 5

    def on_start(self):
        self.headers = {}
        self.roll = random.choice(STUDENT_ROLLS)
        res = self.client.post("/api/auth/login", json={
            "identifier": self.roll,
            "password": "password123"
        })
        if res.status_code == 200:
            token = res.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}

    @task(4)
    def view_dashboard(self):
        if self.headers:
            self.client.get("/api/student/dashboard", headers=self.headers, name="/api/student/dashboard")

    @task(1)
    def request_leave(self):
        if self.headers:
            payload = {
                "reason": f"Medical appointment {random.randint(100, 999)}",
                "notes": "Load test pass submission"
            }
            with self.client.post("/api/student/leave", json=payload, headers=self.headers, catch_response=True, name="/api/student/leave") as resp:
                if resp.status_code in [200, 400]:
                    resp.success()
                else:
                    resp.failure(f"Unexpected status: {resp.status_code}")

    @task(2)
    def view_announcements(self):
        if self.headers:
            self.client.get("/api/announcements", headers=self.headers, name="/api/announcements")


class SecurityUser(HttpUser):
    wait_time = between(0.5, 1.5)
    weight = 3

    def on_start(self):
        self.headers = {}
        res = self.client.post("/api/auth/login", json={
            "identifier": "security",
            "password": "password123"
        })
        if res.status_code == 200:
            token = res.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}

    @task(5)
    def scan_gate_qr(self):
        target_roll = random.choice(STUDENT_ROLLS)
        payload = {
            "roll_number": target_roll,
            "scan_type": "regular"
        }
        self.client.post("/api/gate/scan", json=payload, name="/api/gate/scan")

    @task(2)
    def check_pass_types(self):
        self.client.get("/api/gate/pass-types", name="/api/gate/pass-types")

    @task(1)
    def view_gate_history(self):
        if self.headers:
            self.client.get("/api/gate/history", headers=self.headers, name="/api/gate/history")


class AdminUser(HttpUser):
    wait_time = between(1, 2)
    weight = 2

    def on_start(self):
        self.headers = {}
        res = self.client.post("/api/auth/login", json={
            "identifier": "superadmin",
            "password": "password123"
        })
        if res.status_code == 200:
            token = res.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {token}"}

    @task(3)
    def view_analytics(self):
        if self.headers:
            self.client.get("/api/gate/analytics", headers=self.headers, name="/api/gate/analytics")

    @task(2)
    def search_directory(self):
        if self.headers:
            self.client.get("/api/admin/directory?search=25", headers=self.headers, name="/api/admin/directory")

    @task(1)
    def view_colleges(self):
        if self.headers:
            self.client.get("/api/admin/colleges", headers=self.headers, name="/api/admin/colleges")

    @task(1)
    def view_departments(self):
        if self.headers:
            self.client.get("/api/admin/departments", headers=self.headers, name="/api/admin/departments")
