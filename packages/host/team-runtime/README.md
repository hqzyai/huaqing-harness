---
description: "Discover centrally configured models inside a private team worker and connect its conversation selector to the inference proxy."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-team-runtime

English | [中文](README.zh.md)

## Summary

Members can choose centrally enabled models in the existing conversation composer without configuring provider credentials. The team-worker profile loads the central catalog and preserves the existing per-session selection behavior. Administrators can refresh available routes without recreating a worker. A catalog failure during startup refuses readiness; a later refresh failure retains the previous directory while central inference authorization remains active.

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

Use the shipped [team-worker bundle](../../bundle/team-worker/README.md) inside a managed user container. The plugin requires `connection`, `webServer` and `llm`, a `gatewayURL` and the user-scoped `DSH_TEAM_TOKEN` launch value. `refreshMs` defaults to 15000 and `timeoutMs` to 10000. The [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-host-team-runtime) owns the complete accepted fields; the deployment guide owns container setup.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [bridge](src/index.ts) validates each central catalog response and mounts the existing pi-ai adapter with `team-<service-id>` provider names. Requests carry only a worker-scoped proxy capability. The plugin waits for adapter activation before writing a private browser-readiness token, and disposes catalog polling with its Cordis scope.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Team deployment guide](../../../deployments/team/README.md) — provisioning, operation and recovery.
- [pi-ai adapter](../../llm/llm-pi-ai/README.md) — provider request construction.

-----

<a id="model-experience"></a>
## Model Experience

### Central model selection

#### What the model sees

The bridge registers `team-<service-id>` model routes and adds no prompt or tool text. The existing adapter assembles requests for the session-selected route; provider API keys stay in the control plane.

#### Token effect

Catalog polling adds no model-request tokens. The selected adapter owns request tokenization.

#### KV Cache effect

The bridge does not alter assembled request prefixes. Switching model routes may change provider cache reuse.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Catalog updates are polled, so a worker can temporarily display a disabled route; the control plane still refuses new inference on it.
- This plugin requires the private team gateway and scoped launch capability; it cannot authenticate directly to a provider.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
