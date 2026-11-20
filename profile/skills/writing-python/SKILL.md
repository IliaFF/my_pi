---
name: writing-python
description: Python style rules from Google's guide, applied while writing or reviewing Python. Use when adding a Python module or function, when reviewing a Python diff for style, or before committing Python changes.
---

# Python that survives review

Google's style guide, cut to the lines a reviewer actually flags. Everything else in it — four-space
indent, no semicolons, `with` for files, a `__main__` guard — is what you write by default anyway.

**The test.** Read your own diff as the reviewer will: which line earns a comment? Every rule below
is one of those comments. Trigger none of them and the style half of the task is done.

## The flagged ten

1. **Imports name modules.** `import x`, `from pkg import module`. A function or class does not
   arrive through `from`, and `from . import` never appears — a reviewer cannot tell which module
   you meant. Symbols from `typing` and `collections.abc` import directly; they are the exception.
2. **Logging takes a pattern.** `logging.info("retry %d for %s", n, url)`. An f-string as the first
   argument renders a message that may never be wanted and discards the queryable pattern.
3. **Docstrings use the house sections.** Summary under 80 chars ending in a period, blank line,
   then `Args:`, `Returns:` (or `Yields:`), `Raises:` on a two-space hanging indent. A `None` return
   needs no `Returns:`, and a broken precondition stays out of `Raises:` — misuse is not the API.
   Public symbols get one, trivial private helpers do not.
4. **Optionality is spelled out.** `def f(a: str | None = None)`. Bare `Optional`, `Union`, and
   `a: str = None` all hide that `None` is legal, and the checker reads the last as an error.
5. **Defaults are immutable.** `None` as the sentinel, the real container built inside the body.
6. **`assert` is not validation.** A violated precondition raises `ValueError`; `assert` vanishes
   under `-O` and belongs in tests.
7. **`except` names its exception.** `except json.JSONDecodeError as error:`. A bare `except:`
   survives only to re-raise or to isolate a thread's outermost block.
8. **Strings accumulate in a list.** Append parts, then `"".join(...)`; `+=` in a loop is quadratic,
   and `+` does not build a message — a format string does.
9. **One `for` and one filter per comprehension.** A second clause means the loop gets written out.
10. **Constants are `CAPS_WITH_UNDER`.** Module-level mutable state gets a `_` prefix, an accessor,
    and a comment saying why it is mutable at all.

**Width is the repo's call.** 80 columns is Google's, 88 Black's default. The formatter config
decides; new code matches what is already in the file.

## Workflow: a new module

1. Read two sibling modules. Done when you can name their indent, quote character, docstring mood
   and naming habits — you are about to match them.
2. Lay out the file: docstring, imports, constants, classes, functions, entry point. Done when no
   import sits below a definition and nothing executable sits at module level.
3. Walk the flagged ten over every public name. Done when each public function carries a signature
   annotation and a docstring, and each public class carries an `Attributes:` section for its public
   attributes.
4. Sweep mechanically, then run the repo's formatter and linter. Done when the sweep returns nothing
   and the formatter rewrites no line.

```bash
rg -n "except:\s*$|except Exception|== *False|!= *None|logging\.\w+\(f[\"']|^import \w+,|;$" --type py
rg -n "def .*: *(str|int|float|bytes|list|dict|\w+) *= *None" --type py
```

## Workflow: reviewing a diff

1. Sweep before reading — mechanical hits are cheap and they steer the reading. Done when each hit
   is fixed or carries a comment justifying it.
2. Judge the calls a linter cannot: is the exception narrow, is the global explained, does the
   docstring let a caller skip reading the body. Done when every new public symbol is accounted for.
3. Grep the callers, then fix the cause once in the shared helper. Done when no call site carries a
   copy of the fix.
4. Keep format-only churn in its own commit. A reindent buried in a behavior change is unreviewable.

Correctness outranks this sheet: validation at trust boundaries, error handling that prevents data
loss, security, and accessibility are never traded for a style point. A flag that cannot be fixed
without breaking one of them gets answered in a comment, not in code.

## The rest of the guide

| File | Reach for it when |
|---|---|
| [references/rules.md](references/rules.md) | The line needs the house rule itself: import grouping and ordering, naming tables, docstring templates, layout and whitespace, type-annotation details, properties, decorators, threading, globals, module shape. |
| [references/examples.md](references/examples.md) | A rule reads clear but the shape of the fix does not. Six before/after rewrites. |
