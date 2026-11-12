// ============================================================
// 童画天赋实验室 · 分享卡生成（Canvas 绘制 → PNG 下载）
// ============================================================

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const FONT = '"PingFang SC","Microsoft YaHei",sans-serif';

async function generateShareCard(result, artworkImg, info) {
  const W = 750;
  const type = TYPES[result.typeKey];
  const nick = info.nickname || '我家宝贝';
  const hasArt = !!artworkImg && !!result.hasArt;

  // 动态高度：先估算布局
  let y = 250; // 标题之后
  if (hasArt) y += 400 + 60;          // 画作区
  y += 190 + 30;                      // 分数环
  y += 56 + 30;                       // 称号徽章
  y += 300 + 30;                      // 雷达图
  y += 60 + 50;                       // 百分位 + 优势行
  if (hasArt) y += 44 + 30;           // 主色板
  y += 130;                           // 底部 slogan 区
  const H = y;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // 背景
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, W, H);
  // 装饰圆
  const deco = [
    [W + 40, 60, 160, 'rgba(255,124,84,0.10)'],
    [-50, H * 0.35, 140, 'rgba(139,124,246,0.08)'],
    [W + 30, H - 220, 150, 'rgba(240,110,170,0.08)'],
  ];
  for (const [dx, dy, dr, dc] of deco) {
    ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.fillStyle = dc; ctx.fill();
  }

  // 品牌行
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#A3836B';
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(`🎨 ${PRODUCT.name} · AI 天赋报告`, W / 2, 90);

  // 标题
  ctx.fillStyle = '#3D2E24';
  ctx.font = `700 46px ${FONT}`;
  ctx.fillText(`${nick} 的天赋画像`, W / 2, 180);

  y = 250;

  // 画作（等比裁切填充圆角矩形）
  if (hasArt) {
    const ax = 65, ay = y, aw = 620, ah = 400;
    ctx.save();
    roundRectPath(ctx, ax, ay, aw, ah, 24);
    ctx.clip();
    const iw = artworkImg.naturalWidth, ih = artworkImg.naturalHeight;
    const scale = Math.max(aw / iw, ah / ih);
    const sw = aw / scale, sh = ah / scale;
    const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
    ctx.drawImage(artworkImg, sx, sy, sw, sh, ax, ay, aw, ah);
    ctx.restore();
    roundRectPath(ctx, ax, ay, aw, ah, 24);
    ctx.strokeStyle = 'rgba(61,46,36,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    y += ah + 60;
  }

  // 分数环
  const r = 88, cx = W / 2, cy = y + r;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#F3E7DA'; ctx.lineWidth = 16; ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (result.score / 100));
  ctx.strokeStyle = type.color; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
  ctx.fillStyle = '#3D2E24';
  ctx.font = `700 56px ${FONT}`;
  ctx.fillText(String(result.score), cx, cy - 6);
  ctx.fillStyle = '#A3836B';
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText('天赋指数', cx, cy + 34);
  y = cy + r + 30;

  // 称号徽章
  const badgeText = `${type.emoji} ${type.title} · ${type.name}`;
  ctx.font = `500 30px ${FONT}`;
  const bw = ctx.measureText(badgeText).width + 72;
  roundRectPath(ctx, (W - bw) / 2, y, bw, 56, 28);
  ctx.fillStyle = type.color; ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(badgeText, W / 2, y + 29);
  y += 56 + 30;

  // 雷达图（四字短标签，保证分享卡上的可读性）
  drawRadarToCtx(ctx, W / 2, y + 150, 140,
    DIM_KEYS.map((k) => DIMENSIONS[k].name.slice(0, 4)),
    DIM_KEYS.map((k) => result.dims[k]),
    { labelSize: 26, gridColor: 'rgba(61,46,36,0.10)', labelColor: '#6B5A4E' });
  y += 300 + 48;

  // 百分位 + 优势
  ctx.fillStyle = '#3D2E24';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(`天赋指数超越 ${result.percentile}% 的同龄小艺术家`, W / 2, y + 16);
  y += 60;
  ctx.fillStyle = '#A3836B';
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText(`优势维度 · ${result.top3.map((k) => DIMENSIONS[k].name).join(' / ')}`, W / 2, y + 14);
  y += 50;

  // 主色板
  if (hasArt && state.artFeat && state.artFeat.palette.length) {
    const pals = state.artFeat.palette;
    const gap = 64, total = pals.length * gap - (gap - 44);
    let px = (W - total) / 2 + 22;
    for (const c of pals) {
      ctx.beginPath(); ctx.arc(px, y + 22, 22, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = 'rgba(61,46,36,0.15)'; ctx.lineWidth = 2; ctx.stroke();
      px += gap;
    }
    y += 44 + 30;
  }

  // 底部
  ctx.fillStyle = '#3D2E24';
  ctx.font = `600 32px ${FONT}`;
  ctx.fillText(PRODUCT.slogan, W / 2, y + 20);
  ctx.fillStyle = type.color;
  ctx.font = `500 28px ${FONT}`;
  ctx.fillText(PRODUCT.guide, W / 2, y + 64);
  const now = new Date();
  ctx.fillStyle = '#C4AE9C';
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText(`AI 本地分析生成 · ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`, W / 2, y + 100);

  // 下载
  const fileName = `${nick}的天赋报告.png`;
  cv.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}
