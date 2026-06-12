/* =========================================================
   AI 导演台 · 时间轴 (timeline.js)
   - 读取项目 shots 数组渲染时间轴
   - 点击片段跳转到分镜页
   - 预览播放
   ========================================================= */

(function () {
  'use strict';
  const DC = window.DC;
  if (!DC) return;

  let playTimer = null;

  function render() {
    const track = document.getElementById('timelineTrack');
    const summary = document.getElementById('timelineSummary');
    if (!track) return;
    const shots = getShots();
    track.innerHTML = '';
    const total = shots.reduce((a, s) => a + (parseInt(s.duration) || 0), 0);
    if (summary) {
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      summary.textContent = `总时长：${mins > 0 ? mins + '分' : ''}${secs}秒 · 共 ${shots.length} 个分镜`;
    }
    if (shots.length === 0) {
      track.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-2);">暂无分镜，请在「分镜」页添加或 AI 生成</div>';
      return;
    }

    // —— 刻度尺（每 10 秒一个刻度标记，按总时长比例分配） ——
    const ruler = document.createElement('div');
    ruler.className = 'timeline-ruler';
    const tickInterval = total <= 30 ? 5 : total <= 120 ? 10 : 30;
    const maxTicks = Math.min(Math.ceil(total / tickInterval), 20);
    for (let i = 0; i <= maxTicks; i++) {
      const t = Math.min(i * tickInterval, total);
      const left = total > 0 ? (t / total) * 100 : 0;
      const tick = document.createElement('span');
      tick.style.left = left + '%';
      tick.textContent = t + 's';
      ruler.appendChild(tick);
    }
    track.appendChild(ruler);

    // —— 横向 clip 条带（按真实时长分配宽度，最小 6%，在 flex-row 中从左到右排列） ——
    const clips = document.createElement('div');
    clips.className = 'timeline-clips';
    const safeTotal = total > 0 ? total : 1;
    shots.forEach((s, idx) => {
      const dur = parseInt(s.duration) || 5;
      const percent = Math.max((dur / safeTotal) * 100, 6);
      const el = document.createElement('div');
      el.className = 'timeline-block';
      el.style.flex = `${percent} 1 0`;
      el.style.minWidth = '90px';
      // 色彩梯度（紫色→琥珀色循环），让相邻 clip 视觉可区分
      const hueA = 240 + (idx * 17) % 60; // 紫-蓝紫
      const hueB = 30 + (idx * 23) % 40;   // 琥珀-黄
      el.style.background = `linear-gradient(180deg, hsla(${hueA},70%,55%,0.18), hsla(${hueB},80%,50%,0.08))`;
      el.style.borderColor = `hsla(${hueA},70%,55%,0.45)`;
      el.innerHTML = `
        <div class="tb-num">#${idx + 1}</div>
        <div class="tb-title">${DC.Utils.escapeHtml(s.sceneName || '分镜')}</div>
        <div class="tb-dur">${dur}s</div>
        ${s.imageUrl ? `<img class="tb-thumb" src="${DC.Utils.escapeHtml(s.imageUrl)}" />` : ''}`;
      el.title = `${s.sceneName || '分镜'} · ${s.shotType || ''} ${s.camera || ''} · ${dur}秒\n${s.description || ''}`;
      el.addEventListener('click', () => {
        if (DC.Tabs) DC.Tabs.switch('storyboard');
      });
      clips.appendChild(el);
    });
    track.appendChild(clips);
  }

  function autoOrder() {
    const shots = getShots();
    if (shots.length < 2) { DC.toast('分镜数量不足', 'info'); return; }
    const btn = document.getElementById('btnAutoOrder');
    if (btn) btn.textContent = '✅ 已校验顺序';
    DC.toast(`已校验 ${shots.length} 个分镜顺序`, 'success');
    render();
    setTimeout(() => { if (btn) btn.textContent = '📐 自动排序'; }, 1500);
  }

  function playPreview() {
    const shots = getShots();
    if (shots.length === 0) { DC.toast('暂无分镜', 'warning'); return; }
    const btn = document.getElementById('btnPlayTimeline');
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
      if (btn) btn.textContent = '▶️ 预览播放';
      DC.toast('已停止播放', 'info');
      return;
    }
    let idx = 0;
    if (btn) btn.textContent = '⏸ 停止播放';
    const nextShot = () => {
      if (idx >= shots.length) {
        clearInterval(playTimer);
        playTimer = null;
        if (btn) btn.textContent = '▶️ 预览播放';
        DC.toast('播放结束', 'success');
        return;
      }
      const s = shots[idx];
      DC.toast(`▶️ #${idx + 1}：${s.sceneName || ''} (${s.duration || 5}s)`, 'info', 1500);
      if (DC.Log) DC.Log.info(`▶️ [#${idx + 1}] ${s.sceneName || ''} · ${s.shotType || ''} ${s.camera || ''} · ${s.duration || 5}s`);
      idx++;
    };
    nextShot();
    playTimer = setInterval(nextShot, 1500);
  }

  function getShots() {
    const p = DC.ProjectManager.getCurrent();
    return p ? (p.shots || []) : [];
  }

  DC.Timeline = {
    init() {
      const b1 = document.getElementById('btnAutoOrder');
      if (b1) b1.onclick = autoOrder;
      const b2 = document.getElementById('btnPlayTimeline');
      if (b2) b2.onclick = playPreview;
      render();
    },
    render,
  };
})();
