---
description: "Run first-party team login and administration, route users to isolated Docker runtimes and authorize centrally configured model inference."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-team-server

English | [中文](README.zh.md)

## Summary

Teams can use their own email/password accounts, invite colleagues and choose administrator-configured models without provider login. Administrators manage users and model services in the web portal. Each authenticated user reaches a separate Docker runtime and private volumes. The control plane retains provider credentials and proxies model calls. Deployment requires one control-plane process and a dedicated Docker daemon.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Use the shipped [team profile](../../bundle/team-app/README.md) and the [deployment guide](../../../deployments/team/README.md), which configure the HTTP carrier, private paths, origin, secrets and Docker image together. The plugin injects `webServer`; it mounts no user agent or filesystem tools in the control plane. The [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-host-team-server) lists all accepted deployment fields. Missing secrets, invalid origins and unsupported database versions stop startup.

Administrators can verify a provider connection and read its model catalog before saving a service. Discovery returns only the capabilities supplied by the platform; missing capabilities require explicit manual entry. Requests enforce timeout, response-size and model-count limits, and shutdown cancels admitted discovery. New catalog writes must meet the configured minimum context capacity; the portal displays the Token unit and distinguishes total context from the per-reply output limit. See the [catalog validation upgrade guide](../../../docs/upgrade-guide/v0.2.1-rc.2/team-model-catalog-validation/guide.md) for existing undersized entries and provider changes.

HTTPS is the default for nonloopback origins. An operator may set `allowInsecureHttp: true` to allow HTTP only at a literal RFC1918 IPv4 address (`10.0.0.0/8`, `172.16.0.0/12` or `192.168.0.0/16`); the shipped profile reads this opt-in from `TEAM_ALLOW_INSECURE_HTTP=true`. HTTP sends passwords and session cookies without transport encryption. Exact Host/Origin checks and CSRF checks remain enabled; public HTTP and HTTP DNS names remain rejected. Loopback HTTP remains available without the opt-in.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [route owner](src/index.ts) applies first-party sessions, same-origin mutation checks and administrator authorization before account or model operations. [Container management](src/containers.ts) assigns a runtime from the authenticated user identifier; [HTTP transport](src/http.ts) keeps worker browser credentials server-side. Private model listeners bind concrete addresses on per-user Docker networks. Browser streams recheck revocation; inference resolves enabled model membership on every request. Shutdown stops request admission, cancels active transports and Docker startup, and waits for admitted password/database operations before closing private listeners and stores.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Team deployment guide](../../../deployments/team/README.md) — provisioning, operation and recovery.
- [Identity storage](../../identity/team-auth/README.md) — account and token semantics.
- [Model catalog](../../llm/team-models/README.md) — credential encryption and accepted providers.

-----

<a id="model-experience"></a>
## Model Experience

### Authorized inference

#### What the model sees

`/team` login and administration add no model context. The control plane forwards the worker-assembled request to the exact enabled model route and substitutes the provider credential without adding prompt text.

#### Token effect

The control plane adds no prompt tokens; upstream usage belongs to the selected provider request.

#### KV Cache effect

Credential substitution does not change request prefixes. A different model route can change provider cache reuse.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The deployment supports one control plane and one Docker host; cross-host scheduling and automatic image rollout are unsupported.
- Administrators deliver one-time links manually. Public signup and SMTP delivery are unavailable.
- Operators own transport exposure, dedicated Docker access and consistent backups of private databases, keys and user volumes.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
