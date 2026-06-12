/* =========================================================
   AI 导演台 · 剧本解析 (script-parser.js)
   - 把自由文本剧本 -> 结构化 shots 数组
   - 支持的写法：场景标题 / 角色名: 对白 / [动作] / (表情)
   - 支持用 AI 自动补充分镜：景别 / 机位 / 运镜 / 时长
   ========================================================= */

(function () {
  'use strict';

  const DC = window.DC;
  if (!DC) { console.error('DC 未初始化'); return; }

  // ---------- 简易词法分割（无 AI 时的后备方案） ----------
  function parseScriptHeuristic(text) {
    const shots = [];
    const lines = (text || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
    let sceneName = '未命名场景';
    let order = 1;

    const sceneHeaderRe = /^(场景\s*\d+[：:：]?|第\s*\d+\s*场[：:：]?|SCENE\s*\d+[:：]?|\[[^\]]{2,50}\])\s*(.*)$/i;
    const charLineRe = /^([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9]{0,12})\s*[：:：]\s*(.+)$/;
    const actionRe = /^[（(【【][^）)】】]{2,200}[）)】】]$/;

    let buffer = []; // 累积一段对白/动作 -> 转成一个 shot
    function flush() {
      if (buffer.length === 0) return;
      const merged = buffer.join(' ');
      shots.push({
        id: DC.Utils.uid('shot'),
        order: order++,
        scene: sceneName,
        description: merged,
        dialogue: merged.length > 120 ? merged.slice(0, 100) + '…' : merged,
        duration: 6,
        shotType: '中景',
        angle: '平视',
        movement: '固定',
      });
      buffer = [];
    }

    for (const line of lines) {
      const m = line.match(sceneHeaderRe);
      if (m) {
        flush();
        sceneName = (m[2] || m[1]).replace(/[【】\[\]]/g, '').trim() || '未命名场景';
        continue;
      }
      const mc = line.match(charLineRe);
      if (mc) {
        flush();
        const name = mc[1];
        const line2 = mc[2];
        shots.push({
          id: DC.Utils.uid('shot'),
          order: order++,
          scene: sceneName,
          characterName: name,
          description: line2,
          dialogue: line2,
          duration: 5,
          shotType: '近景',
          angle: '平视',
          movement: '固定',
        });
        continue;
      }
      if (actionRe.test(line)) {
        buffer.push(line);
        continue;
      }
      buffer.push(line);
    }
    flush();
    return shots;
  }

  // ---------- AI 驱动解析：输出 JSON 数组 ----------
  async function parseScriptAI(project) {
    if (!DC.LLM && !DC.AICore) {
      return parseScriptHeuristic(project.script || '');
    }
    const systemPrompt = '你是一位资深中文分镜师。我会给你一份短剧剧本，请把它拆分为分镜（shots）数组。输出必须是合法 JSON 数组，每个元素包含：\n' +
      '- scene: 场景名称（字符串）\n' +
      '- description: 画面内容描述（中文，10-60 字）\n' +
      '- dialogue: 对白（字符串，可为空）\n' +
      '- characterName: 角色名（字符串，可为空）\n' +
      '- shotType: 景别（大远景/远景/全景/中景/近景/特写/大特写，选其一）\n' +
      '- angle: 机位（平视/仰拍/俯拍/顶拍/斜角，选其一）\n' +
      '- movement: 运镜（固定/推/拉/摇/移/跟/升降/环绕，选其一）\n' +
      '- duration: 时长秒数（整数，3-15）\n' +
      '直接输出 JSON，不要任何解释、不要 Markdown 代码块以外的文本。';

    const charactersList = (project.characters || []).map((c, i) => `${i + 1}. ${c.name}${c.age ? `（${c.age}岁）` : ''}${c.gender ? ' ' + c.gender : ''}`).join('\n');
    const userPrompt = '【项目信息】\n' +
      '名称: ' + (project.name || '未命名项目') + '\n' +
      '类型: ' + (project.genre || '') + '\n' +
      '风格: ' + (project.style || '') + '\n' +
      (charactersList ? '\n【角色表】\n' + charactersList : '') +
      '\n\n【剧本】\n' + (project.script || project.outline || '') +
      '\n\n请输出 JSON 数组（每个元素是一个 shot）。';

    try {
      const raw = DC.AICore && DC.AICore.callLLM
        ? await DC.AICore.callLLM(userPrompt, systemPrompt, { temperature: 0.55 })
        : await DC.LLM.generate(userPrompt, { system: systemPrompt, temperature: 0.55 });
      const parsed = DC.AICore ? DC.AICore.extractJSON(raw) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s, i) => ({
          id: s.id || DC.Utils.uid('shot'),
          order: i + 1,
          scene: String(s.scene || '未命名场景'),
          characterName: s.characterName || '',
          characterId: s.characterId || '',
          description: String(s.description || ''),
          dialogue: String(s.dialogue || ''),
          duration: parseInt(s.duration, 10) || 5,
          shotType: String(s.shotType || '中景'),
          angle: String(s.angle || '平视'),
          movement: String(s.movement || '固定'),
        }));
      }
      return parseScriptHeuristic(project.script || '');
    } catch (err) {
      console.warn('[ScriptParser] AI 解析失败，回退到启发式:', err.message);
      return parseScriptHeuristic(project.script || '');
    }
  }

  // ---------- 对外接口 ----------
  DC.ScriptParser = {
    parseHeuristic: parseScriptHeuristic,
    async parse(project) {
      if (!project) return [];
      // 优先尝试 AI；若浏览器无 AI 模块，直接启发式
      const preferAI = (project.script || '').length > 60;
      if (preferAI && (DC.LLM || (DC.AICore && DC.AICore.callLLM))) {
        return await parseScriptAI(project);
      }
      return parseScriptHeuristic(project.script || project.outline || '');
    },
    // 独立使用：绑定"剧本 → 分镜"按钮
    bindButton(btnId) {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.onclick = async () => {
        const p = DC.Project && DC.Project.getCurrent ? DC.Project.getCurrent() : null;
        if (!p) { DC.toast('请先选择项目', 'warning'); return; }
        if (!p.script && !p.outline) { DC.toast('请先编写剧本或大纲', 'warning'); return; }
        btn.disabled = true;
        btn.textContent = '🌀 正在解析分镜...';
        try {
          const shots = await this.parse(p);
          if (!shots.length) throw new Error('未解析出任何分镜');
          DC.ProjectManager.updateShots(shots);
          DC.toast(`已生成 ${shots.length} 个分镜`, 'success');
          if (DC.Tabs && DC.Tabs.switch) DC.Tabs.switch('storyboard');
        } catch (err) {
          DC.toast('解析失败：' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = '🎬 从剧本自动生成分镜';
        }
      };
    },
  };
})();
