# JEFF Dialogue, Critical Reasoning & Knowledge Loop (Design v0.1)
Updated: 2026-11-04 — **design specification, not a deployed capability**

## Product promise
JEFF is a thinking support colleague, not just a form-to-answer generator. A person asks a question once and can discuss the reasoning, disagree, iterate, and re-use approved lessons without remembering agent names or GitHub projects. Research Team Master V4 and HA V2 are to be *reused*, not reimplemented.

## Conversation principles
1. **Understand context first** — Retrieve authorized project context, prior decisions and the user's current request. Do not silently assume stale details are current.
2. **Ask only what matters** — Usually one high-impact question at a time when the missing answer changes safety, methods or output materially; otherwise proceed with explicit assumptions and offer revisions.
3. **Reason and challenge constructively** — Present alternatives, evidence quality, methodological tradeoffs, uncertainty, potential counterexamples, and reasoned recommendations. Never invent citations, results or approvals.
4. **Co-create** — Let the user correct assumptions, modify drafts, request deeper evaluation or switch specialist workflow during the same task; preserve those decisions in a versioned task record.
5. **Check before acting** — Independent review and explicit human approval for high-consequence clinical, ethics, publication, system configuration and external communications.
6. **Reflect and reuse** — At task closure, propose a *reviewable* knowledge card. Do not write unverified claims into a trusted knowledge base.

## Target workflow (with revision loops)
Request → Retrieve authorized context → Director triages question / selects existing specialist skill → Ask / Analyze / Debate → Draft outcome → Independent review → Human review → Apply / evaluate → Reflection & knowledge candidate → Verify / approve → Versioned knowledge library → Next-task retrieval (with source and date) → Re-evaluate when newer evidence conflicts.

Reviewer or user rejection returns to the relevant step, not to the first step. No autonomous external actions without permissions.

## Knowledge card schema (proposed)
- `id`, `title`, `domain` (research | quality | cross-functional), `tags`
- `question`, `context_scope`, `decision`, `alternatives_considered`, `rationale`
- `evidence[]` with source ID, provenance, type (external guideline/research/local policy/observed outcome), version/date, verified_by, access constraints
- `assumptions[]`, `limitations[]`, `contradictions[]`, `outcome_metrics[]`, `followup_date`
- `proposed_by`, `reviewed_by`, `approved_by`, `approval_date`, `status` (draft → pending_review → approved → superseded/rejected), `version`, `supersedes`
- `privacy_class`, `retention_policy`, `permitted_use_scope`; exclude patient and identifiable research-participant data

Only `approved` cards are eligible for ordinary retrieval as trusted local knowledge. Earlier decisions, uncertain claims and negative outcomes remain searchable *as labelled records* for analysis, never as established clinical facts.

## Safety and governance
- "Learning" means curated, versioned knowledge retrieval and workflow feedback; **not** autonomous model-weight training and **not** automatically committing every chat to GitHub.
- No raw identifiable patient data, HN, consent, sensitive HR, or personal health information in GitHub, prompts or unapproved tools.
- Require organization authorization, access control, encryption, audit log, correction/deletion policy and data retention decision prior to storing conversations or results.
- Distinguish externally verified research, internal local observations and expert judgement; never claim a local lesson proves general causal effectiveness.
- When an external guideline changes, flag potentially affected approved cards for re-review; never silently overwrite originals.
- EC decisions are made by the authorized EC; clinical decisions by licensed clinicians; final publication decisions by authors/editors. Agent suggestions cannot substitute for these roles.

## Research team application
Dialogue around study question, design, R&D cycles, control group, sampling, bias, power, outcomes and references. Keep a decision log and manuscript revision history. Critical reviewer challenges design before EC or journal submission.

## HA team application
Dialogue around incident mechanisms and system factors, traceable RCA, QI Plan/PDSA, impact/feasibility, indicator definition, outcome recheck and repeat-event learning. Never declare interventions effective from a draft plan alone.

## UX for a genuinely useful 'assistant'
- Primary screen: one chat input plus optional quick tasks; no forced project or agent selection.
- Show selected team and skill only on demand; allow correction.
- In each task, show concise "what we know / what needs confirmation / recommendation / what changed."
- A user-visible **"บทเรียนจากงานนี้"** panel appears at review, with Approve / Revise / Reject. Do not infer approval from silence.
- Offer a searchable, access-controlled **"คลังองค์ความรู้"** of approved cards, citation/date and stale-status warnings.
- Provide task status and previous decisions when a user returns, with permission controls.

## Acceptance criteria for implementation
1. In a demo with anonymized input, a user asks, challenges an answer, corrects an assumption, and receives a revised response without restarting the task.
2. The task trace records which specialist/skill produced each assertion and the evidence source status.
3. A lesson drafted from the interaction remains untrusted until explicit authorized approval, then is searchable in a new task with citation and version.
4. A conflicting evidence update flags an approved lesson for review without erasing history.
5. Unauthorized access to records is rejected; no patient identifiable data is written to GitHub.
6. Two simulated tasks, one R&D study and one HA RCA, demonstrate follow-up evaluation and knowledge re-use.
7. Tests cover mistaken agent routing, missing evidence, corrections, approvals, revocation and stale source handling.

## Current status
This file is an architectural requirement and testable backlog. The existing portal is a static UI; no conversational backend, agent orchestration, secure memory store, evaluation loop, or real approval flow is implemented.
