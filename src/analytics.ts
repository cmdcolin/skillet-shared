// A hit counter on every page the site serves. GoatCounter counts page views
// and sets no cookies, so no page asks first; /privacy/ says what it collects.
const COUNTER = 'https://cmdcolin.goatcounter.com/count'

// A browser a script is driving counts nothing: the harnesses that screenshot
// and record these pages are nobody's visit.
export function startAnalytics(): void {
  if (navigator.webdriver) return
  if (document.querySelector('script[data-goatcounter]')) return
  const tag = document.createElement('script')
  tag.async = true
  tag.src = 'https://gc.zgo.at/count.js'
  tag.dataset.goatcounter = COUNTER
  document.head.append(tag)
}
