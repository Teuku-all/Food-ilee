let navigationRevision = 0;

export function beginNavigation() {
  navigationRevision += 1;
  return navigationRevision;
}

export function getNavigationRevision() {
  return navigationRevision;
}

export function isCurrentNavigation(revision) {
  return revision === navigationRevision;
}

export function isRouteCurrent(route, revision) {
  return revision === navigationRevision && location.hash === route;
}
