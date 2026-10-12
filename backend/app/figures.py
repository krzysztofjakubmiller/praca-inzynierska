from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


# Bez float liczba całkowita z JSON-a wracałaby do bazy jako 3.0.
Number = int | float
Point = tuple[Number, Number]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Interval(Strict):
    # Brak końca (null) to przedział do brzegu osi. "from" jest słowem kluczowym Pythona.
    from_: int | None = Field(default=None, alias="from")
    to: int | None = None
    from_closed: bool = False
    to_closed: bool = False


class NumberLine(Strict):
    # Zakres osi wynika z podpisów i końców przedziałów, dlatego nie ma go w formacie.
    type: Literal["os-liczbowa"]
    # Na razie tylko liczby całkowite, bo kreski są co 1; inna oś to rysunek "nieznany".
    labels: list[int] = []
    intervals: list[Interval] = []


class Text(Strict):
    # Tekst jak treść zadania: wzory w $...$. at to środek napisu.
    text: str
    at: Point


# Wykres zadany punktami, przez które przechodzi: Gemini odczytuje je z kratki, a wzór liczy
# frontend. Prosta przechodzi przez 2 punkty, parabola przez 3.
class LinearGraph(Strict):
    kind: Literal["liniowa"]
    through: tuple[Point, Point]
    # Fragment wykresu: from i to ograniczają x; bez nich wykres do brzegu kratki.
    from_: Number | None = Field(default=None, alias="from")
    to: Number | None = None
    # Kółko na końcu fragmentu: true pełne (koniec należy do wykresu), false puste,
    # brak pola to brak kółka, np. tam, gdzie fragmenty się łączą.
    from_closed: bool | None = None
    to_closed: bool | None = None


class QuadraticGraph(Strict):
    kind: Literal["kwadratowa"]
    through: tuple[Point, Point, Point]
    from_: Number | None = Field(default=None, alias="from")
    to: Number | None = None
    from_closed: bool | None = None
    to_closed: bool | None = None


class Angle(Strict):
    # Łuk kąta o wierzchołku vertex między półprostymi w stronę punktów from i to.
    vertex: Point
    from_: Point = Field(alias="from")
    to: Point
    radius: Number = 1


class CoordinatePlane(Strict):
    type: Literal["uklad-wspolrzednych"]
    x: tuple[int, int]
    y: tuple[int, int]
    grid: bool = True
    # Bez list podpisów: przy kratce podpisane są wszystkie liczby, bez kratki żadna.
    x_labels: list[int] | None = None
    y_labels: list[int] | None = None
    graphs: list[Annotated[LinearGraph | QuadraticGraph, Field(discriminator="kind")]] = []
    points: list[Point] = []
    angles: list[Angle] = []
    texts: list[Text] = []


class Segment(Strict):
    from_: str = Field(alias="from")
    to: str
    dashed: bool = False
    label: str | None = None
    # Grot na końcu "to", np. od napisu do wskazywanego miejsca.
    arrow: bool = False


class Polygon(Strict):
    points: list[str]
    # true to kolor egzaminu; nazwane kolory są na tła, np. woda i plaża.
    fill: bool | Literal["niebieski", "zolty"] = False
    dashed: bool = False
    # Bez obrysu wielokąt jest samym kolorowym tłem.
    outline: bool = True


class Dimension(Strict):
    # Strzałka wymiaru z podpisem, np. długość boku działki.
    from_: Point = Field(alias="from")
    to: Point
    label: str


class PlaneAngle(Strict):
    # Kąt przy wierzchołku vertex między odcinkami do punktów from i to, podanych nazwami.
    vertex: str
    from_: str = Field(alias="from")
    to: str
    label: str | None = None
    # Kąt prosty: łuk z kropką, jak w arkuszach CKE.
    right: bool = False


class PlaneFigure(Strict):
    type: Literal["figura"]
    points: dict[str, Point]
    # Nazwy punktów wypisywane przy punktach; pozostałe punkty są tylko pomocnicze.
    names: list[str] = []
    polygons: list[Polygon] = []
    segments: list[Segment] = []
    dimensions: list[Dimension] = []
    angles: list[PlaneAngle] = []
    texts: list[Text] = []


class EdgeLabel(Strict):
    from_: str = Field(alias="from")
    to: str
    label: str


class Solid(Strict):
    type: Literal["bryla"]
    solid: Literal["prostopadloscian"]
    # a to krawędź AB z przodu, b to głębokość AD, h to wysokość AE.
    a: Number = Field(gt=0)
    b: Number = Field(gt=0)
    h: Number = Field(gt=0)
    # Wierzchołki po kolei: podstawa A, B, C, D, potem nad nimi E, F, G, H.
    names: list[str] = []
    edge_labels: list[EdgeLabel] = []


