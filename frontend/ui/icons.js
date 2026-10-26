// One optical style for interface actions; brand artwork remains separate.
const glyphs = {
  market: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  store:
    '<path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M5 10v11h14V10M9 21v-7h6v7"/><path d="M3 10a2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0"/>',
  cart: '<path d="M3 4h2l2.5 11h11L21 7H6"/><path d="M8 15l-1 3h12"/><circle cx="9" cy="21" r=".8"/><circle cx="18" cy="21" r=".8"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  assistant:
    '<path d="M6 4h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H9l-5 3V7a3 3 0 0 1 2-3Z"/><path d="M8 9h9M8 13h6"/>',
  receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
  profile: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  community:
    '<path d="M3 21v-2a6 6 0 0 1 12 0v2M17 13a5 5 0 0 1 4 5v3"/><circle cx="9" cy="7" r="3"/><path d="M16 4a3 3 0 0 1 0 6"/>',
  logout: '<path d="M9 4H4v16h5M10 12h11M17 8l4 4-4 4"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  book: '<path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1v15"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  bell: '<path d="M5 17h14l-2-3V9A5 5 0 0 0 7 9v5l-2 3ZM10 21h4M12 3V2"/>',
  chat: '<path d="M4 4h16v13H9l-5 4V4Z"/><path d="M8 9h8M8 13h5"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  leaf: '<path d="M20 4C11 3 5 7 5 13a6 6 0 0 0 6 6c6 0 10-6 9-15ZM4 21l11-11"/>',
  arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
  external: '<path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6"/>',
  package: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7ZM3 7l9 4 9-4M12 11v10M7.5 5l9 4v4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  edit: '<path d="m14 5 5 5M4 20l5-1 11-11a2 2 0 0 0-4-4L5 15l-1 5Z"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  cycle: '<path d="M20 8a8 8 0 0 0-14-3L3 8M3 3v5h5M4 16a8 8 0 0 0 14 3l3-3M21 21v-5h-5"/>',
  sprout:
    '<path d="M12 21v-9M12 12C5 13 3 8 3 4c6 0 9 2 9 8ZM12 15c0-6 3-9 9-9 0 6-3 9-9 9ZM5 21h14"/>',
  upload: '<path d="M12 16V3M7 8l5-5 5 5M4 15v6h16v-6"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 17h3"/>',
  phone:
    '<path d="m5 3 4 1 1 5-3 2a14 14 0 0 0 6 6l2-3 5 1 1 4c-1 3-5 3-9 1A21 21 0 0 1 4 12C2 8 2 4 5 3Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  checkDouble: '<path d="m2 12 4 4L16 6M10 16l2 2L22 8"/>',
  send: '<path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  scale: '<path d="M5 5h14l2 16H3L5 5Z"/><path d="M8 8h8l-1 5H9L8 8ZM12 8l1 3"/>',
  trend: '<path d="M3 20h18M5 16l5-5 4 3 6-8M15 6h5v5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  sort: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

// Existing renderer keys stay compatible while their visual meaning is centralized.
const aliases = {
  ai: 'assistant',
  orders: 'receipt',
  guide: 'book',
  box: 'package',
  recycle: 'cycle',
  compost: 'sprout',
};

export function icon(name, className = 'fi-icon') {
  const key = aliases[name] || name;
  const resolved = Object.hasOwn(glyphs, key) ? key : 'info';
  return (
    '<svg class="' +
    className +
    '" data-icon="' +
    resolved +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    glyphs[resolved] +
    '</svg>'
  );
}

export function brandLogo() {
  return (
    '<span class="fi-brand-mark" aria-hidden="true">' +
    icon('leaf') +
    '</span><span class="fi-brand-wordmark">Food <strong>Ilee</strong></span>'
  );
}

export function brandImage({ tone = 'light' } = {}) {
  if (tone === 'dark')
    return '<img class="fi-brand-image" src="./assets/foodilee-wordmark-dark.png" alt="">';
  return '<img class="fi-brand-image" src="./assets/foodilee-wordmark.png" alt="">';
}
