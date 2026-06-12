/* =========================================================
   AI 导演台 · 分镜脚本 (storyboard.js)
   - 分镜 CRUD
   - localStorage 持久化（项目 shots 字段）
   - AI 剧本→分镜拆分
   - 排序（上下移动）
   ========================================================= */

(function () {
  'use strict';
  const DC = window.DC;
  if (!DC) return;

  function getShots() {
    const p = DC.ProjectManager.getCurrent();
    return p ? (p.shots || []) : [];
  }
  function saveShots(list) {
    DC.ProjectManager.updateShots(list);
    // 如果时间轴模块存在，同步刷新
    if (DC.Timeline && DC.Timeline.render) DC.Timeline.render();
  }
  function uid() { return DC.Utils.uid('shot'); }

  function render() {
    const listEl = document.getElementById('shotList');
    if (!listEl) return;
    const list = getShots();
    listEl.innerHTML = '';

    if (list.length === 0) {
      const tip = document.createElement('div');
      tip.style.cssText = 'padding:40px;text-align:center;color:var(--text-2);';
      tip.innerHTML = '<div style="font-size:36px;margin-bottom:12px;">🎞️</div><div>暂无分镜 · 点击顶部 <b>+ 新增分镜</b> 或 <b>✨ AI 剧本→分镜</b> 自动生成</div>';
      listEl.appendChild(tip);
      return;
    }

    list.forEach((shot, idx) => {
      const card = document.createElement('div');
      card.className = 'shot-card';
      card.draggable = true;
      card.dataset.idx = String(idx);
      card.innerHTML = `
        <div class="shot-head">
          <span class="shot-drag" title="拖拽以重新排序">⋮⋮</span>
          <span class="shot-num">#${idx + 1}</span>
          <span class="shot-title">${DC.Utils.escapeHtml(shot.sceneName || shot.scene || ('分镜 ' + (idx + 1)))}</span>
          <span class="shot-meta">${DC.Utils.escapeHtml(shot.shotType || '中景')} · ${DC.Utils.escapeHtml(shot.angle || shot.camera || '平视')} · ${shot.duration || 5}秒</span>
          <div>
            <button class="btn-icon" title="上移">⬆️</button>
            <button class="btn-icon" title="下移">⬇️</button>
            <button class="btn-icon" title="编辑">✏️</button>
            <button class="btn-icon" title="删除">🗑️</button>
          </div>
        </div>
        <div class="shot-body">
          ${shot.imageUrl ? `<img class="shot-img" src="${DC.Utils.escapeHtml(shot.imageUrl)}" />` : `<div class="shot-img placeholder">🎬<br/><span style="font-size:11px;color:var(--text-2);">（点击编辑）</span></div>`}
          <div class="shot-body-inner">
            <div class="shot-field">
              <div class="shot-field-label">📖 画面描述</div>
              <div class="shot-field-text">${DC.Utils.escapeHtml(shot.description || '（未填写）')}</div>
            </div>
            ${(shot.sceneName || shot.scene) && !(shot.characterName || shot.characterId) ? '' : `
            <div class="shot-field">
              <div class="shot-field-label">👥 出场角色 / 🎬 场景</div>
              <div class="shot-field-text">
                ${shot.characterName ? `👤 ${DC.Utils.escapeHtml(shot.characterName)}` : ''}
                ${shot.sceneName || shot.scene ? `🎬 ${DC.Utils.escapeHtml(shot.sceneName || shot.scene)}` : ''}
                ${!(shot.characterName || shot.characterId || shot.sceneName || shot.scene) ? '（未关联）' : ''}
              </div>
            </div>`}
            <div class="shot-field">
              <div class="shot-field-label">💬 台词 / 旁白</div>
              <div class="shot-field-text shot-field-text-dialog">${DC.Utils.escapeHtml(shot.dialogue || '（无）')}</div>
            </div>
            <div class="shot-field">
              <div class="shot-field-label">🎨 AI 绘图提示词</div>
              <div class="shot-field-text shot-field-text-prompt">${DC.Utils.escapeHtml(shot.prompt || '（未填写）')}</div>
            </div>
          </div>
        </div>`;
      const [upBtn, downBtn, eBtn, dBtn] = card.querySelectorAll('.shot-head .btn-icon');
      upBtn.onclick = () => move(idx, -1);
      downBtn.onclick = () => move(idx, +1);
      eBtn.onclick = () => openEditor(shot, idx);
      dBtn.onclick = () => {
        DC.modal.confirm('确认删除此分镜？',
          () => {
            const arr = getShots().filter((_, i) => i !== idx);
            saveShots(arr);
            render();
            DC.toast('已删除分镜', 'success');
          },
          { title: '删除分镜', confirmText: '删除' }
        );
      };
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-icon')) return;
        openEditor(shot, idx);
      });
      listEl.appendChild(card);
    });

    // —— 绑定 HTML5 拖拽排序 ——
    let dragSrcIdx = -1;
    const cards = listEl.querySelectorAll('.shot-card');
    cards.forEach((card) => {
      // 按钮/编辑点击不应触发拖拽
      card.querySelectorAll('button, input, textarea, a').forEach((btn) => {
        btn.addEventListener('mousedown', (e) => e.stopPropagation());
      });

      card.addEventListener('dragstart', (e) => {
        dragSrcIdx = parseInt(card.dataset.idx, 10);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(dragSrcIdx)); } catch (_) {}
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        cards.forEach((c) => c.classList.remove('drop-target', 'drop-target-top', 'drop-target-bottom'));
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = card.getBoundingClientRect();
        const isTop = (e.clientY - rect.top) < rect.height / 2;
        cards.forEach((c) => {
          if (c !== card) c.classList.remove('drop-target', 'drop-target-top', 'drop-target-bottom');
        });
        card.classList.add('drop-target');
        card.classList.toggle('drop-target-top', isTop);
        card.classList.toggle('drop-target-bottom', !isTop);
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drop-target', 'drop-target-top', 'drop-target-bottom');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetIdx = parseInt(card.dataset.idx, 10);
        card.classList.remove('drop-target', 'drop-target-top', 'drop-target-bottom');
        if (dragSrcIdx === -1 || dragSrcIdx === targetIdx) return;
        // 根据鼠标位置决定插入到目标的上方还是下方
        const rect = card.getBoundingClientRect();
        const isTop = (e.clientY - rect.top) < rect.height / 2;
        let insertIdx = isTop ? targetIdx : targetIdx + 1;
        if (dragSrcIdx < insertIdx) insertIdx -= 1; // 源位置在目标之前，减去自己移除带来的偏移
        moveTo(dragSrcIdx, insertIdx);
      });
    });
  }

  function move(idx, delta) {
    const arr = getShots();
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    saveShots(arr);
    render();
  }

  function moveTo(fromIdx, toIdx) {
    const arr = getShots();
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= arr.length || toIdx > arr.length || fromIdx === toIdx) return;
    const [moved] = arr.splice(fromIdx, 1);
    const insertAt = Math.min(Math.max(toIdx, 0), arr.length);
    arr.splice(insertAt, 0, moved);
    saveShots(arr);
    render();
    DC.toast(`已移动 #${fromIdx + 1} → #${insertAt + 1}`, 'success');
  }

  function openEditor(shot, idx) {
    const s = shot || {
      id: uid(), sceneName: '', shotType: '中景', angle: '平视',
      movement: '固定', duration: 5, description: '', dialogue: '', prompt: '',
    };
    // 兼容旧字段 camera -> movement
    s.movement = s.movement || s.camera || '固定';
    // 获取当前项目的角色/场景列表
    const p = DC.ProjectManager.getCurrent();
    const characters = (p && p.characters) || [];
    const scenes = (p && p.scenes) || [];
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-grid">
        <label>场景/分镜名：<input type="text" id="sh-name" value="${DC.Utils.escapeHtml(s.sceneName || s.scene || '')}" placeholder="例如：霓虹街道 · 相遇" /></label>
        <label>关联场景（选择则自动注入描述）：
          <select id="sh-scene">
            <option value="">（不关联）</option>
            ${scenes.map((sc) => `<option value="${sc.id}" ${s.sceneId === sc.id ? 'selected' : ''}>${DC.Utils.escapeHtml(sc.name)}</option>`).join('')}
          </select>
        </label>
        <label>关联角色：
          <select id="sh-char">
            <option value="">（不关联）</option>
            ${characters.map((c) => `<option value="${c.id}" ${s.characterId === c.id ? 'selected' : ''}>${DC.Utils.escapeHtml(c.name)}${c.role ? ' (' + c.role + ')' : ''}</option>`).join('')}
          </select>
        </label>
        <label>景别：
          <select id="sh-type">
            ${['大远景', '远景', '全景', '中景', '近景', '特写', '大特写'].map((t) => `<option ${(s.shotType || '中景') === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <label>机位/视角：
          <select id="sh-angle">
            ${['平视', '仰拍', '俯拍', '顶拍', '斜角', '主观视角'].map((t) => `<option ${(s.angle || '平视') === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <label>运镜：
          <select id="sh-mov">
            ${['固定', '推', '拉', '摇', '移', '跟', '升降', '环绕', '手持', '斯泰迪康'].map((t) => `<option ${(s.movement || s.camera || '固定') === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <label>时长(秒)：<input type="number" id="sh-dur" value="${s.duration || 5}" min="1" max="180" /></label>
        <label class="full">📖 画面描述：<textarea id="sh-desc" rows="3" placeholder="画面中出现什么、角色的动作、环境的细节……">${DC.Utils.escapeHtml(s.description || '')}</textarea></label>
        <label class="full">💬 台词或旁白：<textarea id="sh-dialog" rows="2" placeholder="角色说的台词，或旁白/narration">${DC.Utils.escapeHtml(s.dialogue || '')}</textarea></label>
        <label class="full">🎨 AI 绘图提示词（英文，自动填充）：<textarea id="sh-prompt" rows="3" placeholder="cinematic wide shot, young woman standing under neon rain">${DC.Utils.escapeHtml(s.prompt || '')}</textarea></label>
        <div style="grid-column:1/-1;display:flex;gap:8px;">
          <button type="button" class="btn" id="sh-btn-inject">🔗 从角色/场景自动生成提示词</button>
        </div>
      </div>`;
    DC.modal.open({
      title: shot ? '✏️ 编辑分镜' : '✨ 新增分镜',
      body: body,
      confirmText: '保存分镜',
      onConfirm: () => {
        const sceneIdVal = body.querySelector('#sh-scene').value;
        const charIdVal = body.querySelector('#sh-char').value;
        const sceneObj = sceneIdVal ? scenes.find((sc) => sc.id === sceneIdVal) : null;
        const charObj = charIdVal ? characters.find((c) => c.id === charIdVal) : null;
        const updated = {
          id: s.id,
          sceneName: body.querySelector('#sh-name').value.trim() || (sceneObj ? sceneObj.name : '分镜 ' + (idx + 1)),
          sceneId: sceneIdVal,
          scene: sceneIdVal ? (sceneObj ? sceneObj.name : '') : '',
          characterId: charIdVal,
          characterName: charObj ? charObj.name : '',
          shotType: body.querySelector('#sh-type').value,
          angle: body.querySelector('#sh-angle').value,
          movement: body.querySelector('#sh-mov').value,
          camera: body.querySelector('#sh-mov').value, // 向后兼容
          duration: parseInt(body.querySelector('#sh-dur').value) || 5,
          description: body.querySelector('#sh-desc').value.trim(),
          dialogue: body.querySelector('#sh-dialog').value.trim(),
          prompt: body.querySelector('#sh-prompt').value.trim(),
          imageUrl: s.imageUrl || '',
        };
        const arr = getShots();
        if (idx != null && arr[idx]) arr[idx] = updated; else arr.push(updated);
        saveShots(arr);
        render();
        DC.toast('分镜已保存', 'success');
      },
    });
    // 绑定"自动生成提示词"按钮
    const btnInject = body.querySelector('#sh-btn-inject');
    if (btnInject) {
      btnInject.addEventListener('click', () => {
        const sceneIdVal = body.querySelector('#sh-scene').value;
        const charIdVal = body.querySelector('#sh-char').value;
        const sceneObj = sceneIdVal ? scenes.find((sc) => sc.id === sceneIdVal) : null;
        const charObj = charIdVal ? characters.find((c) => c.id === charIdVal) : null;
        const type = body.querySelector('#sh-type').value;
        const angle = body.querySelector('#sh-angle').value;
        const mov = body.querySelector('#sh-mov').value;
        const desc = body.querySelector('#sh-desc').value.trim();
        const parts = [];
        if (charObj) {
          if (charObj.prompt) parts.push(charObj.prompt);
          else if (charObj.appearance) parts.push(charObj.appearance);
        }
        if (sceneObj) {
          if (sceneObj.promptEn) parts.push(sceneObj.promptEn);
          else if (sceneObj.prompt) parts.push(sceneObj.prompt);
          else if (sceneObj.description) parts.push(sceneObj.description);
        }
        if (desc) parts.push(desc);
        const tag = [type, angle, mov].filter(Boolean).join(' / ');
        const out = `[${tag}] ${parts.join(' / ')}`;
        body.querySelector('#sh-prompt').value = out;
        DC.toast('提示词已自动填充', 'success');
      });
    }
  }

  async function aiSplit() {
    if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
    if (!p.script || p.script.trim().length < 20) {
      DC.toast('请先在「剧本」页写好剧本', 'warning');
      return;
    }
    const btn = document.getElementById('btnGenShots');
    if (btn) { btn.disabled = true; btn.textContent = '🌀 拆解中...'; }
    if (DC.Log) {
      const logCfg = DC.LLM.getConfig ? DC.LLM.getConfig() : null;
      const p = logCfg ? logCfg.providers[logCfg.activeProvider] : null;
      DC.Log.info('[分镜AI] 开始调用 ' + (p ? (p.name || p.model) : 'LLM'));
    }
    try {
      const prompt =
        `请将以下剧本拆解为分镜列表，以 JSON 数组返回。每个分镜对象包含字段：\n` +
        `- sceneName: 分镜名（简短描述）\n` +
        `- shotType: 景别（远景/全景/中景/近景/特写/大特写，任选其一）\n` +
        `- camera: 运镜（固定/推/拉/摇/移/跟/升降/手持/环绕）\n` +
        `- duration: 时长（秒，数字）\n` +
        `- description: 画面描述（中文，描述构图、动作、光影、色彩）\n` +
        `- dialogue: 台词/旁白（原样提取剧本中的台词）\n` +
        `- prompt: AI 绘图提示词（英文，将画面描述翻译并补充 cinematic, dramatic lighting 等）\n\n` +
        `项目名称：${p.name}\n` +
        `剧本内容：\n${p.script}\n\n` +
        `严格返回 JSON 数组，不要任何额外解释文本。建议5-15个分镜，每个分镜5-15秒。`;
      const text = await DC.LLM.generate(prompt);
      const parsed = parseJSON(text);
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI 返回内容无法解析为分镜列表，请重试');
      }
      const existing = getShots();
      const newShots = parsed.map((o) => ({
        id: uid(),
        sceneName: String(o.sceneName || ''),
        shotType: String(o.shotType || '中景'),
        camera: String(o.camera || '固定镜头'),
        duration: parseInt(o.duration) || 5,
        description: String(o.description || ''),
        dialogue: String(o.dialogue || ''),
        prompt: String(o.prompt || ''),
        imageUrl: '',
      }));
      const merged = existing.concat(newShots);
      saveShots(merged);
      render();
      // —— 为新分镜卡片添加 generating 闪烁效果（1秒后消失）
      const cards = document.querySelectorAll('#shotList .shot-card');
      for (let i = existing.length; i < Math.min(cards.length, existing.length + newShots.length); i++) {
        if (cards[i]) cards[i].classList.add('generating');
      }
      setTimeout(() => {
        document.querySelectorAll('#shotList .shot-card.generating').forEach((c) => c.classList.remove('generating'));
      }, 1800);
      DC.toast(`已新增 ${newShots.length} 个分镜`, 'success');
      if (DC.Log) DC.Log.success(`AI 拆解剧本 → 新增 ${newShots.length} 个分镜`);
    } catch (err) {
      DC.toast('生成失败：' + err.message, 'error');
      if (DC.Log) DC.Log.error('AI 分镜拆解失败：' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✨ AI 剧本→分镜'; }
    }
  }

  async function batchGenImages() {
    if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
    const list = getShots();
    if (list.length === 0) { DC.toast('请先创建分镜', 'warning'); return; }
    const btn = document.getElementById('btnBatchGen');
    if (btn) { btn.disabled = true; btn.textContent = '🌀 批量生成中...'; }
    if (DC.Log) DC.Log.info(`开始为 ${list.length} 个分镜生成图像提示词...`);
    let updated = 0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s.prompt && s.prompt.length > 10) continue; // 已有提示词跳过
      try {
        const text = await DC.LLM.generate(
          `将以下中文画面描述翻译成高质量的英文 AI 绘图提示词（comma-separated），适合 Stable Diffusion / Flux：\n\n` +
          `画面描述：${s.description || s.sceneName}\n` +
          `景别：${s.shotType}\n` +
          `运镜：${s.camera}\n\n` +
          `仅返回提示词文本（逗号分隔英文关键词），不要解释。`
        );
        list[i].prompt = text.trim().slice(0, 500);
        updated++;
        if (DC.Log) DC.Log.success(`[${i + 1}/${list.length}] ${s.sceneName} → 已生成提示词`);
      } catch (err) {
        if (DC.Log) DC.Log.error(`[${i + 1}/${list.length}] ${s.sceneName} → 失败：${err.message}`);
      }
    }
    saveShots(list);
    render();
    if (btn) { btn.disabled = false; btn.textContent = '🎬 批量生成画面'; }
    DC.toast(`已为 ${updated} 个分镜生成绘图提示词。图像生成需配置 ComfyUI`, 'success');
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

  DC.Storyboard = {
    init() {
      const b1 = document.getElementById('btnNewShot');
      if (b1) b1.onclick = () => openEditor();
      const b2 = document.getElementById('btnGenShots');
      if (b2) b2.onclick = aiSplit;
      const b3 = document.getElementById('btnBatchGen');
      if (b3) b3.onclick = batchGenImages;
      render();
    },
    render,
    refresh: render,
    aiSplit,
    batchGenImages,
  };
  DC.Shots = DC.Storyboard;
})();
