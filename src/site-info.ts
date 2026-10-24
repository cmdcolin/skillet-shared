export type NavLink = readonly [href: string, label: string]

export interface SiteInfo {
  name: string
  home: string
  icon: string
  app: string
  nav: readonly NavLink[]
  footer: readonly NavLink[]
}
