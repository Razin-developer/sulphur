---
name: product-delivery
description: Plan, scope, and validate Sulphur product work from a secure vertical slice through production rollout.
---

# Product Delivery

Use this skill when planning Sulphur features, roadmap phases, PRDs, architecture decisions, or launch criteria.

Start from a thin vertical slice that proves the customer outcome with a known reference APK. State what is supported, what is best effort, and what is excluded. Do not convert exploratory claims into universal guarantees.

For every feature, define the user outcome, authorization boundary, failure behavior, acceptance tests, observability, and rollback or kill switch. Build security, auditability, and tenant isolation with the first usable path; do not defer them to a future "hardening" phase.

Use measurable exit criteria for phases. Validate automation claims on a varied APK corpus, including accessible native views, duplicate controls, dynamic screens, custom rendering, permission dialogs, and failures. Treat warm-pool capacity and emulator isolation as product constraints rather than deployment afterthoughts.
