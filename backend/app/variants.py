import json
import random
import re
from functools import lru_cache
from itertools import combinations
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    TypeAdapter,
    ValidationError,
    model_validator,
)
from sqlalchemy.orm import Session
from sympy import (
    Abs,
    Function,
    Integer,
    Mod,
    Pow,
    Rational,
    S,
    Symbol,
    igcd,
    latex,
    nan,
    pi,
    root,
    sqrt,
    zoo,
)

from app.equivalence import (
    KINDS,
    MAX_EXPONENT,
    METHOD_DOT,
    Unreadable,
    decimal_latex,
    equivalent,
    expected_problem,
    parse_unevaluated,
    read,
    same_number,
)
from app.figures import Figure, Number, figure_problems, figures_json
from app.import_tasks import Scoring, describe, scoring_json, text_problems
from app.models import Task, TaskTemplate

Name = Annotated[str, StringConstraints(pattern=r"^[A-Za-z][A-Za-z0-9]*$")]


# gcd z SymPy dla symboli od razu zwraca 1, zanim podstawi się liczby. Ten liczy dopiero
# dla liczb całkowitych, np. w warunku "gcd(a, b) == 1".
class Gcd(Function):
    @classmethod
    def eval(cls, first, second):
        if first.is_Integer and second.is_Integer:
            return Integer(igcd(first, second))
        return None


# Funkcje, których wolno używać w wyrażeniach szablonu. Każda inna nazwa to błąd.
FUNCTIONS = {"sqrt": sqrt, "root": root, "Mod": Mod, "gcd": Gcd, "Abs": Abs, "pi": pi}
# Jak przy wpisie ucznia: parse_expr używa eval, a szablon pisze AI.
TEMPLATE_TEXT = re.compile(r"[0-9A-Za-z+\-*/^().,<>=!\s]+")
# Podwójne nawiasy, bo pojedyncze klamry są w każdym \frac. Bez "[" zaraz po "[[", żeby
# \sqrt[[[k]]]{a} dało stopień pierwiastka k, a nie wyrażenie "[k".
PLACEHOLDER = re.compile(r"\[\[(?!\[)(.+?)\]\]")

SUPPORTED_FORMATS = ("wielokrotny-wybor", "otwarte")
MAX_OPTIONS = 1000
# Tyle prób losowania dla ucznia, zanim zostanie oryginał.
MAX_DRAWS = 1000
CHECK_DRAWS = 200
MIN_VARIANTS = 5

FIGURES = TypeAdapter(dict[str, Figure])


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Param(Strict):
    # Przedział od from do to co step albo lista one_of.
    from_: Number | None = Field(default=None, alias="from")
    to: Number | None = None
    step: Number = Field(default=1, gt=0)
    one_of: list[Number] | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def one_form(self):
        has_range = self.from_ is not None and self.to is not None
        if has_range == (self.one_of is not None):
            raise ValueError("parametr ma mieć from i to albo one_of")
        if has_range and not 1 <= len(self.options()) <= MAX_OPTIONS:
            raise ValueError(f"parametr ma mieć od 1 do {MAX_OPTIONS} wartości")
        return self

    def options(self) -> list[Rational]:
        if self.one_of is not None:
            return [Rational(str(value)) for value in self.one_of]
        low, high, step = (Rational(str(value)) for value in (self.from_, self.to, self.step))
        if high < low:
            return []
        return [low + index * step for index in range(int((high - low) / step) + 1)]


