# Design

Use the existing formatList function with an includeCompleted boolean defaulting to true. Only the slash list caller passes false; the task_queue list caller retains its existing full response and details. Keep task mutation and section parsing untouched. This separates the requested compact user notification from the agent's history inspection without another formatter or new command.

Tests execute both slash forms through AgentSession.prompt with an in-memory faux provider and a notification capture UI. Check active/pending/blocked visibility, absent completed heading/tasks, an empty unfinished queue and byte-for-byte unchanged temporary TODO. Check task_queue list still returns completed text and structured history. No live model calls or production TODO writes.
