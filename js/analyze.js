// ============================================================
// 童画天赋实验室 · 画作分析（浏览器本地 Canvas，不上传任何数据）
// ============================================================

function rgbToHue(r, g, b, max, min, d) {
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

// 输入：<img> 元素；输出画面特征对象
async function analyzeArtwork(imgEl) {
  const MAX = 380;
  const ow = imgEl.naturalWidth || imgEl.width;
  const oh = imgEl.naturalHeight || imgEl.height;
  const s = Math.min(1, MAX / Math.max(ow, oh));
  const w = Math.max(1, Math.round(ow * s));
  const h = Math.max(1, Math.round(oh * s));

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const N = w * h;

  const hueBins = new Array(12).fill(0);
  const binR = new Array(12).fill(0);
  const binG = new Array(12).fill(0);
  const binB = new Array(12).fill(0);
  const lum = new Float32Array(N);

  let content = 0, satSum = 0, lightSum = 0, warm = 0;
  let comX = 0, comY = 0;

  for (let i = 0; i < N; i++) {
    const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2, d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;

    const isPaper = l > 0.90 && s < 0.12; // 纸面白/浅底
    if (isPaper) continue;
    content++;
    comX += i % w; comY += Math.floor(i / w);
    lightSum += l; satSum += s;

    if (s > 0.18 && l > 0.12 && l < 0.95) {
      const hue = rgbToHue(r, g, b, max, min, d);
      const bin = Math.floor(hue / 30) % 12;
      hueBins[bin]++;
      binR[bin] += r * 255; binG[bin] += g * 255; binB[bin] += b * 255;
      if (hue < 70 || hue >= 330) warm++;
    }
  }

  // 边缘密度（笔触/细节量）
  let edges = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = Math.abs(lum[i + 1] - lum[i - 1]);
      const gy = Math.abs(lum[i + w] - lum[i - w]);
      if (gx + gy > 0.12) edges++;
    }
  }

  const colorPixels = hueBins.reduce((a, b) => a + b, 0) || 1;

  // 色相丰富度：占比 > 4% 的色相桶数
  let colorCount = 0;
  for (const b of hueBins) if (b / colorPixels > 0.04) colorCount++;

  // 色相熵
  let entropy = 0;
  for (const b of hueBins) {
    if (b > 0) { const p = b / colorPixels; entropy -= p * Math.log2(p); }
  }

  // 主色板 Top5
  const palette = hueBins
    .map((c, i) => ({ c, i }))
    .filter((b) => b.c / colorPixels > 0.04)
    .sort((a, b) => b.c - a.c)
    .slice(0, 5)
    .map((b) => {
      const n = b.c || 1;
      const r = Math.round(binR[b.i] / n), g = Math.round(binG[b.i] / n), bl = Math.round(binB[b.i] / n);
      return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
    });

  const coverage = content / N;
  const cx = comX / (content || 1) / w - 0.5;
  const cy = comY / (content || 1) / h - 0.5;
  const centerOffset = Math.hypot(cx, cy) / 0.7071;

  return {
    colorCount, hueEntropy: entropy,
    saturation: satSum / (content || 1),
    brightness: lightSum / (content || 1),
    warmth: warm / colorPixels,
    edgeDensity: edges / (content || 1),
    coverage, centerOffset, palette,
  };
}
