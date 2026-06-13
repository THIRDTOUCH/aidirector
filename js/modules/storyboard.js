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
      const shotBtns = card.querySelectorAll('.shot-head .btn-icon');
      if (shotBtns.length >= 4) {
        shotBtns[0].onclick = () => move(idx, -1);
        shotBtns[1].onclick = () => move(idx, +1);
        shotBtns[2].onclick = () => openEditor(shot, idx);
        shotBtns[3].onclick = () => {
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
      }
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
      cameraRig: 'tripod', depthOfField: 'medium', lightingStyle: 'natural',
      lightingDirection: 'front', colorTemperature: 'neutral', focalLength: '50mm',
      photographyTechnique: 'none', playbackSpeed: 'normal',
      emotionTags: [], atmosphericEffects: [], effectIntensity: 'moderate'
    };
    // 兼容旧字段
    s.movement = s.movement || s.camera || '固定';
    s.cameraRig = s.cameraRig || 'tripod';
    s.depthOfField = s.depthOfField || 'medium';
    s.lightingStyle = s.lightingStyle || 'natural';
    s.lightingDirection = s.lightingDirection || 'front';
    s.colorTemperature = s.colorTemperature || 'neutral';
    s.focalLength = s.focalLength || '50mm';
    s.photographyTechnique = s.photographyTechnique || 'none';
    s.playbackSpeed = s.playbackSpeed || 'normal';
    s.emotionTags = s.emotionTags || [];
    s.atmosphericEffects = s.atmosphericEffects || [];
    s.effectIntensity = s.effectIntensity || 'moderate';

    // 获取当前项目的角色/场景列表
    const p = DC.ProjectManager.getCurrent();
    const characters = (p && p.characters) || [];
    const scenes = (p && p.scenes) || [];

    // 读取预设（带兜底）
    const rigPresets = (window.DC.CAMERA_RIG_PRESETS || []).map(p => `<option value="${p.id}" ${(s.cameraRig||'')===p.id?'selected':''}>${p.label}</option>`).join('');
    const dofPresets = (window.DC.DEPTH_OF_FIELD_PRESETS || []).map(p => `<option value="${p.id}" ${(s.depthOfField||'')===p.id?'selected':''}>${p.label}</option>`).join('');
    const litPresets = (window.DC.LIGHTING_STYLE_PRESETS || []).map(p => `<option value="${p.id}" ${(s.lightingStyle||'')===p.id?'selected':''}>${p.label}</option>`).join('');
    const litDirPresets = (window.DC.LIGHTING_DIRECTION_PRESETS || []).map(p => `<option value="${p.id}" ${(s.lightingDirection||'')===p.id?'selected':''}>${p.label}</option>`).join('');
    const ctPresets = (window.DC.COLOR_TEMP_PRESETS || []).map(p => `<option value="${p.id}" ${(s.colorTemperature||'')===p.id?'selected':''}>${p.label}</option>`).join('');
    const flPresets = (window.DC.FOCAL_LENGTH_PRESETS || []).map(p => `<option value="${p.id}" ${(s.focalLength||'')===p.id?'selected':''}>${p.label}</option>`).join('');
    const techPresets = (window.DC.TECHNIQUE_PRESETS || []).map(p => `<option value="${p.id}" ${(s.photographyTechnique||'')===p.id?'selected':''}>${p.label}</option>`).join('');
    const pbPresets = (window.DC.PLAYBACK_SPEED_PRESETS || []).map(p => `<option value="${p.id}" ${(s.playbackSpeed||'')===p.id?'selected':''}>${p.label}</option>`).join('');
    const intensityPresets = (window.DC.EFFECT_INTENSITY_PRESETS || []).map(p => `<option value="${p.id}" ${(s.effectIntensity||'')===p.id?'selected':''}>${p.label}</option>`).join('');

    // 情绪标签
    const emotionOptions = [];
    const allEmotions = [
      ...(window.DC.EMOTION_PRESETS?.basic || []),
      ...(window.DC.EMOTION_PRESETS?.atmosphere || []),
      ...(window.DC.EMOTION_PRESETS?.tone || [])
    ];
    const selectedEmotions = Array.isArray(s.emotionTags) ? s.emotionTags : [];
    allEmotions.forEach(e => {
      const sel = selectedEmotions.includes(e.id) ? 'checked' : '';
      emotionOptions.push(`<label class="checkbox-inline"><input type="checkbox" class="emotion-tag" value="${e.id}" ${sel} />${e.label}</label>`);
    });

    // 氛围特效
    const atmOptions = [];
    const allAtm = [
      ...(window.DC.ATMOSPHERIC_EFFECT_PRESETS?.weather || []),
      ...(window.DC.ATMOSPHERIC_EFFECT_PRESETS?.environment || []),
      ...(window.DC.ATMOSPHERIC_EFFECT_PRESETS?.artistic || [])
    ];
    const selectedAtm = Array.isArray(s.atmosphericEffects) ? s.atmosphericEffects : [];
    allAtm.forEach(e => {
      const sel = selectedAtm.includes(e.id) ? 'checked' : '';
      atmOptions.push(`<label class="checkbox-inline"><input type="checkbox" class="atm-tag" value="${e.id}" ${sel} />${e.label}</label>`);
    });

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="form-grid">
        <label>场景/分镜名：<input type="text" id="sh-name" value="${DC.Utils.escapeHtml(s.sceneName || s.scene || '')}" placeholder="例如：霓虹街道 · 相遇" /></label>
        <label>关联场景：
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
        <label>时长(秒)：<input type="number" id="sh-dur" value="${s.duration || 5}" min="1" max="180" style="width:80px" /></label>
      </div>

      <!-- ===== 摄影参数 7 维度 ===== -->
      <details class="photo-params" open>
        <summary>🎬 摄影参数（7 维度）</summary>
        <div class="form-grid photo-grid">
          <label>景别：
            <select id="sh-type">
              ${['大远景', '远景', '全景', '中景', '近景', '特写', '大特写', '主观视角'].map((t) => `<option ${(s.shotType || '中景') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label>机位角度：
            <select id="sh-angle">
              ${['平视', '仰拍', '俯拍', '鸟瞰', '荷兰角', '顶拍', '侧面'].map((t) => `<option ${(s.angle || '平视') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label>器材：
            <select id="sh-rig">${rigPresets}</select>
          </label>
          <label>运镜：
            <select id="sh-mov">
              ${['固定', '推', '拉', '摇', '移', '跟', '升降', '环绕', '手持', '斯坦尼康', '摇臂'].map((t) => `<option ${(s.movement || '固定') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label>景深：
            <select id="sh-dof">${dofPresets}</select>
          </label>
          <label>焦距：
            <select id="sh-fl">${flPresets}</select>
          </label>
          <label>灯光风格：
            <select id="sh-lit">${litPresets}</select>
          </label>
          <label>灯光方向：
            <select id="sh-litdir">${litDirPresets}</select>
          </label>
          <label>色温：
            <select id="sh-ct">${ctPresets}</select>
          </label>
          <label>摄影技法：
            <select id="sh-tech">${techPresets}</select>
          </label>
          <label>播放速度：
            <select id="sh-pb">${pbPresets}</select>
          </label>
        </div>
      </details>

      <!-- ===== 氛围与情绪 ===== -->
      <details class="mood-params" open>
        <summary>🎭 氛围与情绪</summary>
        <div class="tag-group">
          <div class="tag-label">情绪标签：</div>
          <div class="tag-list">${emotionOptions.join('')}</div>
        </div>
        <div class="tag-group">
          <div class="tag-label">氛围特效：
            <select id="sh-intensity" style="width:auto;margin-left:8px">${intensityPresets}</select>
          </div>
          <div class="tag-list">${atmOptions.join('')}</div>
        </div>
      </details>

      <!-- ===== 内容 ===== -->
      <details class="content-params" open>
        <summary>📖 内容描述</summary>
        <div class="form-grid">
          <label class="full">📝 画面描述：<textarea id="sh-desc" rows="3" placeholder="画面中出现什么、角色的动作、环境的细节……">${DC.Utils.escapeHtml(s.description || '')}</textarea></label>
          <label class="full">💬 台词或旁白：<textarea id="sh-dialog" rows="2" placeholder="角色说的台词，或旁白 narration">${DC.Utils.escapeHtml(s.dialogue || '')}</textarea></label>
          <label class="full">🎨 AI 绘图提示词（英文）：
            <textarea id="sh-prompt" rows="3" placeholder="cinematic wide shot, young woman standing under neon rain">${DC.Utils.escapeHtml(s.prompt || '')}</textarea>
          </label>
          <div style="grid-column:1/-1">
            <button type="button" class="btn" id="sh-btn-inject">🔗 一键生成提示词（角色+场景+摄影参数融合）</button>
            <button type="button" class="btn" id="sh-btn-bible">📖 注入角色一致性</button>
          </div>
        </div>
      </details>`;

    DC.modal.open({
      title: shot ? '✏️ 编辑分镜（专业版）' : '✨ 新增分镜',
      body: body,
      confirmText: '保存分镜',
      width: '720px',
      onConfirm: () => {
        const sceneIdVal = body.querySelector('#sh-scene').value;
        const charIdVal = body.querySelector('#sh-char').value;
        const sceneObj = sceneIdVal ? scenes.find((sc) => sc.id === sceneIdVal) : null;
        const charObj = charIdVal ? characters.find((c) => c.id === charIdVal) : null;

        // 收集情绪标签
        const emotionTags = [];
        body.querySelectorAll('.emotion-tag:checked').forEach(el => emotionTags.push(el.value));

        // 收集氛围特效
        const atmEffects = [];
        body.querySelectorAll('.atm-tag:checked').forEach(el => atmEffects.push(el.value));

        const updated = {
          id: s.id,
          sceneName: body.querySelector('#sh-name').value.trim() || (sceneObj ? sceneObj.name : '分镜 ' + (idx + 1)),
          sceneId: sceneIdVal,
          scene: sceneIdVal ? (sceneObj ? sceneObj.name : '') : '',
          characterId: charIdVal,
          characterName: charObj ? charObj.name : '',
          shotType: body.querySelector('#sh-type').value,
          angle: body.querySelector('#sh-angle').value,
          cameraRig: body.querySelector('#sh-rig').value,
          movement: body.querySelector('#sh-mov').value,
          camera: body.querySelector('#sh-mov').value,
          depthOfField: body.querySelector('#sh-dof').value,
          focalLength: body.querySelector('#sh-fl').value,
          lightingStyle: body.querySelector('#sh-lit').value,
          lightingDirection: body.querySelector('#sh-litdir').value,
          colorTemperature: body.querySelector('#sh-ct').value,
          photographyTechnique: body.querySelector('#sh-tech').value,
          playbackSpeed: body.querySelector('#sh-pb').value,
          duration: parseInt(body.querySelector('#sh-dur').value) || 5,
          description: body.querySelector('#sh-desc').value.trim(),
          dialogue: body.querySelector('#sh-dialog').value.trim(),
          prompt: body.querySelector('#sh-prompt').value.trim(),
          emotionTags,
          atmosphericEffects: atmEffects,
          effectIntensity: body.querySelector('#sh-intensity').value,
          imageUrl: s.imageUrl || '',
        };
        const arr = getShots();
        if (idx != null && arr[idx]) arr[idx] = updated; else arr.push(updated);
        saveShots(arr);
        render();
        DC.toast('分镜已保存', 'success');
      },
    });
    // 绑定"一键生成提示词"按钮（使用 PromptBuilder 5层组装）
    const btnInject = body.querySelector('#sh-btn-inject');
    if (btnInject) {
      btnInject.addEventListener('click', async () => {
        btnInject.disabled = true;
        btnInject.textContent = '🌀 生成中...';
        try {
          const shotData = {
            shotType: body.querySelector('#sh-type').value,
            angle: body.querySelector('#sh-angle').value,
            cameraRig: body.querySelector('#sh-rig').value,
            movement: body.querySelector('#sh-mov').value,
            depthOfField: body.querySelector('#sh-dof').value,
            focalLength: body.querySelector('#sh-fl').value,
            lightingStyle: body.querySelector('#sh-lit').value,
            lightingDirection: body.querySelector('#sh-litdir').value,
            colorTemperature: body.querySelector('#sh-ct').value,
            photographyTechnique: body.querySelector('#sh-tech').value,
            playbackSpeed: body.querySelector('#sh-pb').value,
            emotionTags: [],
            atmosphericEffects: [],
            effectIntensity: body.querySelector('#sh-intensity').value,
            description: body.querySelector('#sh-desc').value.trim(),
            dialogue: body.querySelector('#sh-dialog').value.trim(),
          };
          body.querySelectorAll('.emotion-tag:checked').forEach(el => shotData.emotionTags.push(el.value));
          body.querySelectorAll('.atm-tag:checked').forEach(el => shotData.atmosphericEffects.push(el.value));

          const sceneIdVal = body.querySelector('#sh-scene').value;
          const charIdVal = body.querySelector('#sh-char').value;
          const sceneObj = sceneIdVal ? scenes.find(sc => sc.id === sceneIdVal) : null;
          const charObj = charIdVal ? characters.find(c => c.id === charIdVal) : null;
          if (charObj) {
            shotData.characterName = charObj.name;
            shotData.characterId = charObj.id;
            if (charObj.promptEn || charObj.prompt) shotData.prompt = charObj.promptEn || charObj.prompt;
          }
          if (sceneObj) {
            shotData.sceneName = sceneObj.name;
            if (sceneObj.promptEn || sceneObj.prompt) {
              shotData.prompt = (shotData.prompt || '') + '. ' + (sceneObj.promptEn || sceneObj.prompt);
            }
          }

          let result = '';
          if (window.DC.PromptBuilder) {
            result = window.DC.PromptBuilder.buildShotImagePrompt(shotData, {});
          } else {
            const parts = [];
            const type = shotData.shotType, angle = shotData.angle, mov = shotData.movement;
            if (type) parts.push(type + ' shot');
            if (angle) parts.push(angle);
            if (mov && mov !== '固定') parts.push(mov);
            if (charObj?.appearance) parts.push(charObj.appearance);
            if (sceneObj?.description) parts.push(sceneObj.description);
            if (shotData.description) parts.push(shotData.description);
            result = parts.join(', ');
          }
          body.querySelector('#sh-prompt').value = result;
          DC.toast('提示词已组装（5层结构化）', 'success');
        } catch (err) {
          DC.toast('生成提示词失败: ' + err.message, 'error');
        } finally {
          btnInject.disabled = false;
          btnInject.textContent = '🔗 一键生成提示词（角色+场景+摄影参数融合）';
        }
      });
    }

    // 绑定"注入角色一致性"按钮
    const btnBible = body.querySelector('#sh-btn-bible');
    if (btnBible) {
      btnBible.addEventListener('click', () => {
        const charIdVal = body.querySelector('#sh-char').value;
        const charObj = charIdVal ? characters.find(c => c.id === charIdVal) : null;
        if (!charObj) { DC.toast('请先选择关联角色', 'warning'); return; }

        let bible = null;
        if (window.DC.CharacterBible) {
          const bibles = window.DC.CharacterBible.getAllBibles();
          bible = bibles.find(b => b.characterId === charIdVal);
          if (!bible) bible = window.DC.CharacterBible.ensureBible(charObj);
        }

        let consistencyPrompt = '';
        if (bible && window.DC.PromptBuilder) {
          const styleId = (p && p.visualStyle) || '';
          const styleData = window.DC.PromptBuilder.getStylePrompts(styleId);
          consistencyPrompt = window.DC.CharacterBible.generateConsistencyPrompt(bible, styleData.mediaType);
        } else if (charObj.appearance) {
          consistencyPrompt = charObj.appearance;
        } else {
          DC.toast('无法生成角色一致性提示词', 'warning');
          return;
        }

        const currentPrompt = body.querySelector('#sh-prompt').value.trim();
        if (currentPrompt && !currentPrompt.includes(consistencyPrompt)) {
          body.querySelector('#sh-prompt').value = consistencyPrompt + '. ' + currentPrompt;
        } else if (!currentPrompt) {
          body.querySelector('#sh-prompt').value = consistencyPrompt;
        }
        DC.toast('角色一致性已注入（6层身份锚点）', 'success');
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
