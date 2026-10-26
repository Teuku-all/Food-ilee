/** Load a page stylesheet once, keeping presentation out of page renderers. */
export function loadStylesheet(id, url) {
  const existing = document.getElementById(id);
  if (existing) return existing;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = String(url);
  document.head.append(link);
  return link;
}
