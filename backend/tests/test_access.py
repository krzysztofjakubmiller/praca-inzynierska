def test_accepts_correct_password(client):
    assert client.get("/api/access").status_code == 204


def test_rejects_wrong_password(client):
    response = client.get("/api/access", headers={"Authorization": "Bearer zle-haslo"})

    assert response.status_code == 401
    assert response.json() == {"detail": ["złe hasło"]}


def test_rejects_missing_password(client):
    assert client.get("/api/access", headers={"Authorization": ""}).status_code == 401


def test_rejects_everyone_when_password_is_not_set(client, monkeypatch):
    monkeypatch.delenv("ACCESS_PASSWORD")

    assert client.get("/api/access").status_code == 401


def test_panel_requires_password(client):
    assert client.get("/api/panel/options", headers={"Authorization": ""}).status_code == 401


def test_health_works_without_password(client):
    assert client.get("/api/health", headers={"Authorization": ""}).status_code == 200
