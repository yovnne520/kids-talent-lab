// ============================================================
// 童画天赋实验室 · 评分引擎（纯函数，可单测）
// ============================================================

// 问卷分：每题 1-5 档线性映射 0-100，维度取均值
function calcQuestionScores(answers) {
  const sums = {}, counts = {};
  for (const q of QUESTIONS) {
    const a = answers[q.id] || 3; // 未答默认"偶尔"
    if (!sums[q.dim]) { sums[q.dim] = 0; counts[q.dim] = 0; }
    sums[q.dim] += (a - 1) / 4 * 100;
    counts[q.dim] += 1;
  }
  const out = {};
  for (const k of DIM_KEYS) out[k] = sums[k] / counts[k];
  return out;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const norm = (v, lo, hi) => clamp01((v - lo) / (hi - lo));
// 0-1 → 70-96（画作分永不离谱）
const scaleArt = (v) => 70 + clamp01(v) * 26;

// 画作特征 → 各维度画作分（focus 单幅画测不出，返回 null）
function artDimensionScores(feat) {
  if (!feat) return null;
  return {
    color: scaleArt(0.6 * norm(feat.colorCount, 1.5, 8) + 0.4 * norm(feat.saturation, 0.22, 0.62)),
    observe: scaleArt(norm(feat.edgeDensity, 0.03, 0.16)),
    imagine: scaleArt(0.7 * norm(feat.hueEntropy, 1.2, 3.2) + 0.3 * norm(feat.colorCount, 1.5, 8)),
    express: scaleArt(0.5 * norm(feat.brightness, 0.35, 0.72) + 0.5 * norm(feat.saturation, 0.22, 0.62)),
    aesthetic: scaleArt(
      0.6 * (1 - clamp01(Math.abs(feat.coverage - 0.55) / 0.45)) +
      0.4 * (1 - clamp01((feat.centerOffset - 0.08) / 0.5))
    ),
    focus: null,
  };
}

// 总合成：有画作时 问卷 55% + 画作 45%
function computeResult(answers, feat) {
  const q = calcQuestionScores(answers);
  const art = artDimensionScores(feat);
  const dims = {};
  for (const k of DIM_KEYS) {
    let v = q[k];
    if (art && art[k] != null) v = q[k] * 0.55 + art[k] * 0.45;
    dims[k] = Math.round(Math.min(97, Math.max(72, v)));
  }
  const values = DIM_KEYS.map((k) => dims[k]);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  // 产品铁律：总分 78-96，不低不满
  const score = Math.round(Math.min(96, Math.max(78, avg)));
  // 百分位：映射到 68-94
  const percentile = Math.round(68 + (score - 78) / 18 * 26);

  const sorted = [...DIM_KEYS].sort((a, b) => dims[b] - dims[a]);
  const spread = dims[sorted[0]] - dims[sorted[sorted.length - 1]];
  const typeKey = (spread < 8 && avg >= 84) ? 'hexagon' : sorted[0];

  return {
    dims, score, percentile, typeKey,
    top3: sorted.slice(0, 3),
    hasArt: !!feat,
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calcQuestionScores, artDimensionScores, computeResult };
}
