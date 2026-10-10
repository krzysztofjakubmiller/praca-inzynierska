import os
import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)


# Do czasu logowania całą aplikację zamyka jedno hasło ze zmiennej środowiskowej. Bez tej
# zmiennej nie wejdzie nikt, więc pominięta konfiguracja na serwerze nie otwiera panelu.
def require_password(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    password = os.environ.get("ACCESS_PASSWORD", "")
    given = credentials.credentials if credentials else ""
    # compare_digest porównuje w stałym czasie, więc z czasu odpowiedzi nie da się zgadywać hasła.
    if not password or not secrets.compare_digest(given.encode(), password.encode()):
        raise HTTPException(status_code=401, detail=["złe hasło"])
