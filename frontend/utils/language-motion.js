const textTargets =
  'h1, h2, h3, p, a, button, label, legend, span, strong, small, li, dt, dd, time, input, select, textarea, div';
const frameTargets =
  'header, section, article, aside, footer, form, img, .landing-hero-image, .mp-promo-visual, .fi-nav, .fi-account-menu.open';
const motionTargets = `${textTargets}, ${frameTargets}`;

function visibleTargets() {
  return [
    ...document.querySelectorAll(`#app :is(${motionTargets}), dialog[open] :is(${motionTargets})`),
  ].filter((element) => {
    if (element.closest('[hidden], [aria-hidden="true"]')) return false;
    if (element.matches('.landing-hero')) return false;
    if (
      element.localName === 'div' &&
      !element.matches('.landing-hero-image') &&
      ![...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
      )
    )
      return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth &&
      getComputedStyle(element).visibility === 'visible'
    );
  });
}

function displayText(element) {
  if (element instanceof HTMLSelectElement) return element.selectedOptions[0]?.textContent || '';
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
    return element.value || element.placeholder || '';
  return element.innerText;
}

function settleVisibleEntranceMotion() {
  for (const animation of document.getAnimations()) {
    const element = animation.effect?.target;
    if (!(element instanceof Element) || !element.closest('#app')) continue;
    if (animation.playState !== 'running') continue;
    if (!Number.isFinite(animation.effect.getComputedTiming().endTime)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight) continue;
    animation.finish();
  }
}

// Paths preserve snapshot identity on pages (such as AI) that rebuild their DOM.
function elementPath(element) {
  const parts = [];
  while (element && element !== document.body) {
    if (element.id) {
      parts.unshift(`#${CSS.escape(element.id)}`);
      break;
    }
    const index = [...element.parentElement.children].indexOf(element) + 1;
    parts.unshift(`${element.localName}:nth-child(${index})`);
    element = element.parentElement;
  }
  return parts.join(' > ');
}

async function fadeText(update) {
  // Older browsers fade only text controls, keeping backgrounds and images visible.
  const route = location.hash;
  const animate = (frames, ms) => {
    const targets = visibleTargets().filter(
      (element) =>
        element.matches(textTargets) &&
        displayText(element)?.trim() &&
        !element.matches('[data-language-choice]'),
    );
    const leaves = targets.filter(
      (element) => !targets.some((other) => other !== element && element.contains(other)),
    );
    return Promise.all(
      leaves
        .filter((el) => el.isConnected)
        .map(async (el) => {
          const animation = el.animate(frames, { duration: ms, easing: 'ease-out', fill: 'both' });
          try {
            await animation.finished;
          } finally {
            animation.cancel();
          }
        }),
    );
  };
  await animate([{ opacity: 1 }, { opacity: 0 }], 100);
  update();
  if (location.hash === route) await animate([{ opacity: 0 }, { opacity: 1 }], 200);
}

export async function transitionLanguage(update) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) {
    update();
    return;
  }
  settleVisibleEntranceMotion();
  const targets = visibleTargets();
  if (!document.startViewTransition) {
    if (Element.prototype.animate) await fadeText(update);
    else update();
    return;
  }

  const snapshots = targets.map((element, index) => ({
    element,
    path: elementPath(element),
    name: `language-part-${index}`,
    frame: element.matches(frameTargets),
    text: displayText(element),
    original: element.style.viewTransitionName,
  }));
  const root = document.documentElement;
  root.dataset.languageTransition = 'true';
  const frameStyles = document.createElement('style');
  const keepFramesVisible = () => {
    frameStyles.textContent = snapshots
      .filter(({ frame, element, text }) => frame || displayText(element) === text)
      .map(
        ({ name }) =>
          `html[data-language-transition]::view-transition-old(${name}){display:none}` +
          `html[data-language-transition]::view-transition-new(${name}){animation:none;mix-blend-mode:normal}`,
      )
      .join('\n');
  };
  keepFramesVisible();
  document.head.append(frameStyles);
  snapshots.forEach(({ element, name }) => {
    element.style.viewTransitionName = name;
  });
  let skip;
  try {
    const transition = document.startViewTransition(() => {
      update();
      snapshots.forEach((snapshot) => {
        if (snapshot.element.isConnected) return;
        const replacement = document.querySelector(snapshot.path);
        if (!replacement) return;
        snapshot.element = replacement;
        snapshot.original = replacement.style.viewTransitionName;
        replacement.style.viewTransitionName = snapshot.name;
      });
      keepFramesVisible();
    });
    transition.ready.catch(() => {});
    skip = () => transition.skipTransition();
    window.addEventListener('hashchange', skip, { once: true });
    // A route change or resize can skip motion; the language update still runs.
    await transition.updateCallbackDone;
    await transition.finished;
  } finally {
    if (skip) window.removeEventListener('hashchange', skip);
    snapshots.forEach(({ element, original }) => {
      element.style.viewTransitionName = original;
    });
    frameStyles.remove();
    delete root.dataset.languageTransition;
  }
}
