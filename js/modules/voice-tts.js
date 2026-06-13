/* =========================================================
   AI 导演台 · 配音/语音合成 (voice-tts.js)
   - 基于浏览器 Web Speech API 的 TTS
   - 支持中文/英文多角色配音
   - 支持朗读分镜的 ttsScript / dialogue 字段
   ========================================================= */
(function () {
  'use strict';

  const DC = window.DC;
  if (!DC) { console.error('DC 未初始化'); return; }

  const synth = window.speechSynthesis;
  const VOICE_CACHE_KEY = 'dc_voice_prefs_v1';
  let _availableVoices = [];
  let _currentPrefs = loadVoicePrefs();

  function loadVoicePrefs() {
    try {
      const saved = DC.Storage.get(VOICE_CACHE_KEY, null);
      if (saved) return saved;
    } catch (_) {}
    return {
      voiceName: '',  // 当前选中的语音名称
      rate: 1.0,      // 语速 (0.1 ~ 10)
      pitch: 1.0,     // 音调 (0 ~ 2)
      volume: 1.0,    // 音量 (0 ~ 1)
      language: 'zh-CN', // 默认语言
    };
  }
  function saveVoicePrefs() {
    DC.Storage.set(VOICE_CACHE_KEY, _currentPrefs);
  }

  function refreshVoices() {
    _availableVoices = synth ? synth.getVoices() || [] : [];
    return _availableVoices;
  }

  // 首次加载语音列表（Chrome 需要 onvoiceschanged 事件）
  if (synth) {
    refreshVoices();
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.onvoiceschanged = refreshVoices;
    }
  }

  function isSupported() {
    return !!window.speechSynthesis;
  }

  function getVoices(filterLang) {
    const list = refreshVoices();
    if (!filterLang) return list;
    return list.filter((v) => v.lang && v.lang.toLowerCase().startsWith(filterLang.toLowerCase()));
  }

  function getPrefs() { return structuredClone(_currentPrefs); }

  function setPrefs(patch) {
    _currentPrefs = Object.assign({}, _currentPrefs, patch);
    saveVoicePrefs();
  }

  function pickVoice(langHint) {
    const list = refreshVoices();
    if (list.length === 0) return null;
    // 优先按预设名称匹配
    if (_currentPrefs.voiceName) {
      const match = list.find((v) => v.name === _currentPrefs.voiceName);
      if (match) return match;
    }
    // 其次按语言优先
    const lang = langHint || _currentPrefs.language || 'zh-CN';
    const byLang = list.filter((v) => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (byLang.length > 0) return byLang[0];
    return list[0];
  }

  function speak(text, opts) {
    return new Promise((resolve, reject) => {
      if (!isSupported()) { reject(new Error('浏览器不支持语音合成')); return; }
      if (!text || !text.trim()) { resolve(); return; }

      opts = opts || {};
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = opts.rate != null ? opts.rate : _currentPrefs.rate;
      utter.pitch = opts.pitch != null ? opts.pitch : _currentPrefs.pitch;
      utter.volume = opts.volume != null ? opts.volume : _currentPrefs.volume;
      utter.lang = opts.language || _currentPrefs.language;
      const v = pickVoice(opts.language);
      if (v) utter.voice = v;

      utter.onend = () => resolve();
      utter.onerror = (e) => reject(new Error(e.error || '语音合成错误'));
      synth.speak(utter);
    });
  }

  function stop() {
    if (!isSupported()) return;
    synth.cancel();
  }

  function pause() {
    if (!isSupported()) return;
    synth.pause();
  }

  function resume() {
    if (!isSupported()) return;
    synth.resume();
  }

  function isSpeaking() {
    return isSupported() && synth.speaking;
  }

  // —— 朗读当前分镜的配音稿（若没有则回退到台词）
  function speakCurrentShot(shotIdx) {
    const list = DC.Storyboard ? DC.Storyboard.getShots() : [];
    if (!list[shotIdx]) { DC.toast('未找到分镜', 'warning'); return; }
    const shot = list[shotIdx];
    const text = shot.ttsScript || shot.dialogue || shot.description || '';
    if (!text) { DC.toast('此分镜无配音内容', 'warning'); return; }
    DC.toast('🎤 开始朗读：' + (shot.sceneName || shot.scene || '分镜 ' + (shotIdx + 1)), 'info');
    speak(text).then(() => DC.toast('✓ 朗读完毕', 'success')).catch((e) => DC.toast('朗读失败: ' + e.message, 'error'));
  }

  // —— 批量朗读所有分镜（模拟短剧完整配音预览）
  function speakAllShots() {
    const list = DC.Storyboard ? DC.Storyboard.getShots() : [];
    if (list.length === 0) { DC.toast('暂无分镜', 'warning'); return; }

    let i = 0;
    function next() {
      if (i >= list.length) { DC.toast('✓ 所有分镜朗读完毕', 'success'); return; }
      const shot = list[i];
      const text = shot.ttsScript || shot.dialogue || shot.description || '';
      if (!text) { i++; next(); return; }
      speak(text).then(() => { i++; setTimeout(next, 300); })
        .catch((e) => DC.toast('朗读失败: ' + e.message, 'error'));
    }
    DC.toast(`🎤 开始顺序朗读 ${list.length} 个分镜...`, 'info');
    next();
  }

  // —— 渲染 TTS 设置面板（用于插入到页面或 modal）
  function renderSettingsPanel() {
    const panel = document.createElement('div');
    panel.className = 'tts-settings';
    const voices = refreshVoices();
    const voiceOptions = voices.map((v, i) =>
      `<option value="${DC.Utils.escapeHtml(v.name)}" ${v.name === _currentPrefs.voiceName ? 'selected' : ''}>${DC.Utils.escapeHtml(v.name)} (${v.lang || '—'})</option>`
    ).join('');

    panel.innerHTML = `
      <div class="form-grid">
        <label class="full">🎙️ 语音选择：
          <select id="tts-voice">${voiceOptions || '<option>浏览器未提供语音</option>'}</select>
        </label>
        <label>语速：<input type="range" id="tts-rate" min="0.5" max="2" step="0.1" value="${_currentPrefs.rate}" /> <span id="tts-rate-val">${_currentPrefs.rate}</span></label>
        <label>音调：<input type="range" id="tts-pitch" min="0" max="2" step="0.1" value="${_currentPrefs.pitch}" /> <span id="tts-pitch-val">${_currentPrefs.pitch}</span></label>
        <label>音量：<input type="range" id="tts-volume" min="0" max="1" step="0.1" value="${_currentPrefs.volume}" /> <span id="tts-volume-val">${_currentPrefs.volume}</span></label>
        <label class="full">语言过滤：
          <select id="tts-lang">
            <option value="zh">中文 (zh)</option>
            <option value="en">英文 (en)</option>
            <option value="">全部</option>
          </select>
        </label>
        <label class="full" style="display:flex;gap:8px;">
          <button type="button" class="btn" id="tts-test">🔊 测试朗读</button>
          <button type="button" class="btn" id="tts-stop">⏹️ 停止</button>
        </label>
        <label class="full" style="font-size:12px;color:var(--text-2);">
          提示：浏览器原生 Web Speech API，离线可用，无 API 费用。
        </label>
      </div>`;

    // 绑定事件
    const rateEl = panel.querySelector('#tts-rate');
    const pitchEl = panel.querySelector('#tts-pitch');
    const volumeEl = panel.querySelector('#tts-volume');
    const voiceEl = panel.querySelector('#tts-voice');
    const langEl = panel.querySelector('#tts-lang');
    rateEl.addEventListener('input', () => {
      panel.querySelector('#tts-rate-val').textContent = rateEl.value;
      _currentPrefs.rate = parseFloat(rateEl.value);
      saveVoicePrefs();
    });
    pitchEl.addEventListener('input', () => {
      panel.querySelector('#tts-pitch-val').textContent = pitchEl.value;
      _currentPrefs.pitch = parseFloat(pitchEl.value);
      saveVoicePrefs();
    });
    volumeEl.addEventListener('input', () => {
      panel.querySelector('#tts-volume-val').textContent = volumeEl.value;
      _currentPrefs.volume = parseFloat(volumeEl.value);
      saveVoicePrefs();
    });
    voiceEl.addEventListener('change', () => {
      _currentPrefs.voiceName = voiceEl.value;
      saveVoicePrefs();
    });
    langEl.addEventListener('change', () => {
      const filtered = getVoices(langEl.value);
      const options = filtered.map((v) =>
        `<option value="${DC.Utils.escapeHtml(v.name)}" ${v.name === _currentPrefs.voiceName ? 'selected' : ''}>${DC.Utils.escapeHtml(v.name)} (${v.lang || '—'})</option>`
      ).join('');
      voiceEl.innerHTML = options || '<option>无匹配语音</option>';
    });
    panel.querySelector('#tts-test').addEventListener('click', () => {
      speak('这是一段测试朗读，用于验证语音参数设置是否正确。').catch((e) => DC.toast('失败: ' + e.message, 'error'));
    });
    panel.querySelector('#tts-stop').addEventListener('click', stop);

    return panel;
  }

  // —— 打开 TTS 设置弹窗
  function showSettingsModal() {
    if (!isSupported()) {
      DC.modal.open({
        title: '🎤 配音功能',
        body: '<p style="color:var(--accent-red)">当前浏览器不支持 Web Speech API 语音合成，请使用最新版 Chrome / Edge / Safari。</p>',
        confirmText: '知道了',
      });
      return;
    }
    const panel = renderSettingsPanel();
    DC.modal.open({
      title: '🎤 配音 / TTS 设置',
      body: panel,
      confirmText: '完成',
    });
  }

  // —— 对外接口
  DC.VoiceTTS = {
    isSupported,
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    speakCurrentShot,
    speakAllShots,
    getVoices,
    getPrefs,
    setPrefs,
    showSettings: showSettingsModal,
    renderSettingsPanel,
  };
})();
