// Painted UI art (public/ui/*.webp): character portraits, icons, the Lumen meter frame.
// BASE_URL keeps paths right for every deploy (root, GitHub Pages sub-path, relative builds).
export const ui = (name) => `${import.meta.env.BASE_URL}ui/${name}.webp`;
export const PORTRAIT = { kiri: 'kiri', pip: 'pip', brom: 'brom', pim: 'pim', grumbo: 'grumbo', beast: 'grumbo', boing: 'boing', frog: 'boing', sola: 'sola', bird: 'sola', nuu: 'nuu', fish: 'nuu', oru: 'oru' };
export const portrait = (id, cls = 'pt', alt = '') => PORTRAIT[id] ? `<img class="${cls}" src="${ui('portrait_' + PORTRAIT[id])}" alt="${alt}" draggable="false">` : '';
export const coinImg = `<img class="coin-ico" src="${ui('icon_coin')}" alt="" draggable="false">`;

// painted art used by the HUD's CSS (hearts, glims, shards): exposed as CSS variables so any base path works
export function initUiVars() {
  const r = document.documentElement.style;
  for (const [k, n] of [['glim', 'icon_glim'], ['heart', 'icon_heart'], ['heart-empty', 'icon_heart_empty'], ['shard', 'icon_shard'], ['star', 'icon_star'], ['echo', 'icon_echo'], ['seed', 'icon_seed']]) r.setProperty('--ui-' + k, `url(${ui(n)})`);
}
export const echoImg = `<img class="echo-ico" src="${ui('icon_echo')}" alt="" draggable="false">`;
