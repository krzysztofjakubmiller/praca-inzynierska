import pytest

from app.equivalence import Unreadable
from app.export_for_templates import tasks_for_templates
from app.import_templates import import_templates, summary
from app.models import Task, TaskTemplate
from app.variants import (
    CHECK_DRAWS,
    Template,
    check_template,
    has_equal_choices,
    draw_values,
    pick_variant,
    render,
    variant_of,
)
from tests.test_task import make_task

POWERS = dict(
    content="Liczba $2^{3} \\cdot 2^{4}$ jest równa",
    answer_format="wielokrotny-wybor",
    choices={"A": "$2^{7}$", "B": "$2^{12}$", "C": "$4^{7}$", "D": "$4^{12}$"},
    answer="A",
)


def powers_template(**changes):
    template = {
        "params": {"a": {"from": 2, "to": 5}, "b": {"from": 2, "to": 9}, "c": {"from": 2, "to": 9}},
        "conditions": ["b != c"],
        "content": "Liczba $[[a]]^{[[b]]} \\cdot [[a]]^{[[c]]}$ jest równa",
        "choices": {
            "A": "$[[a]]^{[[b + c]]}$",
            "B": "$[[a]]^{[[b*c]]}$",
            "C": "$[[a^2]]^{[[b + c]]}$",
            "D": "$[[a^2]]^{[[b*c]]}$",
        },
        "answer": "A",
        "original": {"a": 2, "b": 3, "c": 4},
    }
    template.update(changes)
    return template


def test_good_template_passes():
    result = check_template(Task(**POWERS), powers_template())

    assert result["problems"] == []
    assert result["passed"] is True
    assert result["successful"] > 150
    assert result["distinct"] >= 5


def test_template_must_give_the_original_back():
    content = "Liczba $[[a]]^{[[b]]} \\cdot [[a]]^{[[c]]}$ wynosi"
    problems = check_template(Task(**POWERS), powers_template(content=content))["problems"]

    assert problems[0].startswith("treść dla liczb z oryginału: „")


def test_wrong_original_choice_is_named():
    choices = powers_template()["choices"] | {"B": "$[[a]]^{[[b*c + 1]]}$"}
    problems = check_template(Task(**POWERS), powers_template(choices=choices))["problems"]

    assert problems == ["odpowiedź B dla liczb z oryginału: „$2^{13}$” zamiast „$2^{12}$”"]


def test_draws_with_equal_choices_are_skipped():
    # Bez warunku b != c przy b = c = 2 odpowiedzi A i B to ta sama potęga a^4.
    template = powers_template(conditions=[])
    result = check_template(Task(**POWERS), template)

    assert result["passed"] is True
    assert result["successful"] < CHECK_DRAWS
    for seed in range(30):
        variant = draw_values(Template.model_validate(template), seed)
        assert not has_equal_choices(render(Template.model_validate(template), variant))


def test_choices_equal_in_value_are_equal():
    assert has_equal_choices({"choices": {"A": "$4^{6}$", "B": "$2^{12}$", "C": "$3$"}})
    assert not has_equal_choices({"choices": {"A": "$4^{6}$", "B": "$2^{13}$", "C": "tak"}})


def test_same_data_in_every_draw_fails():
    template = powers_template(content=POWERS["content"], choices=POWERS["choices"])

    assert check_template(Task(**POWERS), template)["problems"] == [
        "warianty z różnymi danymi: 1, potrzeba co najmniej 5"
    ]


@pytest.mark.parametrize(
    "condition, problem",
    [
        ("d > 0", "nieznana nazwa d w wyrażeniu d > 0"),
        ("__import__('os')", "niedozwolone znaki w wyrażeniu __import__('os')"),
        ("pi.n(20) > 0", "kropka poza ułamkiem dziesiętnym w wyrażeniu pi.n(20) > 0"),
        ("b + c", "warunek b + c nie daje prawdy ani fałszu"),
    ],
)
def test_bad_condition_is_reported(condition, problem):
    problems = check_template(Task(**POWERS), powers_template(conditions=[condition]))["problems"]

    assert problems[0].startswith(problem)


def test_decimal_point_is_allowed_in_template():
    template = powers_template(conditions=["b != c", "b > 0.5", "c > .5"])

    assert check_template(Task(**POWERS), template)["problems"] == []


def test_gcd_is_counted_for_drawn_numbers():
    template = Template.model_validate(powers_template(conditions=["b != c", "gcd(b, c) == 2"]))

    for seed in range(5):
        variant = draw_values(template, seed)
        assert variant["b"] % 2 == 0 and variant["c"] % 2 == 0


def test_power_tower_is_not_computed():
    template = powers_template(content="$[[a^(b^(c^9))]]$")

    assert check_template(Task(**POWERS), template)["problems"][0].startswith(
        "oryginał: nie da się policzyć wyrażenia a^(b^(c^9))"
    )


