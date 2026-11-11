# Six rewrites

Each pair is the same behavior; only the shape changes. Reach here when a rule in
[`SKILL.md`](../SKILL.md) reads clear but the fixed version does not.

## Mutable default

```python
# Shared across calls: the second caller inherits the first caller's list
def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags
```

```python
def add_tag(tag: str, tags: Sequence[str] | None = None) -> list[str]:
    """Returns the tags with tag appended.

    Args:
      tag: The tag to append.
      tags: Existing tags, or None to start from an empty list.

    Returns:
      A new list of tags.

    Raises:
      ValueError: If tag is empty.
    """
    if not tag:
        raise ValueError("tag must not be empty")
    return [*(tags or ()), tag]
```

## Logging

```python
logging.error(f"Cannot write to $HOME={homedir!r}")
```

```python
logging.error("Cannot write to home directory, $HOME=%r", homedir)
```

## Docstring sections

```python
def fetch(handle, keys, all_keys=False):
    """Fetches rows from a smalltable.
    :param handle: an open table
    :param keys: rows to fetch
    :returns: dict of rows
    """
```

```python
def fetch(
    handle: Table, keys: Sequence[bytes | str], all_keys: bool = False
) -> Mapping[bytes, tuple[str, ...]]:
    """Fetches rows from a smalltable.

    Args:
      handle: An open smalltable.Table instance.
      keys: Keys of the rows to fetch, encoded as UTF-8.
      all_keys: Return only rows that have a value for every key.

    Returns:
      A dict mapping each key to its row, as a tuple of strings.

    Raises:
      IOError: An error occurred accessing the smalltable.
    """
```

## Imports

```python
import os, sys
from . import helpers          # a reviewer cannot tell which module this is
from skia import make_bitmap   # a symbol, not a module
```

```python
import os
import sys

from absl import flags

from book.genres import scifi
from book.genres import helpers
from skia import bitmap
```

## String accumulation

```python
table = "<table>"
for last, first in employees:
    table += f"<tr><td>{last}, {first}</td></tr>"
table += "</table>"
```

```python
rows = ["<table>"]
for last, first in employees:
    rows.append(f"<tr><td>{last}, {first}</td></tr>")
rows.append("</table>")
table = "".join(rows)
```

## Comprehension

```python
pairs = [(x, y) for x in range(10) for y in range(5) if x * y > 10]
```

```python
pairs = []
for x in range(10):
    for y in range(5):
        if x * y > 10:
            pairs.append((x, y))
```