class Template(Strict):
    params: dict[Name, Param] = Field(min_length=1)
    # Wartości liczone z parametrów, w kolejności zapisu.
    computed: dict[Name, str] = {}
    # Wyrażenia, które po podstawieniu liczb muszą być prawdą, np. "k != b".
    conditions: list[str] = []
    content: str
    choices: dict[str, str] | None = None
    # Jak figures przy zadaniu, ale w miejscu liczby może stać "[[wyrażenie]]".
    figures: dict[str, dict] | None = None
    answer: str
    # Jak scoring przy zadaniu otwartym; [[...]] w wynikach, zasadach i uwagach, bo AI ocenia
    # rozwiązanie według zasad i przy wariancie potrzebuje w nich liczb wariantu.
    scoring: dict | None = None
    # Liczby z oryginału. Szablon z nimi musi dać dokładnie zadanie z arkusza.
    original: dict[Name, Number | str]

    @model_validator(mode="after")
    def known_names(self):
        taken = set(self.params) & set(self.computed)
        if taken:
            raise ValueError(f"nazwa {', '.join(sorted(taken))} jest i w params, i w computed")
        reserved = (set(self.params) | set(self.computed)) & set(FUNCTIONS)
        if reserved:
            raise ValueError(f"nazwa {', '.join(sorted(reserved))} jest zajęta przez funkcję")
        if set(self.original) != set(self.params):
            raise ValueError("original ma mieć wartość każdego parametru i nic więcej")
        return self


def to_json(value: Rational) -> int | str:
    return int(value) if value.q == 1 else str(value)


@lru_cache(maxsize=4096)
def parsed(expression: str, names: frozenset):
    # Wyrażenie parsuje się raz, a przy każdym losowaniu tylko podstawia liczby. Parsowanie
    # jest wielokrotnie wolniejsze od liczenia, a sprawdzenie szablonu to setki losowań.
    if len(expression) > 300 or not TEMPLATE_TEXT.fullmatch(expression):
        raise Unreadable(f"niedozwolone znaki w wyrażeniu {expression}")
    if METHOD_DOT.search(expression):
        raise Unreadable(f"kropka poza ułamkiem dziesiętnym w wyrażeniu {expression}")
    unknown = set(re.findall(r"[A-Za-z][A-Za-z0-9]*", expression)) - names - set(FUNCTIONS)
    if unknown:
        raise Unreadable(f"nieznana nazwa {', '.join(sorted(unknown))} w wyrażeniu {expression}")
    symbols = {name: Symbol(name) for name in names}
    try:
        return parse_unevaluated(expression.replace("^", "**"), FUNCTIONS | symbols)
    except Unreadable as error:
        raise Unreadable(f"nie da się odczytać wyrażenia {expression}") from error


def substitute(expr, values: dict):
    # Od liści w górę, żeby wykładnik był znany, zanim potęga się policzy: 9^(9^9) odpada
    # na sprawdzeniu, a nie po godzinie liczenia.
    if expr.is_Symbol:
        return values[expr.name]
    if not expr.args:
        return expr
    args = [substitute(arg, values) for arg in expr.args]
    if isinstance(expr, Pow) and args[1].is_number and abs(complex(args[1])) > MAX_EXPONENT:
        raise Unreadable
    return expr.func(*args)


def evaluate(expression: str, values: dict):
    expr = parsed(expression, frozenset(values))
    try:
        value = substitute(expr, values)
    # Liczby z losowania mogą dać np. pierwiastek z ujemnej, a SymPy rzuca wtedy różne wyjątki.
    except Exception as error:
        raise Unreadable(f"nie da się policzyć wyrażenia {expression}") from error
    if value.has(zoo, nan):
        raise Unreadable(f"dzielenie przez zero w wyrażeniu {expression}")
    return value


def show(placeholder: str, values: dict) -> str:
    # [[x]] to liczba w LaTeX-u (\frac{6}{5}), [[x | dziesietnie]] to 1{,}2.
    expression, _, style = placeholder.partition("|")
    value = evaluate(expression, values)
    if style.strip() == "dziesietnie":
        return decimal_latex(value)
    if style.strip():
        raise Unreadable(f"nieznany format {style.strip()}")
    return latex(value)


def fill(text: str, values: dict) -> str:
    return PLACEHOLDER.sub(lambda match: show(match.group(1), values), text)


