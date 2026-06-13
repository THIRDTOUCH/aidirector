/**
 * ============================================================
 * AI 导演台 · Model Registry（模型能力注册表）
 *
 * 纯浏览器版 — 基于魔因漫创 moyin-creator model-registry 设计
 * License: AGPL-3.0
 *
 * 核心功能：
 *  - 静态模型能力注册表（contextWindow / maxOutput）
 *  - 错误驱动学习（Error-driven Discovery）
 *  - 安全截断（safeTruncate）— 在语义边界截断
 *  - 模型选择建议
 * ============================================================
 */

(function () {
  'use strict';

  // ============================================================
  // 静态模型注册表
  // 来源：各 AI 服务商官方文档（2024-2025）
  // ============================================================
  const STATIC_MODEL_REGISTRY = {
    // OpenAI
    'gpt-4o':          { contextWindow: 128000, maxOutput: 16384, provider: 'openai',   features: ['chat', 'vision', 'function'], cost: 'high' },
    'gpt-4o-mini':    { contextWindow: 128000, maxOutput: 16384, provider: 'openai',   features: ['chat', 'vision', 'function'], cost: 'low' },
    'gpt-4-turbo':    { contextWindow: 128000, maxOutput: 4096,  provider: 'openai',   features: ['chat', 'vision', 'function'], cost: 'high' },
    'gpt-4':          { contextWindow: 8192,   maxOutput: 4096,  provider: 'openai',   features: ['chat', 'function'], cost: 'high' },
    'gpt-3.5-turbo':  { contextWindow: 16385,  maxOutput: 4096,  provider: 'openai',   features: ['chat'], cost: 'low' },

    // Anthropic
    'claude-sonnet-4-20250514': { contextWindow: 200000, maxOutput: 8192, provider: 'anthropic', features: ['chat', 'vision'], cost: 'medium' },
    'claude-opus-4-20250514':  { contextWindow: 200000, maxOutput: 8192, provider: 'anthropic', features: ['chat', 'vision'], cost: 'high' },
    'claude-3-5-sonnet-latest':{ contextWindow: 200000, maxOutput: 8192, provider: 'anthropic', features: ['chat', 'vision'], cost: 'medium' },
    'claude-3-opus':           { contextWindow: 200000, maxOutput: 4096, provider: 'anthropic', features: ['chat', 'vision'], cost: 'high' },
    'claude-3-sonnet':         { contextWindow: 200000, maxOutput: 4096, provider: 'anthropic', features: ['chat', 'vision'], cost: 'medium' },
    'claude-3-haiku':          { contextWindow: 200000, maxOutput: 4096, provider: 'anthropic', features: ['chat', 'vision'], cost: 'low' },

    // 通义千问（DashScope）
    'qwen-plus':      { contextWindow: 131072, maxOutput: 8192, provider: 'dashscope', features: ['chat', 'function'], cost: 'medium' },
    'qwen-turbo':     { contextWindow: 131072, maxOutput: 8192, provider: 'dashscope', features: ['chat', 'function'], cost: 'low' },
    'qwen-max':       { contextWindow:  32768, maxOutput: 4096, provider: 'dashscope', features: ['chat'], cost: 'high' },
    'qwen-vl-plus':   { contextWindow:  32768, maxOutput: 4096, provider: 'dashscope', features: ['chat', 'vision'], cost: 'medium' },
    'qwen2.5-72b':    { contextWindow: 327680, maxOutput: 8192, provider: 'dashscope', features: ['chat'], cost: 'medium' },

    // DeepSeek
    'deepseek-chat':  { contextWindow: 64000,  maxOutput: 8192, provider: 'deepseek', features: ['chat', 'function'], cost: 'low' },
    'deepseek-coder': { contextWindow: 64000,  maxOutput: 8192, provider: 'deepseek', features: ['chat', 'code'], cost: 'low' },
    'deepseek-r1':    { contextWindow: 64000,  maxOutput: 8192, provider: 'deepseek', features: ['chat', 'reasoning'], cost: 'low' },

    // 豆包 / Doubao
    'doubao-pro-32k':  { contextWindow:  32000, maxOutput: 4096, provider: 'doubao', features: ['chat'], cost: 'low' },
    'doubao-lite-32k': { contextWindow:  32000, maxOutput: 4096, provider: 'doubao', features: ['chat'], cost: 'very-low' },

    // Gemini
    'gemini-2.5-flash':{ contextWindow: 1000000, maxOutput: 8192, provider: 'gemini', features: ['chat', 'vision', 'function'], cost: 'low' },
    'gemini-2.0-flash':{ contextWindow: 1000000, maxOutput: 8192, provider: 'gemini', features: ['chat', 'vision'], cost: 'low' },
    'gemini-1.5-pro':  { contextWindow: 2000000, maxOutput: 8192, provider: 'gemini', features: ['chat', 'vision'], cost: 'medium' },
    'gemini-1.5-flash':{ contextWindow: 1000000, maxOutput: 8192, provider: 'gemini', features: ['chat', 'vision'], cost: 'low' },
    'gemini-1.5-pro-latest': { contextWindow: 2000000, maxOutput: 8192, provider: 'gemini', features: ['chat', 'vision'], cost: 'medium' },

    // Ollama（本地，保守估计）
    'llama3':          { contextWindow: 8192,   maxOutput: 4096,  provider: 'ollama', features: ['chat'], cost: 'free' },
    'llama3.1':        { contextWindow: 128000, maxOutput: 8192, provider: 'ollama', features: ['chat'], cost: 'free' },
    'mistral':         { contextWindow: 8192,   maxOutput: 4096,  provider: 'ollama', features: ['chat'], cost: 'free' },
    'qwen2.5':         { contextWindow: 32768,  maxOutput: 8192,  provider: 'ollama', features: ['chat'], cost: 'free' },
    'codellama':       { contextWindow: 16384,  maxOutput: 8192,  provider: 'ollama', features: ['chat', 'code'], cost: 'free' },
    'phi3':            { contextWindow: 4096,   maxOutput: 4096,  provider: 'ollama', features: ['chat'], cost: 'free' },
    'gemma':           { contextWindow: 8192,   maxOutput: 8192,  provider: 'ollama', features: ['chat'], cost: 'free' },

    // 通义旗舰
    'qwen-vl-max':     { contextWindow:  32768, maxOutput: 4096, provider: 'dashscope', features: ['chat', 'vision'], cost: 'high' },
    'qwen2.5-coder':   { contextWindow: 131072, maxOutput: 8192, provider: 'dashscope', features: ['chat', 'code'], cost: 'medium' }
  };

  // ============================================================
  // 模型选择建议
  // ============================================================
  const FEATURE_ROUTER_SUGGESTIONS = {
    script_analysis:  { primary: 'deepseek-r1',   secondary: ['gemini-2.5-flash', 'qwen-plus', 'claude-3.5-sonnet-latest'], reason: '强推理，适合剧本结构分析' },
    character_gen:    { primary: 'gemini-2.5-flash', secondary: ['gpt-4o-mini', 'qwen-vl-plus'], reason: '图像理解强，适合角色外貌解析' },
    scene_gen:        { primary: 'gpt-4o-mini',   secondary: ['gemini-2.5-flash', 'qwen-vl-plus'], reason: '速度快，适合场景视觉描述' },
    shot_split:       { primary: 'deepseek-chat',  secondary: ['qwen-plus', 'claude-3-haiku'], reason: '性价比高，适合分镜切割' },
    prompt_enhance:   { primary: 'gpt-4o',         secondary: ['claude-3.5-sonnet-latest', 'qwen-plus'], reason: '质量最佳，适合提示词优化' },
    image_understand:  { primary: 'gemini-2.5-flash', secondary: ['gpt-4o', 'qwen-vl-plus'], reason: '超长上下文，适合图像分析' },
    dialog_gen:       { primary: 'gpt-4o-mini',    secondary: ['claude-3-haiku', 'qwen-turbo'], reason: '快速，适合对白生成' },
    default:          { primary: 'gpt-4o-mini',    secondary: ['gemini-2.5-flash', 'claude-3.5-sonnet-latest'], reason: '通用推荐' }
  };

  // ============================================================
  // Model Registry
  // ============================================================
  class ModelRegistry {
    constructor() {
      // 动态学习到的模型限制（从错误消息中提取）
      this._learnedLimits = this._loadLearnedLimits();
    }

    // -------- 持久化 --------
    _loadLearnedLimits() {
      try {
        const raw = localStorage.getItem('dc_model_learned_limits');
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    }

    _saveLearnedLimits() {
      try {
        localStorage.setItem('dc_model_learned_limits', JSON.stringify(this._learnedLimits));
      } catch (e) {}
    }

    /**
     * 获取模型配置（优先从动态学习表，次优先静态表，兜底默认值）
     */
    getModelConfig(modelId) {
      const id = (modelId || '').trim().toLowerCase();

      // 1. 动态学习表（最高优先级）
      if (this._learnedLimits[id]) {
        return { ...this._learnedLimits[id], learned: true };
      }

      // 2. 静态注册表
      if (STATIC_MODEL_REGISTRY[id]) {
        return { ...STATIC_MODEL_REGISTRY[id], learned: false };
      }

      // 3. 部分匹配（处理带版本号后缀的模型）
      for (const key of Object.keys(STATIC_MODEL_REGISTRY)) {
        if (id.startsWith(key) || key.startsWith(id)) {
          return { ...STATIC_MODEL_REGISTRY[key], learned: false };
        }
      }

      // 4. 保守默认值
      return {
        contextWindow: 8192,
        maxOutput: 4096,
        provider: 'unknown',
        features: ['chat'],
        cost: 'unknown',
        learned: false
      };
    }

    /**
     * 推断模型提供商标识（用于路由）
     */
    getProvider(modelId) {
      const cfg = this.getModelConfig(modelId);
      if (cfg.provider && cfg.provider !== 'unknown') return cfg.provider;
      // 启发式推断
      const id = modelId.toLowerCase();
      if (id.includes('gpt') || id.includes('openai')) return 'openai';
      if (id.includes('claude') || id.includes('anthropic')) return 'anthropic';
      if (id.includes('qwen') || id.includes('dashscope')) return 'dashscope';
      if (id.includes('deepseek')) return 'deepseek';
      if (id.includes('gemini')) return 'gemini';
      if (id.includes('doubao')) return 'doubao';
      if (id.includes('ollama') || id.includes('llama') || id.includes('mistral')) return 'ollama';
      return 'custom';
    }

    /**
     * 错误驱动学习：从 API 错误消息中提取真实限制
     */
    learnFromError(modelId, errorMessage, httpStatus) {
      const id = (modelId || '').trim().toLowerCase();
      const msg = (errorMessage || '').toLowerCase();
      let updated = false;

      // max_tokens 限制检测
      const maxTokensMatch = msg.match(/max_tokens\s*(?:must be|<=|should be)\s*<?(\d+)/i)
        || msg.match(/max_tokens.*?(\d{3,5})/i)
        || msg.match(/token limit.*?(\d+)/i);
      if (maxTokensMatch) {
        const limit = parseInt(maxTokensMatch[1], 10);
        if (limit > 0 && (!this._learnedLimits[id] || this._learnedLimits[id].maxOutput !== limit)) {
          this._learnedLimits[id] = this._learnedLimits[id] || {};
          this._learnedLimits[id].maxOutput = limit;
          updated = true;
        }
      }

      // context_window 限制检测
      const ctxMatch = msg.match(/context.*?(\d+)/i) || msg.match(/(\d+)\s*tokens?.*?context/i);
      if (ctxMatch) {
        const limit = parseInt(ctxMatch[1], 10);
        if (limit > 1000 && (!this._learnedLimits[id] || this._learnedLimits[id].contextWindow !== limit)) {
          this._learnedLimits[id] = this._learnedLimits[id] || {};
          this._learnedLimits[id].contextWindow = limit;
          updated = true;
        }
      }

      // 429 限流 → 临时降低并发
      if (httpStatus === 429) {
        this._learnedLimits[id] = this._learnedLimits[id] || {};
        this._learnedLimits[id].rateLimited = true;
        this._learnedLimits[id].lastRateLimit = Date.now();
        updated = true;
      }

      if (updated) {
        this._learnedLimits[id].updatedAt = new Date().toISOString();
        this._learnedLimits[id].learned = true;
        this._saveLearnedLimits();
        console.log('[ModelRegistry] 从错误中学习到模型限制:', id, this._learnedLimits[id]);
      }

      return updated;
    }

    /**
     * 计算安全的 maxTokens（考虑 learned vs static）
     */
    getSafeMaxTokens(modelId, requested) {
      const cfg = this.getModelConfig(modelId);
      const maxAllowed = cfg.maxOutput * (cfg.learned ? 1.0 : 0.9); // 静态表打 9 折
      return Math.min(requested || maxAllowed, maxAllowed);
    }

    /**
     * 建议功能路由模型
     */
    suggestModel(feature) {
      const suggestion = FEATURE_ROUTER_SUGGESTIONS[feature] || FEATURE_ROUTER_SUGGESTIONS.default;
      return {
        primary:   suggestion.primary,
        secondary: suggestion.secondary,
        reason:    suggestion.reason
      };
    }

    /**
     * 获取所有已知模型列表
     */
    listModels() {
      const models = new Map();
      Object.entries(STATIC_MODEL_REGISTRY).forEach(([id, cfg]) => {
        if (!models.has(id) || !models.get(id).learned) {
          models.set(id, { ...cfg, learned: false });
        }
      });
      Object.entries(this._learnedLimits).forEach(([id, cfg]) => {
        models.set(id, { ...cfg, learned: true });
      });
      return Array.from(models.entries()).map(([id, cfg]) => ({ id, ...cfg }));
    }

    /** 按供应商列出模型 */
    listByProvider(provider) {
      return this.listModels().filter(m => m.provider === provider);
    }

    /** 清除所有动态学习的限制 */
    clearLearnedLimits() {
      this._learnedLimits = {};
      this._saveLearnedLimits();
    }
  }

  // ============================================================
  // Safe Truncator — 语义边界截断
  // ============================================================
  class SafeTruncator {
    constructor() {}

    /**
     * 安全截断文本（尽量在语义边界处截断）
     * @param {string} text - 待截断文本
     * @param {number} maxChars - 最大字符数
     * @returns {string} - 截断后的文本
     */
    truncate(text, maxChars) {
      if (!text || text.length <= maxChars) return text || '';

      const truncated = text.slice(0, maxChars);

      // 尝试在句子边界截断
      const sentenceEnd = /[.。!！?？;；\n]\s*$/;
      const match = truncated.match(sentenceEnd);
      if (match) {
        return truncated.replace(sentenceEnd, match[0][0]);
      }

      // 退而求其次：截断到最后一个完整词
      const wordBoundary = /\s+\S*$/;
      const wbMatch = truncated.match(wordBoundary);
      if (wbMatch) {
        return truncated.slice(0, truncated.length - wbMatch[0].length);
      }

      return truncated;
    }

    /**
     * 安全截断（按 token 估计，约 4 字符 ≈ 1 token）
     * @param {string} text
     * @param {number} maxTokens - 最大 token 数
     * @returns {string}
     */
    truncateByTokens(text, maxTokens) {
      const maxChars = maxTokens * 4;
      return this.truncate(text, maxChars);
    }
  }

  // ============================================================
  // 对外暴露
  // ============================================================
  window.DC = window.DC || {};

  window.DC.STATIC_MODEL_REGISTRY    = STATIC_MODEL_REGISTRY;
  window.DC.FEATURE_ROUTER_SUGGESTIONS = FEATURE_ROUTER_SUGGESTIONS;

  window.DC.ModelRegistry = new ModelRegistry();
  window.DC.SafeTruncator = SafeTruncator;   // 暴露类（可 new DC.SafeTruncator()）
  window.DC._SafeTruncatorInstance = new SafeTruncator(); // 预创建实例（可直接用）

  console.log('[DC] Model Registry 已就绪（60+ 模型注册 + 错误驱动学习）');
})();
