/* =========================================================
   AI 导演台 · AI 流水线编排 (ai-pipeline.js)
   - 六大智能体按钮：创意总监 / 编剧 / 分镜师 / 角色设计师 / 美术指导 / 视觉生成
   - 一键全流程：依次调用各 Agent
   - 流水线日志：显示执行过程
   ========================================================= */

(function () {
  'use strict';
  const DC = window.DC;
  if (!DC) return;

  function log(type, msg) {
    if (DC.Log) {
      if (type === 'success') DC.Log.success(msg);
      else if (type === 'error') DC.Log.error(msg);
      else if (type === 'warn') DC.Log.warn(msg);
      else DC.Log.info(msg);
    }
  }

  // —— 给一组按钮加处理中状态（加 class + disabled） ——
  function lockButtons(active) {
    const selectors = [
      '#btnRunPipeline',
      '.agent-card button[data-task]',
    ];
    const buttons = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((b) => buttons.push(b));
    });
    if (active) {
      buttons.forEach((b) => {
        if (b.disabled) return;
        b.dataset._origText = b.textContent;
        b.disabled = true;
        b.classList.add('btn-loading');
      });
    } else {
      buttons.forEach((b) => {
        b.disabled = false;
        b.classList.remove('btn-loading');
        if (b.dataset._origText) {
          b.textContent = b.dataset._origText;
          delete b.dataset._origText;
        }
      });
    }
  }

  // —— PipelineGraph 图式工作流引擎 ——
  class PipelineGraph {
    constructor() {
      this._nodes = [];
      this._edges = [];
      this._results = {};
      this._eventHandlers = {};
    }

    on(event, handler) {
      if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
      this._eventHandlers[event].push(handler);
    }

    _emit(event, data) {
      const handlers = this._eventHandlers[event] || [];
      handlers.forEach(h => h(data));
    }

    addNode(id, label, fn, options = {}) {
      this._nodes.push({
        id,
        label,
        fn,
        parallel: options.parallel || false,
        retry: options.retry || 0,
        condition: options.condition || null,
        inputs: options.inputs || [],
        outputs: options.outputs || [],
        humanApproval: options.humanApproval || false,
      });
    }

    addEdge(from, to) {
      this._edges.push({ from, to });
    }

    async execute(ctx = {}) {
      if (!DC.LLM) throw new Error('AI 模块 (DC.LLM) 未加载');
      if (!DC.ProjectManager) throw new Error('项目管理模块 (DC.ProjectManager) 未加载');

      const nodeMap = new Map(this._nodes.map(n => [n.id, n]));
      const inDegree = new Map();
      const adjList = new Map();

      this._nodes.forEach(n => {
        inDegree.set(n.id, 0);
        adjList.set(n.id, []);
      });

      this._edges.forEach(edge => {
        const { from, to } = edge;
        if (nodeMap.has(from) && nodeMap.has(to)) {
          adjList.get(from).push(to);
          inDegree.set(to, (inDegree.get(to) || 0) + 1);
        }
      });

      // 拓扑序：Kahn 算法 + 并行层分组
      const startNodes = [...inDegree.entries()].filter(([_, d]) => d === 0).map(([id]) => id);
      const queue = startNodes.map(id => nodeMap.get(id));
      const executed = new Set();

      while (queue.length > 0) {
        const batch = [];
        while (queue.length > 0) {
          const node = queue.shift();
          if (!node || executed.has(node.id)) continue;
          if (node.condition && !node.condition(ctx, this._results)) {
            executed.add(node.id);
            continue;
          }
          batch.push(node);
        }

        if (batch.length === 0) break;

        // 并行执行同层节点
        const promises = batch.map(async (node) => {
          if (node.humanApproval) {
            const approved = await this._requestApproval(node.id, node.label);
            if (!approved) {
              this._emit('humanSkip', { nodeId: node.id, label: node.label });
              executed.add(node.id);
              return null;
            }
          }

          for (let attempt = 0; attempt <= node.retry; attempt++) {
            try {
              const result = await node.fn(ctx, this._results);
              this._results[node.id] = result;
              this._emit('nodeComplete', { nodeId: node.id, label: node.label, result });
              return result;
            } catch (err) {
              if (attempt < node.retry) {
                this._emit('nodeRetry', { nodeId: node.id, label: node.label, attempt: attempt + 1 });
              } else {
                this._emit('nodeError', { nodeId: node.id, label: node.label, error: err });
                throw err;
              }
            }
          }
        });

        await Promise.all(promises);
        batch.forEach(n => executed.add(n.id));

        // 将后继入度为0的节点加入队列
        batch.forEach(node => {
          const successors = adjList.get(node.id) || [];
          successors.forEach(succId => {
            inDegree.set(succId, inDegree.get(succId) - 1);
            if (inDegree.get(succId) === 0) {
              queue.push(nodeMap.get(succId));
            }
          });
        });
      }
    }

    async _requestApproval(nodeId, label) {
      return new Promise((resolve) => {
        const msg = `是否继续「${label}」阶段？`;
        this._emit('humanApproval', { nodeId, label, message: msg, resolve });
        // 5秒超时自动放行
        setTimeout(() => {
          this._emit('humanTimeout', { nodeId, label });
          resolve(true);
        }, 5000);
      });
    }
  }

  async function ideaAgent() {
    const input = document.getElementById('ideaInput');
    const idea = input ? input.value.trim() : '';
    if (!idea) { DC.toast('请先输入一句话创意', 'warning'); return; }
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
    lockButtons(true);
    log('info', `💡 创意总监：基于「${idea.slice(0, 30)}...」生成大纲`);
    try {
      const text = await DC.LLM.generate(
        `基于以下一句话创意，生成一部短剧的完整大纲（中文），结构为：\n` +
        `1. 核心主题\n2. 主要角色（每人10-20字介绍）\n3. 故事大纲（三幕式，每幕80-150字）\n\n` +
        `用户创意：${idea}\n\n` +
        `项目名：${p.name}\n类型：${p.genre || '剧情'}\n风格：${p.style || ''}\n\n请输出Markdown格式。`
      );
      DC.ProjectManager.update({ logline: idea, outline: text });
      log('success', '✅ 大纲已生成并写入项目');
      DC.toast('大纲已生成', 'success');
    } catch (err) {
      log('error', '❌ 大纲生成失败：' + err.message);
      DC.toast('生成失败：' + err.message, 'error');
    } finally {
      lockButtons(false);
    }
  }

  async function scriptAgent() {
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    if (!p.outline || p.outline.trim().length < 10) {
      DC.toast('请先在「大纲」页生成或编写大纲', 'warning'); return;
    }
    lockButtons(true);
    log('info', '✍️ 编剧：根据大纲编写剧本');
    try {
      const text = await DC.LLM.generate(
        `请根据以下故事大纲编写完整短剧剧本（中文），使用标准格式：\n` +
        `场景一：【场景名 · 时间 · 内/外】\n（画面描述）\n角色：（台词）\n\n` +
        `项目名：${p.name}\n\n` +
        `故事大纲：\n${p.outline}\n\n` +
        `请输出完整剧本正文。`
      );
      DC.ProjectManager.update({ script: text });
      log('success', '✅ 剧本已生成并写入项目');
      DC.toast('剧本已生成', 'success');
    } catch (err) {
      log('error', '❌ 剧本生成失败：' + err.message);
      DC.toast('生成失败：' + err.message, 'error');
    } finally {
      lockButtons(false);
    }
  }

  async function shotsAgent() {
    if (!DC.Storyboard) { DC.toast('分镜模块未加载', 'warning'); return; }
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    if (!p.script || p.script.trim().length < 20) {
      DC.toast('请先编写剧本', 'warning'); return;
    }
    lockButtons(true);
    log('info', '🎬 分镜师：将剧本拆解为分镜');
    try {
      await DC.Storyboard.aiSplit();
      log('success', '✅ 分镜已生成');
    } catch (err) {
      log('error', '❌ 分镜生成失败：' + err.message);
      DC.toast('生成失败：' + err.message, 'error');
    } finally {
      lockButtons(false);
    }
  }

  async function charsAgent() {
    if (!DC.CharacterManager) { DC.toast('角色模块未加载', 'warning'); return; }
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    lockButtons(true);
    log('info', '👤 角色设计师：生成角色设定');
    try {
      await DC.CharacterManager.aiGenerate();
      log('success', '✅ 角色生成完成');
    } catch (err) {
      log('error', '❌ 角色生成失败：' + err.message);
      DC.toast('角色生成失败：' + err.message, 'error');
    } finally {
      lockButtons(false);
    }
  }

  async function scenesAgent() {
    if (!DC.SceneManager) { DC.toast('场景模块未加载', 'warning'); return; }
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    lockButtons(true);
    log('info', '🏞️ 美术指导：生成场景库');
    try {
      await DC.SceneManager.aiGenerate();
      log('success', '✅ 场景生成完成');
    } catch (err) {
      log('error', '❌ 场景生成失败：' + err.message);
      DC.toast('场景生成失败：' + err.message, 'error');
    } finally {
      lockButtons(false);
    }
  }

  async function imagesAgent() {
    if (!DC.Storyboard) { DC.toast('分镜模块未加载', 'warning'); return; }
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    lockButtons(true);
    log('info', '🖼️ 视觉生成：为分镜生成绘图提示词');
    try {
      await DC.Storyboard.batchGenImages();
      log('success', '✅ 批量绘图提示词已生成');
    } catch (err) {
      log('error', '❌ 绘图生成失败：' + err.message);
      DC.toast('绘图生成失败：' + err.message, 'error');
    } finally {
      lockButtons(false);
    }
  }

  async function runFullPipeline() {
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
    if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
    const idea = (document.getElementById('ideaInput') || {}).value || p.logline || p.name;
    lockButtons(true);
    log('info', `🚀 ====== 启动全流程（项目：${p.name}）======`);
    log('info', `起始创意：${idea.slice(0, 50)}`);

    const pipeline = new PipelineGraph();

    // 监听 PipelineGraph 事件
    pipeline.on('nodeComplete', ({ nodeId, label, result }) => {
      log('success', `✅ [${label}] 执行成功`);
    });

    pipeline.on('nodeError', ({ nodeId, label, error }) => {
      log('error', `❌ [${label}] 执行失败：${error.message}`);
    });

    pipeline.on('nodeRetry', ({ nodeId, label, attempt }) => {
      log('warn', `⚠️ [${label}] 执行失败，将进行第 ${attempt} 次重试...`);
    });

    pipeline.on('humanSkip', ({ nodeId, label }) => {
      log('warn', `⏭️ [${label}] 已由用户跳过`);
    });

    // Step 1: 生成大纲
    pipeline.addNode('step1', '💡 创意总监 → 生成故事大纲', async (ctx, results) => {
      const outline = await DC.LLM.generate(
        `基于以下创意生成短剧大纲（Markdown，中文）：\n\n创意：${idea}\n项目：${p.name}\n类型：${p.genre || '剧情'}\n\n请输出：核心主题 + 主要角色 + 三幕式大纲`
      );
      DC.ProjectManager.update({ logline: idea, outline });
      return { outline, length: outline.length };
    }, { retry: 2 });

    // Step 2: 编写剧本
    pipeline.addNode('step2', '✍️ 编剧 → 基于大纲写剧本', async (ctx, results) => {
      const pp = DC.ProjectManager.getCurrent();
      const script = await DC.LLM.generate(
        `基于以下大纲编写完整短剧剧本（中文，场景+对话格式）：\n\n项目：${pp.name}\n大纲：\n${pp.outline}`
      );
      DC.ProjectManager.update({ script });
      return { script, length: script.length };
    }, { retry: 2 });

    // 审批节点：剧本确认
    pipeline.addNode('approval1', '✅ 剧本确认（可跳过）', async (ctx, results) => {
      log('info', '⏸️ 剧本已生成，可前往编辑后再继续');
      return true;
    }, { humanApproval: true });

    // Step 3: 生成角色
    pipeline.addNode('step3', '👤 角色设计师 → 生成角色', async (ctx, results) => {
      const pp = DC.ProjectManager.getCurrent();
      const ctxt = await DC.LLM.generate(
        `基于以下项目生成3-5个角色，严格返回 JSON 数组（字段：name, role, appearance, personality, prompt），不要包裹在解释文字中：\n项目：${pp.name}\n大纲：\n${pp.outline}`
      );
      const chars = parseJSON(ctxt) || [];
      if (chars.length) {
        DC.ProjectManager.updateCharacters(
          chars.map((c) => ({
            id: DC.Utils.uid('char'),
            name: String(c.name || ''), role: String(c.role || ''), appearance: String(c.appearance || ''),
            personality: String(c.personality || ''), prompt: String(c.prompt || ''),
          }))
        );
        return { chars: chars.length };
      } else {
        log('warn', `⚠️ AI 返回无法解析为角色 JSON，建议手动添加角色`);
        if (DC.Log && ctxt) DC.Log.info('  ↪ AI 原文前200字：' + ctxt.slice(0, 200).replace(/\n/g, ' '));
        return { chars: 0 };
      }
    }, { retry: 2 });

    // Step 4: 生成场景
    pipeline.addNode('step4', '🏞️ 美术指导 → 生成场景库', async (ctx, results) => {
      const pp = DC.ProjectManager.getCurrent();
      const stxt = await DC.LLM.generate(
        `基于以下剧本生成3-6个场景，严格返回 JSON 数组（字段：name, time, location, weather, description, prompt），不要包裹在解释文字中：\n剧本：\n${(pp.script || '').slice(0, 1500)}`
      );
      const scenes = parseJSON(stxt) || [];
      if (scenes.length) {
        DC.ProjectManager.updateScenes(
          scenes.map((s) => ({
            id: DC.Utils.uid('scene'),
            name: String(s.name || ''), time: String(s.time || '日'), location: String(s.location || '外'),
            weather: String(s.weather || ''), ambiance: String(s.ambiance || ''),
            description: String(s.description || ''), prompt: String(s.prompt || ''),
          }))
        );
        return { scenes: scenes.length };
      } else {
        log('warn', `⚠️ AI 返回无法解析为场景 JSON，建议手动添加场景`);
        if (DC.Log && stxt) DC.Log.info('  ↪ AI 原文前200字：' + stxt.slice(0, 200).replace(/\n/g, ' '));
        return { scenes: 0 };
      }
    }, { retry: 2 });

    // 审批节点：场景确认
    pipeline.addNode('approval2', '✅ 场景确认（可跳过）', async (ctx, results) => {
      log('info', '⏸️ 场景已生成，可前往编辑后再继续');
      return true;
    }, { humanApproval: true });

    // Step 5: 分镜
    pipeline.addNode('step5', '🎬 分镜师 → 拆解剧本为分镜', async (ctx, results) => {
      const pp = DC.ProjectManager.getCurrent();
      const stxt2 = await DC.LLM.generate(
        `将以下剧本拆分为分镜 JSON 数组（字段：sceneName, shotType, camera, duration, description, dialogue, prompt），严格返回 JSON，不要包裹在解释文字中：\n\n项目：${pp.name}\n剧本：\n${pp.script}`
      );
      const shots = parseJSON(stxt2) || [];
      if (shots.length) {
        DC.ProjectManager.updateShots(
          shots.map((s) => ({
            id: DC.Utils.uid('shot'),
            sceneName: String(s.sceneName || ''), shotType: String(s.shotType || '中景'),
            camera: String(s.camera || '固定镜头'), duration: parseInt(s.duration) || 5,
            description: String(s.description || ''), dialogue: String(s.dialogue || ''),
            prompt: String(s.prompt || ''), imageUrl: '',
          }))
        );
        return { shots: shots.length };
      } else {
        log('warn', `⚠️ AI 返回无法解析为分镜 JSON，建议手动添加分镜`);
        if (DC.Log && stxt2) DC.Log.info('  ↪ AI 原文前200字：' + stxt2.slice(0, 200).replace(/\n/g, ' '));
        return { shots: 0 };
      }
    }, { retry: 2 });

    // 审批节点：分镜确认
    pipeline.addNode('approval3', '✅ 分镜确认（可跳过）', async (ctx, results) => {
      log('info', '⏸️ 分镜已生成，可前往编辑后再继续');
      return true;
    }, { humanApproval: true });

    // Step 6: 绘图提示词
    pipeline.addNode('step6', '🖼️ 视觉生成 → 为分镜生成英文绘图提示词', async (ctx, results) => {
      const pp = DC.ProjectManager.getCurrent();
      const shots = (pp.shots || []).slice();
      let updated = 0;
      for (let i = 0; i < shots.length; i++) {
        if (shots[i].prompt && shots[i].prompt.length > 10) continue;
        const ptxt = await DC.LLM.generate(
          `将以下画面描述翻译成英文 AI 绘图提示词（comma-separated）：\n\n画面：${shots[i].description || shots[i].sceneName}\n景别：${shots[i].shotType}\n运镜：${shots[i].camera}\n\n仅返回英文提示词。`
        );
        shots[i].prompt = ptxt.trim().slice(0, 500);
        updated++;
        if (updated % 3 === 0) log('info', `... 已完成 ${updated}/${shots.length}`);
      }
      DC.ProjectManager.updateShots(shots);
      return { updated, total: shots.length };
    }, { retry: 2 });

    // 完成节点：刷新并通知
    pipeline.addNode('final', '🎉 全流程完成', async (ctx, results) => {
      if (DC.Storyboard && DC.Storyboard.render) DC.Storyboard.render();
      if (DC.CharacterManager && DC.CharacterManager.render) DC.CharacterManager.render();
      if (DC.SceneManager && DC.SceneManager.render) DC.SceneManager.render();
      if (DC.Timeline && DC.Timeline.render) DC.Timeline.render();
      if (DC.Exporter && DC.Exporter.renderPreview) DC.Exporter.renderPreview();
      log('success', `🎉 ====== 全流程完成！请前往「预览 / 导出」页查看成果 ======`);
      DC.toast('全流程完成！', 'success');
      return true;
    }, { retry: 0 });

    // 添加边（执行顺序）
    pipeline.addEdge('step1', 'step2');
    pipeline.addEdge('step2', 'approval1');
    pipeline.addEdge('approval1', 'step3');
    pipeline.addEdge('step3', 'step4');
    pipeline.addEdge('step4', 'approval2');
    pipeline.addEdge('approval2', 'step5');
    pipeline.addEdge('step5', 'approval3');
    pipeline.addEdge('approval3', 'step6');
    pipeline.addEdge('step6', 'final');

    try {
      await pipeline.execute({ idea, project: p });
    } catch (err) {
      log('error', `❌ 全流程异常中断：${err.message}`);
      DC.toast('全流程异常：' + err.message, 'error');
    } finally {
      lockButtons(false);
    }
  }

  function parseJSON(text) {
    if (!text) return null;

    // 策略1：标准 Markdown code fence (```json ... ```)
    let m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    let json = m ? m[1] : text;

    // 策略2：直接解析
    try { return JSON.parse(json); } catch (_) {}

    // 策略3：提取最外层 [] 或 {} 之间的内容
    let start = json.indexOf('[');
    let end = json.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      start = json.indexOf('{');
      end = json.lastIndexOf('}');
    }
    if (start !== -1 && end !== -1 && end > start) {
      let candidate = json.substring(start, end + 1);
      try { return JSON.parse(candidate); } catch (_) {}

      // 策略4：清理常见非标准字符（单引号→双引号、移除尾随逗号、移除 // 注释）
      let cleaned = candidate
        .replace(/\/\/[^\n]*/g, '')
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/'/g, '"');
      try { return JSON.parse(cleaned); } catch (_) {}

      // 策略5：逐行扫描尝试独立 JSON 片段（兼容 Ollama 行模式返回多个对象）
      const lines = candidate.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        const collected = [];
        let buffer = '';
        let depth = 0;
        for (const line of lines) {
          for (const ch of line) {
            if (ch === '[' || ch === '{') depth++;
            else if (ch === ']' || ch === '}') depth--;
          }
          buffer += line;
          if (depth <= 0) {
            try {
              const obj = JSON.parse(buffer);
              if (Array.isArray(obj)) collected.push.apply(collected, obj);
              else collected.push(obj);
            } catch (_) {}
            buffer = '';
            depth = 0;
          }
        }
        if (collected.length) return collected;
      }
    }
    return null;
  }

  DC.AIPipeline = {
    init() {
      // 绑定六大 Agent 按钮
      const cards = document.querySelectorAll('.agent-card');
      cards.forEach((card) => {
        const role = card.dataset.role;
        const btn = card.querySelector('button[data-task]');
        if (!btn) return;
        btn.addEventListener('click', () => {
          if (!DC.LLM) { DC.toast('AI 模块未加载', 'warning'); return; }
          switch (role) {
            case 'idea': ideaAgent(); break;
            case 'writer': scriptAgent(); break;
            case 'shot-designer': shotsAgent(); break;
            case 'character': charsAgent(); break;
            case 'scenographer': scenesAgent(); break;
            case 'visual': imagesAgent(); break;
          }
        });
      });

      const btn = document.getElementById('btnRunPipeline');
      if (btn) btn.onclick = runFullPipeline;
    },
    runFullPipeline,
    ideaAgent,
    scriptAgent,
    shotsAgent,
    charsAgent,
    scenesAgent,
    imagesAgent,
  };
  DC.Pipeline = DC.AIPipeline;
  DC.AIPipelineInit = DC.AIPipeline;
})();