def test_template_format_errors_are_described():
    template = powers_template(original={"a": 2, "b": 3})
    problems = check_template(Task(**POWERS), template)["problems"]

    assert problems == ["szablon: Value error, original ma mieć wartość każdego parametru i nic więcej"]


def test_impossible_conditions_give_no_variant():
    template = powers_template(conditions=["b < 0"])

    assert check_template(Task(**POWERS), template)["problems"][-1] == (
        "żadne losowanie nie daje poprawnego wariantu"
    )
    assert draw_values(Template.model_validate(template), seed=1) is None


def test_drawing_repeats_for_the_same_seed():
    template = Template.model_validate(powers_template())

    assert draw_values(template, seed=5) == draw_values(template, seed=5)


def test_decimal_format():
    assert render(
        Template.model_validate(
            powers_template(content="$[[a/4 | dziesietnie]]$, $[[-a/8 | dziesietnie]]$")
        ),
        {"a": 3, "b": 2, "c": 5},
    )["content"] == "$0{,}75$, $-0{,}375$"


def test_root_degree_and_braces_from_the_variant():
    task = Task(**POWERS | {"content": "Liczba $\\sqrt[3]{2^8}$"})
    template = powers_template(content="Liczba $\\sqrt[[[b]]]{[[a]]^{[[c+4]]}}$")

    assert check_template(task, template)["problems"] == []
    assert render(Template.model_validate(template), {"a": 2, "b": 5, "c": 9})["content"] == (
        "Liczba $\\sqrt[5]{2^{13}}$"
    )


def test_decimal_format_needs_a_finite_decimal():
    template = Template.model_validate(powers_template(content="$[[a/3 | dziesietnie]]$"))

    with pytest.raises(Unreadable):
        render(template, {"a": 1, "b": 2, "c": 3})


def test_figure_numbers_come_from_the_variant():
    figures = {"content": {"type": "os-liczbowa", "labels": [0, 3]}}
    task = Task(**POWERS | {"figures": figures, "has_figure": True})
    template = powers_template(figures={"content": {"type": "os-liczbowa", "labels": [0, "[[b]]"]}})

    assert check_template(task, template)["passed"] is True
    assert render(Template.model_validate(template), {"a": 2, "b": 7, "c": 4})["figures"] == {
        "content": {"type": "os-liczbowa", "labels": [0, 7]}
    }


def open_task():
    return Task(
        content="Rozwiąż równanie $2x = 3$.",
        answer_format="otwarte",
        choices=None,
        answer="$x=1{,}5$",
        scoring={
            "results": [{"expected": "$x=1{,}5$", "kind": "liczba"}],
            "rules": "1 pkt za przeniesienie $3$ na drugą stronę, 2 pkt za $x=1{,}5$.",
        },
    )


def open_template(**scoring_changes):
    scoring = {
        "results": [{"expected": "$x=[[x]]$", "kind": "liczba"}],
        "rules": "1 pkt za przeniesienie $[[b]]$ na drugą stronę, 2 pkt za $x=[[x | dziesietnie]]$.",
    }
    return {
        "params": {"a": {"one_of": [2, 4, 5, 8]}, "b": {"from": 1, "to": 9}},
        "computed": {"x": "b / a"},
        "content": "Rozwiąż równanie $[[a]]x = [[b]]$.",
        "answer": "$x=[[x]]$",
        "scoring": scoring | scoring_changes,
        "original": {"a": 2, "b": 3},
    }


def test_open_task_result_may_be_written_differently():
    assert check_template(open_task(), open_template())["problems"] == []


def test_scoring_rules_get_numbers_of_the_variant():
    rendered = render(Template.model_validate(open_template()), {"a": 4, "b": 3})

    assert rendered["scoring"]["results"] == [{"expected": "$x=\\frac{3}{4}$", "kind": "liczba"}]
    assert rendered["scoring"]["rules"] == (
        "1 pkt za przeniesienie $3$ na drugą stronę, 2 pkt za $x=0{,}75$."
    )


def test_scoring_must_give_the_original_back():
    rules = "1 pkt za przeniesienie $[[b]]$ na drugą stronę."
    problems = check_template(open_task(), open_template(rules=rules))["problems"]

    assert problems[0].startswith("zasady oceniania, pole rules: „")


def test_wrong_result_kind_is_reported():
    results = [{"expected": "$x=[[x]]$", "kind": "wartosci"}]
    problems = check_template(open_task(), open_template(results=results))["problems"]

    assert problems == ["wynik 1: inne pole kind niż w zadaniu"]


