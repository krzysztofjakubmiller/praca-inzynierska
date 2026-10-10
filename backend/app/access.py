import os
import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)


# Do czasu logowania aplikację zamykają dwa hasła ze zmiennych środowiskowych: jedno do
# oglądania, drugie do panelu właściciela. Bez zmiennej nie wejdzie nikt, więc pominięta
# konfiguracja na serwerze niczego nie otwiera.
def password_matches(credentials: HTTPAuthorizationCredentials | None, variable: str) -> bool:
    password = os.environ.get(variable, "")
    given = credentials.credentials if credentials else ""
    # compare_digest porównuje w stałym czasie, więc z czasu odpowiedzi nie da się zgadywać hasła.
    return bool(password) and secrets.compare_digest(given.encode(), password.encode())


def require_password(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not password_matches(credentials, "ACCESS_PASSWORD"):
        raise HTTPException(status_code=401, detail=["złe hasło"])


def require_panel_password(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not password_matches(credentials, "PANEL_PASSWORD"):
        raise HTTPException(status_code=401, detail=["złe hasło panelu"])
