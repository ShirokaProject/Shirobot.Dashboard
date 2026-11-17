/**
 * A button that is doing its work carries `aria-busy="true"` instead of `disabled`, so it keeps
 * its fill, size and label while a ring turns in it (styles/m3.css). Pointer clicks are already
 * off through CSS; this also swallows keyboard activation, before the button's own handler runs.
 */
export function installBusyGuard(root: Document = document) {
  root.addEventListener('click', event => {
    const target = event.target as Element | null
    if (!target?.closest?.('button[aria-busy="true"]')) return
    event.preventDefault()
    event.stopImmediatePropagation()
  }, true)
}