# Rysunek, dla którego nie ma jeszcze grupy; czeka w bazie na uzupełnienie.
class UnknownFigure(Strict):
    type: Literal["nieznany"]


Figure = Annotated[
    NumberLine | CoordinatePlane | PlaneFigure | Solid | UnknownFigure,
    Field(discriminator="type"),
]


def figure_problems(figure: Figure) -> list[str]:
    if isinstance(figure, NumberLine):
        return number_line_problems(figure)
    if isinstance(figure, CoordinatePlane):
        return coordinate_plane_problems(figure)
    if isinstance(figure, PlaneFigure):
        return plane_figure_problems(figure)
    if isinstance(figure, Solid):
        return solid_problems(figure)
    return []


def number_line_problems(figure: NumberLine) -> list[str]:
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


def coordinate_plane_problems(figure: CoordinatePlane) -> list[str]:
    problems = []
    for axis, (low, high) in (("x", figure.x), ("y", figure.y)):
        # Osie układu leżą na zerze, więc zero musi być w zakresie.
        if not low <= 0 <= high or low == high:
            problems.append(f"zakres {axis} od {low} do {high} musi zawierać 0")
        labels = getattr(figure, f"{axis}_labels") or []
        problems += [
            f"podpis {label} poza osią {axis}" for label in labels if not low <= label <= high
        ]
    for graph in figure.graphs:
        xs = [point[0] for point in graph.through]
        through = ", ".join(f"({x}, {y})" for x, y in graph.through)
        if len(set(xs)) < len(xs):
            problems.append(f"wykres przez punkty {through}: dwa punkty mają ten sam x")
        elif graph.kind == "kwadratowa" and collinear(*graph.through):
            problems.append(f"parabola przez punkty {through}: punkty leżą na prostej")
        if graph.from_ is not None and graph.to is not None and graph.from_ >= graph.to:
            problems.append(
                f"wykres od {graph.from_} do {graph.to}: początek nie jest przed końcem"
            )
        if graph.from_closed is not None and graph.from_ is None:
            problems.append(f"wykres przez punkty {through}: kółko from_closed bez from")
        if graph.to_closed is not None and graph.to is None:
            problems.append(f"wykres przez punkty {through}: kółko to_closed bez to")
    for angle in figure.angles:
        if angle.from_ == angle.vertex or angle.to == angle.vertex:
            problems.append("ramię kąta zaczyna się i kończy w wierzchołku")
    return problems


def collinear(a: Point, b: Point, c: Point) -> bool:
    return abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-9


def plane_figure_problems(figure: PlaneFigure) -> list[str]:
    used = set(figure.names)
    for polygon in figure.polygons:
        used.update(polygon.points)
    for segment in figure.segments:
        used.update((segment.from_, segment.to))
    for angle in figure.angles:
        used.update((angle.vertex, angle.from_, angle.to))
    problems = [f"nie ma punktu {name}" for name in sorted(used - figure.points.keys())]
    problems += [
        f"wielokąt {''.join(polygon.points)} ma mniej niż 3 punkty"
        for polygon in figure.polygons
        if len(polygon.points) < 3
    ]
    return problems


def solid_problems(figure: Solid) -> list[str]:
    problems = []
    if figure.names and len(figure.names) != 8:
        problems.append("prostopadłościan ma 8 wierzchołków, a nazw jest inaczej")
    for edge in figure.edge_labels:
        if not {edge.from_, edge.to} <= set(figure.names):
            problems.append(f"krawędź {edge.from_}{edge.to}: nie ma takich wierzchołków")
    return problems


# Napisy na rysunku, żeby sprawdzić w nich LaTeX tak samo jak w treści zadania.
def figure_texts(figure: Figure) -> list[str]:
    texts = [text.text for text in getattr(figure, "texts", [])]
    if isinstance(figure, PlaneFigure):
        texts += [segment.label for segment in figure.segments if segment.label]
        texts += [dimension.label for dimension in figure.dimensions]
        texts += [angle.label for angle in figure.angles if angle.label]
    if isinstance(figure, Solid):
        texts += [edge.label for edge in figure.edge_labels]
    return texts


# Zapis do bazy w tej postaci, w jakiej przyszedł: bez dopisywania pól z wartościami domyślnymi.
def figures_json(figures: dict[str, Figure] | None) -> dict | None:
    if not figures:
        return None
    return {
        place: figure.model_dump(mode="json", by_alias=True, exclude_unset=True)
        for place, figure in figures.items()
    }
