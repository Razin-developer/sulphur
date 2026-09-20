---
name: saas-security-ux
description: Design Sulphur console flows and security controls that are minimal, accessible, auditable, and clear about agent authority.
---

# SaaS Security UX

Use this skill when designing or reviewing Sulphur's web console, approvals, policies, connection controls, session states, or audit experience.

Make authority visible at the moment a user needs it: show the current organization, session, connected client, allowed actions, egress state, data retention, and revoke/pause control. Never hide a consequential automation decision behind generic confirmation copy.

Use Inter as the default typeface. Keep the visual system quiet: space and restrained borders create hierarchy; bold is reserved for titles, active status, and destructive choices. Use the sulphur-yellow accent sparingly. Pair every status color with text and an icon, preserve keyboard navigation and readable contrast, and make system state understandable without technical expertise.

Prefer scoped, reversible decisions. Approval dialogs must state the target, action, session, reason, expiry, and effect of approval. Make "blocked", "needs approval", "stale state", and "completed" visually and semantically distinct. Show audit history as a readable narrative with enough technical detail to investigate.

Do not display credentials, unredacted sensitive field values, raw ADB endpoints, or internal infrastructure identifiers in the standard console.
