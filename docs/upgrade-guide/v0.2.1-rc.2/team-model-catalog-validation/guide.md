---
kind: upgrade-guide
description: "Team model catalog writes reject insufficient context windows and require a new API key when changing providers."
---

# Team model catalog validation

English | [中文](guide.zh.md)

## Change

Administrator catalog writes reject model context windows below the control plane's `modelMinimumContextWindow`, which defaults to 16,384 Token. Previously, writes accepted 1,024 Token. Existing catalog entries remain readable, but editing an undersized entry requires correcting its capacity. Changing a service's provider also requires an API key for the new provider; omitting the key no longer reuses a credential from a different provider.

## Migration

1. Open the service in the administrator's model settings and read its model information from the provider. If discovery is unavailable, copy the model's actual context capacity from the provider's documentation. Use a model that meets the configured minimum; do not increase a declared capacity beyond the model's real limit.
2. Enter a new API key when changing platforms. Leaving the key blank continues to preserve the credential when the platform is unchanged.
3. Update automated `POST /team/api/services` writes to supply the true `models[].contextWindow` and a new `apiKey` when changing `provider`. An insufficient window returns `model-context-too-small`; a missing replacement key returns `missing-api-key`.
4. Confirm the service saves and produces a complete reply in a conversation. Operators can set `modelMinimumContextWindow` in the team-server configuration; it must remain above the runtime's 4,096-Token reservation. Rejected writes preserve the previous configuration and credential.
