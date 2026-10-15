# Evidence — replace Caveman with clear explanations

## Scope and preserved state
- Parent source revision: `0fde43f`; Node `v24.18.0`, Pi core/pi-tui `1.2.0`, Ponytail `5.2.0` unchanged. Source now has 18 direct dependencies, 15 declared Pi packages and 422 lock package entries.
- User explicitly requested Caveman removal and clarity rules. Removed only Caveman from portable/personal package declarations and npm dependency/lock, manifest, obsolete patch and corresponding surface probe. No other direct or retained transitive versions changed; source lock retained package records are identical.
- Existing maintenance-format backup: ignored `backups/20261015-035404-498938`. All managed payload hashes and full npm-tree archive SHA256 verified before removal. Includes both old Caveman patch payload and its package.json.
- Global and portable APPEND_SYSTEM gained one Communication block before Ambiguity. Private file checked byte-for-byte against backup with exactly that insertion; all old bytes preserved. Personal settings compared structurally with only Caveman package removed; auth/models/mcp/context-policy bytes checked unchanged. No private data staged; saved Caveman mode/session history not deleted.
- Rules request direct answers, complete sentences, relevant mechanism/reasons/consequences, current-stack context and useful examples; depth follows question. Progress remains brief. Facts/assumptions/unverified work stay distinct. No fixed heading template, forced verbosity, new reviewer or model call.

## RED → GREEN
- Actual fresh RPC before removal: exit 1, `removed command still registered: caveman`. After removal: exit 0, 50 commands, Ponytail/queue present, Caveman absent, no agent_start/extension errors/provider run.
- Historical rollback regression before allowlist change: 6 tests, 1 failure, `backup contains unmanaged destination: .../npm/node_modules/pi-caveman/extensions/caveman.ts`. After exact retired package.json/patch-path allowlist: 6 tests passed. Existing corrupted-payload/archive and unmanaged-auth rejection tests retained.
- Clear communication policy assertion added to existing unit harness; not a semantic quality evaluation.

## Gates and review
- `npm test`: exit 0, all 12 source checks passed; unit/harness 19 tests passed, real SDK integration and guarded fresh CLI included.
- `npm test -- --agent ~/.pi/agent`: exit 0, all checks passed; host audit failures=0/warnings=3 for preserved personal settings/mcp/APPEND snapshot differences. Warnings not hidden by snapshot/reset.
- Installed maintenance changed source files mirrored from Git source, obsolete Caveman patch removed, npm runtime symlink preserved. Maintenance `npm test -- --agent ~/.pi/agent`: exit 0, all checks passed.
- `python3 scripts/test-release.py`: exit 0; exact lock, release hygiene and pristine archive patch replay passed. Registry archive replay is separate from no-provider-call integration checks.
- OpenSpec strict validation and archive: exit 0. Post-archive `npm test`: exit 0, all 12 source checks passed. Full production/config/dependency/test/document diff reviewed, including deleted patch; `git diff --check`: exit 0.
- Review found two historical Caveman backup destinations, not one; both explicitly allowed and tested, without widening arbitrary-path acceptance. Preservation fixture now uses existing unmanaged pi-workspace-history instead of removed Caveman. Historical reports intentionally remain historical.

## Limits and closure
- Fresh RPC verifies package/command surface, not a generated before_agent_start prompt. No real explanation quality, token savings, paid/live provider behavior or production rollback tested. Existing loaded hooks and Caveman text in conversation are not removed by deleting files: restart Pi and begin a fresh session.
- OpenSpec archived successfully; post-archive source and final installed maintenance gates both exited 0. All 20 staged paths (including OpenSpec metadata/spec/evidence) matched maintenance byte-for-byte; deleted Caveman patch absent. No push or current-revision CI run. Local commit follows completed offline checks; source backup and private pre-state stay outside Git.