def fill_json(data, values: dict):
    if isinstance(data, dict):
        return {key: fill_json(value, values) for key, value in data.items()}
    if isinstance(data, list):
        return [fill_json(value, values) for value in data]
    if not isinstance(data, str):
        return data
    whole = PLACEHOLDER.fullmatch(data)
    if not whole:
        return fill(data, values)
    # Cały napis "[[a]]" w rysunku to liczba, np. współrzędna punktu.
    value = evaluate(whole.group(1), values)
    if not value.is_real:
        raise Unreadable(f"{data} w rysunku nie jest liczbą")
    return int(value) if value.is_integer else float(value)


def all_values(template: Template, params: dict) -> dict:
    values = {name: Rational(str(value)) for name, value in params.items()}
    for name, expression in template.computed.items():
        values[name] = evaluate(expression, values)
    return values


def conditions_hold(template: Template, values: dict) -> bool:
    for condition in template.conditions:
        result = evaluate(condition, values)
        if result not in (S.true, S.false):
            raise Unreadable(f"warunek {condition} nie daje prawdy ani fałszu")
        if result == S.false:
            return False
    return True


def render(template: Template, params: dict) -> dict:
    values = all_values(template, params)
    rendered = {
        "content": fill(template.content, values),
        "choices": None,
        "figures": None,
        "answer": fill(template.answer, values),
        "scoring": None,
    }
    if template.choices is not None:
        rendered["choices"] = {label: fill(text, values) for label, text in template.choices.items()}
    if template.figures is not None:
        try:
            figures = FIGURES.validate_python(fill_json(template.figures, values))
        except ValidationError as error:
            raise Unreadable(describe(error.errors()[0], "rysunek")) from error
        rendered["figures"] = figures_json(figures)
    if template.scoring is not None:
        try:
            scoring = Scoring.model_validate(fill_json(template.scoring, values))
        except ValidationError as error:
            raise Unreadable(describe(error.errors()[0], "zasady oceniania")) from error
        rendered["scoring"] = scoring_json(scoring)
    return rendered


def draw_params(template: Template, rng: random.Random) -> dict:
    return {name: to_json(rng.choice(param.options())) for name, param in template.params.items()}


def rendered_texts(rendered: dict) -> list[str]:
    texts = [rendered["content"], rendered["answer"], *(rendered["choices"] or {}).values()]
    scoring = rendered["scoring"]
    if scoring:
        texts += [scoring["rules"], scoring.get("notes") or ""]
        texts += [result["expected"] for result in scoring["results"]]
    return texts


# Takie losowanie generator po cichu odrzuca i losuje dalej; to nie jest błąd szablonu.
# Równe są też odpowiedzi zapisane inaczej, np. 4^{6} i 2^{12}: pytanie miałoby dwie dobre.
def has_equal_choices(rendered: dict) -> bool:
    choices = [normalized(text) for text in (rendered["choices"] or {}).values()]
    if len(set(choices)) < len(choices):
        return True
    values = []
    for text in (rendered["choices"] or {}).values():
        try:
            values.append(read(text, "wyrazenie"))
        except Unreadable:
            continue
    return any(same_number(first, second) for first, second in combinations(values, 2))


def variant_problems(rendered: dict) -> list[str]:
    problems = []
    for text in rendered_texts(rendered):
        problems += text_problems(text)
    for place, figure in FIGURES.validate_python(rendered["figures"] or {}).items():
        problems += [f"rysunek {place}: {problem}" for problem in figure_problems(figure)]
    results = rendered["scoring"]["results"] if rendered["scoring"] else []
    for number, result in enumerate(results, start=1):
        problem = expected_problem(result["expected"], result["kind"])
        if problem:
            problems.append(f"wynik {number}: {problem}")
    return problems


def draw_values(template: Template, seed: int) -> dict | None:
    rng = random.Random(seed)
    for _ in range(MAX_DRAWS):
        params = draw_params(template, rng)
        try:
            if not conditions_hold(template, all_values(template, params)):
                continue
            rendered = render(template, params)
        except Unreadable:
            continue
        if not has_equal_choices(rendered) and not variant_problems(rendered):
            return params
    return None


