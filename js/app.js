// ============================================================
// 童画天赋实验室 · 主流程
// ============================================================

const state = {
  nickname: '',
  age: 6,
  answers: {},
  qi: 0,
  artImg: null,
  artFeat: null,
  result: null,
};

const $ = (id) => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ---------------- 欢迎页 ----------------
$('btn-start').addEventListener('click', () => showScreen('screen-info'));

// ---------------- 信息页 ----------------
(function initInfo() {
  const sel = $('age-select');
  for (let a = 3; a <= 12; a++) {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = `${a} 岁`;
    sel.appendChild(opt);
  }
  sel.value = 6;
})();

$('btn-info-next').addEventListener('click', () => {
  state.nickname = $('nickname-input').value.trim().slice(0, 10);
  state.age = parseInt($('age-select').value, 10) || 6;
  state.qi = 0;
  renderQuestion();
  showScreen('screen-quiz');
});

// ---------------- 问卷 ----------------
function renderQuestion() {
  const q = QUESTIONS[state.qi];
  $('quiz-progress-text').textContent = `第 ${state.qi + 1} / ${QUESTIONS.length} 题`;
  $('quiz-progress-bar').style.width = `${(state.qi / QUESTIONS.length) * 100}%`;
  $('quiz-question').textContent = q.text;
  const box = $('quiz-options');
  box.innerHTML = '';
  ANSWER_LABELS.forEach((label, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (state.answers[q.id] === idx + 1 ? ' selected' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      state.answers[q.id] = idx + 1;
      document.querySelectorAll('.option-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      setTimeout(() => {
        if (state.qi < QUESTIONS.length - 1) {
          state.qi++;
          renderQuestion();
        } else {
          showScreen('screen-upload');
        }
      }, 180);
    });
    box.appendChild(btn);
  });
  $('btn-quiz-back').style.visibility = state.qi === 0 ? 'hidden' : 'visible';
}

$('btn-quiz-back').addEventListener('click', () => {
  if (state.qi > 0) { state.qi--; renderQuestion(); }
});

// ---------------- 画作上传 ----------------
$('art-input').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.artImg = img;
    $('art-preview').src = url;
    $('art-preview-wrap').style.display = 'block';
    $('upload-hint').style.display = 'none';
    $('btn-analyze').style.display = 'block';
    $('btn-skip').style.display = 'none';
  };
  img.src = url;
});

$('art-input-wrap').addEventListener('click', () => $('art-input').click());

$('btn-skip').addEventListener('click', () => {
  state.artImg = null; state.artFeat = null;
  runAnalysis(false);
});

$('btn-analyze').addEventListener('click', () => runAnalysis(true));

// ---------------- 分析动画 ----------------
async function runAnalysis(withArt) {
  showScreen('screen-analyzing');
  const steps = withArt ? ANALYZE_STEPS_WITH_ART : ANALYZE_STEPS_NO_ART;
  const dur = withArt ? 950 : 850;

  // 真实分析异步进行
  const featPromise = withArt ? analyzeArtwork(state.artImg) : Promise.resolve(null);

  for (let i = 0; i < steps.length; i++) {
    $('analyze-step-text').textContent = steps[i];
    $('analyze-progress-bar').style.width = `${((i + 1) / steps.length) * 100}%`;
    await new Promise((r) => setTimeout(r, dur));
  }
  state.artFeat = await featPromise;
  state.result = computeResult(state.answers, state.artFeat);
  renderResult();
  showScreen('screen-result');
}

