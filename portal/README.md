# One-stop AI Support Portal (UI prototype)

## Why this exists
The user should ask for help from one page, instead of searching projects, remembering agent names, or switching between Codex and ChatGPT.

## Prototype
Open `index.html` in a local browser to inspect the responsive UI. It includes:
- A single request box, auto/manual team preference, and eight common-task shortcuts.
- A non-authoritative visual routing preview for Research vs HA Quality.
- A **prepare/copy prompt** fallback for testing in ChatGPT.
- Privacy warnings and an honest prototype badge.

**No backend, model API, agent execution, login, data storage, network submission, file upload, or actual auto-routing exists in this prototype.** The keyword preview is only a frontend demonstration and must not be used as the production task router. Do not paste identifiable patient or participant data in an unapproved environment.

## Integration design: reuse existing work
1. Inspect the existing Research Team Master V4 / Orchestrator and previously created nursing research, R&D/Action Research, RCT/GCP and Citation Skills. Locate original source files and permissions before implementing any integration.
2. Retain existing HA Quality V2 roles and logic. Do not reimplement role definitions or duplicate agents.
3. Add an authenticated backend API (`POST /api/assist/tasks`) with role-based authorization, privacy boundaries, audit trails, human-review queues and workload tracking. API design is a proposal, not an existing endpoint.
4. Have a server-side director classify task intent, choose an existing workflow/skill, run approved tools, and return progress/result. Include explicit approval checkpoints and evidence provenance.
5. Attach document search/RAG only after access and data-protection review. Never put API keys in browser JavaScript.
6. Test separately with synthetic/de-identified cases and usability tests with nurses/researchers, then review before deploying into any hospital system.

## Definition of done for a real assistant
A user can open one authenticated portal, enter a task, submit it, see which workflow is handling it, review results and evidence, and find previously assigned tasks without navigating between agent-specific projects. All sensitive actions require appropriate authorization and human approval.
