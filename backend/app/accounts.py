import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.access import require_password
from app.db import get_session
from app.models import Account, LoginSession

# Dopóki aplikacja nie wystartuje, konta też są za hasłem dostępu.
router = APIRouter(prefix="/api/account", dependencies=[Depends(require_password)])

# Minimum z zaleceń OWASP. Domyślne 64 MB biblioteki przy kilku logowaniach naraz zapchałoby
# backend, który ma 512 MB pamięci.
hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)

# Identyfikator klienta jest jawny: Google wymaga go w kodzie każdej strony z przyciskiem.
GOOGLE_CLIENT_ID = "991477956168-0mjjmbp7o2lgkq9iqjrv8v49e4g03b8k.apps.googleusercontent.com"

SESSION_LENGTH = timedelta(days=14)
COOKIE = "session"


class Credentials(BaseModel):
    email: str
    password: str


class GoogleCredential(BaseModel):
    credential: str


def normalized(email: str) -> str:
    return email.strip().lower()


def credential_problems(email: str, password: str) -> list[str]:
    problems = []
    local, _, domain = email.partition("@")
    if (
        not local
        or not domain
        or "@" in domain
        or len(email) > 254
        or any(character.isspace() for character in email)
    ):
        problems.append("Niepoprawny adres e-mail.")
    if len(password) < 12:
        problems.append("Hasło musi mieć co najmniej 12 znaków.")
    if len(password) > 128:
        problems.append("Hasło może mieć najwyżej 128 znaków.")
    return problems


def password_matches(password: str, password_hash: str) -> bool:
    try:
        return hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


# Według dokumentacji Google adres jest pewny tylko w kontach Gmail i firmowych (pole hd).
# Przy innych adresach właściciel mógł się zmienić od założenia konta Google.
def google_owns_email(email: str, claims: dict) -> bool:
    return email.endswith("@gmail.com") or bool(claims.get("hd"))


# W bazie leży tylko skrót klucza, więc wyciek bazy albo kopii nie pozwala podszyć się pod
# użytkownika.
def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def set_session_cookie(response: Response, token: str):
    # HttpOnly: skrypt na stronie nie odczyta klucza. SameSite=Lax: cudze strony nie wyślą
    # ciasteczka w zapytaniu POST.
    response.set_cookie(
        COOKIE,
        token,
        max_age=int(SESSION_LENGTH.total_seconds()),
        httponly=True,
        secure=True,
        samesite="lax",
    )


def end_session(session: Session, token: str | None):
    if token:
        session.execute(delete(LoginSession).where(LoginSession.token_hash == token_hash(token)))


# Nowa sesja zastępuje tę, którą ta przeglądarka miała wcześniej; sesje na innych urządzeniach
# zostają. Przy okazji znikają wygasłe, żeby tabela nie rosła bez końca.
def start_session(
    session: Session, response: Response, account_id: int, previous_token: str | None
):
    end_session(session, previous_token)
    session.execute(delete(LoginSession).where(LoginSession.expires_at <= datetime.now(UTC)))
    token = secrets.token_urlsafe(32)
    session.add(
        LoginSession(
            token_hash=token_hash(token),
            account_id=account_id,
            expires_at=datetime.now(UTC) + SESSION_LENGTH,
        )
    )
    set_session_cookie(response, token)


def current_account(
    response: Response,
    token: str | None = Cookie(default=None, alias=COOKIE),
    session: Session = Depends(get_session),
) -> Account:
    login_session = session.get(LoginSession, token_hash(token)) if token else None
    now = datetime.now(UTC)
    if login_session is None or login_session.expires_at <= now:
        raise HTTPException(status_code=401, detail=["Nie zalogowano."])
    # Przedłużenie najwyżej raz na dzień, żeby nie zapisywać do bazy przy każdym zapytaniu.
    if login_session.expires_at < now + SESSION_LENGTH - timedelta(days=1):
        login_session.expires_at = now + SESSION_LENGTH
        session.commit()
        set_session_cookie(response, token)
    return session.get(Account, login_session.account_id)


@router.post("/register", status_code=201)
def register(
    credentials: Credentials,
    response: Response,
    token: str | None = Cookie(default=None, alias=COOKIE),
    session: Session = Depends(get_session),
):
    email = normalized(credentials.email)
    problems = credential_problems(email, credentials.password)
    if problems:
        raise HTTPException(status_code=422, detail=problems)
    if session.scalar(select(Account).where(Account.email == email)):
        raise HTTPException(status_code=409, detail=["Konto z tym adresem już istnieje."])
    account = Account(email=email, password_hash=hasher.hash(credentials.password))
    session.add(account)
    session.flush()
    start_session(session, response, account.id, token)
    session.commit()
    return {"email": account.email}


@router.post("/login", status_code=204)
def log_in(
    credentials: Credentials,
    response: Response,
    token: str | None = Cookie(default=None, alias=COOKIE),
    session: Session = Depends(get_session),
):
    account = session.scalar(select(Account).where(Account.email == normalized(credentials.email)))
    if account is None:
        raise HTTPException(status_code=401, detail=["Nie ma konta z tym adresem."])
    if account.password_hash is None:
        raise HTTPException(status_code=401, detail=["To konto loguje się przez Google."])
    if not password_matches(credentials.password, account.password_hash):
        raise HTTPException(status_code=401, detail=["Złe hasło."])
    start_session(session, response, account.id, token)
    session.commit()


@router.post("/google", status_code=204)
def log_in_with_google(
    google: GoogleCredential,
    response: Response,
    token: str | None = Cookie(default=None, alias=COOKIE),
    session: Session = Depends(get_session),
):
    # Biblioteka Google sprawdza podpis, wystawcę, ważność i to, że token jest dla naszej aplikacji.
    try:
        claims = id_token.verify_oauth2_token(
            google.credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail=["Logowanie przez Google nie powiodło się."])
    if not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail=["Google nie potwierdził tego adresu e-mail."])
    account = session.scalar(select(Account).where(Account.google_id == claims["sub"]))
    if account is None:
        email = normalized(claims["email"])
        account = session.scalar(select(Account).where(Account.email == email))
        if account is None:
            account = Account(email=email)
            session.add(account)
        elif not google_owns_email(email, claims):
            raise HTTPException(
                status_code=409, detail=["Konto z tym adresem już istnieje. Zaloguj się hasłem."]
            )
        account.google_id = claims["sub"]
        session.flush()
    start_session(session, response, account.id, token)
    session.commit()


@router.post("/logout", status_code=204)
def log_out(
    response: Response,
    token: str | None = Cookie(default=None, alias=COOKIE),
    session: Session = Depends(get_session),
):
    end_session(session, token)
    session.commit()
    response.delete_cookie(COOKIE, httponly=True, secure=True, samesite="lax")


@router.get("")
def account_details(account: Account = Depends(current_account)):
    return {"email": account.email}
