/** Team control-plane command line; deployment values come from the profile environment. */
import type { Context } from '@deepseek-ai/cordis'
import { Command } from 'commander'
import { parseCmdline } from '@deepseek-ai/dsh-cmdline'

/** Ordinary provider of the team command's accepted invocation. */
export const name = 'team-startup'
/** Launcher arguments must exist before any deployment resource is opened. */
export const inject = ['cmdlineArgs']

/** Parse help before admitting the control-plane HTTP and database plugins.
 * @param ctx - profile scope carrying launcher facts.
 */
export function apply(ctx: Context): void {
  const program = new Command().name('dsh team')
    .description('Start the Huaqing team service. Configure TEAM_* deployment values before launch.')
    .action(() => { ctx.provide('teamStartup', true) })
  parseCmdline(ctx, program)
}
