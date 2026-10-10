# Matma po kolei

Aplikacja internetowa do przygotowania do matury z matematyki i egzaminu ósmoklasisty. Projekt powstaje jako praca inżynierska.

## Struktura

- `frontend/` - Vue 3, TypeScript, Vite
- `backend/` - FastAPI, SQLAlchemy, Alembic
- `compose.yaml` - PostgreSQL do pracy lokalnej
- `render.yaml` - konfiguracja wdrożenia na Renderze

## Wymagania

- Node.js 22.18+ lub 24.12+
- Python 3.14
- Docker

## Uruchomienie

Frontend:

```
cd frontend
npm install
npm run dev
```

Backend (baza w Dockerze, reszta w środowisku wirtualnym `backend/.venv`):

```
docker compose up -d
cd backend
python -m venv .venv
```

Po aktywacji środowiska:

```
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

API działa pod `http://localhost:8000`, dokumentacja pod `/docs`. Serwer deweloperski frontendu przekazuje zapytania `/api` do backendu.

Do czasu logowania cała aplikacja jest za jednym hasłem ze zmiennej `ACCESS_PASSWORD` backendu, więc trzeba ją ustawić przed uruchomieniem serwera. Bez niej backend odrzuca każde hasło. Panel właściciela (`/panel`) służy do importu zadań i ich sprawdzania.

## Wdrożenie

Konfiguracja Rendera jest w `render.yaml`: strona statyczna z frontendem, backend i PostgreSQL we Frankfurcie. Przed każdym wdrożeniem backendu uruchamiają się migracje i dane startowe.

Zmienne środowiskowe backendu:

- `DATABASE_URL` - adres bazy, na Renderze podstawiany automatycznie
- `ACCESS_PASSWORD` - hasło do aplikacji
- `FRONTEND_ORIGINS` - adresy frontendu oddzielone przecinkami, dla których API przyjmuje zapytania z przeglądarki

Zmienna frontendu przy buildzie:

- `VITE_API_URL` - adres backendu; lokalnie pusta

## Komendy

W folderze `frontend`:

- `npm run dev` - serwer deweloperski
- `npm run build` - sprawdzenie typów i build produkcyjny
- `npm run preview` - podgląd buildu
- `npm run test:unit` - testy jednostkowe (Vitest)
- `npm run lint` - lint (Oxlint, ESLint)
- `npm run format` - formatowanie (Prettier)

W folderze `backend`:

- `uvicorn app.main:app --reload` - serwer deweloperski
- `python -m pytest` - testy (potrzebują bazy z `docker compose up -d`)
- `alembic upgrade head` - zastosowanie migracji
- `alembic revision --autogenerate -m "opis"` - nowa migracja po zmianie `app/models.py`
- `python -m app.seed` - dane startowe: egzaminy, rodzaje źródeł, tematy
- `python -m app.import_tasks plik.json` - import zadań z pliku JSON (cały plik albo nic)
