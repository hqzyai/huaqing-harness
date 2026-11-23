---
description: "Publish a branding-only image update on the managed original Harness workstation."
kind: "reference"
---

# Branding release

English | [中文](README.zh.md)

These tasks support only the managed original workstation, its dedicated rootless daemon, the existing expanded `ops/compose.switch.json` and port 28003. Maintain the playbooks and helpers in the control node's `audible` repository before execution. They preserve the current Switch integration and change only the gateway image and `TEAM_WORKER_IMAGE`; candidate image layers must extend the currently deployed images.

## Inspect and plan

Run the managed Harness status task first. `read-brand-image.yml` accepts an inventory-listed `brand_code_component` and a local `brand_code_destination`. It reads package names using a disposable, read-only, network-disabled container and copies only selected packaged code; no application entrypoint, user volume or runtime secret is mounted. The archive records source-image identity, actual package paths and file hashes.

`prepare-brand-payload.py` packages the two locally built prompt modules after verifying both audited base-image manifests and their original module hashes. `build-brand-images.yml` builds the remaining product-text changes over those frozen images without copying whole application bundles; the gateway inherits its original image user. Maintain these files in `audible` and run its build task with the source archive SHA-256 and explicit confirmation.

If the stopped edge’s declared address is occupied, `repair_harness_edge_address.yml` provides a separate planned repair for this workstation: it moves only the edge from `10.241.0.2` to the verified-free `10.241.0.5` and changes the gateway’s corresponding exact trusted-proxy address. The task preserves images, published ports, volumes and Switch, verifies public health, then stops the edge for the branding release. A failed repair restores the prior configuration and stopped edge state.

After building and verifying both candidate images, run the maintained release task with immutable image IDs:

```sh
.venv/bin/ansible-playbook playbooks/harness_brand_release.yml --limit workstation_001 \
  -e brand_gateway_image=sha256:<gateway-image-id> \
  -e brand_worker_image=sha256:<worker-image-id>
```

The default `plan` action requires the original edge to be stopped and every worker to be idle. It validates inventory images, candidate ancestry, mount sources, worker ownership, private networks and Compose syntax. Normal authenticated Session reads must report no running turns, and process inspection must show only the worker's main Node process; unreadable activity or unexpected children refuse the release. It saves a private receipt and exact configuration backup on the server. Missing edge attachments require a separate reviewed recovery task. `--check` does not create a release plan or establish runtime readiness.

## Apply and verify

Use the returned receipt ID with `brand_release_action=apply`, `brand_release_receipt=<receipt-id>` and `brand_release_confirm=true`. The task stops only the gateway and managed workers, retains original worker containers for rollback, and creates replacements with the same environment, UID, resource limits, volumes, network addresses and aliases. The new gateway recovers those workers. A stopped original Harness edge is started by its exact ID; Switch ingress and ports are not changed.

The `applied-awaiting-acceptance` result requires a real identity reply through the normal Session API or browser. `verify-brand.yml` selects a configured model, checks the reply and logged system identity, and archives only its own test Session; credentials remain inside the worker. `verify-public.yml` checks the public login brand, health and authentication fences directly from the control node. Run `brand_release_action=verify` after application acceptance to verify preserved runtime settings and public health. Re-audit and review the inventory update before exporting current images with the managed export task.

## Roll back

An apply failure attempts to restore the original Compose configuration, worker IDs, network endpoints and initial edge running state. An interrupted or accepted release can be restored explicitly using `brand_release_action=rollback` with the same receipt and confirmation. Runtime drift or incomplete recovery is reported without deleting evidence. A successful release retains stopped original workers; rollback retains stopped failed candidates. The task never deletes volumes, resets credentials, migrates databases, prunes Docker or restarts unrelated services.

## Versioned image delivery

`image-delivery.yml` is maintained as `audible/playbooks/harness_image_delivery.yml` for the existing original workstation. Its default plan freezes the current three image identities and each recognized old image archive and sidecar. After review, apply with the receipt and explicit confirmation to perform the existing verified export, publish `huaqing-harness-0.1.0-linux-x86-<32 lowercase hex from openssl rand -hex 16>-<Asia/Shanghai YYYYmmddHHMMSS>.tar.gz`, then move old image files under `images/del/<receipt>/`. Source archives, other services and existing retained batches are outside its file selection. Moving the Workspace root hard-link alias and its sidecars keeps the old download entry with that batch. Generic exports for other services retain their SHA256 naming.
