/* =========================================================
   工作流页初始化（workflow-init.js）
   - 绑定 workflow 卡片按钮到现有模块
   - 实时显示项目统计（字数/角色/场景/分镜）
   ========================================================= */

(function () {
  'use strict';

  const DC = window.DC;
  if (!DC) return;

  function refreshStats() {
    const p = DC.ProjectManager.getCurrent();
    const outline = p ? (p.outline || '') : '';
    const script = p ? (p.script || '') : '';
    document.getElementById('wf-stat-outline') && (
      document.getElementById('wf-stat-outline').textContent =
        outline ? (outline.length + ' 字') : '未填写'
    );
    document.getElementById('wf-stat-script') && (
      document.getElementById('wf-stat-script').textContent =
        script ? (script.length + ' 字') : '未填写'
    );
    const chars = p && p.characters ? p.characters.length : 0;
    const scenes = p && p.scenes ? p.scenes.length : 0;
    const shots = p && p.shots ? p.shots.length : 0;
    document.getElementById('wf-stat-chars') && (
      document.getElementById('wf-stat-chars').textContent = chars + ' 角色'
    );
    document.getElementById('wf-stat-scenes') && (
      document.getElementById('wf-stat-scenes').textContent = scenes + ' 场景'
    );
    document.getElementById('wf-stat-shots') && (
      document.getElementById('wf-stat-shots').textContent = shots + ' 分镜'
    );
    const totalSec = (p && p.shots ? p.shots : []).reduce(
      (a, s) => a + (parseInt(s && s.duration, 10) || 0), 0
    );
    document.getElementById('wf-stat-duration') && (
      document.getElementById('wf-stat-duration').textContent =
        '总时长：' + Math.floor(totalSec / 60) + '分' + (totalSec % 60) + '秒'
    );
  }

  function log(msg, level) {
    const body = document.getElementById('wfLogBody');
    if (!body) return;
    const line = document.createElement('div');
    const color = level === 'success' ? '#4ade80' :
                  level === 'error' ? '#f87171' :
                  level === 'warn' ? '#fbbf24' : '#a1a1aa';
    line.style.color = color;
    const ts = new Date().toLocaleTimeString();
    line.textContent = '[' + ts + '] ' + msg;
    if (body.textContent === '（暂无记录）') body.textContent = '';
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  function switchTab(name) {
    if (DC.Tabs && DC.Tabs.switch) return DC.Tabs.switch(name);
    // 兼容：手动切
    document.querySelectorAll('.main-tabs .tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
    document.querySelectorAll('.content .panel').forEach((p) => {
      p.classList.toggle('active', p.id === 'panel-' + name);
    });
  }

  function bind() {
    document.getElementById('wfBtnOutline') && (
      document.getElementById('wfBtnOutline').onclick = () => switchTab('outline')
    );
    document.getElementById('wfBtnScript') && (
      document.getElementById('wfBtnScript').onclick = () => switchTab('script')
    );
    document.getElementById('wfBtnShots') && (
      document.getElementById('wfBtnShots').onclick = () => switchTab('storyboard')
    );
    // AI 生成角色
    const wfBtnChars = document.getElementById('wfBtnChars');
    if (wfBtnChars && DC.CharacterManager && typeof DC.CharacterManager.aiGenerate === 'function') {
      wfBtnChars.onclick = async () => {
        if (!DC.ProjectManager.getCurrent()) { DC.toast('请先选择或新建项目', 'warning'); return; }
        log('Step3：正在为项目生成角色...', 'info');
        try {
          await DC.CharacterManager.aiGenerate();
          const p = DC.ProjectManager.getCurrent();
          log('成功：项目内角色数 = ' + ((p && p.characters) ? p.characters.length : 0), 'success');
          refreshStats();
        } catch (e) {
          log('角色生成失败：' + e.message, 'error');
        }
      };
    }
    // AI 生成场景
    const wfBtnScenes = document.getElementById('wfBtnScenes');
    if (wfBtnScenes && DC.SceneManager && typeof DC.SceneManager.aiGenerate === 'function') {
      wfBtnScenes.onclick = async () => {
        if (!DC.ProjectManager.getCurrent()) { DC.toast('请先选择或新建项目', 'warning'); return; }
        log('Step3：正在为项目生成场景...', 'info');
        try {
          await DC.SceneManager.aiGenerate();
          const p = DC.ProjectManager.getCurrent();
          log('成功：项目内场景数 = ' + ((p && p.scenes) ? p.scenes.length : 0), 'success');
          refreshStats();
        } catch (e) {
          log('场景生成失败：' + e.message, 'error');
        }
      };
    }
    // AI 剧本→分镜
    const wfBtnGenShots = document.getElementById('wfBtnGenShots');
    if (wfBtnGenShots) {
      wfBtnGenShots.onclick = async () => {
        const p = DC.ProjectManager.getCurrent();
        if (!p) { DC.toast('请先选择或新建项目', 'warning'); return; }
        const hasScript = (p.script && p.script.length > 20) || (p.outline && p.outline.length > 20);
        if (!hasScript) { DC.toast('请先在剧本或大纲页填写内容', 'warning'); return; }
        // 优先走 script-parser.parse，否则走 storyboard.aiSplit
        const hasParser = DC.ScriptParser && typeof DC.ScriptParser.parse === 'function';
        log('Step4：正在解析剧本为分镜（' + (hasParser ? 'ScriptParser + AI' : 'Storyboard.aiSplit') + '）...', 'info');
        try {
          if (hasParser) {
            const shots = await DC.ScriptParser.parse(p);
            if (shots && shots.length) DC.ProjectManager.updateShots(shots);
          } else if (DC.Storyboard && typeof DC.Storyboard.aiSplit === 'function') {
            await DC.Storyboard.aiSplit();
          }
          const after = DC.ProjectManager.getCurrent();
          log('成功：项目内分镜数 = ' + ((after && after.shots) ? after.shots.length : 0), 'success');
          refreshStats();
        } catch (e) {
          log('分镜生成失败：' + e.message, 'error');
        }
      };
    }
    // 批量生成提示词
    const wfBtnBatch = document.getElementById('wfBtnBatch');
    if (wfBtnBatch && DC.Storyboard && typeof DC.Storyboard.batchGenImages === 'function') {
      wfBtnBatch.onclick = async () => {
        const p = DC.ProjectManager.getCurrent();
        if (!p || !p.shots || p.shots.length === 0) { DC.toast('请先生成分镜', 'warning'); return; }
        log('Step5：正在为每个分镜生成英文提示词...', 'info');
        try {
          await DC.Storyboard.batchGenImages();
          log('成功：已为每个分镜注入 prompt', 'success');
        } catch (e) {
          log('提示词生成失败：' + e.message, 'error');
        }
      };
    }
    // 导出合成脚本
    const wfBtnExport = document.getElementById('wfBtnExport');
    if (wfBtnExport && DC.FFmpegExporter) {
      wfBtnExport.onclick = () => {
        const p = DC.ProjectManager.getCurrent();
        if (!p) { DC.toast('请先选择项目', 'warning'); return; }
        if (!p.shots || p.shots.length === 0) { DC.toast('请先生成分镜', 'warning'); return; }
        DC.toast('已开始下载 FFmpeg 合成脚本 / JSON / 分镜清单', 'info');
        switchTab('export');
      };
    }

    // 刷新统计：定时 + 点击项目切换
    refreshStats();
    setInterval(refreshStats, 2000);
  }

  // 等待 DOM 加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  // 对外暴露（可选）
  DC.Workflow = { refreshStats, log };
})();
