/** Extrai texto puro de um HTML gerado pelo editor rich text, para previews curtos. */
export function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ')
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function isHtmlEmpty(html: string): boolean {
  return stripHtml(html).length === 0
}
