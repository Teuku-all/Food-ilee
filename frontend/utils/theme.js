const THEME_KEY = 'foodilee-theme';

export function getTheme() {

  return (
    localStorage.getItem(
      THEME_KEY
    ) || 'light'
  );
}

export function setTheme(theme) {

  localStorage.setItem(
    THEME_KEY,
    theme
  );

  applyTheme(theme);
}

export function applyTheme(theme) {

  document.body.classList.remove(
    'light-theme',
    'dark-theme'
  );

  document.body.classList.add(
    `${theme}-theme`
  );
}

export function toggleTheme() {

  const currentTheme =
    getTheme();

  const nextTheme =
    currentTheme === 'light'
      ? 'dark'
      : 'light';

  setTheme(nextTheme);
}