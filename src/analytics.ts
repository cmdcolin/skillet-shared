// A hit counter on every page the site serves. GoatCounter counts page views
// and sets no cookies, so no page asks first; /privacy/ says what it collects.
// Each app passes the code of its own GoatCounter site.
const counter = (site: string) => `https://${site}.goatcounter.com/count`

// A browser a script is driving counts nothing: the harnesses that screenshot
// and record these pages are nobody's visit.
export function startAnalytics(site = 'cmdcolin'): void {
  if (navigator.webdriver) return
  if (document.querySelector('script[data-goatcounter]')) return
  const tag = document.createElement('script')
  tag.async = true
  tag.src = 'https://gc.zgo.at/count.js'
  tag.dataset.goatcounter = counter(site)
  document.head.append(tag)
}
