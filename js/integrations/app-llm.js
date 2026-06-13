/* =========================================================
   AI 导演台 · LLM 集成 (app-llm.js)
   - Ollama (本地)
   - Groq (云端 · 兼容 OpenAI)
   - OpenAI / DeepSeek / 自定义 OpenAI 兼容
   - 流式输出 / 非流式
   - 连接测试 & 设置弹窗
   ========================================================= */

(function () {
  'use strict';

  const DC = window.DC;
  if (!DC) {
    console.error('DC 未初始化');
    return;
  }
  const CONFIG_KEY = 'dc_llm_config_v1';
  const STATUS_KEY = 'dc_llm_status_v1';

  // ---------- Provider Registry ----------
  const PROVIDER_REGISTRY = {
    ollama: {
      id: 'ollama',
      name: 'Ollama (本地)',
      apiType: 'ollama',
      endpointPath: '/api/chat',
      testEndpointPath: '/api/tags',
      buildBody(messages, opts) {
        return {
          model: opts.model,
          messages: messages,
          stream: opts.stream,
          options: {
            temperature: opts.temperature,
            num_predict: opts.maxTokens,
          },
        };
      },
      buildHeaders() {
        return { 'Content-Type': 'application/json' };
      },
      parseResponse(data) {
        return (
          (data.message && data.message.content) ||
          (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
          data.response ||
          ''
        );
      },
      parseError(err, p) {
        const msg = err.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          return { ok: false, message: '无法连接 Ollama，请确保服务已启动 (ollama serve) 并配置 CORS (OLLAMA_ORIGINS=*)' };
        }
        return { ok: false, message: '连接失败：' + msg };
      },
      isStreamingOllamaFormat(chunk) {
        return !chunk.startsWith('data:');
      },
    },
    openai: {
      id: 'openai',
      name: 'OpenAI 兼容',
      apiType: 'openai',
      endpointPath: '/v1/chat/completions',
      testEndpointPath: '/v1/models',
      buildBody(messages, opts) {
        return {
          model: opts.model,
          messages: messages,
          stream: opts.stream,
          temperature: opts.temperature,
          max_tokens: opts.maxTokens,
        };
      },
      buildHeaders(apiKey) {
        return {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (apiKey || ''),
        };
      },
      parseResponse(data) {
        return (
          (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
          (data.message && data.message.content) ||
          data.response ||
          ''
        );
      },
      parseError(err, p) {
        const msg = err.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          return { ok: false, message: '网络错误：无法连接 ' + p.endpoint };
        }
        if (msg.includes('401')) {
          return { ok: false, message: 'API Key 无效或未填写' };
        }
        return { ok: false, message: '连接失败：' + msg };
      },
      isStreamingOllamaFormat(chunk) {
        return false;
      },
    },
    // Groq / DeepSeek 等 OpenAI 兼容 provider 共用 openai 逻辑
    groq: null,
    deepseek: null,
  };

  // OpenAI 兼容 provider 到实际 registry 条目的映射
  const OPENAI_COMPAT_ALIASES = {
    groq: 'openai',
    deepseek: 'openai',
  };

  function getRegistryEntry(providerKey) {
    if (PROVIDER_REGISTRY[providerKey] !== null) {
      return PROVIDER_REGISTRY[providerKey];
    }
    const alias = OPENAI_COMPAT_ALIASES[providerKey];
    if (alias && PROVIDER_REGISTRY[alias]) {
      return PROVIDER_REGISTRY[alias];
    }
    return null;
  }

  // ---------- 默认配置 ----------
  const DEFAULT_CFG = {
    activeProvider: 'ollama',
    providers: {
      ollama: {
        name: 'Ollama (本地)',
        endpoint: 'http://localhost:11434',
        model: 'gemma3:1b',
        apiKey: '',
        enabled: true,
      },
      groq: {
        name: 'Groq (云端)',
        endpoint: 'https://api.groq.com/openai',
        model: 'llama-3.3-70b-versatile',
        apiKey: '',
        enabled: false,
      },
      openai: {
        name: 'OpenAI 兼容',
        endpoint: 'https://api.openai.com',
        model: 'gpt-4o-mini',
        apiKey: '',
        enabled: false,
      },
      deepseek: {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        apiKey: '',
        enabled: false,
      },
    },
    stream: true,
    temperature: 0.7,
    maxTokens: 2048,
  };

  function loadConfig() {
    const saved = DC.Storage.get(CONFIG_KEY, null);
    if (!saved) return structuredClone(DEFAULT_CFG);
    // 合并：确保新字段存在
    const merged = structuredClone(DEFAULT_CFG);
    Object.keys(merged.providers).forEach((key) => {
      if (saved.providers && saved.providers[key]) {
        merged.providers[key] = Object.assign(merged.providers[key], saved.providers[key]);
      }
    });
    merged.activeProvider = saved.activeProvider || merged.activeProvider;
    merged.stream = saved.stream ?? merged.stream;
    merged.temperature = saved.temperature ?? merged.temperature;
    merged.maxTokens = saved.maxTokens ?? merged.maxTokens;
    return merged;
  }

  let cfg = loadConfig();

  function saveConfig() {
    DC.Storage.set(CONFIG_KEY, cfg);
  }

  // ---------- 连接测试 ----------
  async function testConnection(providerKey) {
    const p = cfg.providers[providerKey];
    if (!p || !p.enabled) return { ok: false, message: '未启用' };

    const reg = getRegistryEntry(providerKey);
    if (!reg) return { ok: false, message: '未知的 Provider：' + providerKey };

    try {
      const url = p.endpoint.replace(/\/$/, '') + reg.testEndpointPath;
      const headers = reg.buildHeaders(p.apiKey);
      const method = 'GET';

      const res = await fetch(url, { method, headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // 简单校验
      if (providerKey === 'ollama' && (!data.models || data.models.length === 0)) {
        return { ok: false, message: 'Ollama 已连接但未安装任何模型，请运行 `ollama pull ' + p.model + '`' };
      }
      return { ok: true, message: providerKey + ' 已连接', data: data };
    } catch (err) {
      const result = reg.parseError(err, p);
      return result;
    }
  }

  // ---------- 实际发送消息 ----------
  async function sendMessage(prompt, options) {
    options = options || {};
    const provider = cfg.activeProvider;
    const p = cfg.providers[provider];
    if (!p || !p.enabled) throw new Error('未启用的 Provider：' + provider);
    if (!p.model) throw new Error('请先配置模型名称');

    const reg = getRegistryEntry(provider);
    if (!reg) throw new Error('未知的 Provider：' + provider);

    // 历史消息数组：[{role: 'system'|'user'|'assistant', content}]
    const messages = [];
    if (options.system) messages.push({ role: 'system', content: options.system });
    if (options.history && Array.isArray(options.history)) {
      options.history.forEach((m) => messages.push(m));
    }
    messages.push({ role: 'user', content: prompt });

    // 仅当显式请求流式或传入了 onChunk 回调时才用流
    const stream = options.stream === true || typeof options.onChunk === 'function';
    // 支持调用方覆盖 temperature / maxTokens
    const temperature = options.temperature != null ? options.temperature : (cfg.temperature ?? 0.7);
    const maxTokens = options.maxTokens != null ? options.maxTokens : (cfg.maxTokens ?? 2048);

    const buildOpts = { model: p.model, stream, temperature, maxTokens };
    const url = p.endpoint.replace(/\/$/, '') + reg.endpointPath;
    const body = reg.buildBody(messages, buildOpts);
    const headers = reg.buildHeaders(p.apiKey);

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('模型请求失败 (HTTP ' + res.status + '): ' + text.slice(0, 300));
    }

    // 流式
    if (stream) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (isFirstChunk === true) {
          // 使用 registry 提供的格式检测方法
          isFirstChunk = reg.isStreamingOllamaFormat(chunk) ? 'ollama' : 'sse';
        }

        buffer += chunk;

        if (isFirstChunk === 'ollama') {
          // Ollama: 每行一个 JSON 对象
          let idx;
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              const delta = obj.message && obj.message.content;
              if (delta) {
                fullText += delta;
                if (options.onChunk) options.onChunk(delta, fullText);
              }
            } catch (_) { /* 跳过无效行 */ }
          }
        } else {
          // SSE: data: {...}\n\n 分隔
          let sep;
          while ((sep = buffer.indexOf('\n\n')) !== -1 || (sep = buffer.indexOf('\r\n\r\n')) !== -1) {
            const block = buffer.slice(0, sep);
            const sepLen = block.includes('\r\n') ? 4 : 2;
            buffer = buffer.slice(sep + sepLen);
            const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') continue;
              try {
                const obj = JSON.parse(payload);
                const delta = obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content;
                if (delta) {
                  fullText += delta;
                  if (options.onChunk) options.onChunk(delta, fullText);
                }
              } catch (_) { /* 跳过无效 */ }
            }
          }
        }
      }
      if (options.onDone) options.onDone(fullText);
      return fullText;
    }

    // 非流式
    const data = await res.json();
    const text = reg.parseResponse(data);
    if (!text) throw new Error('模型未返回文本内容');
    if (options.onDone) options.onDone(text);
    return text;
  }

  // ---------- 状态更新 ----------
  function refreshStatus() {
    const el = document.getElementById('llmStatusText');
    const dot = document.getElementById('llmStatusDot');
    if (el) el.textContent = '检查中…';
    if (dot) dot.className = 'status-dot';

    const active = cfg.activeProvider;
    testConnection(active).then((r) => {
      if (r.ok) {
        if (el) el.textContent = '✅ ' + (cfg.providers[active].name) + ' · ' + cfg.providers[active].model;
        if (dot) dot.className = 'status-dot ok';
      } else {
        if (el) el.textContent = '⚠️ ' + r.message;
        if (dot) dot.className = 'status-dot warn';
      }
    }).catch((err) => {
      if (el) el.textContent = '❌ ' + err.message;
      if (dot) dot.className = 'status-dot error';
    });
  }

  // ---------- 设置弹窗 ----------
  function renderSettingsBody() {
    const wrapper = document.createElement('div');
    const providersHTML = Object.keys(cfg.providers).map((key) => {
      const p = cfg.providers[key];
      return `
        <div class="provider-block" data-provider="${key}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label style="display:flex;align-items:center;gap:8px;">
              <input type="radio" name="llm-active" value="${key}" ${cfg.activeProvider === key ? 'checked' : ''} />
              <strong>${p.name}</strong>
            </label>
            <label style="font-size:12px;">启用 <input type="checkbox" data-field="enabled" ${p.enabled ? 'checked' : ''} /></label>
          </div>
          <div class="form-grid" style="margin-top:8px;">
            <label class="full">API 端点：<input type="text" data-field="endpoint" value="${DC.Utils.escapeHtml(p.endpoint)}" placeholder="http://localhost:11434" /></label>
            <label>模型名称：<input type="text" data-field="model" value="${DC.Utils.escapeHtml(p.model)}" placeholder="gemma3:1b" /></label>
            <label>API Key：<input type="password" data-field="apiKey" value="${DC.Utils.escapeHtml(p.apiKey)}" placeholder="${key === 'ollama' ? '本地模型无需填写' : '输入 API Key'}" ${key === 'ollama' ? 'disabled' : ''} /></label>
            <label class="full" style="font-size:12px;color:var(--text-2);cursor:pointer;" onclick="DC.LLM.testOne('${key}')">🔌 点击测试该 Provider 的连接</label>
          </div>
        </div>`;
    }).join('');

    wrapper.innerHTML = `
      <p style="color:var(--text-2);font-size:13px;margin:0 0 12px;">配置后请点击「保存」并等待右上角状态指示变绿。</p>
      ${providersHTML}
      <div class="form-grid" style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px;">
        <label>温度 (0~1.5)：<input type="number" step="0.1" id="cfg-temperature" value="${cfg.temperature}" min="0" max="2" /></label>
        <label>最大 Tokens：<input type="number" id="cfg-maxTokens" value="${cfg.maxTokens}" min="64" max="32768" /></label>
        <label class="full" style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="cfg-stream" ${cfg.stream ? 'checked' : ''} />
          启用流式输出（逐字显示）
        </label>
      </div>
      <div id="settings-tip" style="margin-top:14px;font-size:12px;color:var(--text-2);"></div>`;

    // 绑定事件
    const blocks = wrapper.querySelectorAll('.provider-block');
    blocks.forEach((block) => {
      const key = block.dataset.provider;
      // 选择活动 provider
      const radio = block.querySelector('input[name="llm-active"]');
      radio.addEventListener('change', () => { cfg.activeProvider = key; });
      // 编辑各字段
      block.querySelectorAll('[data-field]').forEach((input) => {
        input.addEventListener('input', () => {
          const field = input.dataset.field;
          if (field === 'enabled') cfg.providers[key][field] = input.checked;
          else cfg.providers[key][field] = input.value;
        });
      });
    });
    const tempInput = wrapper.querySelector('#cfg-temperature');
    if (tempInput) tempInput.addEventListener('input', () => { cfg.temperature = parseFloat(tempInput.value) || 0.7; });
    const maxInput = wrapper.querySelector('#cfg-maxTokens');
    if (maxInput) maxInput.addEventListener('input', () => { cfg.maxTokens = parseInt(maxInput.value) || 2048; });
    const streamInput = wrapper.querySelector('#cfg-stream');
    if (streamInput) streamInput.addEventListener('change', () => { cfg.stream = streamInput.checked; });

    return wrapper;
  }

  function showSettings() {
    const body = renderSettingsBody();
    DC.modal.open({
      title: '⚙️ AI 模型设置',
      body: body,
      confirmText: '保存配置',
      onConfirm: () => {
        saveConfig();
        refreshStatus();
        DC.toast('已保存 AI 配置', 'success');
      },
    });
  }

  function testOne(key) {
    DC.toast('正在测试 ' + key + '...', 'info');
    testConnection(key).then((r) => {
      if (r.ok) DC.toast('✅ ' + r.message, 'success');
      else DC.toast('❌ ' + r.message, 'error');
    }).catch((err) => DC.toast('❌ ' + err.message, 'error'));
  }

  // ---------- 对外接口 ----------
  DC.LLM = {
    get config() { return cfg; },
    getConfig() { return cfg; },
    refreshStatus,
    showSettings,
    testOne,
    isReady() {
      const provider = cfg.providers[cfg.activeProvider];
      return !!(provider && provider.enabled && provider.endpoint && provider.model);
    },
    sendMessage(prompt, options) { return sendMessage(prompt, options || {}); },
    generate(prompt, options) { return sendMessage(prompt, options || {}); },
    generateStream(prompt, onChunk, options) {
      const opt = options || {};
      opt.onChunk = onChunk;
      opt.stream = true;
      return sendMessage(prompt, opt);
    },
    getCurrentProviderName() {
      return cfg.providers[cfg.activeProvider] ? cfg.providers[cfg.activeProvider].name : cfg.activeProvider;
    },
    getCurrentModel() {
      const p = cfg.providers[cfg.activeProvider];
      return p ? p.model : '';
    },
  };
})();
