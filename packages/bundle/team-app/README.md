---
description: "Start the trusted team control plane with first-party login, administration and isolated user-runtime routing."
kind: "package-bundle"
---

# @deepseek-ai/dsh-team-app

English | [中文](README.zh.md)

## Summary

The shipped team profile provides the login and administration portal and routes authenticated members to their private runtimes. This layer loads the HTTP carrier and control-plane package without user agent or filesystem tools. Operators configure the deployment environment and secrets before launch. Help and usage errors are handled before deployment resources open. Personal Web and headless profiles keep their own provider authentication.

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

Use `dsh --profile team` through the [team deployment guide](../../../deployments/team/README.md). The shipped profile already includes this bundle, so no additional install step is required. Environment values in the [patch](cordis.patch.yml) configure the [control-plane plugin](../../host/team-server/README.md). Keep this profile separate from agent-bearing bundles; control-plane credentials grant Docker management and model-service access.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [patch](cordis.patch.yml) inserts the command-line startup plugin, HTTP server and team server. The [startup entry](src/index.ts) processes help and usage errors before allowing deployment resources to open. Inserted packages own account storage, routing and inference semantics.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Team deployment guide](../../../deployments/team/README.md) — provisioning, operation and recovery.
- [Control plane](../../host/team-server/README.md) — configuration and runtime behavior.

-----

<a id="model-experience"></a>
## Model Experience

### Control-plane composition

#### What the model sees

The `team` profile runs no agent and adds no model context. The control-plane package owns authorized forwarding of requests assembled in user workers.

#### Token effect

The layer adds no model-request tokens.

#### KV Cache effect

The layer contributes no request prefix; the selected worker adapter owns provider cache behavior.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- This layer requires the deployment environment and dedicated Docker access described in the team guide; it does not create a personal agent workspace.
- Custom profile patches can override complete row configurations, so operators must retain required secret and routing settings.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
