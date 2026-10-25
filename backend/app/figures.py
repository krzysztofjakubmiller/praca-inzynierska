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
    # true to kolor egzaminu; nazwane kolory są na tła, np. woda i plaża. "tlo" zakrywa to, co
    # pod spodem, np. wnętrze sześciokąta wpisanego w zacieniowane koło.
    fill: bool | Literal["niebieski", "zolty", "tlo"] = False
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
    # Zacieniowany wycinek pod łukiem.
    fill: bool = False
    # Dwa łuki oznaczają kąty równe, np. przy dwusiecznej.
    arcs: Literal[1, 2] = 1


class Circle(Strict):
    # Okrąg o środku w nazwanym punkcie; radius_y zamienia go w elipsę, np. podstawę walca.
    center: str
    radius: Number = Field(gt=0)
    radius_y: Number | None = Field(default=None, gt=0)
    dashed: bool = False
    # Górna połowa elipsy przerywana: niewidoczna tylna krawędź podstawy walca lub stożka.
    back_dashed: bool = False
    fill: bool = False


class PlaneFigure(Strict):
    type: Literal["figura"]
    points: dict[str, Point]
    # Nazwy punktów wypisywane przy punktach; pozostałe punkty są tylko pomocnicze.
    names: list[str] = []
    polygons: list[Polygon] = []
    segments: list[Segment] = []
    dimensions: list[Dimension] = []
    angles: list[PlaneAngle] = []
    circles: list[Circle] = []
    # Punkty zaznaczone kropką, np. środek okręgu.
    dots: list[str] = []
    texts: list[Text] = []


class EdgeLabel(Strict):
    from_: str = Field(alias="from")
    to: str
    label: str


class SolidPoint(Strict):
    # Dodatkowy punkt bryły: środek podanych punktów albo punkt na okręgu podstawy walca,
    # stożka lub kuli pod kątem w stopniach (0 w prawo, 270 z przodu).
    midpoint: list[str] | None = Field(default=None, min_length=2)
    base: Number | None = None
    top: Number | None = None


class Solid(Strict):
    # Bryła opisana parametrami; frontend liczy z nich rzut ukośny jak w arkuszach CKE.
    type: Literal["bryla"]
    solid: Literal["prostopadloscian", "graniastoslup", "ostroslup", "walec", "stozek", "kula"]
    # Prostopadłościan: a to krawędź AB z przodu, b to głębokość AD, h to wysokość AE.
    # Graniastosłup i ostrosłup prawidłowy: n kątów podstawy, a krawędź podstawy, h wysokość.
    # Walec, stożek, kula: r promień, h wysokość.
    n: int | None = Field(default=None, ge=3)
    a: Number | None = Field(default=None, gt=0)
    b: Number | None = Field(default=None, gt=0)
    h: Number | None = Field(default=None, gt=0)
    r: Number | None = Field(default=None, gt=0)
    # Nazwy wierzchołków w kolejności opisanej przy solid_vertex_count. Nazwa z małej litery to
    # punkt pomocniczy bez podpisu, jak w figurach płaskich.
    names: list[str] = []
    points: dict[str, SolidPoint] = {}
    edge_labels: list[EdgeLabel] = []
    segments: list[Segment] = []
    polygons: list[Polygon] = []
    angles: list[PlaneAngle] = []
    dots: list[str] = []


class BarChartPanel(Strict):
    title: str | None = None
    values: list[Number] = Field(min_length=1)


class BarChart(Strict):
    # Kilka paneli ze wspólnymi kategoriami i osią stoi obok siebie, np. wyniki dwóch klas.
    type: Literal["diagram-slupkowy"]
    categories: list[str] = Field(min_length=1)
    charts: list[BarChartPanel] = Field(min_length=1)
    x_label: str | None = None
    y_label: str | None = None
    # Bez y_max i y_step oś dobiera się do największej wartości.
    y_max: Number | None = Field(default=None, gt=0)
    y_step: Number | None = Field(default=None, gt=0)
    # Liczby nad słupkami, gdy są na rysunku w arkuszu.
    show_values: bool = False


class PieSlice(Strict):
    value: Number = Field(gt=0)
    # Napis na wycinku, np. "42%", i opis w legendzie.
    label: str | None = None
    legend: str | None = None


class PieChart(Strict):
    # Wycinki od góry zgodnie z ruchem wskazówek zegara, w kolejności z listy.
    type: Literal["diagram-kolowy"]
    slices: list[PieSlice] = Field(min_length=2)


class TableCell(Strict):
    text: str
    # Komórka zajmująca kilka kolumn, np. nagłówek "Kartkówki" nad trzema ocenami.
    colspan: int = Field(default=1, ge=1)


class Table(Strict):
    # Tabela rysowana w HTML, bo KaTeX nie umie scalać komórek (\multicolumn).
    type: Literal["tabela"]
    # Komórka to sam tekst albo obiekt z colspan; tekst jak treść zadania, wzory w $...$.
    rows: list[list[str | TableCell]] = Field(min_length=1)
    # Pierwsze wiersze pogrubione jako nagłówek.
    header_rows: int = Field(default=0, ge=0)


# Rysunek, dla którego nie ma jeszcze grupy; czeka w bazie na uzupełnienie.
class UnknownFigure(Strict):
    type: Literal["nieznany"]


