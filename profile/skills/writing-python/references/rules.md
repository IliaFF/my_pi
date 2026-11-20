# House rules

The long tail behind [`SKILL.md`](../SKILL.md): the mechanical choices a formatter will not make
for you. Everything here is a lookup — read the section you need, not the file.

## Contents

- [Imports](#imports)
- [Naming](#naming)
- [Docstrings](#docstrings)
- [Layout](#layout)
- [Comments and TODOs](#comments-and-todos)
- [Language](#language)
- [Typing](#typing)
- [Module shape](#module-shape)

## Imports

Group, most generic first, with an optional blank line between groups:

1. `from __future__ import ...`
2. standard library
3. third-party packages
4. repo sub-packages

Sort each group lexicographically, ignoring case, by the full package path (`from a.b import c`
sorts on `a.b`).

```python
from __future__ import annotations

import collections
import sys

from absl import app
import tensorflow as tf

from otherproject.ai import mind
```

- One import per line. `typing` and `collections.abc` symbol lists are the exception:
  `from typing import Any, NewType`.
- `import y as z` only for a standard abbreviation (`import numpy as np`).
- `from x import y as z` when `y` collides with a local name, is too generic in context
  (`from storage.file_system import options as fs_options`), or is inconveniently long.
- Type-driven imports: see [Typing](#typing).

## Naming

| Kind | Public | Internal |
|---|---|---|
| Packages | `lower_with_under` | |
| Modules | `lower_with_under.py` | `_lower_with_under.py` |
| Classes, exceptions | `CapWords` | `_CapWords` |
| Functions, methods | `lower_with_under()` | `_lower_with_under()` |
| Constants | `CAPS_WITH_UNDER` | `_CAPS_WITH_UNDER` |
| Variables (global, instance, local), parameters | `lower_with_under` | `_lower_with_under` |

- A single underscore marks internal; a double underscore is name mangling and costs readability
  and testability, so the house choice is one underscore.
- Acronyms keep all capitals in `CapWords`: `HTTPServerError`.
- Descriptive names, with descriptiveness proportional to scope. No letter-dropping abbreviations,
  no type encoding (`id_to_name_dict`).
- Single characters are for counters and iterators (`i`, `j`, `k`, `v`), `e` for a caught exception,
  `f` for a file handle, unconstrained private type vars (`_T`, `_P`), and notation from a cited
  paper.
- Filenames end in `.py` and carry no dashes.
- Tests are named `test_<method>_<state>`.
- Mathematical code keeps its published notation, cites the source in a comment, and silences the
  linter for just those names (`# noqa: N806` in place, or a narrow block-level directive).

## Docstrings

```python
"""A one-line summary of the module or program, terminated by a period.

Leave one blank line. Then an overall description, optionally with usage:

  foo = ClassFoo()
  bar = foo.function_bar()
"""
```

Function and method:

```python
def fetch_smalltable_rows(
    table_handle: smalltable.Table,
    keys: Sequence[bytes | str],
) -> Mapping[bytes, tuple[str, ...]]:
    """Fetches rows from a Smalltable.

    Args:
      table_handle: An open smalltable.Table instance.
      keys: Keys of the rows to fetch, encoded as UTF-8.
      *foo: Variable length sequence.
      **bar: Arbitrary keyword arguments.

    Returns:
      A dict mapping each key to a tuple of strings, one per column.

    Raises:
      IOError: An error occurred accessing the smalltable.
    """
```

- Summary line ≤ 80 characters, ending in `.`, `?` or `!`.
- Section headings end with a colon; bodies hang by 2 or 4 spaces, consistently per file.
- The docstring must let a caller write the call without reading the body: syntax, semantics, and
  any observable side effect (a mutated argument belongs here).
- Tuple return: `Returns: A tuple (mat_a, mat_b), where mat_a is ...`. Never split it into fake
  multiple returns.
- One mood per file: `"""Fetches rows."""` or `"""Fetch rows."""`.
- `@property` docstrings describe the attribute: `"""The Bigtable path."""`, not `"""Returns ..."""`.
- A decorated function documents post-decoration behavior.
- `@override` methods need no docstring unless the contract materially changes.

Class:

```python
class SampleClass:
    """Summary of what an instance represents.

    Longer class information.

    Attributes:
      likes_spam: Whether we like SPAM.
      eggs: An integer count of the eggs we have laid.
    """

    def __init__(self, likes_spam: bool = False):
        """Initializes the instance from a spam preference.

        Args:
          likes_spam: Defines if instance exhibits this preference.
        """
```

- Exceptions describe what they represent, not when they are raised: `"""No more cheese."""`.
- Decorated classes document the post-decoration class.
- Test modules need no module docstring; `TestCase` subclasses and `test_` methods need none unless
  they add information the code does not carry (setup, how to run, golden files).
- A docstring that restates the name is deleted.

## Layout

Continuation is implicit, inside brackets:

```python
foo = long_function_name(var_one, var_two)
meal = (
    spam,
    beans,
)
x = ("first part "
     "second part")
```

- Hanging indent is 4 spaces; nothing on the first line. The closing bracket sits at the end of the
  expression or on its own line, indented to its opening bracket.
- Trailing comma when the closing bracket is on its own line, and for one-element tuples.
- Break at the highest syntactic level; if a line breaks twice, break at the same level both times.
- Comments: a long URL gets its own line rather than a backslash continuation.
- Blank lines: two around top-level definitions, one between methods and between a class docstring
  and the first method, none after `def`.
- Parentheses: `if foo:`, `while x:`, `return foo` — the parens appear only for grouping, a tuple, or
  continuation.
- Whitespace: none inside brackets (`spam(ham[1], {"eggs": 2}, [])`), none before `:`/`,`/`;`/`(`
  of a call, one space after. Spaces around `=` in a default only when the parameter is annotated
  (`def complex(real, imag: float = 0.0)`).
- No vertical alignment of `=`, `:`, or trailing comments.
- `#!/usr/bin/env python3` on the one file that gets executed directly.
- One quote character per file, the other one used only to skip an escape. Multi-line strings use
  `"""`; when the indentation would leak into the value, `textwrap.dedent()` or concatenated
  single-line strings remove it.

If the repo runs a formatter, its config overrides every line above and the formatter is the source
of truth for layout.

## Comments and TODOs

- Comment the reason, never the mechanics. Assume the reader knows the language.
- Inline comment starts two spaces after the code, then `#` and one space.
- Full sentences with punctuation; the file should read like narrative.
- TODOs carry context, ideally a tracked issue:

```python
# TODO(example.com/12345): Investigate cpufreq optimizations.
# TODO: Remove this branch when every client handles XML responses.
```

  No `TODO(username)`. A future-dated TODO names a specific date or a specific event.

## Language

- **Exceptions.** Use the built-in that fits — `ValueError` for a broken precondition. A library's
  own exceptions inherit from an existing class and end in `Error` without repeating the module:
  `foo.Error`, not `foo.FooError`. Keep the `try` body to the statement that raises; `finally` is
  for cleanup.
- **Comprehensions.** One `for` and one filter. This shape is fine:

  ```python
  result = [is_valid(metric={"key": value}) for value in iterable if slow_check(value)]
  ```

- **Generators.** `Yields:` in the docstring describes what `next()` returns. A generator holding an
  expensive resource is wrapped in a context manager.
- **Lambdas.** One line. Prefer `operator.mul` over `lambda x, y: x * y`, and a generator expression
  over `map`/`filter` with a lambda.
- **Conditional expressions.** All three parts fit on one line; otherwise write the `if`.
- **Properties.** Only for trivial, unsurprising computation; a plain public attribute is the answer
  when the property would just read and write it. Not for computation a subclass may want to
  override.
- **Decorators.** Docstring says it is a decorator, unit tests cover it, no files or sockets inside
  it (it runs at import time). Named constructors and class-wide state justify `@classmethod`;
  `@staticmethod` earns its place only when an external API demands it.
- **Threads.** Communicate through `queue.Queue`; prefer `threading.Condition` to bare locks;
  assume nothing about atomicity, not even of dict operations.
- **Power features.** Metaclasses, bytecode access, import hacking, `getattr` reflection tricks, and
  `__del__`-based cleanup stay out of application code. Standard-library modules built on them
  (`abc`, `dataclasses`, `enum`) are ordinary imports.
- **Resources.** Anything closeable is opened in a `with`. An object that has no `__enter__`
  (`urllib` responses, some C extensions) goes through `contextlib.closing()`. Cleanup through
  `__del__` is not a lifetime strategy.
- **Closures.** Fine, as is a nested function that captures a local. A helper hidden from the module
  gets a leading `_` at module level instead of nesting.
- **`from __future__ import annotations`** in every file; keep it even where the current syntax does
  not need it yet.

## Typing

- Annotate public APIs first, then code with a history of type bugs, then code that is hard to read.
  `Any` marks a deliberate hole, never a shortcut. `self`, `cls`, and `__init__`'s return stay bare;
  `Self` when a classmethod returns its own type.
- Annotated assignment, never a type comment:

  ```python
  a: Foo = SomeUndecoratedFunction()
  ```

- Type aliases: `CapWords`, `: TypeAlias = ...`, `_Private` when module-local. An alias is not a
  substitute for importing a module.
- `# type: ignore` on the offending line; a checker's own ignore when it offers one.
- `list[X]` for homogeneous, `tuple[X, ...]` for variable length, `tuple[A, B]` for fixed.
- `TypeVar`/`ParamSpec` names are descriptive unless the variable is private and unconstrained
  (`_T`, `_P`). `AnyStr` when every string in the signature is the same type.
- `str` and `bytes`, never `typing.Text`.
- Abstract types in signatures: `Sequence`, `Mapping`, `Iterable`. Generic parameters are always
  spelled out — bare `Sequence` means `Sequence[Any]`.
- Signature layout: one parameter per line with a trailing comma when the line overflows, closing
  paren aligned with `def`, return type on its own line. Break between parameters, not between a
  name and its type.
- Forward references: `from __future__ import annotations`, or the class name as a string.
- `if TYPE_CHECKING:` blocks sit directly after the normal imports, hold only typing symbols, sort
  like a normal import list, and contain no blank lines. Types imported there are referenced as
  strings.
- A circular dependency created by typing is a refactor signal; when it cannot be removed, alias the
  module to `Any` with a comment saying it imports you back.

## Module shape

- Functions stay small. Around 40 lines, ask whether splitting makes the structure clearer — no hard
  limit, and a long function that is genuinely one thing stays.
- Getters and setters appear when access does real work or costs something; a pair that only reads
  and writes a field means the field is public. Naming: `get_foo()` / `set_foo()`. Rebinding an old
  property to the new accessors is what hides the change from callers.
- The repo's linter and formatter are the authority on mechanical style: read their config, run them,
  and leave the mapping from Google's spent tooling (`pylint`, `pyink`) to whatever the repo actually
  runs.
