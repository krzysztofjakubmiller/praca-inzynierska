import pytest
from pydantic import TypeAdapter

from app.figures import Figure, figure_problems, figures_json

FIGURE = TypeAdapter(Figure)


def problems(data):
    return figure_problems(FIGURE.validate_python(data))


def plane(**changes):
    figure = {"type": "uklad-wspolrzednych", "x": [-5, 3], "y": [-4, 4]}
    figure.update(changes)
    return figure


def test_coordinate_plane_keeps_its_json():
    data = plane(
        graphs=[
            {"kind": "liniowa", "through": [[-2, 0], [0, -4]]},
            {"kind": "kwadratowa", "through": [[-1, 9], [0, 8], [2, 0]], "from": 0, "to": 2.5},
            {"kind": "liniowa", "through": [[1, 5], [2, 5]], "from": 1, "to": 2, "from_closed": False},
        ],
        points=[[0, 4]],
        angles=[{"vertex": [-2, 0], "from": [1, 0], "to": [-3, 2], "radius": 1.5}],
        texts=[{"text": "$y=f(x)$", "at": [-3, 4.5]}],
    )

    assert figures_json({"content": FIGURE.validate_python(data)}) == {"content": data}
    assert problems(data) == []


@pytest.mark.parametrize(
    "changes, problem",
    [
        ({"x": [1, 5]}, "zakres x od 1 do 5 musi zawierać 0"),
        ({"x_labels": [7]}, "podpis 7 poza osią x"),
        (
            {"graphs": [{"kind": "kwadratowa", "through": [[0, 0], [1, 1], [2, 2]]}]},
            "parabola przez punkty (0, 0), (1, 1), (2, 2): punkty leżą na prostej",
        ),
        (
            {"graphs": [{"kind": "liniowa", "through": [[1, 0], [1, 3]]}]},
            "wykres przez punkty (1, 0), (1, 3): dwa punkty mają ten sam x",
        ),
        (
            {"graphs": [{"kind": "liniowa", "through": [[0, 0], [1, 1]], "from": 2, "to": 1}]},
            "wykres od 2 do 1: początek nie jest przed końcem",
        ),
        (
            {"graphs": [{"kind": "liniowa", "through": [[0, 0], [1, 1]], "to_closed": True}]},
            "wykres przez punkty (0, 0), (1, 1): kółko to_closed bez to",
        ),
        (
            {"angles": [{"vertex": [0, 0], "from": [0, 0], "to": [1, 1]}]},
            "ramię kąta zaczyna się i kończy w wierzchołku",
        ),
    ],
)
def test_coordinate_plane_problems(changes, problem):
    assert problems(plane(**changes)) == [problem]


def test_plane_figure_refers_only_to_its_points():
    data = {
        "type": "figura",
        "points": {"A": [0, 0], "B": [4, 0], "C": [4, 4]},
        "names": ["A", "D"],
        "polygons": [{"points": ["A", "B"], "fill": True}],
        "segments": [{"from": "A", "to": "E", "label": "$2x$"}],
        "dimensions": [{"from": [0, -1], "to": [4, -1], "label": "400 m"}],
        "angles": [{"vertex": "B", "from": "A", "to": "F", "right": True}],
    }

    assert problems(data) == [
        "nie ma punktu D",
        "nie ma punktu E",
        "nie ma punktu F",
        "wielokąt AB ma mniej niż 3 punkty",
    ]


def test_solid_needs_eight_names_for_its_vertices():
    data = {
        "type": "bryla",
        "solid": "prostopadloscian",
        "a": 1,
        "b": 1,
        "h": 2,
        "names": list("ABCDEF"),
        "edge_labels": [{"from": "A", "to": "H", "label": "$x$"}],
    }

    assert problems(data) == [
        "bryła ma 8 wierzchołków w names, a nazw jest 6",
        "AH nie jest krawędzią bryły; podpisz go w segments",
    ]


def test_solid_needs_its_parameters():
    assert problems({"type": "bryla", "solid": "ostroslup", "n": 4, "a": 6}) == [
        "brakuje parametru h"
    ]