def normalized(text: str) -> str:
    # Szablon musi pisać 2^{[[n]]}, bo n bywa dwucyfrowe, a arkusz pisze 2^8. W LaTeX-u to
    # to samo, podobnie jak odstępy.
    return re.sub(r"([\^_])\{(\w)\}", r"\1\2", re.sub(r"\s+", "", text))


def same_text(first: str, second: str) -> bool:
    return normalized(first) == normalized(second)


def difference(rendered: str, original: str) -> str:
    rendered, original = normalized(rendered), normalized(original)
    start = next(
        (index for index, (a, b) in enumerate(zip(rendered, original)) if a != b),
        min(len(rendered), len(original)),
    )
    begin = max(start - 15, 0)
    return f"„{rendered[begin : start + 25]}” zamiast „{original[begin : start + 25]}”"


def same_result(rendered: str, original: str, kind: str | None) -> bool:
    if same_text(rendered, original):
        return True
    if kind is None:
        return False
    try:
        return equivalent(rendered, original, kind) is True
    except ValueError:
        return False


def original_problems(task: Task, template: Template) -> list[str]:
    try:
        rendered = render(template, template.original)
    except Unreadable as error:
        return [f"oryginał: {error}"]
    problems = []
    if not same_text(rendered["content"], task.content):
        problems.append(f"treść dla liczb z oryginału: {difference(rendered['content'], task.content)}")
    if (rendered["choices"] is None) != (task.choices is None):
        problems.append("odpowiedzi do wyboru są tylko w szablonie albo tylko w zadaniu")
    elif task.choices is not None:
        if set(rendered["choices"]) != set(task.choices):
            problems.append("inne etykiety odpowiedzi niż w zadaniu")
        for label in sorted(set(rendered["choices"]) & set(task.choices)):
            if not same_text(rendered["choices"][label], task.choices[label]):
                text = difference(rendered["choices"][label], task.choices[label])
                problems.append(f"odpowiedź {label} dla liczb z oryginału: {text}")
    if rendered["figures"] != task.figures:
        problems.append("rysunek dla liczb z oryginału różni się od rysunku zadania")
    if task.answer_format == "otwarte":
        # Wynik otwartego wystarczy równoważny: szablon da \frac{6}{5}, a w kluczu jest 1{,}2.
        answer = task.answer or ""
        if not any(same_result(rendered["answer"], answer, kind) for kind in (None, *KINDS)):
            problems.append(f"wynik dla liczb z oryginału: {difference(rendered['answer'], answer)}")
    elif rendered["answer"] != task.answer:
        problems.append(f"klucz {rendered['answer']} zamiast {task.answer}")
    problems += original_scoring_problems(rendered["scoring"], task.scoring)
    return problems


def original_scoring_problems(rendered: dict | None, original: dict | None) -> list[str]:
    if (rendered is None) != (original is None):
        return ["zasady oceniania są tylko w szablonie albo tylko w zadaniu"]
    if rendered is None:
        return []
    problems = []
    for field in ("rules", "notes"):
        text, task_text = rendered.get(field) or "", original.get(field) or ""
        if not same_text(text, task_text):
            problems.append(f"zasady oceniania, pole {field}: {difference(text, task_text)}")
    results, task_results = rendered["results"], original["results"]
    if len(results) != len(task_results):
        problems.append(f"szablon ma {len(results)} wyników, a zadanie {len(task_results)}")
        return problems
    for number, (result, task_result) in enumerate(zip(results, task_results), start=1):
        for field in ("part", "kind", "points"):
            if result.get(field) != task_result.get(field):
                problems.append(f"wynik {number}: inne pole {field} niż w zadaniu")
        expected, task_expected = result["expected"], task_result["expected"]
        if not same_result(expected, task_expected, task_result["kind"]):
            problems.append(f"wynik {number}: {difference(expected, task_expected)}")
    return problems


