// ============================================================
// 童画天赋实验室 · 雷达图绘制（结果页 & 分享卡共用）
// ============================================================

// 通用绘制：往任意 ctx 画雷达图
function drawRadarToCtx(ctx, cx, cy, R, labels, values, opts = {}) {
  const n = labels.length;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const stroke = opts.stroke || '#3D2E24';

  // 网格环
  ctx.strokeStyle = opts.gridColor || 'rgba(61,46,36,0.12)';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = ang(i % n), r = (R * ring) / 4;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 轴线
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
    ctx.stroke();
  }
  // 数值多边形
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const a = ang(idx), r = (R * Math.max(0.05, values[idx] / 100));
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = opts.fill || 'rgba(255,124,84,0.28)';
  ctx.fill();
  ctx.strokeStyle = opts.line || '#FF7C54';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // 顶点
  for (let i = 0; i < n; i++) {
    const a = ang(i), r = (R * Math.max(0.05, values[i] / 100));
    ctx.beginPath();
    ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = opts.line || '#FF7C54';
    ctx.fill();
  }
  // 标签
  if (opts.labels !== false) {
    ctx.fillStyle = opts.labelColor || '#6B5A4E';
    ctx.font = `${opts.labelSize || 13}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const a = ang(i);
      const x = cx + (R + 22) * Math.cos(a);
      const y = cy + (R + 18) * Math.sin(a);
      ctx.fillText(labels[i], x, y);
    }
  }
  ctx.strokeStyle = stroke;
}

// 结果页：自适应 canvas
function drawRadar(canvas, labels, values) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 300;
  const cssH = canvas.clientHeight || 300;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  drawRadarToCtx(ctx, cssW / 2, cssH / 2, Math.min(cssW, cssH) / 2 - 40, labels, values);
}