// ---------------- 结果页 ----------------
function renderResult() {
  const r = state.result;
  const type = TYPES[r.typeKey];
  const nick = state.nickname || '我家宝贝';
  const ctx = { nickname: nick, age: state.age, feat: r.hasArt ? state.artFeat : null, result: r };

  // 头部
  $('result-title').textContent = `${nick} 的天赋报告`;
  $('result-badge').textContent = `${type.emoji} ${type.title} · ${type.name}`;
  $('result-badge').style.background = type.color;
  $('result-tagline').textContent = `「${type.tagline}」`;
  $('result-score-num').textContent = r.score;
  $('score-ring').style.background =
    `conic-gradient(${type.color} ${r.score * 3.6}deg, #F3E7DA 0deg)`;
  $('result-percentile').textContent = `天赋指数超越 ${r.percentile}% 的同龄小艺术家`;

  // 类型解读
  $('type-interpretation').innerHTML =
    type.paras.map((f) => `<p>${f(ctx)}</p>`).join('') +
    `<div class="advice-box"><div class="advice-title">💡 天赋养成建议</div>` +
    `<ul>${type.advice.map((a) => `<li>${a}</li>`).join('')}</ul></div>`;

  // 雷达图
  requestAnimationFrame(() => {
    drawRadar(
      $('radar-canvas'),
      DIM_KEYS.map((k) => DIMENSIONS[k].name),
      DIM_KEYS.map((k) => r.dims[k])
    );
  });

  // 六维卡片
  const wrap = $('dim-cards');
  wrap.innerHTML = '';
  const sorted = [...DIM_KEYS].sort((a, b) => r.dims[b] - r.dims[a]);
  for (const k of sorted) {
    const d = DIMENSIONS[k];
    const el = document.createElement('div');
    el.className = 'dim-card';
    el.innerHTML =
      `<div class="dim-head"><span class="dim-name">${d.icon} ${d.name}</span>` +
      `<span class="dim-score">${r.dims[k]}</span></div>` +
      `<div class="dim-bar"><i style="width:${r.dims[k]}%;background:${type.color}"></i></div>` +
      `<div class="dim-praise">${d.praise}</div>` +
      `<div class="dim-advice">👉 ${d.advice}</div>`;
    wrap.appendChild(el);
  }

  // 画作特征报告 / 补充上传提示
  const artBox = $('art-report');
  if (r.hasArt && state.artFeat) {
    const f = state.artFeat;
    const stats = [
      ['色相丰富度', `${f.colorCount} 种`],
      ['笔触细节密度', `${Math.round(f.edgeDensity * 1000) / 10}%`],
      ['画面明亮度', `${Math.round(f.brightness * 100)} / 100`],
      ['暖色占比', `${Math.round(f.warmth * 100)}%`],
      ['画面覆盖率', `${Math.round(f.coverage * 100)}%`],
      ['色彩饱和度', `${Math.round(f.saturation * 100)}%`],
    ];
    artBox.style.display = 'block';
    $('no-art-tip').style.display = 'none';
    $('art-palette').innerHTML = (f.palette || [])
      .map((c) => `<span class="swatch" style="background:${c}" title="${c}"></span>`)
      .join('');
    $('art-stats').innerHTML = stats
      .map(([n, v]) => `<div class="stat-item"><span>${n}</span><b>${v}</b></div>`)
      .join('');
  } else {
    artBox.style.display = 'none';
    $('no-art-tip').style.display = 'block';
  }

  // 按钮事件（重新绑定前先克隆去旧监听）
  bindOnce('btn-share', () => generateShareCard(state.result, state.artImg, {
    nickname: state.nickname, age: state.age,
  }));
  bindOnce('btn-add-art', () => showScreen('screen-upload'));
  bindOnce('btn-retest', () => {
    state.answers = {}; state.qi = 0;
    state.artImg = null; state.artFeat = null; state.result = null;
    $('nickname-input').value = '';
    $('art-preview-wrap').style.display = 'none';
    $('upload-hint').style.display = 'block';
    $('btn-analyze').style.display = 'none';
    $('btn-skip').style.display = 'block';
    showScreen('screen-welcome');
  });
}

function bindOnce(id, fn) {
  const old = $(id).cloneNode(true);
  $(id).replaceWith(old);
  old.addEventListener('click', fn);
}
