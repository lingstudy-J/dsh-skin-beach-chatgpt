
const fs = require('fs');
const p = 'src/client/skin.css';
let css = fs.readFileSync(p, 'utf8');

const darkMain = \`/* ── 暗色：暮色海面 ─────────────────────────────────────────
   壁纸本身是白天的海面，所以暗色分支只把界面层压暗，不把画压死：
   遮罩基础值明显低于亮色分支，且公式里乘的强度上限是 100%。
   这样即使"壁纸遮罩"拉满，暗色下也仍然看得见海。 */
body[data-dsh-beach-chatgpt][data-ds-dark-theme] {
  --beach-ink: #eaf3f8;
  --beach-ink-soft: #b9cedb;
  --beach-ink-faint: #93aec0;
  --beach-sea: #79c7e6;
  --beach-sea-deep: #a8dcf2;
  --beach-sun: #f0b27a;

  --beach-glass-rgb: 10 25 37;
  --beach-glass-alpha: 0.18;
  --beach-panel-alpha: 0.80;

  --beach-line: rgba(148, 200, 224, 0.24);
  --beach-shadow: 0 20px 48px rgba(0, 0, 0, 0.42), 0 2px 10px rgba(0, 0, 0, 0.3);
  --beach-scrim: linear-gradient(
    180deg,
    rgb(4 13 21 / calc(0.30 * var(--beach-scrim-strength))) 0%,
    rgb(6 20 32 / calc(0.46 * var(--beach-scrim-strength))) 100%
  );
  --beach-scroll-thumb: rgba(148, 200, 224, 0.32);
  --beach-scroll-thumb-hover: rgba(180, 220, 240, 0.5);
  --beach-text-shadow-color: rgba(0, 0, 0, 0.55);

  --dsw-alias-border-l1: rgba(148, 200, 224, 0.18);
  --dsw-alias-border-l2: rgba(148, 200, 224, 0.30);
}

\`;

const textDark = {
  cool: \`body[data-dsh-beach-chatgpt][data-ds-dark-theme][data-beach-text="cool"] {
  --beach-ink: #eaf3f8;
  --beach-ink-soft: #b9cedb;
  --beach-ink-faint: #93aec0;
}\`,
  warm: \`body[data-dsh-beach-chatgpt][data-ds-dark-theme][data-beach-text="warm"] {
  --beach-ink: #f6e9d7;
  --beach-ink-soft: #d8c3a6;
  --beach-ink-faint: #b7a189;
}\`,
  contrast: \`body[data-dsh-beach-chatgpt][data-ds-dark-theme][data-beach-text="contrast"] {
  --beach-ink: #ffffff;
  --beach-ink-soft: #d7e2ea;
  --beach-ink-faint: #a9b8c4;
}\`,
};

const accentDark = {
  sea: \`body[data-dsh-beach-chatgpt][data-ds-dark-theme][data-beach-accent="sea"] {
  --beach-sea: #79c7e6;
  --beach-sea-deep: #a8dcf2;
  --beach-sun: #f0b27a;
}\`,
  sunset: \`body[data-dsh-beach-chatgpt][data-ds-dark-theme][data-beach-accent="sunset"] {
  --beach-sea: #f0a97c;
  --beach-sea-deep: #ffc79b;
  --beach-sun: #ffcb85;
}\`,
  mint: \`body[data-dsh-beach-chatgpt][data-ds-dark-theme][data-beach-accent="mint"] {
  --beach-sea: #7fd6c6;
  --beach-sea-deep: #a9e8dc;
  --beach-sun: #f0cd80;
}\`,
  sakura: \`body[data-dsh-beach-chatgpt][data-ds-dark-theme][data-beach-accent="sakura"] {
  --beach-sea: #eda3c1;
  --beach-sea-deep: #ffc7dc;
  --beach-sun: #f4a894;
}\`,
};

const wallpaperOffDark = \`body[data-dsh-beach-chatgpt][data-ds-dark-theme][data-beach-wallpaper="off"] {
  background-color: #0a1a26;
}\`;

const anchor = '/* ── 文字颜色预设（面板可切：冷墨 / 暖褐 / 高对比） ───────── */';
if (!css.includes(anchor)) throw new Error('找不到文字预设锚点');
css = css.replace(anchor, darkMain + anchor);

for (const [key, block] of Object.entries(textDark)) {
  const marker = 'body[data-dsh-beach-chatgpt][data-beach-text="' + key + '"] {';
  const start = css.indexOf(marker);
  if (start === -1) throw new Error('找不到文字预设块 ' + key);
  const end = css.indexOf('}', start) + 1;
  css = css.slice(0, end) + '\n\n' + block + css.slice(end);
}

for (const [key, block] of Object.entries(accentDark)) {
  const marker = 'body[data-dsh-beach-chatgpt][data-beach-accent="' + key + '"] {';
  const start = css.indexOf(marker);
  if (start === -1) throw new Error('找不到强调色块 ' + key);
  const end = css.indexOf('}', start) + 1;
  css = css.slice(0, end) + '\n\n' + block + css.slice(end);
}

const offMarker = 'body[data-dsh-beach-chatgpt][data-beach-wallpaper="off"] {';
const offStart = css.indexOf(offMarker);
if (offStart === -1) throw new Error('找不到壁纸开关块');
const offEnd = css.indexOf('}', offStart) + 1;
css = css.slice(0, offEnd) + '\n\n' + wallpaperOffDark + css.slice(offEnd);

fs.writeFileSync(p, css);
const count = (css.match(/\[data-ds-dark-theme\]/g) || []).length;
console.log('暗色分支规则数：', count);
console.log('总行数：', css.split('\n').length);
