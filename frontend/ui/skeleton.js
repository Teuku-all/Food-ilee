export function skeleton(width = '100%', height = '14px', shape = '') {
  return `<span class="fi-skeleton${shape ? ` ${shape}` : ''}" style="width:${width};height:${height}" aria-hidden="true"></span>`;
}
