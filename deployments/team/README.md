---
description: "Deploy the invite-only Huaqing team workspace on one Linux Docker host."
kind: "tutorial"
---

# Team deployment

English | [中文](README.zh.md)

This deployment has a single-network edge proxy, one trusted control plane and one private Docker runtime per user. Accounts belong to Huaqing; users do not sign in to DeepSeek or supply provider API keys. Administrators configure model services, invite accounts and generate password-reset links. Members choose an enabled model in the existing conversation composer; selections are saved per conversation.

## Prepare the host

Use Linux, Node 24, Docker Engine 28 or newer with Compose 2.33.1 or newer and a dedicated rootless Docker daemon. HTTPS with a domain is the default; private-network HTTP requires the explicit opt-in below. The control plane has access to that daemon's Unix socket and can control its containers; do not point it at a shared or host-root daemon. Workers receive no Docker socket, host source directories, administrator keys or other users' volumes. Reserve capacity for the edge proxy, control plane and each active worker; the default worker limits are 2 CPUs, 2 GiB memory and 256 processes. Use an external firewall; the default deployment uses a TLS reverse proxy. Only the edge publishes `127.0.0.1:18410`; the control plane has no published port.

Build the worker, gateway and edge images from this checkout. Host node_modules, compiled outputs and secret files are excluded from the build context.

```sh
docker build --build-arg DSH_BUILD_COMMIT="$(git rev-parse HEAD)" --target worker -t huaqing-team-worker:0.2.1-rc.2 -f deployments/team/Dockerfile .
docker build --build-arg DSH_BUILD_COMMIT="$(git rev-parse HEAD)" --target gateway -t huaqing-team-gateway:0.2.1-rc.2 -f deployments/team/Dockerfile .
docker build -t huaqing-team-edge:0.2.1-rc.2 -f deployments/team/edge.Dockerfile .
```

## Initialize the control plane

Create `deployments/team/.env` with these deployment values. The socket must belong to the dedicated rootless daemon; the images must be available in that daemon's image store. Choose a control subnet that does not overlap existing host or Docker networks. `TEAM_CONTROL_SUBNET` defaults to `172.30.0.0/24`; `TEAM_EDGE_IP` defaults to `172.30.0.2` and `TEAM_GATEWAY_IP` to `172.30.0.3`. Both addresses must be distinct, unused and inside the chosen subnet. Update both addresses when changing the subnet.

```dotenv
DSH_BUILD_COMMIT=<source-commit>
TEAM_PUBLIC_ORIGIN=https://agent.example.com
TEAM_BOOTSTRAP_EMAIL=admin@example.com
TEAM_DOCKER_SOCKET=/run/user/1000/docker.sock
TEAM_CONTROL_SUBNET=172.30.0.0/24
TEAM_EDGE_IP=172.30.0.2
TEAM_GATEWAY_IP=172.30.0.3
TEAM_TRUSTED_PROXY_IPS=
```

Set `TEAM_TRUSTED_PROXY_IPS` to the literal socket-peer IP addresses of the outer TLS proxy as seen by the edge, separated by spaces. Compose passes this value to the edge as `TEAM_EDGE_TRUSTED_PROXY_IPS`; an unset or empty value trusts only `127.0.0.1 ::1`, never an entire bridge network. The edge accepts `X-Real-IP` only from those peers and overwrites the upstream value with its resolved client address. The gateway trusts only the fixed `TEAM_EDGE_IP`, which Compose configures automatically. A missing trusted TLS-proxy peer makes login IP limits apply to that proxy's address instead of each client.

Generate private files once, using the same public origin, then start the control plane. The provisioner preserves existing encryption and worker-token keys. Keep these files out of Git and copy them to your deployment secret store.

```sh
TEAM_PUBLIC_ORIGIN=https://agent.example.com node deployments/team/provision.mjs
docker compose --env-file deployments/team/.env -f deployments/team/compose.yml up -d
```

Configure the host's HTTPS reverse proxy using [Caddyfile](Caddyfile), with `TEAM_DOMAIN` set to your domain. It must preserve Host, overwrite `X-Real-IP` and support long responses. Requests pass through the loopback edge to the control plane over the control network; the [edge configuration](edge.caddyfile) retains the original Host, including a nondefault port, and supports WebSocket and streaming traffic. The edge starts after the gateway health check passes. Confirm the deployed TLS proxy's socket-peer address before admitting members. Open the initial administrator link saved in `deployments/team/private/administrator-activation-url` within 24 hours and choose a password of 15–128 Unicode characters. The token is carried in the URL fragment and removed from browser history when the activation page opens; it is never sent as an HTTP query or referrer. After activation, keep the bootstrap token offline.

## Opt in to private-network HTTP

The default configuration requires HTTPS. For a private-network entrypoint at a literal RFC1918 IPv4 address, set these values in the same `.env`:

```dotenv
TEAM_PUBLIC_ORIGIN=http://192.168.2.11:18400
TEAM_ALLOW_INSECURE_HTTP=true
```

Use a deployment-specific Compose override to replace the edge publication with `192.168.2.11:18400:18410`, and restrict the host firewall to the actual private-network clients; keep the gateway unpublished. The public origin must exactly match the browser's protocol, IP and port. Always load the same override when recreating the gateway and edge; do not substitute Docker Desktop's local override for the dedicated rootless daemon.

This option accepts only literal IPv4 addresses within `10.0.0.0/8`, `172.16.0.0/12` and `192.168.0.0/16`; public HTTP, HTTP DNS names and other addresses still stop startup. HTTP sends passwords and session cookies without transport encryption; same-origin, CSRF, account authorization and user-runtime isolation checks remain enabled. Loopback HTTP does not require this option.

## Try locally with Docker Desktop

