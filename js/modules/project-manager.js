/* =========================================================
   AI 导演台 · 项目管理 (project-manager.js)
   - 项目 CRUD
   - localStorage 持久化
   - 项目卡片渲染
   - 大纲/剧本字段实时同步
   ========================================================= */

(function () {
  'use strict';

  const DC = window.DC;
  if (!DC) {
    console.error('DC 未初始化，请先加载 app.js');
    return;
  }
  const STORAGE_KEY = 'dc_projects_v1';

  // ---------- 项目数据结构 ----------
  // 项目类型常量
  const PROJECT_TYPES = [
    { id: 'short-video', name: '🎬 短剧', description: '剧本→角色→分镜→出图，完整短剧生产流程' },
    { id: 'explore-store', name: '🏪 探店', description: '门店环境→菜品→卖点镜头→推广文案' },
    { id: 'explainer', name: '📢 讲解视频', description: '主题→讲解大纲→出镜场景→素材镜头' },
    { id: 'series', name: '📺 连续剧', description: '多集连续剧情，统一角色和画风' },
  ];

  function createEmptyProject(name, projectType) {
    const now = new Date().toISOString();
    return {
      id: DC.Utils.uid('proj'),
      name: name || '新短剧项目',
      projectType: projectType || 'short-video',
      genre: '剧情',
      duration: '3分钟短剧',
      style: '写实 / 电影感',
      // 项目级画风锁定：统一的视觉风格应用到所有分镜
      visualStyle: 'cinematic',   // cinematic / anime_ghibli / real_hk_retro / noir / photorealistic
      visualPrompt: '',           // 自定义附加提示词，覆盖默认风格
      logline: '',
      outline: '',
      script: '',
      characters: [],
      scenes: [],
      shots: [],
      // 剧集/集数（连续剧模式）
      episodes: [],                // [{ id, name, status, shots: [] }]
      createdAt: now,
      updatedAt: now,
    };
  }

  // ---------- 项目仓库 ----------
  const Projects = {
    all() {
      return DC.Storage.get(STORAGE_KEY, []);
    },
    save(list) {
      DC.Storage.set(STORAGE_KEY, list);
    },
    get(id) {
      return this.all().find((p) => p.id === id) || null;
    },
    create(name, projectType) {
      const list = this.all();
      const p = createEmptyProject(name, projectType);
      list.unshift(p);
      this.save(list);
      return p;
    },
    update(id, patch) {
      const list = this.all();
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], patch, { updatedAt: new Date().toISOString() });
      this.save(list);
      return list[idx];
    },
    remove(id) {
      const list = this.all().filter((p) => p.id !== id);
      this.save(list);
      if (DC.getCurrentProjectId() === id) DC.setCurrentProjectId(list[0] ? list[0].id : null);
    },
  };

  // ---------- 表单元素 ----------
  const fields = ['projTitle', 'projGenre', 'projDuration', 'projStyle', 'projLogline', 'projOutline', 'projScript'];
  function fieldMap() {
    return {
      projTitle: 'name',
      projGenre: 'genre',
      projDuration: 'duration',
      projStyle: 'style',
      projLogline: 'logline',
      projOutline: 'outline',
      projScript: 'script',
    };
  }

  // ---------- UI：项目卡片网格 ----------
  function renderGrid() {
    const grid = document.getElementById('projectGrid');
    if (!grid) return;
    const list = Projects.all();
    const currentId = DC.getCurrentProjectId();
    grid.innerHTML = '';

    // 新建项目卡片
    const newCard = document.createElement('div');
    newCard.className = 'project-card new-project';
    newCard.innerHTML = '<div style="font-size:32px;">+</div><div style="margin-top:6px;">新建项目</div>';
    newCard.onclick = () => openNewProjectDialog();
    grid.appendChild(newCard);

    list.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'project-card';
      if (p.id === currentId) card.style.borderColor = 'var(--primary)';
      const chars = (p.characters || []).length;
      const scenes = (p.scenes || []).length;
      const shots = (p.shots || []).length;
      const typeInfo = PROJECT_TYPES.find((t) => t.id === p.projectType);
      const typeLabel = typeInfo ? typeInfo.name : '🎬 短剧';
      card.innerHTML = `
        <div class="pc-actions">
          <button class="btn-icon" title="编辑">✏️</button>
          <button class="btn-icon" title="删除">🗑️</button>
        </div>
        <div class="pc-title">${DC.Utils.escapeHtml(p.name)}</div>
        <div class="pc-meta">
          <span style="color:var(--primary);">${typeLabel}</span> · ${DC.Utils.escapeHtml(p.genre || '未分类')} · ${DC.Utils.fmtDate(p.updatedAt)}
        </div>
        <div style="font-size:12px;color:var(--text-2);line-height:1.6;min-height:40px;max-height:60px;overflow:hidden;">
          ${DC.Utils.escapeHtml(p.logline || (p.outline ? p.outline.slice(0, 120) : '尚未编写概要'))}
        </div>
        <div class="pc-stats">
          <span>📖 ${(p.outline || '').length} 字</span>
          <span>✍️ ${(p.script || '').length} 字</span>
          <span>👥 ${chars} 角色</span>
          <span>🏞️ ${scenes} 场景</span>
          <span>🎞️ ${shots} 分镜</span>
        </div>`;
      card.addEventListener('click', (e) => {
        // 点击actions里的按钮不触发项目打开
        if (e.target.closest('.pc-actions')) return;
        openProject(p.id);
      });
      const [editBtn, delBtn] = card.querySelectorAll('.pc-actions .btn-icon');
      if (editBtn) editBtn.onclick = (e) => { e.stopPropagation(); openEditDialog(p); };
      if (delBtn) delBtn.onclick = (e) => {
        e.stopPropagation();
        DC.modal.confirm('确认删除项目 "' + DC.Utils.escapeHtml(p.name) + '"？<br><span style="color:var(--text-2);font-size:12px;">此操作不可恢复。</span>',
          () => {
            Projects.remove(p.id);
            DC.toast('已删除：' + p.name, 'success');
            renderGrid();
          },
          { title: '删除项目', confirmText: '确认删除' }
        );
      };
      grid.appendChild(card);
    });
  }

  function openProject(id) {
    const p = Projects.get(id);
    if (!p) return;
    DC.setCurrentProjectId(id);
    DC.toast('已打开项目：' + p.name, 'info');
    // 自动跳转到大纲页
    if (DC.Tabs) DC.Tabs.switch('outline');
  }

  function openNewProjectDialog() {
    const wrapper = document.createElement('div');
    // 项目类型选择
    const typeOptions = PROJECT_TYPES.map((t) =>
      `<label style="display:block;padding:8px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;margin-bottom:6px;">
        <input type="radio" name="np-ptype" value="${t.id}" ${t.id === 'short-video' ? 'checked' : ''} style="margin-right:6px;" />
        <strong>${t.name}</strong>
        <div style="font-size:12px;color:var(--text-2);margin-top:2px;">${t.description}</div>
       </label>`
    ).join('');
    // 画风预设
    const visualOptions = [
      { id: 'cinematic', name: '🎬 电影感（写实）', prompt: 'cinematic, film grain, 35mm, shallow depth of field, dramatic lighting' },
      { id: 'anime_ghibli', name: '🌸 吉卜力动画风', prompt: 'studio ghibli style, anime, soft watercolor background, warm lighting' },
      { id: 'real_hk_retro', name: '🌆 港式复古', prompt: 'hong kong retro style, neon lights, wet streets, 1980s aesthetic' },
      { id: 'noir', name: '🕵️ 黑色电影', prompt: 'film noir, black and white, high contrast shadows, 1940s detective atmosphere' },
      { id: 'photorealistic', name: '📷 写实摄影', prompt: 'photorealistic, 8k, ultra detailed, professional photography, natural lighting' },
      { id: 'ink_chinese', name: '🖌️ 水墨国风', prompt: 'traditional chinese ink painting style, minimalist, soft brushstrokes, elegant' },
      { id: 'cyberpunk', name: '🤖 赛博朋克', prompt: 'cyberpunk style, neon lights, futuristic cityscape, high tech, gritty atmosphere' },
      { id: 'documentary', name: '🎥 纪录片', prompt: 'documentary style, handheld camera feel, natural lighting, authentic, candid' },
    ];
    const visualSelect = visualOptions.map((v) =>
      `<option value="${v.id}" data-prompt="${v.prompt}">${v.name}</option>`
    ).join('');

    wrapper.innerHTML = `
      <div class="form-grid">
        <label class="full">项目名称：
          <input type="text" id="np-name" placeholder="例如：霓虹夜都市" />
        </label>
        <label class="full">项目类型：
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">${typeOptions}</div>
        </label>
        <label>剧情类型：
          <select id="np-genre">
            <option>爱情</option><option>悬疑</option><option>科幻</option>
            <option>喜剧</option><option>动作</option><option>奇幻</option>
            <option>剧情</option><option>恐怖</option><option>历史</option>
          </select>
        </label>
        <label>时长：
          <input type="text" id="np-duration" value="3分钟短剧" />
        </label>
        <label class="full">视觉风格（项目级画风锁定，所有分镜默认应用此风格）：
          <select id="np-visual">${visualSelect}</select>
        </label>
        <label class="full">自定义风格提示词（可选，覆盖或补充上面的预设）：
          <textarea id="np-visual-prompt" rows="2" placeholder="例如：warm sunset lighting, vibrant colors, dreamy atmosphere"></textarea>
        </label>
        <label class="full">一句话概要：
          <textarea id="np-logline" rows="2" placeholder="一句话讲清核心创意"></textarea>
        </label>
      </div>`;
    DC.modal.open({
      title: '✨ 新建项目',
      body: wrapper,
      confirmText: '创建',
      onConfirm: () => {
        const name = document.getElementById('np-name').value.trim();
        if (!name) { DC.toast('请填写项目名称', 'warning'); return false; }
        const typeRadio = wrapper.querySelector('input[name="np-ptype"]:checked');
        const projectType = typeRadio ? typeRadio.value : 'short-video';
        const visualSel = wrapper.querySelector('#np-visual');
        const visualStyle = visualSel.value;
        const visualOpt = visualSel.options[visualSel.selectedIndex];
        const visualDefaultPrompt = visualOpt.dataset.prompt || '';
        const visualCustom = wrapper.querySelector('#np-visual-prompt').value.trim();

        const p = Projects.create(name, projectType);
        Projects.update(p.id, {
          genre: document.getElementById('np-genre').value,
          duration: document.getElementById('np-duration').value,
          style: visualOpt.textContent.replace(/^[^\s]+\s/, '').trim() || visualStyle,
          visualStyle: visualStyle,
          visualPrompt: visualCustom || visualDefaultPrompt,
          logline: document.getElementById('np-logline').value.trim(),
        });
        DC.setCurrentProjectId(p.id);
        DC.toast('项目已创建：' + p.name, 'success');
        renderGrid();
        if (DC.Tabs) DC.Tabs.switch('outline');
      },
    });
  }

  function openEditDialog(p) {
    const wrapper = document.createElement('div');
    const visualOptions = [
      { id: 'cinematic', name: '🎬 电影感（写实）' },
      { id: 'anime_ghibli', name: '🌸 吉卜力动画风' },
      { id: 'real_hk_retro', name: '🌆 港式复古' },
      { id: 'noir', name: '🕵️ 黑色电影' },
      { id: 'photorealistic', name: '📷 写实摄影' },
      { id: 'ink_chinese', name: '🖌️ 水墨国风' },
      { id: 'cyberpunk', name: '🤖 赛博朋克' },
      { id: 'documentary', name: '🎥 纪录片' },
    ];
    const visualSelect = visualOptions.map((v) =>
      `<option value="${v.id}" ${(p.visualStyle || 'cinematic') === v.id ? 'selected' : ''}>${v.name}</option>`
    ).join('');
    const typeOptions = PROJECT_TYPES.map((t) =>
      `<option value="${t.id}" ${(p.projectType || 'short-video') === t.id ? 'selected' : ''}>${t.name}</option>`
    ).join('');

    wrapper.innerHTML = `
      <div class="form-grid">
        <label class="full">项目名称：
          <input type="text" id="ep-name" value="${DC.Utils.escapeHtml(p.name)}" />
        </label>
        <label>项目类型：
          <select id="ep-ptype">${typeOptions}</select>
        </label>
        <label>剧情类型：
          <input type="text" id="ep-genre" value="${DC.Utils.escapeHtml(p.genre || '')}" />
        </label>
        <label>时长：
          <input type="text" id="ep-duration" value="${DC.Utils.escapeHtml(p.duration || '')}" />
        </label>
        <label class="full">视觉风格：
          <select id="ep-visual">${visualSelect}</select>
        </label>
        <label class="full">自定义风格提示词：
          <textarea id="ep-visual-prompt" rows="2" placeholder="应用到所有分镜的统一风格词">${DC.Utils.escapeHtml(p.visualPrompt || '')}</textarea>
        </label>
        <label class="full">一句话概要：
          <textarea id="ep-logline" rows="2">${DC.Utils.escapeHtml(p.logline || '')}</textarea>
        </label>
      </div>`;
    DC.modal.open({
      title: '✏️ 编辑项目',
      body: wrapper,
      confirmText: '保存',
      onConfirm: () => {
        const updated = Projects.update(p.id, {
          name: document.getElementById('ep-name').value.trim() || p.name,
          projectType: document.getElementById('ep-ptype').value,
          genre: document.getElementById('ep-genre').value,
          duration: document.getElementById('ep-duration').value,
          visualStyle: document.getElementById('ep-visual').value,
          visualPrompt: document.getElementById('ep-visual-prompt').value.trim(),
          logline: document.getElementById('ep-logline').value.trim(),
        });
        DC.toast('已保存', 'success');
        renderGrid();
        if (updated && updated.id === DC.getCurrentProjectId()) syncToUI();
      },
    });
  }

  // ---------- 大纲/剧本表单实时同步 ----------
  let debounceTimer = null;
  function syncToUI() {
    const currentId = DC.getCurrentProjectId();
    const p = currentId ? Projects.get(currentId) : null;
    const fields = {
      projTitle: p ? p.name : '',
      projGenre: p ? (p.genre || '剧情') : '剧情',
      projDuration: p ? (p.duration || '3分钟短剧') : '3分钟短剧',
      projStyle: p ? (p.style || '写实 / 电影感') : '写实 / 电影感',
      projLogline: p ? (p.logline || '') : '',
      projOutline: p ? (p.outline || '') : '',
      projScript: p ? (p.script || '') : '',
    };
    Object.keys(fields).forEach((fid) => {
      const el = document.getElementById(fid);
      if (el) el.value = fields[fid];
    });
    const status = document.getElementById('statusProject');
    if (status) status.textContent = p ? ('📂 ' + p.name) : '📂 未选择项目';
    // 预览页信息同步
    const infoTitle = document.getElementById('infoTitle');
    if (infoTitle) infoTitle.textContent = p ? p.name : '—';
    const infoGenre = document.getElementById('infoGenre');
    if (infoGenre) infoGenre.textContent = p ? (p.genre || '—') : '—';
    const infoDuration = document.getElementById('infoDuration');
    if (infoDuration) infoDuration.textContent = p ? (p.duration || '—') : '—';
    const infoStyle = document.getElementById('infoStyle');
    if (infoStyle) infoStyle.textContent = p ? (p.style || '—') : '—';
    const infoShotCount = document.getElementById('infoShotCount');
    if (infoShotCount) infoShotCount.textContent = p && p.shots ? String(p.shots.length) : '0';
    const infoCharCount = document.getElementById('infoCharCount');
    if (infoCharCount) infoCharCount.textContent = p && p.characters ? String(p.characters.length) : '0';
    const infoSceneCount = document.getElementById('infoSceneCount');
    if (infoSceneCount) infoSceneCount.textContent = p && p.scenes ? String(p.scenes.length) : '0';
  }

  function fieldChanged() {
    const currentId = DC.getCurrentProjectId();
    if (!currentId) return;
    const patch = {};
    const map = fieldMap();
    fields.forEach((fid) => {
      const el = document.getElementById(fid);
      if (el) patch[map[fid]] = el.value;
    });
    Projects.update(currentId, patch);
    // 轻微提示
    const s = document.getElementById('statusSaved');
    if (s) s.textContent = '💾 已保存 ' + new Date().toLocaleTimeString();
  }

  function bindOutlineEvents() {
    fields.forEach((fid) => {
      const el = document.getElementById(fid);
      if (!el) return;
      el.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fieldChanged, 500);
      });
    });

    const btnGen = document.getElementById('btnGenOutline');
    if (btnGen) {
      btnGen.onclick = async () => {
        const p = Projects.get(DC.getCurrentProjectId());
        if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
        if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
        const prompt = '请为以下项目生成完整的短剧大纲：\n\n' +
          '项目名称：' + p.name + '\n' +
          '类型：' + (p.genre || '') + '\n' +
          '风格：' + (p.style || '') + '\n' +
          '时长：' + (p.duration || '') + '\n' +
          '核心想法：' + (p.logline || '（用户未提供具体想法，发挥创意）') + '\n\n' +
          '请以Markdown格式输出，包含：核心主题、主要角色、故事大纲（三幕式）。';
        btnGen.disabled = true;
        btnGen.textContent = '🌀 生成中...';
        try {
          const text = await DC.LLM.generate(prompt);
          Projects.update(p.id, { outline: text });
          syncToUI();
          DC.toast('大纲已生成', 'success');
        } catch (err) {
          DC.toast('生成失败：' + err.message, 'error');
        } finally {
          btnGen.disabled = false;
          btnGen.textContent = '✨ AI 生成大纲';
        }
      };
    }

    const btnGenScript = document.getElementById('btnGenScript');
    if (btnGenScript) {
      btnGenScript.onclick = async () => {
        const p = Projects.get(DC.getCurrentProjectId());
        if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
        if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
        btnGenScript.disabled = true;
        btnGenScript.textContent = '🌀 生成中...';
        try {
          const ctx = '请根据以下大纲编写短剧剧本（中文），使用场景+对白格式：\n\n' +
            (p.outline || '（无大纲）') + '\n\n请输出剧本正文：';
          const text = await DC.LLM.generate(ctx);
          Projects.update(p.id, { script: text });
          syncToUI();
          DC.toast('剧本已生成', 'success');
        } catch (err) {
          DC.toast('生成失败：' + err.message, 'error');
        } finally {
          btnGenScript.disabled = false;
          btnGenScript.textContent = '✨ AI 基于大纲写剧本';
        }
      };
    }

    const btnContinue = document.getElementById('btnGenScriptContinue');
    if (btnContinue) {
      btnContinue.onclick = async () => {
        const p = Projects.get(DC.getCurrentProjectId());
        if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
        if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
        btnContinue.disabled = true;
        btnContinue.textContent = '🌀 续写中...';
        try {
          const ctx = '请继续以下剧本的编写（中文），接续最后一段：\n\n' +
            (p.script || '').slice(-800) + '\n\n（继续往下写）';
          const text = await DC.LLM.generate(ctx);
          const merged = (p.script || '') + '\n\n' + text;
          Projects.update(p.id, { script: merged });
          syncToUI();
          DC.toast('已续写', 'success');
        } catch (err) {
          DC.toast('生成失败：' + err.message, 'error');
        } finally {
          btnContinue.disabled = false;
          btnContinue.textContent = '➡️ 续写';
        }
      };
    }

    // 项目页搜索
    const searchInput = document.getElementById('projectSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const kw = searchInput.value.trim().toLowerCase();
        document.querySelectorAll('.project-card').forEach((card) => {
          if (card.classList.contains('new-project')) return;
          const text = card.textContent.toLowerCase();
          card.style.display = !kw || text.includes(kw) ? '' : 'none';
        });
      });
    }

    const btnNew = document.getElementById('btnNewProject');
    if (btnNew) btnNew.onclick = openNewProjectDialog;
  }

  // ---------- 对外接口 ----------
  DC.ProjectManager = {
    init() {
      bindOutlineEvents();
      this.render();
      // 如果还没有项目，创建一个示例
      if (Projects.all().length === 0) {
        const p = Projects.create('我的第一个短剧项目', 'short-video');
        Projects.update(p.id, {
          projectType: 'short-video',
          genre: '剧情',
          duration: '3分钟短剧',
          style: '电影感（写实）',
          visualStyle: 'cinematic',
          visualPrompt: 'cinematic, film grain, 35mm, shallow depth of field, dramatic lighting',
          logline: '用一句话描述你的核心创意，例如：一位外卖员在雨夜遇到改变人生的陌生人...',
          outline: '## 核心主题\n\n（由 AI 或您自己编写故事核心）\n\n## 主要角色\n\n- 角色A：\n- 角色B：\n\n## 故事大纲\n\n### 第一幕：\n### 第二幕：\n### 第三幕：',
          script: '场景一：【】\n（请在此处编写剧本正文，或点击上方 AI 按钮自动生成）',
        });
        DC.setCurrentProjectId(p.id);
      } else if (!DC.getCurrentProjectId()) {
        DC.setCurrentProjectId(Projects.all()[0].id);
      }
      syncToUI();
    },
    render() { renderGrid(); },
    syncToUI() { syncToUI(); },
    getAll() { return Projects.all(); },
    getCurrent() {
      const id = DC.getCurrentProjectId();
      return id ? Projects.get(id) : null;
    },
    create(name, projectType) {
      const p = Projects.create(name, projectType);
      DC.setCurrentProjectId(p.id);
      renderGrid();
      return p;
    },
    update(patch) {
      const id = DC.getCurrentProjectId();
      if (!id) return null;
      const updated = Projects.update(id, patch);
      syncToUI();
      return updated;
    },
    // 供其他模块使用的项目数据操作
    getProject(id) { return Projects.get(id || DC.getCurrentProjectId()); },
    updateShots(shots) {
      const result = this.update({ shots });
      if (DC.Storyboard && DC.Storyboard.render) DC.Storyboard.render();
      if (DC.Timeline && DC.Timeline.render) DC.Timeline.render();
      if (DC.Exporter && DC.Exporter.renderPreview) DC.Exporter.renderPreview();
      return result;
    },
    updateCharacters(characters) {
      const result = this.update({ characters });
      if (DC.CharacterManager && DC.CharacterManager.render) DC.CharacterManager.render();
      if (DC.Exporter && DC.Exporter.renderPreview) DC.Exporter.renderPreview();
      return result;
    },
    updateScenes(scenes) {
      const result = this.update({ scenes });
      if (DC.SceneManager && DC.SceneManager.render) DC.SceneManager.render();
      if (DC.Exporter && DC.Exporter.renderPreview) DC.Exporter.renderPreview();
      return result;
    },
    // —— 新增：项目级画风与类型管理 ——
    getProjectTypes() { return PROJECT_TYPES.slice(); },
    getCurrentProjectType() {
      const p = this.getCurrent();
      return p ? (p.projectType || 'short-video') : 'short-video';
    },
    getCurrentVisualStyle() {
      const p = this.getCurrent();
      return p ? (p.visualStyle || 'cinematic') : 'cinematic';
    },
    getCurrentVisualPrompt() {
      const p = this.getCurrent();
      return p ? (p.visualPrompt || '') : '';
    },
    setVisualStyle(styleId, customPrompt) {
      const patch = { visualStyle: styleId };
      if (customPrompt !== undefined) patch.visualPrompt = customPrompt;
      return this.update(patch);
    },
  };
  DC.Project = DC.ProjectManager;
})();
