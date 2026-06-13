/* =========================================================
   AI 导演台 · 场景库 (scene-lib.js)
   - 场景 CRUD
   - localStorage 持久化（存到项目的 scenes 字段）
   - AI 生成场景（根据项目大纲/剧本）
   ========================================================= */

(function () {
  'use strict';
  const DC = window.DC;
  if (!DC) return;

  function getScenes() {
    const p = DC.ProjectManager.getCurrent();
    if (!p) return [];
    return p.scenes || [];
  }
  function saveScenes(list) {
    DC.ProjectManager.updateScenes(list);
  }
  function uid() { return DC.Utils.uid('scene'); }

  function render() {
    const grid = document.getElementById('sceneGrid');
    if (!grid) return;
    const list = getScenes();
    grid.innerHTML = '';

    const addBtn = document.createElement('div');
    addBtn.className = 'scene-card add-card';
    addBtn.innerHTML = '<div style="font-size:40px;color:var(--primary);">+</div><div>添加场景</div>';
    addBtn.onclick = () => openEditor();
    grid.appendChild(addBtn);

    list.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'scene-card';
      const description = s.description ? s.description : '';
      const lighting = s.lighting ? s.lighting : '';
      const props = s.props ? s.props : '';
      const views = s.views || {};
      const hasView = views.wide || views.medium || views.closeup;
      card.innerHTML = `
        <div class="pc-actions">
          <button class="btn-icon" title="编辑">✏️</button>
          <button class="btn-icon" title="删除">🗑️</button>
        </div>
        <div class="pc-title">${DC.Utils.escapeHtml(s.name || '未命名')} <span style="color:var(--text-2);font-size:12px;font-weight:normal;">${DC.Utils.escapeHtml(s.time || '')} · ${DC.Utils.escapeHtml(s.location || '')}</span></div>
        <div class="pc-meta">${DC.Utils.escapeHtml((s.weather || '') + (s.weather && s.ambiance ? ' · ' : '') + (s.ambiance || ''))}</div>
        ${description ? `<div class="pc-body-text description"><span class="pc-body-label">场景</span>${DC.Utils.escapeHtml(description)}</div>` : ''}
        ${lighting ? `<div class="pc-body-text lighting"><span class="pc-body-label">灯光</span>${DC.Utils.escapeHtml(lighting)}</div>` : ''}
        ${props ? `<div class="pc-body-text props"><span class="pc-body-label">道具</span>${DC.Utils.escapeHtml(props)}</div>` : ''}
        ${hasView ? `<div class="pc-body-text views"><span class="pc-body-label">视角</span>
          ${views.wide ? `<span class="pc-view-pill">全景: ${DC.Utils.escapeHtml(views.wide)}</span>` : ''}
          ${views.medium ? `<span class="pc-view-pill">中景: ${DC.Utils.escapeHtml(views.medium)}</span>` : ''}
          ${views.closeup ? `<span class="pc-view-pill">特写: ${DC.Utils.escapeHtml(views.closeup)}</span>` : ''}
        </div>` : ''}
        ${s.prompt ? `<div class="pc-prompt">🎨 ${DC.Utils.escapeHtml(s.prompt)}</div>` : ''}
        ${s.promptEn ? `<div class="pc-prompt prompt-en">🇬🇧 ${DC.Utils.escapeHtml(s.promptEn)}</div>` : ''}`;
      const actionBtns = card.querySelectorAll('.pc-actions .btn-icon');
      if (actionBtns.length >= 2) {
        actionBtns[0].onclick = (e) => { e.stopPropagation(); openEditor(s, idx); };
        actionBtns[1].onclick = (e) => {
          e.stopPropagation();
          DC.modal.confirm('确认删除场景：' + DC.Utils.escapeHtml(s.name) + '？',
            () => {
              const arr = getScenes().filter((_, i) => i !== idx);
              saveScenes(arr);
              render();
              DC.toast('已删除场景', 'success');
            },
            { title: '删除场景', confirmText: '删除' }
          );
        };
      }
      // —— 点击描述字段展开/收起 ——
      card.querySelectorAll('.pc-body-text').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          el.classList.toggle('expanded');
        });
      });
      card.addEventListener('click', () => openEditor(s, idx));
      grid.appendChild(card);
    });

    if (list.length === 0) {
      const tip = document.createElement('div');
      tip.style.cssText = 'grid-column:1/-1;padding:20px;text-align:center;color:var(--text-2);font-size:13px;';
      tip.textContent = '暂无场景，点击上方 ✨ AI 生成场景 或 + 添加场景 卡片创建';
      grid.appendChild(tip);
    }
  }

  function openEditor(scene, idx) {
    const s = scene || { id: uid(), name: '', time: '', location: '', weather: '', ambiance: '', lighting: '', props: '', description: '', views: {}, prompt: '', promptEn: '' };
    s.views = s.views || {};
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-grid">
        <label>场景名：<input type="text" id="s-name" value="${DC.Utils.escapeHtml(s.name)}" placeholder="例如：霓虹街道" /></label>
        <label>时间：
          <select id="s-time">
            <option ${s.time === '日' ? 'selected' : ''}>日</option>
            <option ${s.time === '夜' ? 'selected' : ''}>夜</option>
            <option ${s.time === '黄昏' ? 'selected' : ''}>黄昏</option>
            <option ${s.time === '黎明' ? 'selected' : ''}>黎明</option>
            <option ${s.time === '不限' ? 'selected' : ''}>不限</option>
          </select>
        </label>
        <label>地点：
          <select id="s-location">
            <option ${s.location === '内' ? 'selected' : ''}>内（室内）</option>
            <option ${s.location === '外' ? 'selected' : ''}>外（室外）</option>
          </select>
        </label>
        <label>天气：<input type="text" id="s-weather" value="${DC.Utils.escapeHtml(s.weather)}" placeholder="晴/雨/雪/雾…" /></label>
        <label>氛围：<input type="text" id="s-ambiance" value="${DC.Utils.escapeHtml(s.ambiance)}" placeholder="紧张/温馨/压抑/梦幻…" /></label>
        <label class="full">场景描述：<textarea id="s-description" rows="3" placeholder="场景的空间布局、道具、光线、色彩……">${DC.Utils.escapeHtml(s.description)}</textarea></label>
        <label class="full">灯光：<textarea id="s-lighting" rows="2" placeholder="例如：冷蓝主光 + 霓虹边缘光，高对比度…">${DC.Utils.escapeHtml(s.lighting || '')}</textarea></label>
        <label class="full">关键道具：<textarea id="s-props" rows="2" placeholder="例如：黑色雨伞、折叠刀、旧照片……">${DC.Utils.escapeHtml(s.props || '')}</textarea></label>
        <label>全景视角描述：<input type="text" id="s-v-wide" value="${DC.Utils.escapeHtml(s.views.wide || '')}" placeholder="用于远景/全景分镜" /></label>
        <label>中景视角描述：<input type="text" id="s-v-medium" value="${DC.Utils.escapeHtml(s.views.medium || '')}" placeholder="用于中景/近景分镜" /></label>
        <label>特写视角描述：<input type="text" id="s-v-close" value="${DC.Utils.escapeHtml(s.views.closeup || '')}" placeholder="用于特写/大特写分镜" /></label>
        <label class="full">🎨 AI 绘图提示词（中文参考）：<textarea id="s-prompt" rows="3" placeholder="场景的中文描述，点击底部按钮可自动翻译为英文">${DC.Utils.escapeHtml(s.prompt)}</textarea></label>
        <label class="full">🇬🇧 AI 绘图提示词（英文，实际发送给模型）：<textarea id="s-prompten" rows="3" placeholder="dark rainy neon alley at midnight, cinematic lighting, kodak portra 800">${DC.Utils.escapeHtml(s.promptEn || '')}</textarea></label>
      </div>`;
    DC.modal.open({
      title: scene ? '✏️ 编辑场景' : '✨ 新建场景',
      body: body,
      confirmText: '保存场景',
      onConfirm: () => {
        const name = body.querySelector('#s-name').value.trim();
        if (!name) { DC.toast('请填写场景名', 'warning'); return false; }
        const updated = {
          id: s.id,
          name: name,
          time: body.querySelector('#s-time').value,
          location: body.querySelector('#s-location').value,
          weather: body.querySelector('#s-weather').value.trim(),
          ambiance: body.querySelector('#s-ambiance').value.trim(),
          lighting: body.querySelector('#s-lighting').value.trim(),
          props: body.querySelector('#s-props').value.trim(),
          description: body.querySelector('#s-description').value.trim(),
          views: {
            wide: body.querySelector('#s-v-wide').value.trim(),
            medium: body.querySelector('#s-v-medium').value.trim(),
            closeup: body.querySelector('#s-v-close').value.trim(),
          },
          prompt: body.querySelector('#s-prompt').value.trim(),
          promptEn: body.querySelector('#s-prompten').value.trim(),
        };
        const arr = getScenes();
        if (idx != null && arr[idx]) arr[idx] = updated; else arr.push(updated);
        saveScenes(arr);
        render();
        DC.toast('场景已保存', 'success');
      },
    });
  }

  async function aiGenerate() {
    if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
    const btn = document.getElementById('btnGenScenes');
    const grid = document.getElementById('sceneGrid');
    if (btn) { btn.disabled = true; btn.textContent = '🌀 生成中...'; }
    if (grid) {
      grid.style.opacity = '0.7';
      grid.style.pointerEvents = 'none';
    }
    if (DC.Log) {
      const provider = DC.LLM && DC.LLM.getCurrentProviderName ? DC.LLM.getCurrentProviderName() : 'LLM';
      DC.Log.info('[场景AI] 开始调用 ' + provider);
    }
    try {
      const prompt =
        `基于以下项目信息，设计3-6个主要场景，以 JSON 数组格式返回。每个对象字段：name, time(日/夜/黄昏), location(内/外), weather, ambiance, description, prompt(英文绘图提示词)。\n\n` +
        `项目：${p.name}\n` +
        `类型/风格：${p.genre || ''} / ${p.style || ''}\n` +
        `概要：${p.logline || ''}\n` +
        `大纲：\n${p.outline || '（无）'}\n` +
        `剧本：\n${(p.script || '').slice(0, 1200)}\n\n` +
        `严格返回 JSON 数组，不要任何解释文字。`;
      const text = await DC.LLM.generate(prompt);
      const parsed = parseJSON(text);
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI 返回内容无法解析为场景列表，请重试');
      }
      const existing = getScenes();
      const merged = existing.concat(parsed.map((o) => ({
        id: uid(),
        name: String(o.name || '未命名'),
        time: String(o.time || ''),
        location: String(o.location || ''),
        weather: String(o.weather || ''),
        ambiance: String(o.ambiance || ''),
        description: String(o.description || ''),
        prompt: String(o.prompt || ''),
      })));
      saveScenes(merged);
      render();
      DC.toast(`已新增 ${parsed.length} 个场景`, 'success');
      if (DC.Log) DC.Log.success(`[场景AI] 成功生成 ${parsed.length} 个场景`);
    } catch (err) {
      DC.toast('生成失败：' + err.message, 'error');
      if (DC.Log) DC.Log.error('[场景AI] ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✨ AI 生成场景'; }
      if (grid) {
        grid.style.opacity = '';
        grid.style.pointerEvents = '';
      }
    }
  }

  function parseJSON(text) {
    if (!text) return null;
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    let json = m ? m[1] : text;
    try { return JSON.parse(json); } catch (_) {}
    const s = json.indexOf('[');
    const e = json.lastIndexOf(']');
    if (s !== -1 && e !== -1 && e > s) {
      try { return JSON.parse(json.substring(s, e + 1)); } catch (_) {}
    }
    return null;
  }

  DC.SceneManager = {
    init() {
      const b1 = document.getElementById('btnNewScene');
      if (b1) b1.onclick = () => openEditor();
      const b2 = document.getElementById('btnGenScenes');
      if (b2) b2.onclick = aiGenerate;
      render();
    },
    render,
    aiGenerate,
    getScenes,
    saveScenes,
  };
  DC.Scenes = DC.SceneManager;
  DC.SceneLib = DC.SceneManager;
})();
