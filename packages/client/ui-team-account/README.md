---
description: "Open first-party account management and sign out from the team worker sidebar while retaining the existing settings entry."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-team-account

English | [中文](README.zh.md)

## Summary

Members can open their team account page, use the existing settings panel or sign out from the sidebar menu. The team-worker profile replaces provider-account onboarding with these first-party actions. The menu uses localized labels and adapts to the collapsed sidebar. Provider credentials remain outside the browser.

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

The [team-worker bundle](../../bundle/team-worker/README.md) mounts the host placeholder and its browser entry. The browser requires the existing `slots`, `locale` and `connection` services and contributes to `settings.launcher`; it accepts no package-specific configuration. Account navigation uses `/team/account`. Sign-out obtains the current CSRF value, revokes the session through the control plane and redirects to login only after success; failure produces a localized retry message.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The [browser entry](src/client/index.ts) registers locale dictionaries and menu operations in its Cordis scope. The [menu](src/client/menu.tsx) reuses shared Menu, Toast and icon components. Its busy state prevents duplicate sign-out selection, and the host entry stores no identities. Initial load, connection loss, window focus and page visibility changes check the first-party session without extending its idle lifetime. A confirmed HTTP 401 redirects to team login; network failures remain with transport recovery.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Team deployment guide](../../../deployments/team/README.md) — provisioning, operation and recovery.
- [Control plane](../../host/team-server/README.md) — account and session authority.

-----

<a id="model-experience"></a>
## Model Experience

### Account navigation

#### What the model sees

The `settings.launcher` menu changes browser navigation and authentication only. It contributes no model prompt, schema or tool result.

#### Token effect

The menu adds no request tokens.

#### KV Cache effect

Opening settings, account management or sign-out does not rewrite model request prefixes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The menu requires the same-origin team portal; it is not a standalone account provider for other profiles.
- Password setup, account invitation and administrator operations are owned by the control-plane pages.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
