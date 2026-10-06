from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Exam, SourceKind, Topic

EXAMS = {
    "matura-podstawowa": "Egzamin maturalny z matematyki na poziomie podstawowym",
    "matura-rozszerzona": "Egzamin maturalny z matematyki na poziomie rozszerzonym",
    "e8": "Egzamin ósmoklasisty z matematyki",
}

SOURCE_KINDS = {
    "matura-podstawowa": {
        "glowny": "Termin główny",
        "dodatkowy": "Termin dodatkowy",
        "poprawkowy": "Termin poprawkowy",
        "probny": "Próbny egzamin maturalny",
        "informator": "Informator",
    },
    "matura-rozszerzona": {
        "glowny": "Termin główny",
        "dodatkowy": "Termin dodatkowy",
        "probny": "Próbny egzamin maturalny",
        "informator": "Informator",
    },
    "e8": {
        "glowny": "Termin główny",
        "dodatkowy": "Termin dodatkowy",
        "probny": "Próbny egzamin ósmoklasisty",
    },
}

# Kody takie same jak klucze stacji w frontend/src/maps/basic/graph.ts.
TOPICS = {
    "matura-podstawowa": {
        "logarytmy": "Logarytmy",
        "liczby-potegi": "Liczby. Potęgi",
        "algebra": "Algebra",
        "dowody-algebra": "Dowody (algebra)",
        "rownania-nierownosci": "Równania. Nierówności",
        "wykresy": "Wykresy",
        "wielomiany": "Wielomiany",
        "wartosc-bezwzgledna": "Wartość bezwzględna",
        "funkcja-liniowa": "Funkcja liniowa",
        "uklad-rownan": "Układ równań",
        "ciagi": "Ciągi",
        "funkcja-kwadratowa": "Funkcja kwadratowa",
        "optymalizacja": "Optymalizacja",
        "inne-funkcje": "Inne funkcje",
        "procenty": "Procenty",
        "statystyka": "Statystyka",
        "kombinatoryka": "Kombinatoryka",
        "rachunek-prawdopodobienstwa": "Rachunek prawdopodobieństwa",
        "geometria-analityczna": "Geometria analityczna",
        "trygonometria": "Trygonometria",
        "planimetria": "Planimetria",
        "stereometria": "Stereometria",
        "dowody-geometria": "Dowody (geometria)",
    },
}


# Dopisuje brakujący wiersz albo poprawia nazwę istniejącego, więc skrypt
# można uruchamiać wiele razy bez dublowania danych.
def save(session: Session, model, name: str, **key):
    row = session.scalar(select(model).filter_by(**key))
    if row is None:
        row = model(**key)
        session.add(row)
    row.name = name
    return row


def seed(session: Session) -> None:
    for exam_code, exam_name in EXAMS.items():
        exam = save(session, Exam, exam_name, code=exam_code)
        session.flush()  # nowy egzamin dostaje id dopiero po zapisie, a niżej jest potrzebne
        for code, name in SOURCE_KINDS[exam_code].items():
            save(session, SourceKind, name, exam_id=exam.id, code=code)
        for code, name in TOPICS.get(exam_code, {}).items():
            save(session, Topic, name, exam_id=exam.id, code=code)


if __name__ == "__main__":
    with SessionLocal() as session:
        seed(session)
        session.commit()
    print("Dane startowe zapisane.")
