from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class Interval(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Brak końca (null) to przedział do brzegu osi. "from" jest słowem kluczowym Pythona.
    from_: int | None = Field(default=None, alias="from")
    to: int | None = None
    from_closed: bool = False
    to_closed: bool = False


class NumberLine(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Zakres osi wynika z podpisów i końców przedziałów, dlatego nie ma go w formacie.
    type: Literal["os-liczbowa"]
    # Na razie tylko liczby całkowite, bo kreski są co 1; inna oś to rysunek "nieznany".
    labels: list[int] = []
    intervals: list[Interval] = []


# Rysunek, dla którego nie ma jeszcze grupy; czeka w bazie na uzupełnienie.
class UnknownFigure(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["nieznany"]


Figure = Annotated[NumberLine | UnknownFigure, Field(discriminator="type")]


def figure_problems(figure: Figure) -> list[str]:
    if not isinstance(figure, NumberLine):
        return []

    problems = []
    numbers = list(figure.labels)
    for interval in figure.intervals:
        ends = [end for end in (interval.from_, interval.to) if end is not None]
        numbers += ends
        if len(ends) == 2 and ends[0] >= ends[1]:
            problems.append(
                f"przedział od {ends[0]} do {ends[1]}: początek nie jest przed końcem"
            )
    if not numbers:
        problems.append("oś bez podpisów i końców przedziałów")
    return problems


# Zapis do bazy w tej postaci, w jakiej przyszedł: bez dopisywania pól z wartościami domyślnymi.
def figures_json(figures: dict[str, Figure] | None) -> dict | None:
    if not figures:
        return None
    return {
        place: figure.model_dump(by_alias=True, exclude_unset=True)
        for place, figure in figures.items()
    }
