/* =========================================================
   AI 导演台 · AI 核心调度 (ai-core.js)
   - 多供应商 API Key 管理
   - Key 轮询 (round-robin / 失败剔除)
   - 任务队列（优先级、自动重试）
   - 提示词模板引擎（角色引用注入）
   - 语言风格统一（中 -> 英自动翻译用于 SD/Seedance 图生图）
   ========================================================= */

(function () {
  'use strict';

  const DC = window.DC;
  if (!DC) { console.error('DC 未初始化'); return; }

  // ---------- 供应商配置 ----------
  const PROVIDERS = {
    openai: { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', key: '' },
    anthropic: { name: 'Anthropic Claude', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514', key: '' },
    dashscope: { name: '通义千问 (阿里云 DashScope)', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus', key: '' },
    doubao: { name: '豆包 (火山引擎)', endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-4k', key: '' },
    seedance: { name: 'Seedance 2.0 (图/视频)', endpoint: 'https://api.seedance.ai/v2/generate', model: 'seedance-2.0', key: '' },
    jimeng: { name: '即梦 Jimeng (图生视频)', endpoint: 'https://jimeng.jianying.com/v1/generate', model: 'jimeng-v1', key: '' },
    custom: { name: '自定义 API (OpenAI 兼容)', endpoint: '', model: '', key: '' },
  };

  // ---------- Key 配置存储 ----------
  const KEY_STORAGE = 'dc_ai_keys_v1';
  const PROV_STORAGE = 'dc_ai_providers_v1';
  const ACTIVE_STORAGE = 'dc_ai_active_providers_v1';

  function loadKeys() {
    const stored = DC.Storage.get(KEY_STORAGE, {});
    const out = {};
    Object.keys(PROVIDERS).forEach((k) => { out[k] = stored[k] || ''; });
    return out;
  }
  function saveKeys(keys) { DC.Storage.set(KEY_STORAGE, keys); }

  function loadActiveProviders() {
    return DC.Storage.get(ACTIVE_STORAGE, ['openai', 'dashscope', 'seedance']);
  }
  function saveActiveProviders(list) { DC.Storage.set(ACTIVE_STORAGE, list); }

  function loadConfig() {
    const stored = DC.Storage.get(PROV_STORAGE, {});
    const merged = JSON.parse(JSON.stringify(PROVIDERS));
    Object.keys(stored).forEach((k) => {
      if (merged[k]) Object.assign(merged[k], stored[k]);
    });
    const keys = loadKeys();
    Object.keys(keys).forEach((k) => { if (merged[k]) merged[k].key = keys[k]; });
    return merged;
  }

  // ---------- 供应商轮询 ----------
  class ProviderPool {
    constructor() { this.reset(); }
    reset() {
      const active = loadActiveProviders().filter((p) => PROVIDERS[p]);
      this.queue = active.slice();
      this.blacklistUntil = {};
    }
    next(isText = true) {
      const now = Date.now();
      for (let i = 0; i < this.queue.length; i++) {
        const name = this.queue[i];
        if (this.blacklistUntil[name] && this.blacklistUntil[name] > now) continue;
        if (isText && name === 'seedance' && name === 'jimeng') continue;
        this.queue.splice(i, 1);
        this.queue.push(name);
        return name;
      }
      return this.queue[0] || null;
    }
    fail(name, seconds = 30) { this.blacklistUntil[name] = Date.now() + seconds * 1000; }
  }
  const pool = new ProviderPool();

  // ---------- 通用 LLM 调用（兼容多家 OpenAI 格式） ----------
  async function callLLM(userPrompt, systemPrompt, opts = {}) {
    const config = loadConfig();
    const active = loadActiveProviders().filter((n) => {
      const c = config[n];
      return c && c.key && (n === 'openai' || n === 'anthropic' || n === 'dashscope' || n === 'doubao' || n === 'custom');
    });
    if (active.length === 0) {
      throw new Error('尚未配置任何 LLM API Key，请前往「AI 设置」填写');
    }

    // 若已存在 DC.LLM 且用户配置了它的 endpoint，优先沿用老实现
    if (DC.LLM && DC.LLM.isReady && DC.LLM.isReady()) {
      try {
        return await DC.LLM.generate(userPrompt, { system: systemPrompt, ...opts });
      } catch (e) {
        // 老实现失败，继续尝试新实现
      }
    }

    let lastError = null;
    for (const providerName of active) {
      const c = config[providerName];
      if (!c || !c.key) continue;
      try {
        const body = {
          model: c.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt || '你是一位资深中文编剧与分镜师。' },
            { role: 'user', content: userPrompt },
          ],
          temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.75,
        };
        const resp = await fetch(c.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.key },
          body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + providerName);
        const data = await resp.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          return data.choices[0].message.content || '';
        }
        throw new Error('响应格式异常: ' + providerName);
      } catch (err) {
        lastError = err;
        pool.fail(providerName, 20);
        console.warn('[AICore] provider ' + providerName + ' failed:', err.message);
        continue;
      }
    }
    throw lastError || new Error('所有 LLM 供应商均不可用');
  }

  // ---------- JSON 解析 ----------
  function extractJSON(text) {
    if (!text) return null;
    const candidates = [];
    const braces = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
    if (braces) {
      braces.forEach((b) => {
        const clean = b.replace(/```(?:json)?/gi, '').trim();
        candidates.push(clean);
      });
    }
    const firstOpen = text.indexOf('[');
    const firstCurly = text.indexOf('{');
    const start = firstOpen === -1 ? firstCurly :
      firstCurly === -1 ? firstOpen : Math.min(firstOpen, firstCurly);
    if (start !== -1) {
      const openCh = text[start];
      const closeCh = openCh === '[' ? ']' : '}';
      let depth = 0, i = start, started = false;
      for (; i < text.length; i++) {
        if (text[i] === openCh) { depth++; started = true; }
        else if (text[i] === closeCh) {
          depth--;
          if (started && depth === 0) {
            candidates.push(text.substring(start, i + 1));
            break;
          }
        }
      }
    }
    for (const cand of candidates) {
      try { return JSON.parse(cand); } catch (e) { /* try next */ }
    }
    return null;
  }

  // ---------- 提示词模板引擎（角色/场景参数注入） ----------
  function renderPrompt(template, vars) {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const keys = path.split('.');
      let cur = vars;
      for (const k of keys) {
        if (cur == null) return '';
        cur = cur[k];
      }
      return cur != null ? String(cur) : '';
    });
  }

  // ---------- 中译英提示词（用于 SD/Seedance 等偏好英文 prompt 的服务） ----------
  async function translatePromptToEnglish(chineseText) {
    if (!chineseText) return '';
    const userPrompt = '请将以下中文场景描述翻译为英文，输出仅为翻译结果（不要任何解释、不要包裹符号、直接输出英文）：\n\n' + chineseText;
    try {
      const text = await callLLM(userPrompt, '你是一位专业的影视美术翻译，擅长把中文场景描述转换为英文 Stable Diffusion 风格的提示词。请直接输出英文。', { temperature: 0.3 });
      return text.trim();
    } catch (e) {
      return chineseText; // 失败返回原文，用户可手动改
    }
  }

  // ---------- 角色圣经（6层身份锚点）注入提示词 ----------
  function buildCharacterPrompt(character) {
    if (!character) return '';
    const parts = [];
    if (character.age || character.gender) parts.push(`${character.age || '约25岁'} ${character.gender || '人物'}`);
    if (character.appearance) parts.push(`外貌: ${character.appearance}`);
    if (character.personality) parts.push(`性格: ${character.personality}`);
    if (character.costume) parts.push(`服饰: ${character.costume}`);
    if (character.face) parts.push(`面部特征: ${character.face}`);
    if (character.body) parts.push(`体态: ${character.body}`);
    if (character.prompt) parts.push(`附加: ${character.prompt}`);
    return parts.join('；');
  }

  function buildShotPrompt(shot, opts = {}) {
    // 拼接角色 + 场景 + 景别/机位
    const parts = [];
    if (shot.shotType) parts.push(`[${shot.shotType}]`);
    if (shot.angle) parts.push(`[${shot.angle}]`);
    if (shot.movement) parts.push(`[${shot.movement}]`);
    if (shot.characterName) {
      const char = (opts.characters || []).find((c) => c.id === shot.characterId) || null;
      if (char) parts.push(buildCharacterPrompt(char));
      else parts.push(`角色: ${shot.characterName}`);
    }
    if (shot.sceneName) parts.push(`场景: ${shot.sceneName}`);
    if (shot.description) parts.push(shot.description);
    return parts.join('。');
  }

  // ---------- 任务队列 ----------
  class TaskQueue {
    constructor(concurrency = 2) {
      this.concurrency = concurrency;
      this.waiting = [];
      this.running = 0;
      this.history = [];
    }
    push(task) {
      const t = Object.assign({
        id: DC.Utils.uid('task'),
        priority: 5,
        retries: 2,
        createdAt: Date.now(),
        status: 'pending',
      }, task);
      this.waiting.push(t);
      this.waiting.sort((a, b) => (b.priority - a.priority) || (a.createdAt - b.createdAt));
      this._kick();
      return t.id;
    }
    async _kick() {
      while (this.running < this.concurrency && this.waiting.length > 0) {
        const task = this.waiting.shift();
        this.running++;
        task.status = 'running';
        this._onStatus && this._onStatus(task);
        try {
          const result = await this._runWithRetry(task);
          task.status = 'done';
          task.result = result;
          task.endedAt = Date.now();
          this.history.push(task);
          if (task.onDone) task.onDone(result);
          this._onStatus && this._onStatus(task);
        } catch (err) {
          task.status = 'failed';
          task.error = err.message;
          task.endedAt = Date.now();
          this.history.push(task);
          if (task.onFail) task.onFail(err);
          this._onStatus && this._onStatus(task);
        } finally {
          this.running--;
          this._kick();
        }
      }
    }
    async _runWithRetry(task) {
      let lastErr = null;
      for (let i = 0; i <= (task.retries || 0); i++) {
        try {
          return await task.fn(i);
        } catch (err) {
          lastErr = err;
          if (i < task.retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
      throw lastErr || new Error('任务失败');
    }
    onStatus(fn) { this._onStatus = fn; }
  }
  const queue = new TaskQueue(2);

  // ---------- 对外接口 ----------
  DC.AICore = {
    PROVIDERS,
    getConfig: loadConfig,
    setProviderField(providerName, field, value) {
      const all = loadConfig();
      all[providerName][field] = value;
      const sanitized = JSON.parse(JSON.stringify(all));
      const keys = {};
      Object.keys(sanitized).forEach((k) => {
        keys[k] = sanitized[k].key || '';
        delete sanitized[k].key;
      });
      DC.Storage.set(PROV_STORAGE, sanitized);
      saveKeys(keys);
    },
    getActiveProviders: loadActiveProviders,
    setActiveProviders: saveActiveProviders,
    callLLM,
    extractJSON,
    renderPrompt,
    translatePromptToEnglish,
    buildCharacterPrompt,
    buildShotPrompt,
    queue,
    TaskQueue,
    // 渲染"AI 设置"面板
    renderSettings(panelId) {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      const config = loadConfig();
      const active = loadActiveProviders();

      let html = `
        <div class="panel-header">
          <div class="panel-title">⚙️ AI 设置</div>
          <div class="panel-subtitle">配置你的 API Key，按顺序轮询使用，失败自动切换。</div>
        </div>
        <div class="panel-body" style="padding:16px;max-height:none;">
          <div style="margin-bottom:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <label style="font-size:13px;color:var(--text-1);">活跃供应商（将作为轮询池）：</label>`;
      Object.keys(PROVIDERS).forEach((k) => {
        html += `<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;">
          <input type="checkbox" class="ai-prov" data-prov="${k}" ${active.includes(k) ? 'checked' : ''}/>
          ${PROVIDERS[k].name}
        </label>`;
      });
      html += `</div><div class="form-grid" style="gap:10px;">`;

      Object.keys(PROVIDERS).forEach((k) => {
        const c = config[k];
        html += `
          <div class="card" style="padding:12px;">
            <div style="font-weight:600;margin-bottom:6px;">${c.name}</div>
            <label class="full" style="font-size:12px;color:var(--text-2);">Endpoint
              <input type="text" data-prov="${k}" data-field="endpoint" value="${DC.Utils.escapeHtml(c.endpoint || '')}" placeholder="https://..."/>
            </label>
            <label class="full" style="font-size:12px;color:var(--text-2);">Model
              <input type="text" data-prov="${k}" data-field="model" value="${DC.Utils.escapeHtml(c.model || '')}" placeholder="例如 gpt-4o-mini"/>
            </label>
            <label class="full" style="font-size:12px;color:var(--text-2);">API Key
              <input type="password" data-prov="${k}" data-field="key" value="${DC.Utils.escapeHtml(c.key || '')}" placeholder="sk-..."/>
            </label>
          </div>`;
      });

      html += `</div>
        <div style="margin-top:14px;display:flex;gap:8px;">
          <button class="btn btn-primary" id="btnSaveAISettings">保存设置</button>
          <button class="btn" id="btnTestLLM">测试一次调用</button>
          <span id="llmTestResult" style="font-size:12px;color:var(--text-2);align-self:center;"></span>
        </div>
        <div class="hint" style="margin-top:12px;">
          ⚠️ 提示：API Key 仅保存在你本机的浏览器中，不会上传到任何服务器。但在浏览器直接调用厂商 API 会受 CORS 限制，
          生产环境请使用你自己的代理服务器。
        </div>
      </div>`;
      panel.innerHTML = html;

      panel.querySelectorAll('[data-prov][data-field]').forEach((el) => {
        el.addEventListener('change', () => {
          const prov = el.getAttribute('data-prov');
          const field = el.getAttribute('data-field');
          DC.AICore.setProviderField(prov, field, el.value);
        });
      });

      panel.querySelectorAll('.ai-prov').forEach((el) => {
        el.addEventListener('change', () => {
          const list = Array.from(panel.querySelectorAll('.ai-prov:checked')).map((c) => c.getAttribute('data-prov'));
          saveActiveProviders(list);
        });
      });

      const btnSave = document.getElementById('btnSaveAISettings');
      if (btnSave) btnSave.onclick = () => {
        pool.reset();
        DC.toast('已保存 AI 设置', 'success');
      };
      const btnTest = document.getElementById('btnTestLLM');
      if (btnTest) btnTest.onclick = async () => {
        const result = document.getElementById('llmTestResult');
        result.textContent = '⏳ 正在调用...';
        try {
          const text = await callLLM('请用 10 个字告诉我你是谁。', '你是一位助手。', { temperature: 0.3 });
          result.textContent = '✅ 成功：' + text;
        } catch (err) {
          result.textContent = '❌ 失败：' + err.message;
        }
      };
    },
  };
})();
