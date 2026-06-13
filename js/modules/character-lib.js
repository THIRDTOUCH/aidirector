/* =========================================================
   AI 导演台 · 角色库 (character-lib.js)
   - 角色 CRUD
   - localStorage 持久化（存到项目的 characters 字段）
   - AI 生成角色（根据项目大纲）
   ========================================================= */

(function () {
  'use strict';
  const DC = window.DC;
  if (!DC) return;

  function getChars() {
    const p = DC.ProjectManager.getCurrent();
    if (!p) return [];
    return p.characters || [];
  }
  function saveChars(list) {
    DC.ProjectManager.updateCharacters(list);
  }
  function uid() { return DC.Utils.uid('char'); }

  function render() {
    const grid = document.getElementById('charGrid');
    if (!grid) return;
    const list = getChars();
    grid.innerHTML = '';

    // 新建卡片
    const addBtn = document.createElement('div');
    addBtn.className = 'char-card add-card';
    addBtn.innerHTML = '<div style="font-size:40px;color:var(--primary);">+</div><div>添加角色</div>';
    addBtn.onclick = () => openEditor();
    grid.appendChild(addBtn);

    list.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'char-card';
      const appearance = c.appearance ? c.appearance : '';
      const personality = c.personality ? c.personality : '';
      const costume = c.costume ? c.costume : '';
      const face = c.face ? c.face : '';
      const body = c.body ? c.body : '';
      const hasRef = c.refImages && c.refImages.length > 0;
      card.innerHTML = `
        <div class="pc-actions">
          <button class="btn-icon" title="编辑">✏️</button>
          <button class="btn-icon" title="删除">🗑️</button>
        </div>
        <div class="pc-title">${DC.Utils.escapeHtml(c.name || '未命名')} <span style="color:var(--text-2);font-size:12px;font-weight:normal;">${DC.Utils.escapeHtml(c.role || '')}</span></div>
        <div class="pc-meta">${DC.Utils.escapeHtml((c.age ? c.age + '岁 · ' : '') + (c.gender || '未设定'))}</div>
        ${hasRef ? `<div class="pc-refs">${c.refImages.slice(0, 4).map((img) => `<div class="pc-ref" title="参考图" style="background-image:url('${DC.Utils.escapeHtml(img)}')"></div>`).join('')}</div>` : ''}
        ${appearance ? `<div class="pc-body-text appearance"><span class="pc-body-label">外貌</span>${DC.Utils.escapeHtml(appearance)}</div>` : ''}
        ${face ? `<div class="pc-body-text face"><span class="pc-body-label">面部</span>${DC.Utils.escapeHtml(face)}</div>` : ''}
        ${costume ? `<div class="pc-body-text costume"><span class="pc-body-label">服饰</span>${DC.Utils.escapeHtml(costume)}</div>` : ''}
        ${body ? `<div class="pc-body-text body"><span class="pc-body-label">体态</span>${DC.Utils.escapeHtml(body)}</div>` : ''}
        ${personality ? `<div class="pc-body-text personality"><span class="pc-body-label">性格</span>${DC.Utils.escapeHtml(personality)}</div>` : ''}
        ${c.prompt ? `<div class="pc-prompt">🎨 ${DC.Utils.escapeHtml(c.prompt)}</div>` : ''}`;
      const actionBtns = card.querySelectorAll('.pc-actions .btn-icon');
      if (actionBtns.length >= 2) {
        actionBtns[0].onclick = (e) => { e.stopPropagation(); openEditor(c, idx); };
        actionBtns[1].onclick = (e) => {
          e.stopPropagation();
          DC.modal.confirm('确认删除角色：' + DC.Utils.escapeHtml(c.name) + '？',
            () => {
              const arr = getChars().filter((_, i) => i !== idx);
              saveChars(arr);
              render();
              DC.toast('已删除角色', 'success');
            },
            { title: '删除角色', confirmText: '删除' }
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
      card.addEventListener('click', () => openEditor(c, idx));
      grid.appendChild(card);
    });

    if (list.length === 0) {
      const tip = document.createElement('div');
      tip.style.cssText = 'grid-column:1/-1;padding:20px;text-align:center;color:var(--text-2);font-size:13px;';
      tip.textContent = '暂无角色，点击上方 ✨ AI 生成角色 或 + 添加角色 卡片创建';
      grid.appendChild(tip);
    }
  }

  function openEditor(char, idx) {
    const c = char || { id: uid(), name: '', role: '', age: '', gender: '', appearance: '', face: '', costume: '', body: '', personality: '', background: '', prompt: '', refImages: [] };
    c.refImages = c.refImages || [];
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-grid">
        <label>角色名：<input type="text" id="e-name" value="${DC.Utils.escapeHtml(c.name)}" placeholder="例如：林雨" /></label>
        <label>角色定位：<input type="text" id="e-role" value="${DC.Utils.escapeHtml(c.role)}" placeholder="主角/配角/反派…" /></label>
        <label>年龄：<input type="text" id="e-age" value="${DC.Utils.escapeHtml(c.age)}" placeholder="例如：28" /></label>
        <label>性别：
          <select id="e-gender">
            <option value="">（不限）</option>
            <option ${c.gender === '女' ? 'selected' : ''}>女</option>
            <option ${c.gender === '男' ? 'selected' : ''}>男</option>
            <option ${c.gender === '中性' ? 'selected' : ''}>中性</option>
          </select>
        </label>
        <label class="full">面部特征：<textarea id="e-face" rows="2" placeholder="脸型、五官、标志性细节……">${DC.Utils.escapeHtml(c.face || '')}</textarea></label>
        <label class="full">外貌整体：<textarea id="e-appearance" rows="2" placeholder="身高、体型、整体感觉……">${DC.Utils.escapeHtml(c.appearance)}</textarea></label>
        <label class="full">典型服饰：<textarea id="e-costume" rows="2" placeholder="主要出场时的服装风格……">${DC.Utils.escapeHtml(c.costume || '')}</textarea></label>
        <label class="full">体态特征：<textarea id="e-body" rows="2" placeholder="站姿、行走风格、小动作……">${DC.Utils.escapeHtml(c.body || '')}</textarea></label>
        <label class="full">性格特征：<textarea id="e-personality" rows="2" placeholder="内向/坚韧/冷静……">${DC.Utils.escapeHtml(c.personality)}</textarea></label>
        <label class="full">人物背景/动机：<textarea id="e-background" rows="3" placeholder="职业、经历、核心动机……">${DC.Utils.escapeHtml(c.background)}</textarea></label>
        <label class="full">🎨 AI 绘图提示词（英文）：<textarea id="e-prompt" rows="3" placeholder="例如：young asian woman, long black hair, rainy neon street, cinematic">${DC.Utils.escapeHtml(c.prompt)}</textarea></label>
        <label class="full">🖼️ 参考图（粘贴图片 URL，每行一张）：<textarea id="e-refs" rows="2" placeholder="https://example.com/img1.png&#10;https://example.com/img2.png">${DC.Utils.escapeHtml(c.refImages.join('\n'))}</textarea></label>
      </div>`;
    DC.modal.open({
      title: (char ? '✏️ 编辑角色' : '✨ 新建角色'),
      body: body,
      confirmText: '保存角色',
      onConfirm: () => {
        const name = body.querySelector('#e-name').value.trim();
        if (!name) { DC.toast('请填写角色名', 'warning'); return false; }
        const refRaw = body.querySelector('#e-refs').value.trim();
        const refImages = refRaw ? refRaw.split('\n').map((s) => s.trim()).filter(Boolean) : [];
        const updated = {
          id: c.id,
          name: name,
          role: body.querySelector('#e-role').value.trim(),
          age: body.querySelector('#e-age').value.trim(),
          gender: body.querySelector('#e-gender').value,
          face: body.querySelector('#e-face').value.trim(),
          appearance: body.querySelector('#e-appearance').value.trim(),
          costume: body.querySelector('#e-costume').value.trim(),
          body: body.querySelector('#e-body').value.trim(),
          personality: body.querySelector('#e-personality').value.trim(),
          background: body.querySelector('#e-background').value.trim(),
          prompt: body.querySelector('#e-prompt').value.trim(),
          refImages: refImages,
        };
        const arr = getChars();
        if (idx != null && arr[idx]) arr[idx] = updated; else arr.push(updated);
        saveChars(arr);
        render();
        DC.toast('角色已保存', 'success');
      },
    });
  }

  async function aiGenerate() {
    if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
    const btn = document.getElementById('btnGenChars');
    const grid = document.getElementById('charGrid');
    if (btn) { btn.disabled = true; btn.textContent = '🌀 生成中...'; }
    if (grid) {
      grid.style.opacity = '0.7';
      grid.style.pointerEvents = 'none';
    }
    if (DC.Log) {
      const provider = DC.LLM && DC.LLM.getCurrentProviderName ? DC.LLM.getCurrentProviderName() : 'LLM';
      DC.Log.info('[角色AI] 开始调用 ' + provider);
    }
    try {
      const prompt =
        `基于以下项目信息，设计3-5个关键角色，以 JSON 数组格式返回。每个对象包含字段：name, role, age, gender, appearance, personality, background, prompt(AI绘图提示词，英文)。\n\n` +
        `项目名称：${p.name}\n` +
        `类型/风格：${p.genre || ''} / ${p.style || ''}\n` +
        `一句话概要：${p.logline || ''}\n` +
        `故事大纲：\n${p.outline || '（无）'}\n\n` +
        `要求：严格返回 JSON 数组，不要任何解释文字。数组外层用 [ ] 包裹，对象字段双引号。`;
      const text = await DC.LLM.generate(prompt);
      const parsed = parseJSON(text);
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI 返回内容无法解析为角色列表，请重试');
      }
      const existing = getChars();
      const merged = existing.concat(parsed.map((o) => ({
        id: uid(),
        name: String(o.name || '未命名'),
        role: String(o.role || ''),
        age: String(o.age || ''),
        gender: String(o.gender || ''),
        appearance: String(o.appearance || ''),
        personality: String(o.personality || ''),
        background: String(o.background || ''),
        prompt: String(o.prompt || ''),
      })));
      saveChars(merged);
      render();
      DC.toast(`已新增 ${parsed.length} 个角色`, 'success');
      if (DC.Log) DC.Log.success(`[角色AI] 成功生成 ${parsed.length} 个角色`);
    } catch (err) {
      DC.toast('生成失败：' + err.message, 'error');
      if (DC.Log) DC.Log.error('[角色AI] ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✨ AI 生成角色'; }
      if (grid) {
        grid.style.opacity = '';
        grid.style.pointerEvents = '';
      }
    }
  }

  function parseJSON(text) {
    if (!text) return null;
    // 尝试提取 ```json ... ```
    let json = text;
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (m) json = m[1];
    try { return JSON.parse(json); } catch (_) {}
    // 尝试找数组起点
    const s = json.indexOf('[');
    const e = json.lastIndexOf(']');
    if (s !== -1 && e !== -1 && e > s) {
      try { return JSON.parse(json.substring(s, e + 1)); } catch (_) {}
    }
    return null;
  }

  DC.CharacterManager = {
    init() {
      const b1 = document.getElementById('btnNewChar');
      if (b1) b1.onclick = () => openEditor();
      const b2 = document.getElementById('btnGenChars');
      if (b2) b2.onclick = aiGenerate;
      render();
    },
    render,
    aiGenerate,
    getChars,
    saveChars,
  };
  DC.Characters = DC.CharacterManager;
  DC.CharacterLib = DC.CharacterManager;
})();
