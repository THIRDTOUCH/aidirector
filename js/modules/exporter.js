/* =========================================================
   AI 导演台 · 导出器 (exporter.js)
   - Markdown 剧本导出
   - JSON 完整项目导出
   - HTML 放映页导出
   - 预览播放
   ========================================================= */

(function () {
  'use strict';
  const DC = window.DC;
  if (!DC) return;

  function escapeXml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  }

  function buildMarkdown(p) {
    if (!p) p = DC.ProjectManager.getCurrent() || {};
    let md = `# ${p.name || '短剧项目'}\n\n`;
    md += `- **类型**：${p.genre || '—'}  \n`;
    md += `- **时长**：${p.duration || '—'}  \n`;
    md += `- **风格**：${p.style || '—'}  \n`;
    md += `- **一句话概要**：${p.logline || '—'}\n\n`;
    md += `---\n\n## 📖 故事大纲\n\n${p.outline || '（未编写）'}\n\n`;
    md += `## ✍️ 剧本\n\n${p.script || '（未编写）'}\n\n`;
    const chars = p.characters || [];
    if (chars.length) {
      md += `## 👥 角色设定\n\n`;
      chars.forEach((c, i) => {
        md += `### ${i + 1}. ${c.name || '未命名'} ${c.role ? `(${c.role})` : ''}\n`;
        if (c.age || c.gender) md += `- **基本**：${[c.age && c.age + '岁', c.gender].filter(Boolean).join(' · ')}\n`;
        if (c.appearance) md += `- **外貌**：${c.appearance}\n`;
        if (c.personality) md += `- **性格**：${c.personality}\n`;
        if (c.background) md += `- **背景/动机**：${c.background}\n`;
        if (c.prompt) md += `- **🎨 AI绘图**：${c.prompt}\n`;
        md += '\n';
      });
    }
    const scenes = p.scenes || [];
    if (scenes.length) {
      md += `## 🏞️ 场景库\n\n`;
      scenes.forEach((s, i) => {
        md += `### ${i + 1}. ${s.name || '未命名'} (${s.time || ''}${s.location ? '/' + s.location : ''})\n`;
        if (s.weather || s.ambiance) md += `- **氛围**：${[s.weather, s.ambiance].filter(Boolean).join(' · ')}\n`;
        if (s.description) md += `- **描述**：${s.description}\n`;
        if (s.prompt) md += `- **🎨 AI绘图**：${s.prompt}\n`;
        md += '\n';
      });
    }
    const shots = p.shots || [];
    if (shots.length) {
      md += `## 🎞️ 分镜脚本\n\n`;
      md += `| # | 分镜 | 景别 | 运镜 | 时长 | 画面 | 台词 |\n|---|---|---|---|---|---|---|\n`;
      shots.forEach((s, i) => {
        md += `| ${i + 1} | ${escapeMdCell(s.sceneName)} | ${s.shotType || ''} | ${s.camera || ''} | ${s.duration || 0}s | ${escapeMdCell(s.description)} | ${escapeMdCell(s.dialogue)} |\n`;
      });
      md += '\n';
    }
    return md;
  }

  function escapeMdCell(s) {
    if (s == null) return '';
    return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
  }

  function buildHTML(p) {
    if (!p) p = DC.ProjectManager.getCurrent() || {};
    const shots = p.shots || [];
    const chars = p.characters || [];
    let shotsHtml = '';
    if (shots.length === 0) {
      shotsHtml = `<div style="padding:40px;text-align:center;color:#94a3b8;">暂无分镜 · 点击 <b>🎬 批量生成画面</b> 或 <b>✨ AI 剧本→分镜</b> 先创建分镜</div>`;
    } else {
      shots.forEach((s, i) => {
        const img = s.imageUrl
          ? `<img src="${escapeXml(s.imageUrl)}" style="max-width:100%;border-radius:10px;" />`
          : `<div style="aspect-ratio:16/9;background:linear-gradient(135deg,#1e293b,#334155);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;">🎬 #${i + 1} · ${escapeXml(s.sceneName || '')}</div>`;
        shotsHtml += `
          <div class="shot" style="margin-bottom:28px;padding:18px 0;border-bottom:1px solid #e2e8f0;">
            <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px;">
              <span style="font-size:20px;font-weight:600;">#${i + 1}</span>
              <span style="font-size:18px;font-weight:600;">${escapeXml(s.sceneName || '')}</span>
              <span style="color:#64748b;font-size:13px;">${escapeXml(s.shotType || '')} · ${escapeXml(s.camera || '')} · ${s.duration || 5}s</span>
            </div>
            ${img}
            <div style="margin-top:12px;line-height:1.7;color:#1e293b;"><b>画面：</b>${escapeXml(s.description || '')}</div>
            ${s.dialogue ? `<div style="margin-top:8px;line-height:1.7;color:#7c3aed;"><b>台词：</b>${escapeXml(s.dialogue)}</div>` : ''}
            ${s.prompt ? `<div style="margin-top:8px;font-size:12px;color:#64748b;line-height:1.6;"><b>AI Prompt：</b>${escapeXml(s.prompt)}</div>` : ''}
          </div>`;
      });
    }

    let charsHtml = '';
    if (chars.length) {
      charsHtml = '<h2 style="margin-top:40px;">👥 角色设定</h2>';
      chars.forEach((c) => {
        charsHtml += `
          <div style="padding:14px 18px;background:#f8fafc;border-radius:10px;margin-bottom:10px;">
            <div style="font-size:16px;font-weight:600;margin-bottom:6px;">${escapeXml(c.name || '')} <span style="color:#64748b;font-size:13px;font-weight:normal;">${escapeXml(c.role || '')}</span></div>
            ${c.appearance ? `<div style="font-size:13px;color:#334155;line-height:1.7;"><b>外貌：</b>${escapeXml(c.appearance)}</div>` : ''}
            ${c.personality ? `<div style="font-size:13px;color:#334155;line-height:1.7;"><b>性格：</b>${escapeXml(c.personality)}</div>` : ''}
            ${c.background ? `<div style="font-size:13px;color:#334155;line-height:1.7;"><b>背景：</b>${escapeXml(c.background)}</div>` : ''}
            ${c.prompt ? `<div style="font-size:11px;color:#64748b;margin-top:6px;line-height:1.6;"><b>AI Prompt：</b>${escapeXml(c.prompt)}</div>` : ''}
          </div>`;
      });
    }

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${escapeXml(p.name || '短剧项目')} · 分镜放映页</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 820px; margin: 0 auto; padding: 30px 20px; color: #1e293b; background: #fff; line-height: 1.6; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  h2 { font-size: 18px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 14px; }
  .outline, .script { background: #f8fafc; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
</style>
</head>
<body>
<h1>${escapeXml(p.name || '短剧项目')}</h1>
<div class="meta">类型：${escapeXml(p.genre || '—')} · 时长：${escapeXml(p.duration || '—')} · 风格：${escapeXml(p.style || '—')}</div>
${p.logline ? `<div style="color:#7c3aed;margin-bottom:20px;font-size:14px;">${escapeXml(p.logline)}</div>` : ''}
<h2>📖 故事大纲</h2>
<div class="outline">${escapeXml(p.outline || '（未编写）')}</div>
<h2>✍️ 剧本</h2>
<div class="script">${escapeXml(p.script || '（未编写）')}</div>
${charsHtml}
<h2 style="margin-top:40px;">🎞️ 分镜脚本（共 ${shots.length} 个）</h2>
${shotsHtml}
</body>
</html>`;
  }

  function exportMarkdown(explicitProject) {
    const p = explicitProject || DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    const md = buildMarkdown(p);
    if (explicitProject) return md; // 仅返回字符串（测试/程序化调用）
    download(`《${p.name || '短剧'}》-剧本.md`, md, 'text/markdown;charset=utf-8');
    DC.toast('Markdown 已导出', 'success');
  }

  function exportJSON(explicitProject) {
    const p = explicitProject || DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    const json = JSON.stringify(p, null, 2);
    if (explicitProject) return json; // 测试/程序化调用时仅返回字符串
    download(`《${p.name || '短剧'}》-项目.json`, json, 'application/json;charset=utf-8');
    DC.toast('JSON 已导出', 'success');
  }

  function exportHTML(explicitProject) {
    const p = explicitProject || DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    const html = buildHTML(p);
    if (explicitProject) return html; // 测试/程序化调用时仅返回字符串
    download(`《${p.name || '短剧'}》-放映页.html`, html, 'text/html;charset=utf-8');
    DC.toast('HTML 放映页已导出', 'success');
  }

  function renderPreview() {
    const player = document.getElementById('previewPlayer');
    const p = DC.ProjectManager.getCurrent();
    if (!player) return;
    if (!p) {
      player.innerHTML = `<div class="player-cover"><div class="cover-title">选择或新建项目后开始创作</div><div class="cover-hint">使用左侧智能体一键生成完整短片</div></div>`;
      // 清空信息栏
      const infoTitle = document.getElementById('infoTitle'); if (infoTitle) infoTitle.textContent = '—';
      const infoGenre = document.getElementById('infoGenre'); if (infoGenre) infoGenre.textContent = '—';
      const infoDuration = document.getElementById('infoDuration'); if (infoDuration) infoDuration.textContent = '—';
      const infoStyle = document.getElementById('infoStyle'); if (infoStyle) infoStyle.textContent = '—';
      const infoShotCount = document.getElementById('infoShotCount'); if (infoShotCount) infoShotCount.textContent = '0';
      const infoCharCount = document.getElementById('infoCharCount'); if (infoCharCount) infoCharCount.textContent = '0';
      const infoSceneCount = document.getElementById('infoSceneCount'); if (infoSceneCount) infoSceneCount.textContent = '0';
      const summary = document.getElementById('infoSummary'); if (summary) summary.style.display = 'none';
      return;
    }
    const shots = p.shots || [];
    let html = `<div style="padding:18px 20px;border-bottom:1px solid var(--border);"><div style="font-size:18px;font-weight:600;margin-bottom:6px;">${DC.Utils.escapeHtml(p.name)}</div><div style="font-size:12px;color:var(--text-2);">${DC.Utils.escapeHtml(p.genre || '')} · ${DC.Utils.escapeHtml(p.duration || '')} · ${DC.Utils.escapeHtml(p.style || '')}</div>${p.logline ? `<div style="margin-top:8px;font-size:13px;color:var(--accent);">${DC.Utils.escapeHtml(p.logline)}</div>` : ''}</div>`;
    if (shots.length === 0) {
      html += `<div style="padding:40px;text-align:center;color:var(--text-2);">暂无分镜 · 前往 <b>分镜脚本</b> 页创建或 AI 生成</div>`;
    } else {
      for (let i = 0; i < Math.min(shots.length, 6); i++) {
        const s = shots[i];
        const img = s.imageUrl
          ? `<img src="${DC.Utils.escapeHtml(s.imageUrl)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;" />`
          : `<div style="aspect-ratio:16/9;background:linear-gradient(135deg,#1e293b,#334155);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;">🎬 #${i + 1}</div>`;
        html += `
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">#${i + 1} ${DC.Utils.escapeHtml(s.sceneName || '')} · <span style="color:var(--text-2);font-weight:normal;">${s.duration || 5}s</span></div>
            ${img}
            <div style="margin-top:10px;font-size:12px;line-height:1.7;color:var(--text);">${DC.Utils.escapeHtml(s.description || '')}</div>
            ${s.dialogue ? `<div style="margin-top:6px;font-size:12px;color:#a78bfa;line-height:1.7;">💬 ${DC.Utils.escapeHtml(s.dialogue)}</div>` : ''}
          </div>`;
      }
      if (shots.length > 6) html += `<div style="padding:18px;text-align:center;color:var(--text-2);font-size:13px;">... 共 ${shots.length} 个分镜，点击顶部「🌐 导出HTML放映页」查看完整内容</div>`;
    }
    player.innerHTML = html;

    // 更新右侧信息栏
    const infoTitle = document.getElementById('infoTitle'); if (infoTitle) infoTitle.textContent = p.name || '—';
    const infoGenre = document.getElementById('infoGenre'); if (infoGenre) infoGenre.textContent = p.genre || '—';
    const infoDuration = document.getElementById('infoDuration'); if (infoDuration) infoDuration.textContent = p.duration || '—';
    const infoStyle = document.getElementById('infoStyle'); if (infoStyle) infoStyle.textContent = p.style || '—';
    const infoShotCount = document.getElementById('infoShotCount'); if (infoShotCount) infoShotCount.textContent = shots.length;
    const infoCharCount = document.getElementById('infoCharCount'); if (infoCharCount) infoCharCount.textContent = (p.characters || []).length;
    const infoSceneCount = document.getElementById('infoSceneCount'); if (infoSceneCount) infoSceneCount.textContent = (p.scenes || []).length;
    const summary = document.getElementById('infoSummary');
    if (summary) {
      summary.style.display = 'block';
      summary.innerHTML = `<b>大纲</b><br/>${DC.Utils.escapeHtml(p.outline || '（无）').replace(/\n/g, '<br/>')}<br/><br/><b>剧情简介</b><br/>${DC.Utils.escapeHtml(p.script ? (p.script.length > 200 ? p.script.slice(0, 200) + '…' : p.script) : '（无）').replace(/\n/g, '<br/>')}`;
    }
  }

  function playPreviewFromPage() {
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    const shots = p.shots || [];
    if (shots.length === 0) { DC.toast('暂无分镜可播放', 'warning'); return; }
    // 复用时间轴播放逻辑
    let idx = 0;
    const next = () => {
      if (idx >= shots.length) { DC.toast('播放结束', 'success'); return; }
      const s = shots[idx];
      DC.toast(`▶️ #${idx + 1}：${s.sceneName || ''} (${s.duration || 5}s)`, 'info', 1500);
      idx++;
      setTimeout(next, 1500);
    };
    next();
  }

  DC.Exporter = {
    init() {
      const b1 = document.getElementById('btnExportMarkdown');
      if (b1) b1.onclick = exportMarkdown;
      const b2 = document.getElementById('btnExportJSON');
      if (b2) b2.onclick = exportJSON;
      const b3 = document.getElementById('btnExportHTML');
      if (b3) b3.onclick = exportHTML;
      const topBtn = document.getElementById('btnExport');
      if (topBtn) topBtn.onclick = exportHTML;
      const play = document.getElementById('btnPlayPreview');
      if (play) play.onclick = playPreviewFromPage;

      // —— 信息栏折叠/展开按钮
      const toggleBtn = document.getElementById('previewInfoToggle');
      const infoPanel = document.getElementById('previewInfo');
      if (toggleBtn && infoPanel) {
        toggleBtn.onclick = () => {
          infoPanel.classList.toggle('collapsed');
          toggleBtn.textContent = infoPanel.classList.contains('collapsed') ? '‹' : '›';
          toggleBtn.title = infoPanel.classList.contains('collapsed') ? '展开信息栏' : '折叠信息栏';
        };
      }

      // —— 信息栏拖拽调整宽度
      const resizer = document.getElementById('previewResizer');
      if (resizer && infoPanel) {
        let startX = 0, startWidth = 0, dragging = false;
        resizer.addEventListener('mousedown', (e) => {
          dragging = true;
          startX = e.clientX;
          startWidth = infoPanel.getBoundingClientRect().width;
          resizer.classList.add('dragging');
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
          e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
          if (!dragging) return;
          const dx = startX - e.clientX; // 向右拖拽：向右拖 → 加宽信息栏
          const newWidth = Math.max(240, Math.min(600, startWidth + dx));
          infoPanel.style.flex = `0 0 ${newWidth}px`;
          infoPanel.style.minWidth = newWidth + 'px';
        });
        document.addEventListener('mouseup', () => {
          if (!dragging) return;
          dragging = false;
          resizer.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        });
      }

      renderPreview();
    },
    renderPreview,
    buildMarkdown,
    buildHTML,
    exportMarkdown,
    exportJSON,
    exportHTML,
    playPreviewFromPage,
  };
})();