For a loopback-only Mac or Windows preview, set `TEAM_PUBLIC_ORIGIN=http://127.0.0.1:18410`, `TEAM_DOCKER_SOCKET=/var/run/docker.sock` and the administrator email in the same `.env`, provision with that origin, then start with the explicit local override. This override permits Docker Desktop's VM daemon only when the public origin is loopback HTTP; the production entrypoint still requires rootless Docker.

```sh
docker compose --env-file deployments/team/.env -f deployments/team/compose.yml -f deployments/team/compose.local.yml up -d
```

Open the generated administrator activation link and configure real model services before opening a conversation. An empty model directory is intentional until an administrator saves an enabled service.

## Invite members and configure models

Open **Account and team → Administration**. Create an account and copy its single-use activation link; deliver it privately yourself. Invitations expire after 24 hours. Password-reset links expire after one hour, replace earlier links and revoke all existing account sessions when used. Disabling an account revokes access immediately and stops its runtime while retaining data. A failed Docker stop is reported separately; access remains disabled and inference is denied.

### Connect a model service

The administration form separates the provider connection from the models offered to members. A new service receives a default display name and an automatically generated internal ID; administrators can change the display name without entering a technical identifier.

1. Choose Volcengine, Qwen, Bailian, DeepSeek or Zhipu. Confirm the suggested API URL, adjust it for the supported region or workspace, and enter the provider API key. Qwen and Bailian share the DashScope-compatible API; separate services can use different credentials and catalogs.
2. For Qwen, Bailian or DeepSeek, choose **Verify connection and read models**. This reads authenticated provider metadata without sending inference or saving the service. Select the models to offer to members; provider-reported context capacity and image support fill their fields when available, and the reported output capability constrains the suggested per-request ceiling. A successful catalog request does not prove that a later inference call has model access or will succeed.
3. Open a model's advanced parameters when any capability is unknown. Check the provider documentation, supply the actual context capacity and image capability, choose an output ceiling within the provider limit, and confirm the manual values. Every capacity is measured in tokens: context is the combined input-plus-output capacity; output is the per-request ceiling. The suggested output value is a workspace preference, not evidence of provider capability. Models below the workspace minimum cannot be selected or saved; choose a suitable model rather than overstating its capacity.
4. Review the selected models and enable the service, then choose **Save service**. Reading the catalog does not persist keys, endpoints or model edits. When editing a saved service, leaving the key blank retains it only if the provider is unchanged; changing provider requires a new key.

Volcengine Ark and Zhipu use the manual model flow because this integration does not provide reliable official catalog discovery with their inference keys. The form explicitly states that the key has not been verified. Enter the full model or Ark endpoint ID and confirm the real capabilities from provider documentation; saving a manual service does not authenticate the key or perform inference.

API keys are encrypted in the control plane and are never returned to members or placed in worker environments. Discovery timeouts, response/model limits, concurrent-request limits and workspace model defaults are deployment settings in the [configuration catalog](../../docs/config-catalog.md#deepseek-aidsh-host-team-server). Workers refresh saved catalogs every 15 seconds. The inference proxy checks enabled service/model membership and output limits on every request, including requests that bypass the selector. Disabling a service prevents new requests; an already accepted request can finish.

## Operate and recover

The identity and model databases live in the `team-control` volume; each user owns separate `hqzy-<user-id>-home` and `hqzy-<user-id>-workspace` volumes. Back up the databases and encryption/worker-token keys together, and back up user volumes separately. Stop writes or use SQLite's online backup API for a consistent database backup. Never copy only a live `.sqlite` file while omitting its WAL. Test restoration before upgrades. Schema versions increase monotonically; an unknown version stops startup.

Browser sessions expire after seven days or twelve idle hours. Logout revokes the server-side session; long user-facing HTTP responses and Remote WebSocket connections recheck access every second. Docker networks and container identities are derived only from server-side user IDs. The gateway joins each private network and binds a worker-scoped inference listener on its concrete network address; workers do not share a bridge. The gateway binds its HTTP listener and health check to the named control network. The edge remains on that network alone and publishes the stable deployment entrypoint while the gateway joins user networks. After a gateway restart, running worker routes are recovered before readiness is announced. Container images and limits are deployment settings; changing them requires an operator-managed worker replacement that retains its volumes. Rotate a worker-token signing key by replacing workers with the same private volumes; API-key rotation is available in the administration page.

Inspect proxy logs with `docker compose --env-file deployments/team/.env -f deployments/team/compose.yml logs edge`, control-plane logs with `docker compose --env-file deployments/team/.env -f deployments/team/compose.yml logs gateway` and the assigned worker with `docker logs hqzy-<user-id>`. If the first activation link expires before setup, the operator runs the provisioner with `--renew-bootstrap`, then restarts the gateway and uses the new activation file. Renewal works only while the sole initial administrator remains inactive; it never overwrites an active account. No public password-recovery or signup endpoint is provided.

## Verify restart recovery

The deployment operator verifies the complete public request path after setup and image upgrades. Initial Compose health dependencies do not replace these checks during operation.

1. Activate two test members, open a conversation for each and keep both runtimes active. Select a configured model and verify that each member can read only its own workspace and conversation.
2. Restart only the gateway three times consecutively. After each restart, wait for gateway health and verify a new request to `/team/health` through the public origin. Reload both existing conversations, confirm the saved model selection and send a new message through the configured model service.
3. Repeat the access and isolation checks after the third restart. A healthy container alone is insufficient: the edge, browser connection, saved conversation and inference route must all recover.

## Deployment limits

This is a single-control-plane, single-Docker-host deployment. SMTP delivery, public signup, multi-host scheduling and automatic container-image rollout are outside this configuration. Run the normal local `dsh web` profile for personal use; the team deployment does not change its provider credentials or existing sessions.
