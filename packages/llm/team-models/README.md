---
description: "Configure explicit cloud model catalogs and encrypt provider API keys for the team inference proxy."
kind: "package-library"
---

# @deepseek-ai/dsh-team-models

English | [中文](README.zh.md)

## Summary

Administrators can maintain enabled model services for Volcengine, Qwen, Bailian, DeepSeek and Zhipu without exposing their API keys in model discovery. Callers can resolve an exact enabled service/model pair for inference. Saved credentials use a separately managed encryption key. Callers can prepare a temporary provider connection before saving a complete model catalog. Model identifiers and capability limits must match the deployed models.

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

The [team control plane](../../host/team-server/README.md) opens `TeamModels` using a private SQLite path and a 32-byte base64url encryption key. Validate administrator JSON with `parseModelService` before saving a complete service. `list` omits keys; `route` returns a credential-bearing result for control-plane use only. Invalid writes report `TeamModelError`; a wrong encryption key refuses startup. The [source](src/index.ts) defines the accepted endpoints and fields.

For catalog discovery, `parseModelConnection` validates provider, endpoint, optional existing service ID and optional replacement key without requiring model capabilities. `resolveConnection` returns an in-memory credential-bearing connection using the supplied key or an existing service's saved key for the same provider. Neither operation performs a network request or persists edits; only `save` stores the completed service. Omitting the key preserves it only for the same provider. A provider change requires a new key for both connection resolution and saving; a failed attempt leaves the saved service unchanged.

Qwen and Bailian accept the declared DashScope endpoints and workspace URLs in the form `https://{WorkspaceId}.{region}.maas.aliyuncs.com/compatible-mode/v1`. Workspace identifiers must start with `ws-` or `llm-`, contain only lowercase DNS-label characters and fit within 63 characters. Supported regions are `cn-beijing`, `ap-southeast-1`, `eu-central-1`, `ap-northeast-1`, `cn-hongkong` and `us-east-1`. Other providers do not accept these workspace URLs. Set `contextWindow` to the deployed model’s full input-plus-output context capacity and `maxTokens` to the chosen per-request output ceiling, both in tokens; the two values describe different limits. The [control-plane configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-host-team-server) owns discovery limits and workspace minimum-capacity policy.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The store keeps public configuration separate from AES-256-GCM ciphertext. Each encrypted credential is authenticated with its service identifier. Public listings return detached configurations; temporary connection resolution decrypts a credential only for its caller, without updating the catalog. Inference resolves enabled membership again instead of trusting a browser selection. The control plane owns authenticated metadata requests; no provider network call occurs in this library.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Team deployment guide](../../../deployments/team/README.md) — provisioning, operation and recovery.
- [Inference proxy](../../host/team-server/README.md) — request authorization and upstream transport.

-----

<a id="model-experience"></a>
## Model Experience

### Model routing

#### What the model sees

`TeamModels` supplies model metadata and credentials to its caller; it contributes no prompt or tool text. The inference adapter and control plane own the request sent to the selected model.

#### Token effect

The catalog adds no request tokens.

#### KV Cache effect

The catalog does not rewrite request prefixes. Selecting a different provider or model can change provider cache reuse.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Only the cloud HTTPS endpoints declared in the parser are accepted. Provider metadata discovery and any inference verification belong to the control plane; resolving a connection here does not verify the key.
- The encryption key must be backed up with the database. Losing it makes saved provider credentials unreadable.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