Figure = Annotated[
    NumberLine | CoordinatePlane | PlaneFigure | Solid | BarChart | PieChart | Table | UnknownFigure,
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
    if isinstance(figure, BarChart):
        return bar_chart_problems(figure)
    if isinstance(figure, Table):
        return table_problems(figure)
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
    used.update(circle.center for circle in figure.circles)
    used.update(figure.dots)
    problems = [f"nie ma punktu {name}" for name in sorted(used - figure.points.keys())]
    problems += [
        f"wielokąt {''.join(polygon.points)} ma mniej niż 3 punkty"
        for polygon in figure.polygons
        if len(polygon.points) < 3
    ]
    return problems


def bar_chart_problems(figure: BarChart) -> list[str]:
    problems = []
    for panel in figure.charts:
        name = f"diagram {panel.title}" if panel.title else "diagram"
        if len(panel.values) != len(figure.categories):
            problems.append(f"{name}: liczba słupków inna niż liczba kategorii")
        if any(value < 0 for value in panel.values):
            problems.append(f"{name}: ujemna wartość słupka")
        if figure.y_max is not None and max(panel.values) > figure.y_max:
            problems.append(f"{name}: słupek wyższy niż y_max")
    return problems


def cell_span(cell: str | TableCell) -> int:
    return cell.colspan if isinstance(cell, TableCell) else 1


def table_problems(figure: Table) -> list[str]:
    widths = [sum(cell_span(cell) for cell in row) for row in figure.rows]
    problems = []
    if len(set(widths)) > 1:
        problems.append(f"wiersze tabeli mają różną liczbę kolumn: {', '.join(map(str, widths))}")
    if figure.header_rows > len(figure.rows):
        problems.append("więcej wierszy nagłówka niż wierszy tabeli")
    return problems


SOLID_PARAMETERS = {
    "prostopadloscian": ("a", "b", "h"),
    "graniastoslup": ("n", "a", "h"),
    "ostroslup": ("n", "a", "h"),
    "walec": ("r", "h"),
    "stozek": ("r", "h"),
    "kula": ("r",),
}
ROUND_SOLIDS = {"walec", "stozek", "kula"}


# Kolejność wierzchołków w names: podstawa od lewego przedniego przeciwnie do ruchu wskazówek
# zegara (patrząc z góry), potem wierzchołki nad nimi albo wierzchołek ostrosłupa. Walec: środek
# dolnej i górnej podstawy; stożek: środek podstawy i wierzchołek; kula: środek.
def solid_vertex_count(figure: Solid) -> int:
    if figure.solid == "prostopadloscian":
        return 8
    if figure.solid == "graniastoslup":
        return 2 * (figure.n or 0)
    if figure.solid == "ostroslup":
        return (figure.n or 0) + 1
    return {"walec": 2, "stozek": 2, "kula": 1}[figure.solid]


def solid_edges(figure: Solid) -> set[frozenset[int]]:
    if figure.solid in ROUND_SOLIDS:
        return set()
    n = 4 if figure.solid == "prostopadloscian" else figure.n or 0
    edges = {frozenset((i, (i + 1) % n)) for i in range(n)}
    if figure.solid == "ostroslup":
        return edges | {frozenset((i, n)) for i in range(n)}
    return edges | {frozenset((n + i, n + (i + 1) % n)) for i in range(n)} | {
        frozenset((i, n + i)) for i in range(n)
    }


def solid_problems(figure: Solid) -> list[str]:
    problems = [
        f"brakuje parametru {name}"
        for name in SOLID_PARAMETERS[figure.solid]
        if getattr(figure, name) is None
    ]
    if problems:
        return problems
    count = solid_vertex_count(figure)
    if figure.names and len(figure.names) != count:
        problems.append(f"bryła ma {count} wierzchołków w names, a nazw jest {len(figure.names)}")

    known = {name for name in figure.names if name} | set(figure.points)
    used = set(figure.dots)
    for name, point in figure.points.items():
        given = [point.midpoint is not None, point.base is not None, point.top is not None]
        if sum(given) != 1:
            problems.append(f"punkt {name}: podaj dokładnie jedno z midpoint, base, top")
        if (point.base is not None or point.top is not None) and figure.solid not in ROUND_SOLIDS:
            problems.append(f"punkt {name}: base i top są tylko dla walca, stożka i kuli")
        if point.top is not None and figure.solid != "walec":
            problems.append(f"punkt {name}: top jest tylko dla walca")
        used.update(point.midpoint or [])
    for segment in figure.segments:
        used.update((segment.from_, segment.to))
    for polygon in figure.polygons:
        used.update(polygon.points)
    for angle in figure.angles:
        used.update((angle.vertex, angle.from_, angle.to))
    problems += [f"nie ma punktu {name}" for name in sorted(used - known)]

    index = {name: i for i, name in enumerate(figure.names) if name}
    edges = solid_edges(figure)
    for edge in figure.edge_labels:
        pair = {index.get(edge.from_), index.get(edge.to)}
        if None in pair or frozenset(pair) not in edges:
            problems.append(f"{edge.from_}{edge.to} nie jest krawędzią bryły; podpisz go w segments")
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
        texts += [segment.label for segment in figure.segments if segment.label]
        texts += [angle.label for angle in figure.angles if angle.label]
    if isinstance(figure, Table):
        texts += [cell.text if isinstance(cell, TableCell) else cell for row in figure.rows for cell in row]
    return texts


# Zapis do bazy w tej postaci, w jakiej przyszedł: bez dopisywania pól z wartościami domyślnymi.
def figures_json(figures: dict[str, Figure] | None) -> dict | None:
    if not figures:
        return None
    return {
        place: figure.model_dump(mode="json", by_alias=True, exclude_unset=True)
        for place, figure in figures.items()
    }
