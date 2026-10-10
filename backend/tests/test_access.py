ACCESS = {"Authorization": "Bearer haslo-testowe"}
PANEL = {"Authorization": "Bearer haslo-panelu"}


def test_accepts_correct_password(client):
    assert client.get("/api/access", headers=ACCESS).status_code == 204


def test_rejects_wrong_password(client):
    response = client.get("/api/access", headers={"Authorization": "Bearer zle-haslo"})

    assert response.status_code == 401
    assert response.json() == {"detail": ["złe hasło"]}


def test_rejects_missing_password(client):
    assert client.get("/api/access", headers={"Authorization": ""}).status_code == 401


def test_rejects_everyone_when_password_is_not_set(client, monkeypatch):
    monkeypatch.delenv("ACCESS_PASSWORD")

    assert client.get("/api/access", headers=ACCESS).status_code == 401


def test_accepts_correct_panel_password(client):
    assert client.get("/api/panel/access", headers=PANEL).status_code == 204


def test_access_password_does_not_open_panel(client):
    response = client.get("/api/panel/options", headers=ACCESS)

    assert response.status_code == 401
    assert response.json() == {"detail": ["złe hasło panelu"]}


def test_panel_is_closed_when_panel_password_is_not_set(client, monkeypatch):
    monkeypatch.delenv("PANEL_PASSWORD")

    assert client.get("/api/panel/options", headers=PANEL).status_code == 401


def test_health_works_without_password(client):
    assert client.get("/api/health", headers={"Authorization": ""}).status_code == 200