def test_import_stores_every_template_with_its_result(session):
    good = make_task(session, number=1, **POWERS)
    bad = make_task(session, number=2, **POWERS)
    data = {
        "read_method": "inne-ai",
        "read_model": "model-testowy",
        "templates": [
            {"task": good.id, "template": powers_template()},
            {"task": bad.id, "template": powers_template(answer="B")},
            {"task": 999999, "template": powers_template()},
            {"task": good.id + 1000, "skip": "dowód"},
        ],
    }

    results = import_templates(session, data)

    assert [result.get("passed") for result in results] == [True, False, False, None]
    row = session.get(TaskTemplate, good.id)
    assert row.review_status == "do-sprawdzenia"
    assert row.ai_body == row.body == powers_template()
    assert session.get(TaskTemplate, bad.id).check_result["passed"] is False
    assert summary(results)[-1] == "Przeszło 1 z 3 szablonów, pominięte: 1."


def test_manual_fix_keeps_the_ai_copy(session):
    task = make_task(session, number=1, **POWERS)
    from_ai = powers_template(conditions=[])
    ai_file = {"read_method": "gemini", "read_model": "gemini-2.5-pro"}
    import_templates(session, ai_file | {"templates": [{"task": task.id, "template": from_ai}]})

    fixed = [{"task": task.id, "template": powers_template()}]
    import_templates(session, {"read_method": "recznie", "templates": fixed})

    row = session.get(TaskTemplate, task.id)
    assert (row.ai_body, row.body) == (from_ai, powers_template())
    assert (row.read_method, row.read_model) == ("gemini", "gemini-2.5-pro")
    assert row.check_result["passed"] is True


def test_checked_template_is_not_overwritten(session):
    task = make_task(session, number=1, **POWERS)
    data = {"read_method": "recznie", "templates": [{"task": task.id, "template": powers_template()}]}
    import_templates(session, data)
    session.get(TaskTemplate, task.id).review_status = "sprawdzone"

    results = import_templates(session, data)

    assert results[0]["problems"] == ["zadanie ma już sprawdzony szablon, nie nadpisuję"]


def test_export_lists_tasks_without_checked_template(session):
    first = make_task(session, number=1, review_status="sprawdzone", **POWERS)
    second = make_task(session, number=2, review_status="sprawdzone", **POWERS)
    make_task(session, number=3, **POWERS)
    session.add(
        TaskTemplate(
            task_id=second.id,
            body={},
            read_method="recznie",
            review_status="sprawdzone",
            check_result={},
        )
    )
    session.flush()

    tasks = tasks_for_templates(session, "matura-podstawowa", "logarytmy")

    assert tasks == [{"task": first.id} | POWERS]


def test_student_gets_variants_only_from_checked_template(session):
    task = make_task(session, number=1, **POWERS)
    entries = [{"task": task.id, "template": powers_template()}]
    import_templates(session, {"read_method": "recznie", "templates": entries})

    assert pick_variant(session, task, seed=3) is None

    session.get(TaskTemplate, task.id).review_status = "sprawdzone"
    variant = pick_variant(session, task, seed=3)

    assert variant is not None
    assert variant_of(session, task, variant)["answer"] == "A"


@pytest.mark.parametrize(
    "variant",
    [
        {"a": 2, "b": 3, "c": 3},
        {"a": 2, "b": 3, "c": 40},
        {"a": 2, "b": 3},
        {"a": "sqrt(2)", "b": 3, "c": 4},
        {"a": "x", "b": 3, "c": 4},
    ],
)
def test_variant_from_the_browser_must_come_from_the_template(session, variant):
    task = make_task(session, number=1, **POWERS)
    session.add(
        TaskTemplate(
            task_id=task.id,
            body=powers_template(),
            read_method="recznie",
            review_status="sprawdzone",
            check_result={},
        )
    )
    session.flush()

    with pytest.raises(ValueError):
        variant_of(session, task, variant)


def checked(session, template):
    task = make_task(session, number=1, **POWERS)
    session.add(
        TaskTemplate(
            task_id=task.id,
            body=template,
            read_method="recznie",
            review_status="sprawdzone",
            check_result={},
        )
    )
    session.flush()
    return task


def test_choices_are_shuffled_with_the_key(session):
    template = powers_template()
    task = checked(session, template)
    orders = set()
    for seed in range(20):
        variant = pick_variant(session, task, seed)
        shown = variant_of(session, task, variant)
        plain = render(Template.model_validate(template), variant)

        assert list(shown["choices"]) == ["A", "B", "C", "D"]
        assert sorted(shown["choices"].values()) == sorted(plain["choices"].values())
        assert shown["choices"][shown["answer"]] == plain["choices"]["A"]
        assert variant_of(session, task, variant) == shown
        orders.add(tuple(shown["choices"].values()).index(plain["choices"]["A"]))

    assert len(orders) > 1


def test_figure_of_a_choice_moves_with_it(session):
    figures = {"A": {"type": "os-liczbowa", "labels": [0, "[[b + c]]"]}}
    task = checked(session, powers_template(figures=figures))
    variant = pick_variant(session, task, seed=4)

    shown = variant_of(session, task, variant)

    assert list(shown["figures"]) == [shown["answer"]]
