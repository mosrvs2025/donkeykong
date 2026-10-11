// Painted UI art (public/ui/*.webp): character portraits, icons, the Lumen meter frame.
// BASE_URL keeps paths right for every deploy (root, GitHub Pages sub-path, relative builds).
export const ui = (name) => `${import.meta.env.BASE_URL}ui/${name}.webp`;
export const PORTRAIT = { kiri: 'kiri', pip: 'pip', brom: 'brom', pim: 'pim', grumbo: 'grumbo', beast: 'grumbo', boing: 'boing', frog: 'boing', sola: 'sola', bird: 'sola', nuu: 'nuu', fish: 'nuu', oru: 'oru' };
export const portrait = (id, cls = 'pt', alt = '') => PORTRAIT[id] ? `<img class="${cls}" src="${ui('portrait_' + PORTRAIT[id])}" alt="${alt}" draggable="false">` : '';
export const coinImg = `<img class="coin-ico" src="${ui('icon_coin')}" alt="" draggable="false">`;
