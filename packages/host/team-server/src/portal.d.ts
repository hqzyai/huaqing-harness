/** Operator-selected reply defaults and minimum model capacity shown by the portal. */
export interface PortalModelDefaults {
  /** Suggested per-request output ceiling; this is not a provider capability. */
  defaultMaxTokens: number
  /** Minimum actual model context capacity supported by this workspace. */
  minimumContextWindow: number
}
/** Produce a private page with nonce-scoped scripts/styles and no external dependencies.
 * @param language - requested browser language.
 * @param modelDefaults - deployment-owned reply ceiling and minimum actual context capacity.
 * @returns body and matching content security policy.
 */
export declare function portalPage(language: string, modelDefaults: PortalModelDefaults): {
  html: string
  csp: string
}
//# sourceMappingURL=portal.d.ts.map
