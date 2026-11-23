/** Team account menu contribution, replacing provider-account onboarding in team workers. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { TeamAccountMenu } from './menu.tsx'

const zh = { menu: '账号与团队', settings: '设置', account: '账号与团队', logout: '退出登录', failed: '退出失败，请重试' }
const en: Record<keyof typeof zh, string> = { menu: 'Account and team', settings: 'Settings', account: 'Account and team', logout: 'Sign out', failed: 'Sign-out failed. Please retry.' }

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'team.account': keyof typeof zh }
}

/** Menu operations derived from the authenticated team portal. */
export interface TeamMenuInjected {
  openAccount: () => void
  logout: () => Promise<void>
}
/** Required browser services. */
export const inject = ['slots', 'locale', 'connection']

/** Register localized, disposable menu content through the existing settings launcher.
 * @param ctx - browser plugin scope.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const connection = ctx.get('connection') as ConnectionHandle
    let disposed = false
    let pending: AbortController | undefined
    let task: Promise<void> | undefined
    const check = (): void => {
      if (document.visibilityState === 'hidden') return
      pending?.abort()
      const controller = new AbortController()
      pending = controller
      task = fetch('/team/api/me', { cache: 'no-store', signal: controller.signal }).then(async (response) => {
        await response.body?.cancel()
        if (!disposed && !controller.signal.aborted && response.status === 401) window.location.replace('/team/login')
      }).catch((_connectionUnavailable: unknown) => {
        // Transport recovery owns network failures; only a confirmed 401 withdraws the page.
      })
    }
    const unsubscribe = connection.state.subscribe(() => {
      if (connection.state.getSnapshot() !== 'connected') check()
    })
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    check()
    return async () => {
      disposed = true
      unsubscribe()
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
      pending?.abort()
      await task
    }
  }, 'team-account: expired session navigation')
  ctx.effect(() => ctx.locale.register('team.account', { zh, en }), 'team-account: dictionaries')
  ctx.slots.inject('settings.launcher', () => ctx.slots.register({ name: 'settings.launcher', locale: 'team.account',
    inject: (): TeamMenuInjected => ({
      openAccount: () => { window.location.assign('/team/account') },
      logout: async () => {
        const response = await fetch('/team/api/me', { cache: 'no-store' })
        const body: unknown = await response.json()
        if (!response.ok || typeof body !== 'object' || body === null || !('csrf' in body) || typeof body.csrf !== 'string') throw new Error('team session unavailable')
        const result = await fetch('/team/api/logout', { method: 'POST', headers: {
          'content-type': 'application/json', 'x-hqzy-request': '1', 'x-hqzy-csrf': body.csrf,
        }, body: '{}' })
        if (!result.ok) throw new Error('team sign-out failed')
        window.location.assign('/team/login')
      },
    }),
  }, TeamAccountMenu))
}
