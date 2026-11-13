import csv
import json
import re
import sys
from pathlib import Path

from app.db import SessionLocal
from app.grading import GradingUnavailable, ask, tutor_system
from app.models import Task
from app.practice import task_for_model

# Porównanie modeli w roli Dyżurnego na stałym zestawie przypadków (cases.json i obrazy
# w jednym folderze). Odpowiedzi zbiera się do porownanie-dyzurnego.csv w tym samym folderze
# razem z kryteriami przypadku; ocenia je człowiek, a skrypt sprawdza tylko zasady stylu.
# Użycie: python -m app.compare_tutor FOLDER model1,model2,... [powtórzenia]

# Zasady stylu z instrukcji Dyżurnego, które da się sprawdzić bez czytania odpowiedzi.
MARKDOWN = re.compile(r"\*\*|^#|^\s*[-*] ", re.MULTILINE)
SECOND_PERSON_PAST = re.compile(r"\w+(łeś|łaś)\b", re.IGNORECASE)

COLUMNS = [
    "przypadek",
    "model",
    "powtorzenie",
    "kryteria",
    "markdown",
    "forma_rodzaju",
    "znaki",
    "sekundy",
    "koszt",
    "odpowiedz",
]


def compare(folder: Path, models: list[str], repeats: int) -> dict:
    cases = json.loads((folder / "cases.json").read_text(encoding="utf-8"))
    summary = {model: {"cost": 0.0, "seconds": 0.0, "answers": 0} for model in models}
    with SessionLocal() as session, open(
        folder / "porownanie-dyzurnego.csv", "w", newline="", encoding="utf-8-sig"
    ) as file:
        writer = csv.writer(file, delimiter=";")
        writer.writerow(COLUMNS)
        for case in cases:
            described = task_for_model(session.get(Task, case["task"]))
            if case["checked"]:
                described += "\n\n" + case["attempt"]
            system = tutor_system(described, case["checked"])
            messages = [*case["history"], {"role": "user", "content": case["question"]}]
            image = (folder / case["image"]).read_bytes() if case.get("image") else None
            criteria = " | ".join(case["criteria"])
            for model in models:
                for repeat in range(1, repeats + 1):
                    try:
                        reply = ask(system, messages, image, "image/png", models=[model])
                    except GradingUnavailable:
                        writer.writerow([case["id"], model, repeat, criteria, "blad"] + [""] * 5)
                        continue
                    found = SECOND_PERSON_PAST.finditer(reply.text)
                    writer.writerow(
                        [
                            case["id"],
                            model,
                            repeat,
                            criteria,
                            bool(MARKDOWN.search(reply.text)),
                            ", ".join(match.group(0) for match in found),
                            len(reply.text),
                            round(reply.seconds, 1),
                            reply.cost,
                            reply.text,
                        ]
                    )
                    totals = summary[model]
                    totals["cost"] += reply.cost or 0
                    totals["seconds"] += reply.seconds
                    totals["answers"] += 1
                    print(case["id"], model, repeat, flush=True)
    return summary


if __name__ == "__main__":
    repeats = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    summary = compare(Path(sys.argv[1]), sys.argv[2].split(","), repeats)
    for model, totals in summary.items():
        answers = totals["answers"] or 1
        print(
            f"{model}: {1000 * totals['cost'] / answers:.2f} USD na 1000 odpowiedzi,"
            f" średnio {totals['seconds'] / answers:.1f} s"
        )
