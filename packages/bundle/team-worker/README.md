---
description: "Use central team models and first-party account navigation in each private user runtime."
kind: "package-bundle"
---

# @deepseek-ai/dsh-team-worker

English | [中文](README.zh.md)

## Summary

The shipped team-worker profile lets members use the existing Web agent with centrally configured models and first-party account navigation. This layer disables direct DeepSeek account/model onboarding and uses the browser directory picker. Members retain per-session model selection and private workspace data. The control plane supplies each container with its own proxy capability.

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

The [team deployment](../../../deployments/team/README.md) launches `dsh --profile team-worker` inside managed user containers. That shipped profile applies this bundle after `base` and `web-app`; no member installation is required. The [central bridge](../../host/team-runtime/README.md) consumes the gateway address and scoped launch token. Use the normal Web profile for a personal installation.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [patch](cordis.patch.yml) disables direct provider-account rows and the standalone model settings page, then mounts the central model bridge and account menu. It replaces the directory-picker provider and adds its browser view. Existing session selection and Web components retain their owning implementations.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Team deployment guide](../../../deployments/team/README.md) — provisioning, operation and recovery.
- [Central model bridge](../../host/team-runtime/README.md) — catalog polling and private inference routes.
- [Account menu](../../client/ui-team-account/README.md) — account navigation and sign-out.

-----

<a id="model-experience"></a>
## Model Experience

### Worker model selection

#### What the model sees

The `team-worker` layer contributes no prompt or tool text. The central bridge selects available model routes; the composed agent and adapter own model-visible requests and existing durable Session selections.

#### Token effect

The layer adds no request tokens beyond the behavior owned by its composed packages.

#### KV Cache effect

The patch adds no request prefix. Changing the selected model may change provider cache reuse.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- This layer depends on the base and web-app rows it overrides; it is not a standalone profile or a direct provider login path.
- Worker creation, filesystem isolation and Docker resource limits are owned by the control plane, not by this profile patch.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
