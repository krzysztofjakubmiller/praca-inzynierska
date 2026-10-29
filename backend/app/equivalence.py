import re

from sympy import (
    EmptySet,
    Expr,
    FiniteSet,
    Ge,
    Gt,
    Interval,
    Le,
    Lt,
    Pow,
    S,
    Symbol,
    Union,
    default_sort_key,
    latex,
    nan,
    oo,
    pi,
    postorder_traversal,
    root,
    simplify,
    solveset,
    sqrt,
    zoo,
)
from sympy.parsing.sympy_parser import (
    implicit_multiplication_application,
    parse_expr,
    rationalize,
    standard_transformations,
)

KINDS = ("liczba", "wartosci", "przedzial", "punkt", "rownanie", "wyrazenie")

MAX_LENGTH = 200
# 9^(9^9) liczyłby się w nieskończoność, a na maturze wykładniki są małe.
MAX_EXPONENT = 100

# rationalize: 1.2 staje się 6/5, więc porównanie jest dokładne, bez błędów zaokrągleń.
TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application, rationalize)
# Każda litera to zwykła zmienna. Bez tego E, I, N, S, O znaczyłyby w SymPy coś innego.
NAMES = {letter: Symbol(letter) for letter in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"}
NAMES |= {"sqrt": sqrt, "root": root, "pi": pi, "oo": oo}
FUNCTIONS = {"sqrt", "root", "pi", "oo"}

# parse_expr w środku używa eval, więc przepuszcza tylko cyfry, litery, działania i nawiasy.
# Bez podkreślników i cudzysłowów nie da się dojść do niczego w Pythonie.
SAFE_TEXT = re.compile(r"[0-9A-Za-z+\-*/().\s]+")
# Kropka tylko w ułamku dziesiętnym (0.5, .5). Po literze albo nawiasie, albo bez cyfry za nią,
# wywołałaby metodę wewnątrz eval, np. pi.n(9999999) liczy miliony cyfr pi.
METHOD_DOT = re.compile(r"(?<=[A-Za-z)\]])\.|\.(?!\d)")

REPLACEMENTS = [
    ("^\\circ", ""),
    ("°", ""),
    ("\\left", ""),
    ("\\right", ""),
    ("\\dfrac", "\\frac"),
    ("\\tfrac", "\\frac"),
    ("{,}", "."),
    ("\\cdot", "*"),
    ("\\times", "*"),
    ("\\pi", "pi"),
    ("\\infty", "oo"),
    ("\\,", " "),
    ("\\;", " "),
    ("\\ ", " "),
    ("\\!", ""),
    ("−", "-"),
    ("·", "*"),
    ("×", "*"),
    (":", "/"),
    ("π", "pi"),
    ("∞", "oo"),
    ("√", "sqrt"),
]

# Nazwa przed wynikiem, np. "x=", "V=", "x_1=", "x2=", "|BC|=". Pomijana przy liczbach i punktach.
NAME_PREFIX = re.compile(r"^\s*(?:\|[A-Za-z]{1,3}\||[A-Za-z](?:_?\{?\w*\}?)?)\s*=\s*")
# Jednostka po odstępie na końcu liczby, np. "51 kg", "750 zł", "10 000 m^2".
UNIT = re.compile(r"\s+[^\W\d_]+(?:\s*\^?[23²³])?\.?\s*$")
TEXT = re.compile(r"\\(?:text|mathrm)\{([^}]*)\}")
# Kilka wartości po słowach albo po przecinku z odstępem. Przecinek bez odstępu to część dziesiętna.
WORD_SEPARATOR = re.compile(r"\s+(?:lub|i|oraz)\s+|,\s+")


class Unreadable(Exception):
    pass


def argument(text: str, start: int) -> tuple[str, int]:
    while start < len(text) and text[start] == " ":
        start += 1
    if start >= len(text):
        raise Unreadable
    # \frac12 bez klamer to w LaTeX-u \frac{1}{2}.
    if text[start] != "{":
        return text[start], start + 1
    depth = 0
    for end in range(start, len(text)):
        if text[end] == "{":
            depth += 1
        elif text[end] == "}":
            depth -= 1
            if depth == 0:
                return text[start + 1 : end], end + 1
    raise Unreadable


def latex_to_plain(text: str) -> str:
    plain = []
    i = 0
    while i < len(text):
        if text.startswith("\\frac", i):
            numerator, i = argument(text, i + len("\\frac"))
            denominator, i = argument(text, i)
            plain.append(f"(({latex_to_plain(numerator)})/({latex_to_plain(denominator)}))")
        elif text.startswith("\\sqrt", i):
            i += len("\\sqrt")
            degree = None
            if text.startswith("[", i):
                end = text.find("]", i)
                if end == -1:
                    raise Unreadable
                degree, i = text[i + 1 : end], end + 1
            radicand, i = argument(text, i)
            if degree is None:
                plain.append(f"sqrt({latex_to_plain(radicand)})")
            else:
                plain.append(f"root({latex_to_plain(radicand)}, {latex_to_plain(degree)})")
        elif text[i] == "{":
            plain.append("(")
            i += 1
        elif text[i] == "}":
            plain.append(")")
            i += 1
        else:
            plain.append(text[i])
            i += 1
    return "".join(plain)


def split_letters(match: re.Match) -> str:
    # Znane nazwy zostają w całości, reszta to pojedyncze zmienne: "xsqrt" z "x√2" to x razy
    # sqrt, a nie x, s, q, r, t.
    return " ".join(re.findall(r"sqrt|root|pi|oo|[A-Za-z]", match.group()))


def parse_unevaluated(text: str, names: dict):
    try:
        return parse_expr(text, local_dict=names, transformations=TRANSFORMATIONS, evaluate=False)
    # Tekst może być dowolny, a parse_expr przy złym zapisie rzuca wyjątki różnych typów.
    except Exception as error:
        raise Unreadable from error


def checked_doit(expr):
    try:
        # Od najgłębszej potęgi, żeby wieża 9^(9^(9^9)) odpadła, zanim cokolwiek się policzy.
        for node in postorder_traversal(expr):
            if isinstance(node, Pow):
                exponent = node.exp.doit()
                if exponent.is_number and abs(complex(exponent)) > MAX_EXPONENT:
                    raise Unreadable
        return expr.doit()
    except Unreadable:
        raise
    except Exception as error:
        raise Unreadable from error


def parse_safely(text: str, names: dict):
    return checked_doit(parse_unevaluated(text, names))


def plain_text(text: str) -> str:
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    text = latex_to_plain(text).replace("^", "**").replace(",", ".")
    # Odstęp między cyframi to separator tysięcy: "10 000" to dziesięć tysięcy, a nie 10 razy 0.
    text = re.sub(r"(?<=\d)\s+(?=\d)", "", text)
    if not text.strip() or len(text) > MAX_LENGTH or not SAFE_TEXT.fullmatch(text):
        raise Unreadable
    if METHOD_DOT.search(text):
        raise Unreadable
    # "xy" to x razy y, a "2x" i "x2" to mnożenie, a nie jedna nazwa.
    text = re.sub(r"[A-Za-z]+", split_letters, text)
    return re.sub(r"(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])", " ", text)


def read_expression(text: str) -> Expr:
    expr = parse_safely(plain_text(text), NAMES)
    if not isinstance(expr, Expr) or expr.has(zoo, nan):
        raise Unreadable
    return expr


def number_text(text: str) -> str:
    text = NAME_PREFIX.sub("", text, count=1)
    unit = UNIT.search(text)
    # "2 pi" to liczba, a nie 2 z jednostką "pi".
    if unit and unit.group().strip(" .") not in FUNCTIONS:
        text = text[: unit.start()]
    return text


def read_number(text: str) -> Expr:
    number = read_expression(number_text(text))
    if number.free_symbols:
        raise Unreadable
    return number


def blocks(text: str) -> list[str]:
    # "$x=-3$, $x=1$" to dwie wartości, bez względu na tekst między nimi.
    found = re.findall(r"\$(.+?)\$", text)
    return found if found else [text]


def values(text: str) -> list[str]:
    found = blocks(text)
    if len(found) > 1:
        return found
    text = found[0]
    if ";" in text:
        return text.split(";")
    return WORD_SEPARATOR.split(text)


def read_values(text: str) -> set:
    return {read_number(value) for value in values(text)}


def read_point(text: str) -> tuple:
    found = blocks(text)
    if len(found) > 1:
        coordinates = found
    else:
        text = NAME_PREFIX.sub("", found[0], count=1).strip()
        if text.startswith("(") and text.endswith(")"):
            inner = text[1:-1]
            coordinates = inner.split(";") if ";" in inner else inner.split(",")
        else:
            coordinates = values(text)
    if len(coordinates) < 2:
        raise Unreadable
    return tuple(read_number(coordinate) for coordinate in coordinates)


SET_REPLACEMENTS = [
    # Przed \le, bo inaczej \left zamieniłoby się w "<=ft".
    ("\\left", ""),
    ("\\right", ""),
    ("\\mathbb{R}", "R"),
    ("ℝ", "R"),
    ("\\emptyset", "∅"),
    ("\\varnothing", "∅"),
    ("\\cup", " U "),
    ("∪", " U "),
    ("\\langle", "["),
    ("⟨", "["),
    ("\\rangle", "]"),
    ("⟩", "]"),
    ("\\{", "{"),
    ("\\}", "}"),
    ("\\leqslant", "<="),
    ("\\geqslant", ">="),
    ("\\leq", "<="),
    ("\\geq", ">="),
    ("\\le", "<="),
    ("\\ge", ">="),
    ("≤", "<="),
    ("≥", ">="),
    ("$", ""),
]
INTERVAL = re.compile(r"([\[(])(.+)([\])])")
INEQUALITY = re.compile(r"(<=|>=|<|>)")
RELATIONS = {"<": Lt, ">": Gt, "<=": Le, ">=": Ge}


def read_inequality(text: str):
    # "x>2" albo "-3<x<1": każda para sąsiednich stron to jedna nierówność, a wynik to część wspólna.
    parts = INEQUALITY.split(text)
    sides = [read_expression(side) for side in parts[::2]]
    variables = set().union(*(side.free_symbols for side in sides))
    if len(variables) != 1:
        raise Unreadable
    variable = variables.pop()
    solution = S.Reals
    for left, operator, right in zip(sides, parts[1::2], sides[1:]):
        relation = RELATIONS[operator](left, right)
        if relation in (S.true, S.false):
            raise Unreadable
        solution = solution.intersect(solveset(relation, variable, S.Reals))
    return solution


def read_set_piece(piece: str):
    piece = piece.strip()
    if piece == "R":
        return S.Reals
    if piece == "∅":
        return EmptySet
    if piece.startswith("{") and piece.endswith("}"):
        return FiniteSet(*read_values(piece[1:-1]))
    # Przedział domknięty ⟨2; 5⟩ wpisany z klawiatury jako <2; 5>.
    if piece.startswith("<") and piece.endswith(">"):
        piece = "[" + piece[1:-1] + "]"
    if INEQUALITY.search(piece):
        return read_inequality(piece)
    match = INTERVAL.fullmatch(piece)
    if not match:
        raise Unreadable
    opening, inner, closing = match.groups()
    ends = inner.split(";") if ";" in inner else inner.split(",")
    if len(ends) != 2:
        raise Unreadable
    low, high = read_number(ends[0]), read_number(ends[1])
    # Przy nieskończoności nawias jest zawsze otwarty, nawet gdy ktoś napisze "[".
    return Interval(low, high, opening == "(" or low == -oo, closing == ")" or high == oo)


def read_set(text: str):
    for old, new in SET_REPLACEMENTS:
        text = text.replace(old, new)
    # "x \in (-3, 1)" i "x ∈ (-3, 1)" to sam przedział.
    text = re.sub(r"^\s*[A-Za-z]\s*(?:\\in(?!fty)|∈)\s*", "", text)
    pieces = re.split(r"\s*U\s*|\s+lub\s+", text.strip())
    return Union(*(read_set_piece(piece) for piece in pieces))


def read_equation(text: str) -> Expr:
    sides = text.replace("$", "").split("=")
    if len(sides) != 2:
        raise Unreadable
    difference = read_expression(sides[0]) - read_expression(sides[1])
    if not difference.free_symbols:
        raise Unreadable
    return difference


def decimal_latex(value) -> str:
    # Ułamek dziesiętny jak w arkuszu CKE: 0{,}25. Skończone rozwinięcie ma tylko ułamek,
    # którego mianownik dzieli się wyłącznie przez 2 i 5.
    if not value.is_rational:
        raise Unreadable(f"{value} nie jest ułamkiem dziesiętnym")
    rest = value.q
    for prime in (2, 5):
        while rest % prime == 0:
            rest //= prime
    if rest != 1:
        raise Unreadable(f"{value} nie ma skończonego rozwinięcia dziesiętnego")
    digits = 0
    while (abs(value) * 10**digits).q != 1:
        digits += 1
    whole, fraction = divmod(int(abs(value) * 10**digits), 10**digits)
    sign = "-" if value < 0 else ""
    return sign + str(whole) + (f"{{,}}{str(fraction).zfill(digits)}" if digits else "")


def same_number(first: Expr, second: Expr) -> bool:
    return simplify(first - second) == 0


def read(text: str, kind: str):
    if kind not in KINDS:
        raise ValueError(f"nieznany rodzaj wyniku {kind}")
    # "$x=-3 \text{ lub } x=3$": słowo z \text działa jak zwykły tekst między wartościami.
    text = TEXT.sub(r" \1 ", text)
    if kind == "liczba":
        found = blocks(text)
        if len(found) > 1:
            raise Unreadable
        return read_number(found[0])
    if kind == "wartosci":
        return read_values(text)
    if kind == "przedzial":
        return read_set(text)
    if kind == "punkt":
        return read_point(text)
    if kind == "rownanie":
        return read_equation(text)
    return read_expression(text.replace("$", ""))


def same(student, expected, kind: str) -> bool:
    if kind in ("liczba", "wyrazenie"):
        return same_number(student, expected)
    if kind == "wartosci":
        # Zbiory porównuje się przez sprawdzenie każdej pary, bo sqrt(8) i 2*sqrt(2) to ta sama liczba.
        return all(any(same_number(a, b) for b in expected) for a in student) and all(
            any(same_number(a, b) for a in student) for b in expected
        )
    if kind == "przedzial":
        return student == expected
    if kind == "punkt":
        return len(student) == len(expected) and all(map(same_number, student, expected))
    # Równania są równoważne, gdy jedna różnica stron to stała wielokrotność drugiej.
    ratio = simplify(student / expected)
    return not ratio.free_symbols and ratio != 0 and ratio.is_finite is True


def expected_problem(expected: str, kind: str) -> str | None:
    try:
        read(expected, kind)
    except Unreadable:
        return f"nie da się odczytać wyniku {expected} jako {kind}"
    return None


def equivalent(student: str, expected: str, kind: str) -> bool | None:
    try:
        correct = read(expected, kind)
    except Unreadable as error:
        raise ValueError(f"nie da się odczytać wzorca {expected} jako {kind}") from error
    if len(student) > MAX_LENGTH:
        return None
    try:
        answer = read(student, kind)
    except Unreadable:
        return None
    return same(answer, correct, kind)


def shown(value: Expr, decimal: bool) -> str:
    if decimal:
        try:
            return decimal_latex(value)
        except Unreadable:
            pass
    return latex(value)


def typed_latex(text: str) -> str:
    # Bez wyliczania: kto wpisał 3^2, widzi 3^2, a nie 9. Wywoływane dopiero po read, więc wpis
    # przeszedł już wszystkie sprawdzenia, a bez wyliczania potęgi nie liczą się wcale.
    shown = latex(parse_unevaluated(plain_text(text), NAMES), order="none")
    # Bez wyliczania 1/3 to 1 razy 1/3 i SymPy drukuje "1 \cdot \frac{1}{3}".
    return re.sub(r"(?<![\d.])1 \\cdot (?=\\frac\{1\})", "", shown)


# Podgląd pod polem odpowiedzi: uczeń widzi, co aplikacja odczytała, zanim wyśle. None, gdy
# wpisu nie da się odczytać. Kto wpisał 0,25, widzi 0{,}25, a nie \frac{1}{4}.
def read_latex(student: str, kind: str) -> str | None:
    if len(student) > MAX_LENGTH:
        return None
    text = TEXT.sub(r" \1 ", student).replace("$", "")
    decimal = bool(re.search(r"\d[.,]\d|(?<!\d)[.,]\d", student))
    try:
        value = read(student, kind)
        if kind == "rownanie":
            # Strony tak, jak je wpisał uczeń, a nie przeniesione na jedną stronę.
            return " = ".join(typed_latex(side) for side in text.split("="))
        if kind == "liczba" and not decimal:
            return typed_latex(number_text(text))
        if kind == "wyrazenie" and not decimal:
            return typed_latex(text)
    except Unreadable:
        return None
    if kind == "wartosci":
        return "; ".join(shown(number, decimal) for number in sorted(value, key=default_sort_key))
    if kind == "punkt":
        return "(" + "; ".join(shown(number, decimal) for number in value) + ")"
    if kind in ("liczba", "wyrazenie"):
        return shown(value, decimal)
    return latex(value)
