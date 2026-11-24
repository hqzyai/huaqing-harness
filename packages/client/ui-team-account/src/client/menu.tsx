/** Presentation-only team account launcher. */
import { useState } from 'react'
import { Menu, Toast, IconUserOutlineMedium, IconSettingsOutlineMedium } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { TeamMenuInjected } from './index.ts'
import css from './menu.module.css'

type Props = PropsRuntime<'settings.launcher'> & PropsLocale<'team.account'> & InjectFace<TeamMenuInjected>

/** Render the existing settings launcher with first-party account navigation.
 * @param props - framework-owned layout and injected operations.
 * @returns sidebar menu and transient error feedback.
 */
export function TeamAccountMenu({ wide, openSettings, settingsShortcut, openAccount, logout, t }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(0)
  return <div className={css.root}>
    <Menu open={open} side="top" portal autoFocus className={css.root}
      anchor={<button type="button" className={css.trigger} data-collapsed={!wide} aria-label={t('menu')}
        aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(value => !value) }}>
        <IconUserOutlineMedium size={16} />{wide && <span>{t('menu')}</span>}
      </button>}
      items={[
        { id: 'settings', label: t('settings'), icon: <IconSettingsOutlineMedium size={16} />,
          ...settingsShortcut === undefined ? {} : { shortcut: settingsShortcut } },
        { id: 'account', label: t('account'), icon: <IconUserOutlineMedium size={16} /> },
        { id: 'logout', label: t('logout'), disabled: busy },
      ]}
      onClose={() => { setOpen(false) }} onSelect={(id) => {
        setOpen(false)
        if (id === 'settings') openSettings()
        else if (id === 'account') openAccount()
        else {
          setBusy(true)
          void logout().catch((_logoutError: unknown) => { setError(value => value + 1) }).finally(() => { setBusy(false) })
        }
      }} />
    {error > 0 && <Toast key={error} text={t('failed')} onDone={() => { setError(0) }} />}
  </div>
}
