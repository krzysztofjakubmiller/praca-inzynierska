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
        "prostopadłościan ma 8 wierzchołków, a nazw jest inaczej",
        "krawędź AH: nie ma takich wierzchołków",
    ]


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
