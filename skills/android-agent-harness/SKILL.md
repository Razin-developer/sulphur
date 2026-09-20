---
name: android-agent-harness
description: Build or review Sulphur's Android emulator automation, screen snapshots, MCP actions, and stale-state protections.
---

# Android Agent Harness

Use this skill when changing the emulator adapter, harness worker, normalized screen model, or MCP action semantics for Sulphur.

Treat the uploaded APK as untrusted and the accessibility tree as useful but incomplete. Prefer a semantic locator that is re-resolved immediately before an action. A coordinate is a last resort, must be tied to the current snapshot, and must never be presented as a guaranteed target.

Keep MCP tools static and compact. Return dynamic elements as data with opaque, snapshot-scoped IDs. An action must include the snapshot it was based on; reject it with a fresh state when the snapshot, target, policy, or app foreground state has changed.

Use the automation adapter behind an interface that supports: read active UI, subscribe to invalidation events, resolve a semantic target, execute an interaction, wait for a stable result, and capture a redacted screenshot. Appium is an implementation option, not a public product contract.

For custom-rendered or inaccessible UIs, record a coverage score and switch to a visual result marked with source and confidence. Visual clicks require the product policy's additional confirmation where configured.

Before completing work, test normal semantic interaction, duplicate labels in a list, a stale snapshot, a permission/system dialog, app crash/relaunch, and a low-confidence visual target.
