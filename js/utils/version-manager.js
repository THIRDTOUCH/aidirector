/**
 * AI 导演台 · 版本管理与数据保护系统
 * 源自 TVLIB app-update.js - 已迁移到 aidirector
 * 功能：自动备份 / 版本迁移 / 数据导出导入 / 检查完整性
 * 约定：所有接口挂在 window.DC.Version
 * 读取/写入：localStorage，key 前缀 directorProject_ 由外层 app 管理；
 *         备份/恢复功能接收当前 app 的 projectData 对象和 save/load 回调。
 */
(function () {
  'use strict';

  window.DC = window.DC || {};

  const Version = {
    currentVersion: '1.0.0',
    minCompatibleVersion: '1.0.0',
    releaseDate: new Date().toISOString(),

    // 兼容性比较：-1 a<b, 0 相等, 1 a>b
    compareVersions(a, b) {
      const pa = String(a).split('.').map(Number);
      const pb = String(b).split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        const va = pa[i] || 0, vb = pb[i] || 0;
        if (va < vb) return -1;
        if (va > vb) return 1;
      }
      return 0;
    },

    // 初始化：首次访问写入版本号
    init() {
      const saved = localStorage.getItem('director_version');
      if (!saved) {
        localStorage.setItem('director_version', this.currentVersion);
        localStorage.setItem('director_releaseDate', this.releaseDate);
        return { firstUse: true, version: this.currentVersion };
      }
      // 如果旧版本号低于当前版本，执行迁移逻辑
      if (this.compareVersions(saved, this.currentVersion) < 0) {
        console.log(`[DC.Version] 版本更新: ${saved} → ${this.currentVersion}`);
        this.migrate(saved, this.currentVersion);
        localStorage.setItem('director_version', this.currentVersion);
      }
      return { firstUse: false, version: this.currentVersion };
    },

    // 迁移器注册：新增版本时在这里补充
    migrators: {
      '0.9.0->1.0.0'(projectData) {
        // 例如：0.9 版可能不包含 characters/scenes/beats
        if (!projectData.characters) projectData.characters = [];
        if (!projectData.scenes) projectData.scenes = [];
        if (!projectData.beats) projectData.beats = { structure: 'three-act', beats: [] };
        return projectData;
      }
    },

    migrate(fromVersion, toVersion) {
      // 按版本号顺序应用迁移器
      for (const key of Object.keys(this.migrators)) {
        const [minVer, maxVer] = key.split('->');
        if (this.compareVersions(fromVersion, minVer) <= 0 && this.compareVersions(toVersion, maxVer) >= 0) {
          console.log(`[DC.Version] 执行迁移: ${key}`);
          // 注意：完整数据迁移需要调用方传入 projectData；此处仅打印记录
        }
      }
      const log = JSON.parse(localStorage.getItem('director_migrationLog') || '[]');
      log.push({ from: fromVersion, to: toVersion, timestamp: new Date().toISOString() });
      localStorage.setItem('director_migrationLog', JSON.stringify(log));
    },

    // ===== 备份 / 恢复 =====
    createBackup(projectData, reason = '手动备份') {
      const backup = {
        id: 'backup_' + Date.now(),
        timestamp: new Date().toISOString(),
        version: this.currentVersion,
        reason,
        data: projectData
      };
      const history = JSON.parse(localStorage.getItem('director_backupHistory') || '[]');
      history.unshift({ id: backup.id, timestamp: backup.timestamp, reason, version: backup.version });
      if (history.length > 10) history.length = 10; // 保留最近 10 条
      localStorage.setItem('director_backupHistory', JSON.stringify(history));
      localStorage.setItem(backup.id, JSON.stringify(backup));
      return backup.id;
    },

    restoreFromBackup(backupId) {
      const raw = localStorage.getItem(backupId);
      if (!raw) return null;
      const backup = JSON.parse(raw);
      return backup.data;
    },

    listBackups() {
      try {
        return JSON.parse(localStorage.getItem('director_backupHistory') || '[]');
      } catch (e) { return []; }
    },

    deleteBackup(backupId) {
      localStorage.removeItem(backupId);
      const history = this.listBackups().filter(b => b.id !== backupId);
      localStorage.setItem('director_backupHistory', JSON.stringify(history));
    },

    // ===== 导出 / 导入 =====
    exportJSON(projectData, extraMeta = {}) {
      const payload = {
        version: this.currentVersion,
        generatedAt: new Date().toISOString(),
        project: projectData,
        ...extraMeta
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aidirector_${projectData.name || 'project'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },

    importJSON(file, onParsed) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.project) throw new Error('文件格式不正确，缺少 project 字段');
          onParsed(data.project, data);
        } catch (err) {
          console.error('[DC.Version] 导入失败:', err);
          alert('导入失败: ' + err.message);
        }
      };
      reader.readAsText(file);
    },

    // ===== 数据完整性校验 =====
    checkIntegrity(projectData) {
      const issues = [];
      if (!projectData || typeof projectData !== 'object') {
        issues.push('项目数据格式错误'); return issues;
      }
      if (!projectData.name) issues.push('缺少项目名');
      if (!projectData.shots || !Array.isArray(projectData.shots)) issues.push('缺少分镜数据');
      if (!projectData.characters || !Array.isArray(projectData.characters)) issues.push('缺少角色数据');
      if (!projectData.scenes || !Array.isArray(projectData.scenes)) issues.push('缺少场景数据');
      return issues;
    },

    // ===== 数据大小估算 =====
    estimateSize(projectData) {
      try { return new Blob([JSON.stringify(projectData)]).size; } catch (e) { return 0; }
    }
  };

  window.DC.Version = Version;
  console.log('[DC] 版本管理系统已就绪 (v' + Version.currentVersion + ')');
})();
