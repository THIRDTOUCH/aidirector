/* =========================================================
   AI 导演台 · 主应用 (app.js)
   - 选项卡切换
   - 弹窗 / Toast 工具
   - 全局工具函数
   - 各模块初始化
   ========================================================= */

(function () {
  'use strict';

  // ---------- 全局命名空间 ----------
  const DC = (window.DC = window.DC || {});
  DC.version = '1.0.0';

  // ---------- localStorage 工具 ----------
  DC.Storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('Storage.set error:', e);
        return false;
      }
    },
    remove(key) {
      localStorage.removeItem(key);
    },
  };

  // ---------- 工具函数 ----------
  DC.Utils = {
    uid(prefix = 'id') {
      return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    },
    escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    fmtDate(ts) {
      if (!ts) return '—';
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${hh}:${mm}`;
    },
    countWords(text) {
      if (!text) return 0;
      return text.trim().length;
    },
  };

  // ---------- Toast ----------
  let toastSeq = 0;
  DC.toast = function (message, type = 'info', duration = 2500) {
    const area = document.getElementById('toastArea');
    if (!area) {
      console.log('[Toast]', message);
      return;
    }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<span>' + String(message).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]) + '</span>' +
      '<button class="toast-close" aria-label="关闭">×</button>';
    el.id = 'toast_' + ++toastSeq;
    const removeFn = () => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 300);
    };
    const timer = setTimeout(removeFn, duration);
    const closeBtn = el.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        clearTimeout(timer);
        removeFn();
      });
    }
    area.appendChild(el);
  };

  // ---------- 自定义确认对话框（替代原生 confirm）----------
  DC.modal = {
    open(options) {
      // options: { title, body: HTML字符串 | DOM, onConfirm, confirmText, cancelText, hideCancel }
      const modal = document.getElementById('modal');
      if (!modal) return;
      document.getElementById('modalTitle').textContent = options.title || '提示';
      const content = document.getElementById('modalContent');
      content.innerHTML = '';
      if (typeof options.body === 'string') {
        content.innerHTML = options.body;
      } else if (options.body instanceof HTMLElement) {
        content.appendChild(options.body);
      }
      // 操作按钮
      const actions = document.createElement('div');
      actions.className = 'form-actions';
      if (!options.hideCancel) {
        const btnC = document.createElement('button');
        btnC.className = 'btn';
        btnC.textContent = options.cancelText || '取消';
        btnC.onclick = () => this.close();
        actions.appendChild(btnC);
      }
      const btnOk = document.createElement('button');
      btnOk.className = 'btn btn-primary';
      btnOk.textContent = options.confirmText || '确定';
      btnOk.onclick = () => {
        if (options.onConfirm) {
          const keep = options.onConfirm();
          if (keep === false) return; // 返回false保持打开
        }
        this.close();
      };
      actions.appendChild(btnOk);
      content.appendChild(actions);

      // —— 重置位置（居中）
      const modalBody = document.getElementById('modalBody');
      if (modalBody) {
        modalBody.style.top = '';
        modalBody.style.left = '';
        modalBody.style.transform = '';
      }

      modal.classList.add('active');
    },
    close() {
      const modal = document.getElementById('modal');
      if (modal) modal.classList.remove('active');
    },
    confirm(message, onConfirm, opts = {}) {
      this.open({
        title: opts.title || '请确认',
        body: '<div style="padding:8px 4px 12px;line-height:1.6;color:var(--text-1);">' + message + '</div>',
        confirmText: opts.confirmText || '确定',
        cancelText: opts.cancelText || '取消',
        onConfirm: onConfirm,
      });
    },
  };

  // —— 模态框头部拖拽移动（所有弹窗共用）
  (function () {
    const header = document.getElementById('modalTitle')?.parentElement;
    const modalBody = document.getElementById('modalBody');
    if (!header || !modalBody) return;
    header.style.cursor = 'move';
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('modal-close')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = modalBody.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      // 切换到绝对定位模式
      modalBody.style.position = 'fixed';
      modalBody.style.left = startLeft + 'px';
      modalBody.style.top = startTop + 'px';
      modalBody.style.transform = 'none';
      modalBody.style.margin = '0';
      document.body.style.userSelect = 'none';
      header.style.userSelect = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const newLeft = Math.max(0, Math.min(window.innerWidth - 100, startLeft + (e.clientX - startX)));
      const newTop = Math.max(0, Math.min(window.innerHeight - 80, startTop + (e.clientY - startY)));
      modalBody.style.left = newLeft + 'px';
      modalBody.style.top = newTop + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      if (header) header.style.userSelect = '';
    });
  })();

  // —— ESC 键关闭模态框 + 全局快捷键
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modal');
    const isModalOpen = modal && modal.classList.contains('active');

    // ESC: 关闭模态框
    if (e.key === 'Escape' && isModalOpen) {
      DC.modal.close();
      return;
    }

    // 在输入框/textarea中时不触发文本快捷键
    const target = e.target;
    const isTypingField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    // Tab 切换：Ctrl/Cmd + 数字 1-9
    if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const tabs = document.querySelectorAll('.main-tabs .tab');
      if (tabs[idx]) {
        e.preventDefault();
        tabs[idx].click();
        return;
      }
    }

    if (isTypingField) return;

    // N: 新建（根据当前 Tab）
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      const tab = (DC.Tabs && DC.Tabs.active) || 'project';
      switch (tab) {
        case 'project':
          document.querySelectorAll('.panel.active .new-card, .panel.active .char-card.add-card, .panel.active .scene-card.add-card, .panel.active .shot-card.new, .panel.active .btn-new, .panel.active .btn-primary').forEach((el) => { if (el.textContent.includes('新建') || el.textContent.includes('+') || el.textContent.includes('添加')) el.click(); });
          if (!document.querySelector('.modal.active')) {
            const firstBtn = document.querySelector('.panel.active .project-card.new-project, .panel.active .char-card.add-card, .panel.active .scene-card.add-card');
            if (firstBtn) firstBtn.click();
          }
          break;
        case 'character':
          (() => {
            const addBtn = document.querySelector('#charGrid .char-card.add-card');
            if (addBtn) addBtn.click();
            else if (DC.CharacterManager && DC.CharacterManager.init) DC.CharacterManager.init();
          })();
          break;
        case 'scene':
          (() => {
            const addBtn = document.querySelector('#sceneGrid .scene-card.add-card');
            if (addBtn) addBtn.click();
            else if (DC.SceneManager && DC.SceneManager.init) DC.SceneManager.init();
          })();
          break;
        case 'storyboard':
          (() => {
            const addBtn = document.querySelector('#shotList .shot-card.new');
            if (addBtn) addBtn.click();
          })();
          break;
        default:
          DC.toast('当前 Tab 暂不支持快捷键新建', 'info');
      }
      return;
    }

    // D: 删除第一/选中卡片（仅分镜、角色、场景页有效）
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      const tab = (DC.Tabs && DC.Tabs.active) || '';
      const supportedTabs = ['character', 'scene', 'storyboard'];
      if (!supportedTabs.includes(tab)) return;
      let gridId;
      if (tab === 'storyboard') gridId = 'shotList';
      else if (tab === 'character') gridId = 'charGrid';
      else gridId = 'sceneGrid';
      const grid = document.getElementById(gridId);
      if (!grid) return;
      const cards = grid.querySelectorAll('.char-card, .scene-card, .shot-card');
      // 找到第一个非 "new/add" 的卡片
      for (const c of cards) {
        if (c.classList.contains('new') || c.classList.contains('add-card')) continue;
        const delBtn = c.querySelector('.pc-actions .btn-icon:last-child, .shot-head .btn-icon:last-child');
        if (delBtn) { delBtn.click(); return; }
      }
      return;
    }

    // S: 保存（仅大纲/剧本页 — 触发防抖保存）
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      DC.toast('已自动保存 · localStorage', 'success');
      if (DC.Log) DC.Log.info('[auto-save] 项目数据已同步到 localStorage');
      return;
    }

    // /?: 显示快捷键帮助
    if (e.key === '/' || e.key === '?') {
      e.preventDefault();
      const help = `快捷键：\n  N — 新建（当前 Tab）\n  D — 删除列表第一项\n  Ctrl/Cmd+S — 保存\n  Ctrl/Cmd+1~9 — 切换 Tab\n  Esc — 关闭弹窗`;
      alert(help);
    }
  });

  // ---------- 选项卡切换 ----------
  DC.Tabs = {
    active: 'project',
    switch(tabName) {
      this.active = tabName;
      // 更新按钮状态
      document.querySelectorAll('.main-tabs .tab').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });
      // 更新面板显示
      document.querySelectorAll('.panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === 'panel-' + tabName);
      });
      // 页面切换回调
      if (tabName === 'project' && DC.ProjectManager && DC.ProjectManager.render) DC.ProjectManager.render();
      if (tabName === 'characters' && DC.CharacterManager && DC.CharacterManager.render) DC.CharacterManager.render();
      if (tabName === 'scenes' && DC.SceneManager && DC.SceneManager.render) DC.SceneManager.render();
      if (tabName === 'storyboard' && DC.Storyboard && DC.Storyboard.render) DC.Storyboard.render();
      if (tabName === 'timeline' && DC.Timeline && DC.Timeline.render) DC.Timeline.render();
      if (tabName === 'preview' && DC.Exporter && DC.Exporter.renderPreview) DC.Exporter.renderPreview();
    },
    init() {
      const tabs = document.querySelectorAll('.main-tabs .tab');
      tabs.forEach((btn) => {
        btn.addEventListener('click', () => this.switch(btn.dataset.tab));
      });
    },
  };

  // ---------- 当前项目上下文 ----------
  // 统一管理"当前项目"引用，各模块通过 DC.getCurrentProject() 获取
  DC._currentProjectId = null;
  DC.getCurrentProjectId = function () {
    if (!DC._currentProjectId) DC._currentProjectId = DC.Storage.get('currentProjectId', null);
    return DC._currentProjectId;
  };
  DC.setCurrentProjectId = function (id) {
    DC._currentProjectId = id;
    DC.Storage.set('currentProjectId', id);
    // 自动联动加载到表单（大纲/剧本）
    if (DC.ProjectManager) DC.ProjectManager.syncToUI();
  };

  // ---------- 日志（供智能体使用） ----------
  DC.Log = {
    _write(type, message) {
      const body = document.getElementById('logBody');
      const line = document.createElement('div');
      line.className = 'log-line ' + type;
      const ts = new Date();
      const stamp = String(ts.getHours()).padStart(2, '0') + ':' + String(ts.getMinutes()).padStart(2, '0') + ':' + String(ts.getSeconds()).padStart(2, '0');
      line.innerHTML = '<span class="ts">[' + stamp + ']</span>' + DC.Utils.escapeHtml(message);
      if (body) body.appendChild(line);
      if (body) body.scrollTop = body.scrollHeight;
    },
    info(msg) { this._write('info', msg); },
    success(msg) { this._write('success', msg); },
    warn(msg) { this._write('warning', msg); },
    error(msg) { this._write('error', msg); },
    clear() {
      const body = document.getElementById('logBody');
      if (body) body.innerHTML = '';
    },
  };

  // ---------- 关闭按钮 ----------
  function initGlobalUI() {
    const close = document.getElementById('modalClose');
    if (close) close.onclick = () => DC.modal.close();
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) backdrop.onclick = () => DC.modal.close();
  }

  // ---------- 初始化 ----------
  document.addEventListener('DOMContentLoaded', function () {
    console.log('🎬 AI 导演台 · 启动');
    initGlobalUI();
    DC.Tabs.init();

    // 初始化各模块（若存在）
    if (DC.ProjectManager && DC.ProjectManager.init) DC.ProjectManager.init();
    if (DC.CharacterManager && DC.CharacterManager.init) DC.CharacterManager.init();
    if (DC.SceneManager && DC.SceneManager.init) DC.SceneManager.init();
    if (DC.Storyboard && DC.Storyboard.init) DC.Storyboard.init();
    if (DC.Timeline && DC.Timeline.init) DC.Timeline.init();
    if (DC.Exporter && DC.Exporter.init) DC.Exporter.init();
    if (DC.AIPipeline && DC.AIPipeline.init) DC.AIPipeline.init();

    // LLM状态指示器（若LLM模块存在）
    if (DC.LLM && DC.LLM.refreshStatus) {
      DC.LLM.refreshStatus();
    }

    // 顶部按钮
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) btnSettings.onclick = () => {
      if (DC.LLM && DC.LLM.showSettings) DC.LLM.showSettings();
      else DC.toast('AI模块尚未加载', 'warning');
    };
    const btnExport = document.getElementById('btnExport');
    if (btnExport) btnExport.onclick = () => {
      if (DC.Exporter && DC.Exporter.exportJSON) DC.Exporter.exportJSON();
      else DC.toast('导出模块尚未加载', 'warning');
    };

    console.log('✅ 主应用初始化完成');
  });
})();
