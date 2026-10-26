import pytest

from app.equivalence import equivalent, expected_problem, read_latex


@pytest.mark.parametrize(
    "student, expected, kind",
    [
        ("11/24", "$\\frac{11}{24}$", "liczba"),
        ("22/48", "$\\frac{11}{24}$", "liczba"),
        ("1,2", "$p=1{,}2$", "liczba"),
        ("6/5", "$p=1{,}2$", "liczba"),
        ("0.5", "$\\frac{1}{2}$", "liczba"),
        (".5", "$\\frac{1}{2}$", "liczba"),
        ("2,5", "$\\frac{5}{2}$", "liczba"),
        ("p = 1.2", "$p=1{,}2$", "liczba"),
        ("48", "$V=48$", "liczba"),
        ("48 cm", "$48$", "liczba"),
        ("735000", "$735\\,000 \\text{ zł}$", "liczba"),
        ("10 000", "$10\\,000\\text{ m}^2$", "liczba"),
        ("2 pi", "$2\\pi$", "liczba"),
        ("120", "$120^\\circ$", "liczba"),
        ("2sqrt(13)", "$|BC|=2\\sqrt{13}$", "liczba"),
        ("2sqrt(2)", "$\\sqrt{8}$", "liczba"),
        ("2√2", "$2\\sqrt{2}$", "liczba"),
        ("\\frac{\\sqrt{3}}{2}", "$\\frac{\\sqrt{3}}{2}$", "liczba"),
        ("sqrt(3)/2", "$\\frac{\\sqrt{3}}{2}$", "liczba"),
        ("2^10", "$1024$", "liczba"),
        ("6:3", "$2$", "liczba"),
        ("-3; 1", "$x=-3$, $x=1$", "wartosci"),
        ("1; -3", "$x=-3$, $x=1$", "wartosci"),
        ("x=1 lub x=-3", "$x=-3$, $x=1$", "wartosci"),
        ("3; -3", "$x=-3 \\text{ lub } x=3$", "wartosci"),
        ("x1 = -3, x2 = 1", "$x_1=-3$, $x_2=1$", "wartosci"),
        ("(-3, 1)", "$x \\in (-3, 1)$", "przedzial"),
        ("(-3; 1)", "$(-3, 1)$", "przedzial"),
        ("-3<x<1", "$(-3, 1)$", "przedzial"),
        ("x > 2", "$(2, +\\infty)$", "przedzial"),
        ("(-oo, 2] U (5, oo)", "$(-\\infty, 2] \\cup (5, +\\infty)$", "przedzial"),
        ("x<=2 lub x>5", "$(-\\infty, 2] \\cup (5, +\\infty)$", "przedzial"),
        ("<2; 5>", "$\\langle 2, 5 \\rangle$", "przedzial"),
        ("[2; 5]", "$\\left\\langle 2, 5 \\right\\rangle$", "przedzial"),
        ("R", "$\\mathbb{R}$", "przedzial"),
        ("∅", "$\\emptyset$", "przedzial"),
        ("(2; -1)", "$(2, -1)$", "punkt"),
        ("(2,-1)", "$P=(2, -1)$", "punkt"),
        ("x=2, y=-1", "$x=2$, $y=-1$", "punkt"),
        ("y = 2x + 1", "$y=2x+1$", "rownanie"),
        ("2x - y + 1 = 0", "$y=2x+1$", "rownanie"),
        ("4x - 2y = -2", "$y=2x+1$", "rownanie"),
        ("x(3x - 2)", "$3x^2-2x$", "wyrazenie"),
    ],
)
def test_equivalent_answers(student, expected, kind):
    assert equivalent(student, expected, kind) is True


@pytest.mark.parametrize(
    "student, expected, kind",
    [
        ("11/25", "$\\frac{11}{24}$", "liczba"),
        ("0,46", "$\\frac{11}{24}$", "liczba"),
        ("-2sqrt(2)", "$2\\sqrt{2}$", "liczba"),
        ("2", "$2\\pi$", "liczba"),
        ("-3", "$x=-3$, $x=1$", "wartosci"),
        ("-3; 1; 2", "$x=-3$, $x=1$", "wartosci"),
        ("[-3, 1]", "$(-3, 1)$", "przedzial"),
        ("x < 2", "$(2, +\\infty)$", "przedzial"),
        ("(-1; 2)", "$(2, -1)$", "punkt"),
        ("y = 2x - 1", "$y=2x+1$", "rownanie"),
        ("3x^2 + 2x", "$3x^2-2x$", "wyrazenie"),
    ],
)
def test_different_answers(student, expected, kind):
    assert equivalent(student, expected, kind) is False


@pytest.mark.parametrize(
    "student, expected, kind",
    [
        ("", "$2$", "liczba"),
        ("nie wiem", "$2$", "liczba"),
        ("2 + * 3", "$6$", "liczba"),
        ("(2", "$2$", "liczba"),
        ("1/0", "$2$", "liczba"),
        ("__import__('os')", "$2$", "liczba"),
        ("pi.n(20000)", "$2$", "liczba"),
        ("x.n(5)", "$2$", "liczba"),
        ("sqrt.x", "$2$", "liczba"),
        ("(2).n(5)", "$2$", "liczba"),
        ("2.n(5)", "$2$", "liczba"),
        ("9^9^9^9", "$2$", "liczba"),
        ("1" * 300, "$2$", "liczba"),
        ("(1, 2, 3)", "$(1, 2)$", "przedzial"),
        ("2x + 1", "$y=2x+1$", "rownanie"),
    ],
)
def test_unreadable_answer_is_not_wrong(student, expected, kind):
    assert equivalent(student, expected, kind) is None


def test_unreadable_expected_is_a_data_error():
    with pytest.raises(ValueError):
        equivalent("2", "$\\log_2 4$", "liczba")


def test_expected_problem_names_the_result():
    assert expected_problem("$x=-3$, $x=1$", "wartosci") is None
    assert expected_problem("$x \\in \\mathbb{R} \\setminus \\{2\\}$", "przedzial") == (
        "nie da się odczytać wyniku $x \\in \\mathbb{R} \\setminus \\{2\\}$ jako przedzial"
    )


@pytest.mark.parametrize(
    "student, kind, shown",
    [
        ("11/24", "liczba", "\\frac{11}{24}"),
        ("0,25", "liczba", "0{,}25"),
        ("1/3", "liczba", "\\frac{1}{3}"),
        ("2sqrt(3)", "liczba", "2 \\sqrt{3}"),
        ("48 cm", "liczba", "48"),
        ("x=1 lub x=-3", "wartosci", "-3; 1"),
        ("(2; -1,5)", "punkt", "(2; -1{,}5)"),
        ("(-3; 1]", "przedzial", "\\left(-3, 1\\right]"),
        ("y=2x+1", "rownanie", "y = 2 x + 1"),
        ("x(3x-2)", "wyrazenie", "x \\left(3 x - 2\\right)"),
    ],
)
def test_preview_shows_what_was_read(student, kind, shown):
    assert read_latex(student, kind) == shown


@pytest.mark.parametrize("student", ["", "nie wiem", "pi.n(20)", "1" * 300])
def test_preview_of_unreadable_answer_is_none(student):
    assert read_latex(student, "liczba") is None