def test_pyramid_with_extra_points_and_marks():
    data = {
        "type": "bryla",
        "solid": "ostroslup",
        "n": 4,
        "a": 6,
        "h": 4,
        "names": ["A", "B", "C", "D", "S"],
        "points": {"O": {"midpoint": ["A", "C"]}, "M": {"midpoint": ["B", "C"]}},
        "segments": [{"from": "S", "to": "O", "dashed": True}, {"from": "S", "to": "M", "label": "$6$"}],
        "polygons": [{"points": ["S", "O", "M"], "fill": True}],
        "angles": [{"vertex": "O", "from": "M", "to": "S", "right": True}],
        "edge_labels": [{"from": "A", "to": "B", "label": "$6$"}],
    }

    assert figures_json({"content": FIGURE.validate_python(data)}) == {"content": data}
    assert problems(data) == []

    data["edge_labels"] = [{"from": "A", "to": "C", "label": "$x$"}]
    data["points"]["P"] = {"base": 270}
    assert problems(data) == [
        "punkt P: base i top są tylko dla walca, stożka i kuli",
        "AC nie jest krawędzią bryły; podpisz go w segments",
    ]


def test_cylinder_points_lie_on_its_bases():
    data = {
        "type": "bryla",
        "solid": "walec",
        "r": 2,
        "h": 3,
        "points": {"A": {"base": 200}, "D": {"top": 200}, "B": {"base": 340}},
        "polygons": [{"points": ["A", "B", "D"], "fill": True}],
        "angles": [{"vertex": "B", "from": "A", "to": "D", "label": "$30^\\circ$"}],
    }

    assert problems(data) == []


def test_plane_figure_takes_only_known_fill_colors():
    data = {
        "type": "figura",
        "points": {"A": [0, 0], "B": [4, 0], "C": [4, 4]},
        "polygons": [{"points": ["A", "B", "C"], "fill": "niebieski", "outline": False}],
        "segments": [{"from": "A", "to": "C", "arrow": True}],
    }
    assert problems(data) == []

    data["polygons"][0]["fill"] = "czerwony"
    with pytest.raises(ValueError):
        problems(data)


def test_plane_figure_circles_and_dots_refer_to_its_points():
    data = {
        "type": "figura",
        "points": {"S": [0, 0], "A": [3, 0], "B": [0, 3]},
        "circles": [{"center": "S", "radius": 3}, {"center": "T", "radius": 1, "radius_y": 0.4}],
        "dots": ["S", "P"],
        "angles": [{"vertex": "S", "from": "A", "to": "B", "fill": True, "arcs": 2}],
    }

    assert problems(data) == ["nie ma punktu P", "nie ma punktu T"]


def test_bar_chart_needs_one_value_per_category():
    data = {
        "type": "diagram-slupkowy",
        "categories": ["1", "2", "3"],
        "charts": [{"title": "klasa IV A", "values": [1, 6, 3]}, {"values": [2, 9]}],
        "y_max": 8,
    }

    assert problems(data) == [
        "diagram: liczba słupków inna niż liczba kategorii",
        "diagram: słupek wyższy niż y_max",
    ]


def test_pie_chart_keeps_its_json():
    data = {
        "type": "diagram-kolowy",
        "slices": [{"value": 42, "label": "42%", "legend": "mecze bez goli"}, {"value": 58}],
    }

    assert figures_json({"content": FIGURE.validate_python(data)}) == {"content": data}
    assert problems(data) == []


def test_table_rows_must_have_the_same_width():
    data = {
        "type": "tabela",
        "rows": [
            [{"text": "Kartkówki", "colspan": 3}, "Projekty"],
            ["$4$", "$4$", "$3$", "$2$"],
            ["$5$"],
        ],
        "header_rows": 1,
    }

    assert problems(data) == ["wiersze tabeli mają różną liczbę kolumn: 4, 4, 1"]

    data["rows"].pop()
    assert figures_json({"content": FIGURE.validate_python(data)}) == {"content": data}
    assert problems(data) == []
