import json
import os
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request

import pytest

BASE_URL = "http://localhost:3000"
DB_PATH = "tasks.db"


def _request(method: str, path: str, payload=None):
    url = f"{BASE_URL}{path}"
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode("utf-8")
            parsed = json.loads(body) if body else None
            return resp.status, parsed
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        parsed = json.loads(body) if body else None
        return exc.code, parsed


def _create_task(**overrides):
    payload = {
        "title": "Default task",
        "importance": 5,
        "duration": 30,
        "is_habit": False,
    }
    payload.update(overrides)
    return _request("POST", "/api/tasks", payload)


@pytest.fixture(scope="session", autouse=True)
def server_process():
    env = os.environ.copy()
    env["NODE_ENV"] = "production"
    process = subprocess.Popen(
        ["npm", "run", "dev"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    deadline = time.time() + 25
    while time.time() < deadline:
        if process.poll() is not None:
            output = process.stdout.read() if process.stdout else ""
            raise RuntimeError(f"Server exited early. Output:\n{output}")
        try:
            status, _ = _request("GET", "/api/tasks")
            if status == 200:
                break
        except Exception:
            pass
        time.sleep(0.3)
    else:
        process.terminate()
        output = process.stdout.read() if process.stdout else ""
        raise RuntimeError(f"Server did not start in time. Output:\n{output}")

    yield process

    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


@pytest.fixture(autouse=True)
def reset_tasks_table(server_process):
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("DELETE FROM tasks")
        conn.commit()
    finally:
        conn.close()


def test_post_tasks_success_creates_row():
    status, body = _create_task(title="Write report", importance=8, duration=60, is_habit=False)

    assert status == 201
    assert isinstance(body["id"], int)
    assert body["title"] == "Write report"
    assert body["importance"] == 8
    assert body["duration"] == 60
    assert body["is_habit"] is False
    assert body["status"] == "pending"

    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT id, title, importance, duration, is_habit, status FROM tasks WHERE id = ?",
            (body["id"],),
        ).fetchone()
    finally:
        conn.close()

    assert row is not None
    assert row[1] == "Write report"
    assert row[2] == 8
    assert row[3] == 60
    assert row[4] == 0
    assert row[5] == "pending"


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "", "importance": 5, "duration": 30, "is_habit": False},
        {"title": "x" * 121, "importance": 5, "duration": 30, "is_habit": False},
        {"title": "bad importance low", "importance": 0, "duration": 30, "is_habit": False},
        {"title": "bad importance high", "importance": 11, "duration": 30, "is_habit": False},
        {"title": "bad duration zero", "importance": 5, "duration": 0, "is_habit": False},
        {"title": "bad duration negative", "importance": 5, "duration": -1, "is_habit": False},
        {"title": "bad duration high", "importance": 5, "duration": 1441, "is_habit": False},
        {
            "title": "bad deadline",
            "importance": 5,
            "duration": 30,
            "is_habit": False,
            "deadline": "not-a-date",
        },
    ],
)
def test_post_tasks_validation_failures(payload):
    status, _ = _request("POST", "/api/tasks", payload)
    assert status == 400


def test_get_tasks_ordering_by_status_then_importance_desc():
    _, first = _create_task(title="pending low", importance=3)
    _, second = _create_task(title="pending high", importance=9)
    _, third = _create_task(title="will complete", importance=1)

    _request("POST", f"/api/tasks/{third['id']}/toggle")

    status, tasks = _request("GET", "/api/tasks")
    assert status == 200

    status_importance_pairs = [(t["status"], t["importance"]) for t in tasks]
    assert status_importance_pairs == sorted(status_importance_pairs, key=lambda x: (x[0], -x[1]))

    titles = [t["title"] for t in tasks]
    assert titles[0] == "will complete"
    assert titles[1] == "pending high"
    assert titles[2] == "pending low"


def test_put_tasks_success_invalid_id_and_missing_id():
    _, created = _create_task(title="to update", importance=4, duration=40)

    status, body = _request(
        "PUT",
        f"/api/tasks/{created['id']}",
        {"title": "updated", "importance": 10, "duration": 20, "is_habit": True},
    )
    assert status == 200
    assert body == {"success": True}

    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT title, importance, duration, is_habit FROM tasks WHERE id = ?",
            (created["id"],),
        ).fetchone()
    finally:
        conn.close()
    assert row == ("updated", 10, 20, 1)

    status, _ = _request(
        "PUT",
        "/api/tasks/abc",
        {"title": "x", "importance": 5, "duration": 10, "is_habit": False},
    )
    assert status == 400

    status, _ = _request(
        "PUT",
        "/api/tasks/999999",
        {"title": "x", "importance": 5, "duration": 10, "is_habit": False},
    )
    assert status == 404


def test_delete_tasks_success_invalid_id_and_missing_id():
    _, created = _create_task(title="to delete", importance=4, duration=40)

    status, body = _request("DELETE", f"/api/tasks/{created['id']}")
    assert status == 200
    assert body == {"success": True}

    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute("SELECT id FROM tasks WHERE id = ?", (created["id"],)).fetchone()
    finally:
        conn.close()
    assert row is None

    status, _ = _request("DELETE", "/api/tasks/abc")
    assert status == 400

    status, _ = _request("DELETE", "/api/tasks/999999")
    assert status == 404


def test_toggle_tasks_success_invalid_id_and_missing_id():
    _, created = _create_task(title="toggle me", importance=4, duration=40)

    status, body = _request("POST", f"/api/tasks/{created['id']}/toggle")
    assert status == 200
    assert body["success"] is True
    assert body["status"] == "completed"

    status, _ = _request("POST", "/api/tasks/abc/toggle")
    assert status == 400

    status, _ = _request("POST", "/api/tasks/999999/toggle")
    assert status == 404


def test_get_analytics_response_keys_and_values():
    _create_task(title="normal pending", importance=3, duration=15, is_habit=False)
    _, completed = _create_task(title="normal complete", importance=8, duration=25, is_habit=False)
    _create_task(title="habit task", importance=6, duration=10, is_habit=True)

    _request("POST", f"/api/tasks/{completed['id']}/toggle")

    status, body = _request("GET", "/api/analytics")
    assert status == 200
    assert set(body.keys()) == {"productivityScore", "totalCompleted", "focusTimeMinutes", "habits"}
    assert body["productivityScore"] == 50
    assert body["totalCompleted"] == 1
    assert body["focusTimeMinutes"] == 25
    assert isinstance(body["habits"], list)
    assert len(body["habits"]) == 1


def test_get_schedule_response_shape():
    _create_task(
        title="schedule task",
        importance=9,
        duration=45,
        is_habit=False,
        deadline="2099-01-01T10:00:00.000Z",
    )
    _create_task(
        title="no deadline task",
        importance=3,
        duration=20,
        is_habit=False,
    )

    status, body = _request("GET", "/api/schedule")
    assert status == 200
    assert isinstance(body, list)
    assert len(body) >= 2

    for item in body:
        assert "startTime" in item
        assert "endTime" in item
        assert "isOverdue" in item
        assert isinstance(item["startTime"], str)
        assert isinstance(item["endTime"], str)
        assert isinstance(item["isOverdue"], bool)
