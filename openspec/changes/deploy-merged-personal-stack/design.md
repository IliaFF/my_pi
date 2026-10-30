## Deployment boundary
Use the existing exact source lock and version-gated patches. Preserve settings/provider/model/package options and private instructions; allow only installer-documented managed pins, retired Herdr declaration removal, workspace-history addition, missing MCP entries and portable AGENTS sections. No unrelated configuration rewrites. Core CLI currently 1.3.0; managed SDK already 1.4.0 with several extensions behind source. Target core and TUI 1.4.0.

## Safety and recovery
Initial working tree: M TODO.md; untracked .pi/tasks and enable-canary-500k-cache-warming planning. Keep all outside committed deployment archive. Preflight currently passes, disk has about 28 GiB available; existing runtime npm is 333 MiB and global core 155 MiB. Existing installer creates managed backup and uses validated staged restore on failure. Additional full global-core archive permits recovery without registry access. Stack stores are deliberately retained after failure, not recursively removed. Stop on conflicting personal sections/components or incomplete store. Backups contain private data and stay outside Git with restrictive permissions.

## Acceptance
Run full source npm test on the committed candidate. Run install from clean archive with locked OpenSpec tooling. Installer itself runs host gate; separately verify actual PATH CLI and preserved config against private baseline. No live provider or Windows/SSH availability claims. Demo has separate prefix and is not targeted.
