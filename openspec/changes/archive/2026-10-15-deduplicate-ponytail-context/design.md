# Design

Use the existing Ponytail before_agent_start structured-prompt branch. For lite/full/ultra, replace only this run's systemPromptOptions.skills with a filtered array excluding name ponytail. Never mutate the loader or original array; core reconstructs run options from the base each run, so off restores discovery. Persisted independent review mode does not supply base rules and must retain the base skill. Legacy unstructured prompt fallback remains unchanged.

Do not use static disable-model-invocation: that would hide the base skill when the extension is off or absent. The resource loader remains authoritative for explicit /skill:ponytail and existing aliases. Review/audit prose follows the session language, retaining simple explanations and report structure.

Capture the change as a versioned maintenance patch against the source-lock Ponytail package, not edits to personal/project npm installations. Test actual SDK provider contexts using fauxProvider, in-memory credentials and temporary HOME; no external calls. Cover mode transitions, manual base invocation, review/audit aliases, persisted review mode and no-extension standalone discovery. Run the entire npm test gate and review diff before archive/commit. Production installation needs separate approval and backup.
