import smtplib

import pytest

from app import mail


@pytest.fixture
def smtp(monkeypatch):
    connections = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            self.host = host
            self.port = port
            self.steps = []
            self.messages = []
            connections.append(self)

        def __enter__(self):
            return self

        def __exit__(self, *error):
            return False

        def starttls(self):
            self.steps.append("starttls")

        def login(self, user, password):
            self.steps.append(("login", user, password))

        def send_message(self, message):
            self.messages.append(message)

    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USER", "uzytkownik")
    monkeypatch.setenv("SMTP_PASSWORD", "sekret")
    return connections


def test_without_smtp_server_the_email_is_printed(monkeypatch, capsys):
    monkeypatch.delenv("SMTP_HOST", raising=False)

    mail.send_email("ola@example.com", "Potwierdź adres", "Kliknij: http://localhost/link")

    printed = capsys.readouterr().out
    assert "ola@example.com" in printed
    assert "Potwierdź adres" in printed
    assert "Kliknij: http://localhost/link" in printed


def test_sends_through_smtp_after_encryption_and_login(smtp):
    mail.send_email("ola@example.com", "Potwierdź adres", "Kliknij link, żeby założyć konto.")

    [connection] = smtp
    assert (connection.host, connection.port) == ("smtp.example.com", 587)
    assert connection.steps == ["starttls", ("login", "uzytkownik", "sekret")]
    [message] = connection.messages
    assert message["From"] == "Matma po kolei <powiadomienia@matmapokolei.pl>"
    assert message["To"] == "ola@example.com"
    assert message["Reply-To"] == "pomoc@matmapokolei.pl"
    assert message["Subject"] == "Potwierdź adres"
    assert message.get_content().strip() == "Kliknij link, żeby założyć konto."
