---
description: "Invite-only email/password accounts, revocable sessions and administrator-issued activation and reset links for the team control plane."
kind: "package-library"
---

# @deepseek-ai/dsh-team-auth

English | [中文](README.zh.md)

## Summary

Team members can activate an invited email account, sign in with a password and reset access through an administrator-issued link. Administrators can invite members or administrators and disable accounts without deleting their data. The team control plane uses this library to retain account state across restarts. It requires one SQLite owner and explicit login limits and token lifetimes.

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

The [team control plane](../../host/team-server/README.md) constructs `TeamAuth` with a private database path and `TeamAuthOptions`; this library has no profile layer or plugin entry. See [the source declarations](src/index.ts) for each operation. Account failures expose typed `TeamAuthError` codes to the caller; database errors stop dependent requests.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The SQLite store owns account state, token digests, login-attempt windows and audit records. Password derivation uses scrypt with independent salts and bounded concurrency. Reset-token consumption rechecks the token after password derivation and atomically revokes prior sessions. Disabling an account also revokes its outstanding links; the caller owns runtime shutdown.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Team deployment guide](../../../deployments/team/README.md) — provisioning, operation and recovery.
- [Control plane](../../host/team-server/README.md) — HTTP authentication and runtime shutdown.

-----

<a id="model-experience"></a>
## Model Experience

### Account operations

#### What the model sees

`TeamAuth` operations contribute no prompt, schema or tool-result text. Account emails, passwords and login tokens do not become model context through this library.

#### Token effect

Zero request tokens are added by account management.

#### KV Cache effect

Account operations do not change model request prefixes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The database has one control-plane owner; multiple active replicas are unsupported.
- The caller must deliver activation/reset links and close the store after requests settle. This library does not send mail or stop containers.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