def check_template(task: Task, data) -> dict:
    result = {"passed": False, "problems": [], "draws": CHECK_DRAWS, "successful": 0, "distinct": 0}
    try:
        template = Template.model_validate(data)
    except ValidationError as error:
        result["problems"] = [describe(problem, "szablon") for problem in error.errors()]
        return result
    if task.answer_format not in SUPPORTED_FORMATS:
        result["problems"] = [f"zadania w formacie {task.answer_format} nie mają jeszcze szablonów"]
        return result

    problems = original_problems(task, template)
    seen = set()
    for seed in range(CHECK_DRAWS):
        params = draw_params(template, random.Random(seed))
        try:
            if not conditions_hold(template, all_values(template, params)):
                continue
            rendered = render(template, params)
        except Unreadable as error:
            found = [str(error)]
        else:
            if has_equal_choices(rendered):
                continue
            result["successful"] += 1
            found = variant_problems(rendered)
            # Różne warianty to różne dane w treści; ten sam wynik przy innych danych jest dobry.
            if not found:
                seen.add(rendered["content"])
        for problem in found:
            # Ten sam błąd w wielu losowaniach to jeden problem, z przykładem liczb.
            if not any(known.startswith(problem) for known in problems):
                problems.append(f"{problem} (np. dla {json.dumps(params)})")
    result["distinct"] = len(seen)
    if result["successful"] == 0:
        problems.append("żadne losowanie nie daje poprawnego wariantu")
    elif result["distinct"] < MIN_VARIANTS:
        problems.append(
            f"warianty z różnymi danymi: {result['distinct']}, potrzeba co najmniej {MIN_VARIANTS}"
        )
    result["problems"] = problems
    result["passed"] = not problems
    return result


def checked_template(session: Session, task: Task) -> Template | None:
    row = session.get(TaskTemplate, task.id)
    if row is None or row.review_status != "sprawdzone":
        return None
    return Template.model_validate(row.body)


def pick_variant(session: Session, task: Task, seed: int) -> dict | None:
    template = checked_template(session, task)
    return draw_values(template, seed) if template else None


def is_variant(template: Template, variant: dict) -> bool:
    # Liczby wariantu wracają z przeglądarki przy sprawdzaniu odpowiedzi, więc muszą być
    # z przedziałów szablonu i spełniać warunki, inaczej uczeń mógłby podesłać własne.
    if set(variant) != set(template.params):
        return False
    try:
        params = {name: Rational(str(value)) for name, value in variant.items()}
        if any(params[name] not in param.options() for name, param in template.params.items()):
            return False
        return conditions_hold(template, all_values(template, variant))
    except (Unreadable, TypeError, ValueError):
        return False


def shuffled(rendered: dict, variant: dict) -> dict:
    # Kolejność A–D wynika z liczb wariantu: ten sam wariant ma zawsze tę samą kolejność, więc
    # przy rozwiązaniu wystarczy zapisać liczby. Tylko gdy klucz to jedna etykieta.
    choices = rendered["choices"]
    if choices is None or rendered["answer"] not in choices:
        return rendered
    labels = list(choices)
    order = labels[:]
    random.Random(json.dumps(variant, sort_keys=True)).shuffle(order)
    new_label = dict(zip(order, labels))
    # Rysunek w odpowiedzi idzie razem z nią; rysunek pod treścią ("content") zostaje.
    figures = rendered["figures"]
    if figures:
        figures = {new_label.get(place, place): figure for place, figure in figures.items()}
    return rendered | {
        # Etykiety zostają po kolei A, B, C, D, zmienia się tylko to, co pod nimi.
        "choices": {label: choices[old] for label, old in zip(labels, order)},
        "answer": new_label[rendered["answer"]],
        "figures": figures,
    }


def variant_of(session: Session, task: Task, variant: dict) -> dict:
    template = checked_template(session, task)
    if template is None or not is_variant(template, variant):
        raise ValueError(f"zadanie {task.id} nie ma takiego wariantu")
    return shuffled(render(template, variant), variant)
