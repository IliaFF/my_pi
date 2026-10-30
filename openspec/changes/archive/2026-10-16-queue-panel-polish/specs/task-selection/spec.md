## MODIFIED Requirements

### Requirement: Compact panel reflects the authoritative project queue
Trusted TUI sessions MUST render a read-only, terminal-safe tree of unfinished tasks with exact counts/overflow and distinct status glyphs/colors. Preview MUST fit six rows and half the terminal (minimum one); native expansion MUST retain the half-height cap. /queue panel and Ctrl+Shift+T MUST toggle one-row collapse. Rendering MUST adapt without IO. TODO/order/model messages MUST stay unchanged; no extra store, dependencies, config or Completed/Deferred rows.

#### Scenario: Mixed and long queue
- **WHEN** current, pending, blocked and completed tasks exist, including wide characters and control sequences
- **THEN** rows show current, Pending FIFO, then Blocked with exact hidden counts, closed tree branches and native width clipping with ellipsis; current uses ◐ with accent/bold, Pending ○ with dim glyph, Blocked ! with warning; user controls and Completed/Deferred never render

#### Scenario: Collapse and expand
- **WHEN** the slash command or registered collapse shortcut is invoked twice
- **THEN** the same queue switches to one line and back without writes or model execution

#### Scenario: Resize and global expansion
- **WHEN** terminal height or native tools-expanded mode changes without a file event
- **THEN** the same widget immediately adjusts visible rows and overflow without a disk read; collapsed view remains one line
