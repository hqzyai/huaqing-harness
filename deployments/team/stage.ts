/** Reuse the repository's deployment materialization for an independently movable Docker payload. */
import { resolve } from 'node:path'
import { restoreLegacyHoists } from '../../scripts/executable-packaging.ts'
import { materializeStagedLinks, deduplicateStagedWorkspacePackages } from '../../scripts/build-exe-for-python-sdk-staging.ts'

const destination = '/opt/dsh'
await restoreLegacyHoists(destination, resolve('python/sdk-runtime/node_modules'))
await materializeStagedLinks(destination)
await deduplicateStagedWorkspacePackages(destination, process.cwd())
