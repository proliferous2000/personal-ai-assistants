# Selective routing: development acceptance report

Date: 2026-11-08. Isolated development branch; no production deployment or merge.

## Existing assets audited

`lib/teams.mjs` composes six Office teams from the existing HA registry and Office desk definitions. HA contains 16 registered roles, not 16 independently deployed services. Existing providers are Claude CLI, Codex CLI and OpenAI Responses API. This implementation extends `executeTask`, not a second orchestration service. Service Plan uses an existing relevant leader (HA or ward); no invented Service Plan agent. Research V4 original sources remain unconfirmed per PROJECT_CONTEXT.md. ChatGPT skills are not automatically installed in these external providers.

## Behavior

- Routine: one JEFF routing/reply call, no specialists.
- Specialist: one registered leader, at most one justified support.
- Collaborative: one registered leader, up to three distinct supports.
- Router must choose the registered team's first desk as leader. Invalid IDs, duplicate assignments, unsupported levels, excess supports and invalid context indexes fail before specialist invocation.
- Main leader drafts; independent supports receive only their selected message indexes and assignment, run concurrently, and return to the leader. Leader checks evidence and resolves conflicts with written decisions before JEFF relays the result. One review round; maximum seven calls. `needs_info` requests missing evidence.
- Failed calls, cancellation or invalid review never produce ready. No automatic retry or reuse of stale/unchecked results. Verified-result caching is deferred until source version/expiry and approval can be established.
- Existing file tools remain enabled for leader draft/review. Supports request tools:false. Claude enforces its tool switch; OpenAI has no attached tools. **Codex adapter still runs read-only CLI and does not enforce tools:false**: scoped prompt inputs are not a filesystem sandbox or security isolation. Deployment requiring strict file separation needs isolated workspaces/provider enforcement before approval.

## Execution log

`data/office.json` tasks now contain executionLog, durably persisted at each planned/started/completed/failed/acceptance event. Call records include UUID, role, phase, timestamps, input SHA-256/character count, output/error, usage and cost. Started proves invocation attempted; completed proves provider returned, not leader acceptance. Provider failure has no successful output. Leader verdict, evidence checks, limitations and conflict decisions are recorded separately. Logs may contain source material and must remain local; never commit real patient/task logs.

OpenAI usage is recorded through its callback when available. CLI usage and all costs are null (unavailable), never reported as zero. No savings percentage is claimed. This budget limits calls, not exact tokens or money.

## Validation and release limits

Automated tests use deterministic fake model/CLI/HTTP results: they demonstrate routing, persistence, failure behavior and adapter contracts, **not real model execution**. Runtime readiness checked in this environment: codex and claude executables absent; OPENAI_API_KEY and OPENAI_MODEL absent. Therefore real Routine/Specialist/Collaborative provider acceptance runs are BLOCKED; there is no real model execution log to claim. Development code review by a separate Work assistant occurred, but is not an Office runtime agent test.

To finish acceptance: run Office in a test environment with an authorized existing provider configured; submit non-sensitive Routine, Specialist and Collaborative tasks in its UI; inspect `/api/state` executionLog, leader verdict and actual provider usage; verify failed calls cannot produce ready. Do not merge/deploy until these checks pass. Do not put API keys into GitHub or chat.

## Normal ChatGPT entry

Current `/api/bridge/events` imports reported status only. It never calls the router and is not execution proof. Normal ChatGPT chats have no automatic webhook into Office. Real routing currently starts via Office UI → same-origin `/api/chat` → executeTask → configured provider. Automatic chat intake would need a separately authorized authenticated tool/connector to a reachable test service with identity, request IDs and replay protection; no such connection was created here. Localhost origin restrictions remain intact.
