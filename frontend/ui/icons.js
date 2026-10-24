const paths = {
  market:
    '<path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/><path d="M3 10a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>',
  cart: '<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.7 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 7H5"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  ai: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4M8 10h.01M12 10h.01M16 10h.01M8 14h8"/>',
  orders: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  store: '<path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  guide: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  chat: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  leaf: '<path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z"/><path d="M4 21c2-5 6-8 12-11"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  external:
    '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  sparkles:
    '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3ZM19 14l1.2 2.8L23 18l-2.8 1.1L19 22l-1.1-2.9L15 18l2.9-1.2L19 14Z"/>',
  box: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
  eye: '<path d="M2.5 12s3.4-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.4 6.2-9.5 6.2S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/>',
  recycle:
    '<path d="m7 7 2-3 3 0 2 3M17 7h3l1.5 2-1.5 3M17 17l-2 3h-3l-2-3M7 17H4l-1.5-2L4 12"/><path d="m9 4 2 3-4 0M21.5 9 18 10l2 3M10 20l1-4 3 2M2.5 15 6 14l-2-3"/>',
  compost: '<path d="M4 18c4-2 6-7 16-12-1 9-4 14-10 14-3 0-5-1-6-2Z"/><path d="M4 21c3-5 7-8 12-11"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Z"/><path d="M9 21v-7h6v7"/>',
};

export function icon(name, className = 'fi-icon') {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.guide}</svg>`;
}

export function brandLogo() {
  return `<span class="fi-brand-mark" aria-hidden="true">${icon('leaf')}</span><span class="fi-brand-wordmark">Food <strong>Ilee</strong></span>`;
}

export function brandHeader() {
  return '<img class="fi-brand-symbol" src="./assets/foodilee-logo.png" alt=""><span class="fi-brand-wordmark">Food <strong>Ilee</strong></span>';
}

export function brandImage({ tone = 'light' } = {}) {
  if (tone === 'dark')
    return '<img class="fi-brand-image" src="./assets/foodilee-wordmark-dark.png" alt="">';
  return '<img class="fi-brand-image" src="./assets/foodilee-wordmark.png" alt="">';
}
