# Sulphur — Product Requirements Document

**Status:** product foundation  
**Owner:** Sulphur  
**Last updated:** 2026-09-19

## 1. Executive summary

Sulphur turns a customer-authorized Android APK running in an isolated emulator into a secure, agent-ready environment. An AI client connects through MCP, reads a compact description of the current app screen, and performs guarded actions such as tap, type, scroll, back, and screenshot. A companion web console lets a person upload an APK, watch the session, control its access, and inspect every action.

The product is **not** an API generator for arbitrary mobile apps and must never promise that every interface is perfectly inspectable or that every action can be guaranteed. Its promise is a safer, observable Android automation surface: semantic Android automation first; visual assistance only when semantics are incomplete; action confirmation and fresh-state validation before execution.

## 2. Problem and opportunity

AI agents can work effectively with websites that expose a DOM, but native mobile apps typically expose only screenshots or an Android accessibility tree. Existing mobile automation products are reliable for engineers writing tests; they are not designed to make a live app understandable and controllable through an MCP connection.

Sulphur’s wedge is developer and QA workflows: upload a non-production APK, connect an approved AI client, then explore, reproduce, test, or validate a mobile workflow without writing a bespoke Appium script first.

### Why this is technically viable

- Android UI Automator can inspect the active window and interact with UI across apps through Android’s automation and accessibility APIs. It is a strong semantic primary path for normal Android Views. [Android UI Automator](https://developer.android.com/training/testing/other-components/ui-automator)
- Android explicitly notes that custom views need accessibility support to be discoverable; therefore a vision fallback is necessary, but it is a best-effort fallback rather than a guarantee. [Android accessibility guidance](https://developer.android.com/training/testing/other-components/ui-automator-legacy)
- Appium UiAutomator2 is a suitable prototype adapter, not the core product boundary. It provides a mature baseline while Sulphur owns its normalized state, policies, and MCP contract. [Appium UiAutomator2](https://appium.io/docs/en/2.0/quickstart/uiauto2-driver/)
- MCP’s modern remote transport is Streamable HTTP; stable tool definitions also give clients better caching behavior. [MCP TypeScript server transport](https://ts.sdk.modelcontextprotocol.io/server)

### Hard constraints and product implications

| Reality | Sulphur response |
| --- | --- |
| Custom, canvas, Flutter, Compose, game, and WebView surfaces may expose weak semantics. | Score semantic coverage; show visual fallback confidence; require a screenshot/explicit confirmation for low-confidence actions. |
| Android nodes can become stale during animations or app updates. | Snapshot versioning, event-driven invalidation, selector re-resolution, and a pre-action state check. |
| Emulators require hardware virtualization for acceptable production performance. | Use a warm, dedicated worker pool on virtualization-capable hosts; do not cold-boot a Docker emulator per request. |
| Uploaded APKs are untrusted. | Treat every APK and emulator as hostile; isolate per session and block privileged host access. |
| AI clients can make consequential errors. | Destructive-action policy, explicit approval gates, full audit trail, rate limits, and session-scoped credentials. |

## 3. Users and jobs

**Mobile developer / QA engineer** — “Let my approved agent explore an uploaded staging APK, reproduce a bug, and return an auditable action log.”

**Engineering lead** — “Give agents a controlled mobile test surface without exposing source code, production accounts, or the host network.”

**AI agent / MCP client** — “Read only the current, concise app state and make a precise, authorized action with a clear result.”

## 4. Goals, non-goals, and success measures

### Goals (v1)

1. A user can create an isolated Android session from a signed or uploaded APK and view it in the browser.
2. An approved MCP client can discover one fixed set of tools and operate only the session it is authorized for.
3. Sulphur returns a compact, current screen model and executes semantic actions with precondition checks.
4. Every state change is traceable to a human, connection, agent, tool call, snapshot, and result.
5. A human can pause, revoke, or terminate a session immediately.

### Non-goals (v1)

- Universal, fully autonomous control of all Android apps.
- iOS support, physical devices, production-user account automation, payment completion, or CAPTCHA bypass.
- Generating a different MCP tool for each button; that is costly, brittle, and weakens prompt caching.
- Allowing uploaded APKs direct access to the control plane, Docker socket, host ADB, or the public internet by default.

### Success measures

- >= 90% successful semantic actions in the supported-reference-app suite.
- >= 99% of action attempts have a complete audit record.
- 0 cross-tenant session reads or actions.
- >= 95% of sessions ready from the warm pool within the target readiness SLO.
- Vision-assisted actions clearly show confidence and receive the required policy gate.

## 5. MVP functional requirements

### Workspace and sessions

- Authenticate users and organize work by organization and project.
- Upload APK/AAB-derived APK to a quarantined object store using a short-lived upload URL.
- Validate size, package metadata, signing certificate, manifest permissions, and a malware-scanning policy before allocation.
- Create an emulator from a clean golden snapshot; install the helper and target APK; launch the target package explicitly from parsed package metadata—never by guessing from installed packages.
- Render a live, view-only stream to the console. Browser controls go through the same policy engine as MCP actions.
- Support pause, resume, reset-to-clean-state, export audit log, terminate, and automatic expiry.

### Screen model

- Acquire the active Android window tree and accessibility events via an in-emulator automation adapter.
- Normalize actionable elements into a versioned snapshot containing opaque `elementId`, role, accessible name, enabled state, value hint, nearby context, locator strategy, bounds, and confidence.
- Prefer semantic locators in this order: stable resource id; accessibility label; unique structural selector plus context; bounds only as a last resort.
- Suppress hidden, disabled, non-actionable, and duplicate structural nodes; preserve enough list/card context to distinguish repeated labels.
- Assign opaque IDs per snapshot; never allow an ID from an old snapshot to be used in a new one.
- Detect low semantic coverage and run OCR plus UI-component detection on a screenshot. Mark every vision-derived target as `visual` and include confidence; do not pretend text detection proves clickability.

### MCP contract

Tools are fixed, tenant/session scoped, deterministically ordered, and intentionally small:

| Tool | Purpose | Required guard |
| --- | --- | --- |
| `get_screen_state` | Current compact snapshot; accepts optional detail level. | Authorized session |
| `act` | `tap`, `type`, `long_press`, `scroll`, `back`, `wait`. | `snapshotId`, `elementId` when relevant, action policy |
| `take_screenshot` | Current PNG with optional redaction. | Screenshot permission |
| `get_action_log` | Recent actions and outcomes. | Audit-read permission |
| `reset_session` | Restore clean target state. | Human approval / reset scope |

`act` resolves the target again against the live UI immediately before execution. If the snapshot no longer matches, it returns `STALE_SNAPSHOT` with a fresh compact screen state; it must not click by old coordinates. For a high-risk action, it returns `APPROVAL_REQUIRED` and waits for the named approver rather than retrying.

### Action policies

- **Allow:** navigation, non-sensitive local form entry, scrolling, back.
- **Confirm:** login submission, permission prompts, external links, share/export, account mutation, uninstall/reset, and any vision-derived action below the configured confidence.
- **Block:** payment submission, financial transfers, real secrets in prompts/logs, device-admin/accessibility enablement, arbitrary ADB shell, and host/network escape attempts.
- Customers can make policies stricter, not weaker than platform baseline.

## 6. Recommended architecture

```text
React web console ── HTTPS/WebSocket ── API & control plane ── scheduler ── isolated session worker
       │                                         │                         ├─ MCP gateway (Streamable HTTP)
       └──────────── WebRTC view stream ◄────────┘                         ├─ harness / policy engine
                                                                          ├─ automation adapter
                                                                          └─ Android emulator
                                                                                ├─ Sulphur test helper
                                                                                └─ uploaded target APK
```

### Components and responsibilities

| Component | Recommended choice | Responsibilities |
| --- | --- | --- |
| Console | React + TypeScript + Tailwind | Session setup, live screen, MCP connection, approvals, audit, access controls. |
| API/control plane | Hono + TypeScript on Node.js | Auth, projects, uploads, session lifecycle, policy, metadata, signed URLs. |
| MCP gateway | MCP TypeScript SDK + Streamable HTTP | OAuth-bound, session-scoped tool calls; deterministic tools; trace propagation. |
| Scheduler | Durable queue plus relational session state | Warm-pool allocation, retries, leases, TTL cleanup, capacity limits. |
| Harness | TypeScript process per emulator session | Snapshot model, locator resolution, stale-state protection, policy enforcement, audit events. |
| Android adapter | Appium UiAutomator2 for prototype; custom instrumentation adapter when warranted | Tree/events, semantic interactions, input, screenshots. Keep it behind a narrow adapter interface. |
| Runtime | Dedicated VM workers with KVM; containerization inside worker only where proven safe | Emulator lifecycle and hard isolation. A developer Docker Compose setup is permitted for local development, not the production security boundary. |
| Streaming | scrcpy capture to a media gateway / WebRTC | View-only stream; no raw ADB port exposed to browsers. |
| Data | PostgreSQL, Redis/queue, encrypted object storage | Metadata/audit, leases/jobs, APKs/screenshots/log exports. |
| Observability | OpenTelemetry, structured logs, metrics/traces backend | Per-call tracing, security alerts, SLOs, debugging. |

### Security architecture requirements

1. **Isolation:** one tenant session per disposable emulator worker; dedicated service account; no shared writable volumes; no Docker socket, `privileged` mode, broad Linux capabilities, or host networking in session containers.
2. **Network:** deny all egress by default. If test traffic is needed, route it through an allowlisted, logged proxy; never expose ADB, helper, or emulator ports publicly.
3. **Identity:** SSO/OIDC for people; short-lived OAuth access tokens for remote MCP; bind MCP authorization, session, organization, and tool permissions on every request. Validate Origin/Host and protect against DNS rebinding.
4. **Secrets/data:** no secrets in logs or screen-state payloads; client-side redaction overlays and server-side field/screenshot redaction; envelope encryption for artifacts; short retention by default; cryptographic deletion on expiry.
5. **APK intake:** quarantine, static manifest/signature scan, explicit limits, content-addressed immutable artifacts, audit custody, no execution until policy passes.
6. **Execution:** policy decision before and after locator resolution; explicit confirmation tokens that are single-use and snapshot-bound; per-session action rate limits; tamper-evident append-only audit events.
7. **Operations:** dependency/image scanning, signed build artifacts, SBOM, patch SLA, secret manager, incident runbook, audit-log export, and quarterly isolation tests.

## 7. UI direction — calm, security-forward SaaS

The interface should feel like a serious developer control plane: minimal, spacious, and decisive rather than “hacker themed.” Use **Inter** throughout. Use a little bold only for page titles, active session status, and dangerous confirmations; otherwise use regular/medium weight with strong hierarchy through spacing.

- Warm off-white or near-black canvas; elevated panels with subtle one-pixel borders.
- One restrained sulphur-yellow accent for active/attention states; blue/green for verified/safe; amber for review; red reserved for blocked/destructive.
- Monospace only for session IDs, package names, commands, and audit payload excerpts.
- Never use color alone: every state has an icon, text label, and accessible contrast.
- Persistent session bar: environment, policy state, operator, expiry, Pause, and End session.
- Split desktop view: live emulator left; right rail has `Screen state`, `MCP connection`, and `Activity`. On narrow screens, stream first and move the rail to tabs.
- Security centre shows “what the agent can do,” egress state, data-retention countdown, connected clients, and a one-click revoke control—not buried settings.

```text
┌ Sulphur / Project / Session ── [Isolated] [Egress blocked]  Pause  End ┐
│                                                                          │
│  Android live view                     Screen state                      │
│  ┌───────────────────────────┐        Login · snapshot 8f29              │
│  │                           │        4 actionable elements              │
│  │        emulator stream    │        ● Sign in   semantic / verified     │
│  │                           │        MCP: connected · scoped             │
│  └───────────────────────────┘                                           │
│                                                                          │
│  Activity: agent requested tap → policy allowed → UI changed             │
└──────────────────────────────────────────────────────────────────────────┘
```

## 8. Phased build plan

| Phase | Outcome | Scope | Exit criteria |
| --- | --- | --- | --- |
| 0. Discovery & threat model | A buildable, safe target | User interviews; APK corpus; threat model; policy taxonomy; SLO/cost model; UX prototype. | Signed-off supported-app matrix and risk register. |
| 1. Local vertical slice | One APK controlled locally | Emulator bootstrap, manual APK install, UiAutomator adapter, normalized snapshot, fixed MCP tools, CLI audit log. | 20-repeat happy path with no stale action. |
| 2. Guarded agent loop | Safe MCP usability | Snapshot IDs, selector re-resolution, approvals, action policies, screenshot, error taxonomy, test fixtures. | All destructive-action and state-drift tests pass. |
| 3. Console & session service | Usable beta | Auth, project/session UI, uploads, live stream, connection wizard, pause/reset/end, audit viewer. | Internal users complete setup without shell access. |
| 4. Production isolation | Secure multi-tenant beta | VM/KVM worker pool, egress proxy, queue/leases, OIDC/OAuth, encrypted artifacts, observability, retention. | External pen test / isolation review and load test meet launch bar. |
| 5. Coverage intelligence | Broader app compatibility | Accessibility score, OCR/component fallback, confidence UX, visual-action confirmation, coverage reports. | Measured improvement on curated custom-rendered app corpus; no false “semantic” claims. |
| 6. Enterprise & scale | Controlled rollout | RBAC/SCIM, regional data controls, customer policy packs, usage billing, SDK, export/API. | Design partners meet their governance and reliability acceptance criteria. |

### Build order inside each phase

1. Define acceptance tests and failure behavior.
2. Implement the narrowest adapter and contract required.
3. Add observability and security controls alongside the feature—not as a later hardening pass.
4. Run the reference APK suite plus adversarial/stale-state tests.
5. Ship behind a flag, observe, then expand the support matrix.

## 9. Key decisions

- **Static MCP tools, dynamic data:** use one `act` tool with snapshot-bound opaque targets. Do not dynamically register a tool per screen element.
- **Adapter boundary:** prototype with Appium UiAutomator2; do not couple the product protocol to WebDriver or helper internals.
- **Semantic before visual:** an accessible node is normally safer than a coordinate. Vision is assistive and policy-gated.
- **Event-aware freshness:** combine accessibility events, stable waits, and live re-resolution. A semantic hash alone cannot prove that an action is safe.
- **Production runtime:** emulator-per-session in a hardened VM worker pool. Docker Compose plus `/dev/kvm` is a local-development convenience only; `privileged: true`, `NET_ADMIN`, and mounted Docker sockets are not acceptable production defaults.

## 10. Open questions to resolve before Phase 1 exits

1. Which initial environment is allowed: only internal/staging apps, or customer-owned signed release APKs too?
2. Which MCP clients must be first-class, and which transport/auth flows do they support today?
3. Does “live stream” require interactive human takeover or only observation? Interactive takeover changes the audit and consent model.
4. What data classes may appear in screenshots, and what default retention period meets customer expectations?
5. What is the initial supported-app declaration for Flutter, React Native, Compose, WebView, games, login screens, and third-party SDK dialogs?

## 11. Launch readiness checklist

- Threat model reviewed; tenant-escape, malicious-APK, prompt-injection, credential exposure, and session-hijack scenarios tested.
- No publicly reachable ADB/helper ports; all remote MCP requests authenticated and session-bound.
- Full action/audit correlation works across console, MCP gateway, harness, and emulator.
- Policy gates and revocation are tested under concurrent requests.
- Reference suite demonstrates semantic success, vision-assisted confidence behavior, stale snapshot rejection, and app crash/reboot recovery.
- UX is keyboard accessible, screen-reader labelled, responsive, and passes color-contrast review.
