# JEFF AI Support — project context
Updated: 2026-11-04

## Purpose
An approachable **single front door** for research and hospital quality support. People should enter a task once; they should not need to locate ChatGPT Projects, GitHub, Codex, skill names, or individual agents for routine work.

## Current source of truth
- HA Quality & Surveyor Intelligence Team V2: existing implementation under `ha_quality_team_v2/`. The role registry defines **16 roles**; it is currently an offline scaffold with simulated data, not 16 autonomous model instances.
- Research Team Master V4 / Orchestrator: previously used in the user's research project, with 10 agent reports and 4 simulated panel reports according to a dated work report. **Original V4 code/skill files are not yet confirmed in this repository**; retrieve and inspect before building a replacement.
- Previously established research skill concepts include nursing research assistance, R&D/Action Research, RCT/GCP, and reference/citation verification. Their exact current skill sources and installation locations must be verified before integration.
- Research Team draft scaffold is isolated in PR #1 (branch `feature/research-team-starter`) and has **not** been merged; do not treat its roles as a replacement for V4 or automatically count them as deployed.
- The JEFF Support Portal prototype is under `portal/`, tracked in PR #2. It is a **static UX prototype**; no login, real agent execution, model API, database, persistent tasks, or hospital integrations exist yet.

## Naming
- The single front door/AI assistant is **เจฟ (JEFF AI Support)**.
- Keep existing source-directory and legacy project identifiers untouched unless migration and compatibility checks are complete. This is a user-facing portal rename, not a rename of every hospital system called J.A.R.V.I.S.

## Target workflow
User request → authenticated support portal → director/orchestrator selects suitable existing team + skill → authorized agent/tool flow → evidence and independent quality checks → human review/approval → response and trackable task status.

## Safety and implementation principles
- No new agent or duplicated orchestration without auditing Research Team Master V4 and the existing HA V2 design.
- Do not upload personally identifiable patient or research-participant data to GitHub or unapproved model services.
- Prefer simple Thai UI, sensible defaults and common task shortcuts. Offer explicit user-facing status, reviewer checkpoints and easy-to-find historical tasks.
- A preview/copy prompt is not real end-to-end AI execution; label it truthfully.
- Do not deploy to hospital networks or give write access to clinical systems without organization authorization, access control, security review and testing.

## Dialogue and continuous learning — added 2026-11-04
JEFF must be conversational, challenge assumptions and rationales constructively, revise work with the user, evaluate outcomes, and propose a knowledge card for explicit authorized human approval. Only verified/approved, scoped, dated and versioned knowledge is trusted for subsequent retrieval. Do not train model weights from chat or save conversations, clinical details or participant data automatically.

Design and acceptance criteria: `docs/dialogue_learning_loop.md`. This is **not yet implemented** in the static portal or backend.

## Architecture decision — 2026-11-04: ChatGPT-first, skill-focused assistant
User's preferred model is **one specialist ChatGPT companion named JEFF**, not a collection of 26 autonomous agents or a separate website as the default entry point. Use the strongest available authorized ChatGPT model as the thinking/conversation engine; adapt it through well-scoped project instructions, existing nursing research/R&D/RCT-GCP/citation and HA skills, verified internal knowledge, and carefully selected external search only when evidence needs validation or updating.

Priority: easy entry, one natural-language conversation, critical thinking with the user, contextual continuity, evidence verification, and human-approved reusable lessons. Domain experts are *roles/skills* and optional workflows, not necessarily separately running model instances. Preserve Research Team Master V4 and HA Team V2 as existing assets; first audit and reuse. Avoid unnecessary external agent frameworks, API expense, or new UI deployment unless specialized ChatGPT/Project capabilities demonstrably cannot meet tested needs.

Current ChatGPT product distinctions must be respected: a Project can provide reusable chats/files/instructions and project memory depending on settings; existing custom GPTs are configurable but have different memory behavior. Do not claim an existing project skill is automatically installed in external Codex/GitHub or that a static portal has AI reasoning. Maintain the portal only as an optional future interface, not required for daily use.

Learning is *curated knowledge reuse with provenance, version and explicit authorization*, not autonomous self-training on chats. Do not store identifiable patient or study-participant records in GitHub.
