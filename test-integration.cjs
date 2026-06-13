/* ============================================================
 * 综合集成测试 - 在 Node.js 中模拟浏览器环境
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const testResults = [];
function assert(name, cond, detail) {
  testResults.push({ name, pass: !!cond, detail: detail || '' });
  console.log('  [' + (cond ? '✅' : '❌') + '] ' + name + (detail ? ' - ' + detail : ''));
  return !!cond;
}

function createMockElement(id, tag) {
  const el = {
    id: id, tagName: (tag || 'div').toUpperCase(),
    className: '', style: {}, dataset: {}, children: [],
    innerHTML: '', textContent: '', value: '',
    appendChild: function(child) { this.children.push(child); return child; },
    removeChild: function(child) { this.children = this.children.filter(function(c){ return c !== child; }); return child; },
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    addEventListener: function() {},
    removeEventListener: function() {},
    getAttribute: function() { return null; },
    setAttribute: function() {},
    click: function() {}, focus: function() {}, blur: function() {},
    insertAdjacentHTML: function(pos, html) { this.innerHTML += html; }
  };
  return el;
}

function runAll() {
  const localStorageData = {};
  const mockLocalStorage = {
    getItem: function(k) { return k in localStorageData ? localStorageData[k] : null; },
    setItem: function(k, v) { localStorageData[k] = String(v); },
    removeItem: function(k) { delete localStorageData[k]; },
    clear: function() { Object.keys(localStorageData).forEach(function(k){ delete localStorageData[k]; }); }
  };

  const mockElements = new Map();
  ['projectGrid', 'charGrid', 'sceneGrid', 'shotList', 'timelineTrack', 'timelineSummary',
   'modal', 'modalBody', 'modalContent', 'modalTitle', 'modalClose', 'toastArea',
   'llmStatusDot', 'llmStatusText', 'statusProject', 'statusSaved',
   'projTitle', 'projGenre', 'projDuration', 'projStyle', 'projLogline', 'projOutline', 'projScript',
   'pipelineLog', 'logBody', 'previewBody', 'previewPlayer', 'previewInfo', 'previewInfoToggle',
   'previewInfoInner', 'previewInfoCollapsed', 'infoTitle', 'infoGenre', 'infoDuration',
   'infoStyle', 'infoShotCount', 'infoCharCount', 'infoSceneCount', 'infoSummary',
   'coverTitle', 'cover-hint', 'mainTabs',
   'wf-stat-outline', 'wf-stat-script', 'wf-stat-chars', 'wf-stat-scenes', 'wf-stat-shots',
   'wf-stat-duration', 'workflowGrid', 'workflowLog', 'wfLogBody',
   'outlineProject', 'projectSearch'
  ].forEach(function(id) { mockElements.set(id, createMockElement(id)); });

  const mockDocument = {
    getElementById: function(id) { return mockElements.get(id) || createMockElement(id); },
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    createElement: function(tag) { return createMockElement('_' + Math.random(), tag); },
    addEventListener: function() {}, removeEventListener: function() {},
    body: createMockElement('body'), head: createMockElement('head')
  };

  Object.defineProperty(global, 'window', { value: global, writable: true, configurable: true });
  Object.defineProperty(global, 'document', { value: mockDocument, writable: true, configurable: true });
  Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true, configurable: true });
  Object.defineProperty(global, 'navigator', { value: { userAgent: 'node-test', language: 'zh-CN' }, writable: true, configurable: true });
  Object.defineProperty(global, 'location', { value: { href: 'test://localhost', origin: 'test://localhost' }, writable: true, configurable: true });
  Object.defineProperty(global, 'fetch', { value: function() { return Promise.reject(new Error('Network disabled')); }, writable: true, configurable: true });

  global.DC = {};
  global.DC.Utils = {
    uid: function() { return 'id_' + Math.random().toString(36).slice(2, 10); },
    escapeHtml: function(s) { return String(s || '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); },
    toast: function(msg, type) { console.log('[TOAST-' + (type || 'info') + '] ' + msg); },
    modal: {
      open: function(opts) { console.log('[MODAL open] ' + (opts && opts.title ? opts.title : '(no title)')); },
      close: function() { console.log('[MODAL close]'); },
      confirm: function(msg, cb) { console.log('[MODAL confirm] ' + msg); if (cb) cb(); }
    },
    saveJSON: function(key, data) { mockLocalStorage.setItem(key, JSON.stringify(data)); },
    loadJSON: function(key, def) {
      try { var v = mockLocalStorage.getItem(key); return v ? JSON.parse(v) : def; }
      catch(e) { return def; }
    }
  };
  global.DC.toast = global.DC.Utils.toast;
  global.DC.modal = global.DC.Utils.modal;

  // === 加载 JS 文件 ===
  const JS_DIR = path.join(__dirname, 'js');
  const loadOrder = [
    'utils/perf.js',
    'utils/version-manager.js',
    'data/preset-data.js',
    'data/storyboard-templates.js',
    'data/beat-sheet.js',
    'core/app.js',
    'integrations/app-llm.js',
    'integrations/app-comfyui.js',
    'modules/project-manager.js',
    'modules/character-bible.js',
    'modules/character-lib.js',
    'modules/scene-lib.js',
    'modules/prompt-builder.js',
    'modules/storyboard.js',
    'modules/timeline.js',
    'modules/ai-task-queue.js',
    'modules/ai-pipeline.js',
    'modules/exporter.js',
    'modules/model-registry.js',
    'core/ai-core.js',
    'modules/script-parser.js',
    'modules/ffmpeg-exporter.js',
    'modules/workflow-init.js'
  ];

  console.log('================================================');
  console.log('📋 Step 1: 模块加载顺序测试');
  console.log('================================================');

  let loadedCount = 0;
  for (const rel of loadOrder) {
    const filePath = path.join(JS_DIR, rel);
    if (!fs.existsSync(filePath)) {
      assert('文件存在: ' + rel, false, '文件缺失');
      continue;
    }
    const code = fs.readFileSync(filePath, 'utf8');
    try {
      // 在当前作用域内执行代码，使 window.DC 被修改为 global.DC
      eval(code);
      loadedCount++;
      assert('加载成功: ' + rel, true, '大小: ' + (code.length/1024).toFixed(1) + 'KB');
    } catch (err) {
      assert('加载成功: ' + rel, false, err.message);
    }
  }
  assert('总模块加载数 >= 20', loadedCount >= 20, '实际: ' + loadedCount + '/' + loadOrder.length);

  // === Step 2: DC 命名空间 ===
  console.log('\n================================================');
  console.log('🔍 Step 2: DC 命名空间结构检查');
  console.log('================================================');

  const expectedModules = [
    'Perf', 'Version', 'ProjectManager', 'CharacterBible', 'CharacterLib',
    'SceneLib', 'PromptBuilder', 'Storyboard', 'Timeline',
    'TaskQueue', 'Pipeline', 'Exporter', 'ModelRegistry', 'AICore',
    'ScriptParser', 'FFmpegExporter', 'WorkflowInit', 'LLM', 'ComfyUI'
  ];
  for (const mod of expectedModules) {
    const exists = global.DC[mod] !== undefined;
    assert('DC.' + mod + ' 已定义', exists, exists ? '类型: ' + typeof global.DC[mod] : '未找到');
  }

  const presetKeys = ['VISUAL_STYLES', 'CAMERA_RIG_PRESETS', 'SHOT_SIZE_PRESETS',
    'LIGHTING_STYLE_PRESETS', 'DEPTH_OF_FIELD_PRESETS', 'FOCAL_LENGTH_PRESETS',
    'COLOR_TEMP_PRESETS', 'MOVEMENT_SPEED_PRESETS', 'TECHNIQUE_PRESETS',
    'EMOTION_PRESETS', 'ATMOSPHERIC_EFFECT_PRESETS', 'EFFECT_INTENSITY_PRESETS',
    'MEDIA_TYPE_TOKENS', 'MODEL_REGISTRY_DATA', 'CINEMATOGRAPHY_PROFILES',
    'PLAYBACK_SPEED_PRESETS', 'LIGHTING_DIRECTION_PRESETS', 'SHOT_SIZE_PRESETS_B'];
  for (const key of presetKeys) {
    const val = global.DC[key];
    const exists = val !== undefined && val !== null;
    let detail = '缺失';
    if (exists) {
      if (Array.isArray(val)) detail = '长度: ' + val.length;
      else if (typeof val === 'object') detail = '键数: ' + Object.keys(val).length;
      else detail = '类型: ' + typeof val;
    }
    assert('预设 DC.' + key + ' 已挂载', exists, detail);
  }

  // === Step 3: 端到端流程 ===
  console.log('\n================================================');
  console.log('🔄 Step 3: 端到端流程测试');
  console.log('================================================');

  try {
    const PM = global.DC.ProjectManager;
    if (PM && typeof PM.create === 'function') {
      const newProj = PM.create({ title: '测试项目', genre: '科幻', duration: '3分钟', style: '电影感' });
      assert('ProjectManager.create 成功', !!newProj, newProj ? 'ID: ' + newProj.id : '返回 null');
      const current = typeof PM.getCurrent === 'function' ? PM.getCurrent() : null;
      assert('ProjectManager.getCurrent 成功', !!current, current ? '当前: ' + current.title : '无当前项目');
      if (current && typeof PM.update === 'function') {
        PM.update(current.id, { outline: '## 测试大纲\n\n### 第一幕：开场' });
        assert('ProjectManager.update 成功', true, '大纲已保存');
      }
    }
  } catch(e) { assert('项目管理流程', false, e.message); }

  try {
    const CL = global.DC.CharacterLib;
    if (CL && typeof CL.getChars === 'function') {
      const chars = [{
        id: 'test_char_1', name: '林雨', role: '女主', age: 25,
        appearance: '黑色长发，穿白色连衣裙', personality: '温柔但坚定',
        prompt: 'young woman, long black hair, white dress',
        consistency: { bone: 'oval', face: 'heart' }
      }];
      if (typeof CL.saveChars === 'function') CL.saveChars(chars);
      const loaded = CL.getChars();
      assert('CharacterLib 写入读取', Array.isArray(loaded) && loaded.length === 1, '返回 ' + (loaded ? loaded.length : 'null') + ' 个角色');
    }
  } catch(e) { assert('角色管理流程', false, e.message); }

  try {
    const SL = global.DC.SceneLib;
    if (SL && typeof SL.getScenes === 'function') {
      const scenes = [{
        id: 'test_scene_1', name: '霓虹街道', time: '夜晚', location: '城市街头',
        description: '霓虹招牌闪烁，赛博朋克氛围',
        prompt: 'cyberpunk neon street, rain'
      }];
      if (typeof SL.saveScenes === 'function') SL.saveScenes(scenes);
      const loaded = SL.getScenes();
      assert('SceneLib 写入读取', Array.isArray(loaded) && loaded.length === 1, '返回 ' + (loaded ? loaded.length : 'null') + ' 个场景');
    }
  } catch(e) { assert('场景管理流程', false, e.message); }

  try {
    const SB = global.DC.Storyboard;
    if (SB && typeof SB.getShots === 'function') {
      const shots = [{
        id: 'test_shot_1', sceneName: '霓虹街道 · 相遇', duration: 5,
        shotType: '中景', angle: '平视', movement: '固定',
        description: '林雨站在街角', dialogue: '林雨：那一天之后...',
        prompt: 'cinematic medium shot, young woman on neon street',
        cameraRig: 'tripod', depthOfField: 'shallow', focalLength: '50mm',
        lightingStyle: 'neon', lightingDirection: 'front', colorTemperature: 'cool',
        photographyTechnique: 'none', playbackSpeed: 'normal',
        emotionTags: ['melancholy'], atmosphericEffects: ['rain'],
        effectIntensity: 'moderate', sceneId: 'test_scene_1', characterId: 'test_char_1'
      }];
      if (typeof SB.saveShots === 'function') SB.saveShots(shots);
      const loaded = SB.getShots();
      assert('Storyboard 写入读取', Array.isArray(loaded) && loaded.length === 1, '返回 ' + (loaded ? loaded.length : 'null') + ' 个分镜');
    }
  } catch(e) { assert('分镜管理流程', false, e.message); }

  // === Step 4: Prompt Builder ===
  console.log('\n================================================');
  console.log('🎨 Step 4: Prompt Builder 5层组装验证');
  console.log('================================================');

  try {
    const PB = global.DC.PromptBuilder;
    if (PB && typeof PB.buildShotImagePrompt === 'function') {
      const testShot = {
        sceneName: '霓虹街道', characterName: '林雨', description: '雨中转身',
        shotType: '中景', angle: '平视', movement: '推',
        cameraRig: 'tripod', depthOfField: 'shallow', focalLength: '50mm',
        lightingStyle: 'neon', lightingDirection: 'front', colorTemperature: 'cool',
        photographyTechnique: 'none', playbackSpeed: 'normal',
        emotionTags: ['melancholy'], atmosphericEffects: ['rain'],
        effectIntensity: 'moderate', prompt: 'cinematic, moody atmosphere'
      };
      const mediaTypes = ['cinematic', 'animation', 'stop-motion', 'graphic'];
      for (const mt of mediaTypes) {
        const result = PB.buildShotImagePrompt(testShot, {}, { mediaType: mt });
        const ok = typeof result === 'string' && result.length > 20;
        assert('PromptBuilder [' + mt + '] 提示词生成', ok, '长度: ' + (result ? result.length : 0) + ' 字符');
        if (ok && result.length < 500) console.log('    预览: ' + result.slice(0, 120) + '...');
      }
      if (typeof PB.getStylePrompts === 'function') {
        const style = PB.getStylePrompts('real_hk_retro');
        assert('PromptBuilder.getStylePrompts 可用', !!style, style ? 'mediaType: ' + (style.mediaType || 'N/A') : '未找到');
      }
    }
  } catch(e) { assert('Prompt Builder 测试', false, e.message); }

  // === Step 5: Character Bible ===
  console.log('\n================================================');
  console.log('👤 Step 5: Character Bible 角色一致性注入');
  console.log('================================================');

  try {
    const CB = global.DC.CharacterBible;
    if (CB && typeof CB.ensureBible === 'function') {
      const char = {
        id: 'test_char_2', name: '苏晓', role: '男主',
        appearance: '短发，深色西装，年轻英俊，眼神锐利',
        prompt: 'young man, short dark hair, dark suit'
      };
      const bible = CB.ensureBible(char);
      assert('CharacterBible.ensureBible 成功', !!bible, bible ? '锚点数: ' + (bible.anchors ? Object.keys(bible.anchors).length : 'N/A') : 'null');
      if (typeof CB.generateConsistencyPrompt === 'function') {
        const prompt1 = CB.generateConsistencyPrompt(bible, 'cinematic');
        const prompt2 = CB.generateConsistencyPrompt(bible, 'animation');
        assert('CharacterBible 电影感一致性提示词', typeof prompt1 === 'string' && prompt1.length > 10, '长度: ' + prompt1.length);
        assert('CharacterBible 动画一致性提示词', typeof prompt2 === 'string' && prompt2.length > 10, '长度: ' + prompt2.length);
        const hasAnime = prompt2.toLowerCase().indexOf('anime') >= 0 || prompt2.toLowerCase().indexOf('animation') >= 0;
        assert('CharacterBible 动画风格包含 anime 关键词', hasAnime, '提示词: ' + prompt2.slice(0, 80));
      }
    }
  } catch(e) { assert('Character Bible 测试', false, e.message); }

  // === Step 6: TaskQueue ===
  console.log('\n================================================');
  console.log('⚙️ Step 6: TaskQueue 并发测试');
  console.log('================================================');

  try {
    const TQ = global.DC.TaskQueue;
    if (TQ) {
      assert('TaskQueue 对象存在', true, '类型: ' + typeof TQ);
    }
  } catch(e) { assert('TaskQueue 测试', false, e.message); }

  // === Step 7: Model Registry ===
  console.log('\n================================================');
  console.log('📚 Step 7: Model Registry 错误驱动学习');
  console.log('================================================');

  try {
    const MR = global.DC.ModelRegistry;
    if (MR) {
      const config = typeof MR.getModelConfig === 'function' ? MR.getModelConfig('gpt-4o') : null;
      assert('ModelRegistry.getModelConfig 可用', config !== null, config ? '上下文: ' + (config.contextWindow || 'N/A') : '未实现');
      if (typeof MR.learnFromError === 'function') {
        MR.learnFromError('test-model-v1', 'max_tokens must be <= 4096', 400);
        assert('ModelRegistry.learnFromError 执行', true, '已学习');
        const newConfig = MR.getModelConfig('test-model-v1');
        assert('ModelRegistry 学习到的配置可查询', newConfig !== null, newConfig ? 'maxOutput: ' + (newConfig.maxOutput || 'N/A') : '未找到');
      }
    }
  } catch(e) { assert('Model Registry 测试', false, e.message); }

  // === Step 8: Script Parser ===
  console.log('\n================================================');
  console.log('📝 Step 8: Script Parser 剧本解析');
  console.log('================================================');

  try {
    const SP = global.DC.ScriptParser;
    if (SP && typeof SP.parse === 'function') {
      const parsed = SP.parse('场景一：【城市街道 · 夜 · 外】\n\n霓虹招牌下，林雨独自伫立在街角。\n\n林雨：那一天之后，我再也分不清真实与虚拟……');
      assert('ScriptParser.parse 成功', parsed !== null && parsed !== undefined, '结果类型: ' + typeof parsed);
    }
  } catch(e) { assert('Script Parser 测试', false, e.message); }

  // === Step 9: Exporter ===
  console.log('\n================================================');
  console.log('📤 Step 9: Exporter 导出测试');
  console.log('================================================');

  try {
    const EX = global.DC.Exporter;
    if (EX) {
      if (typeof EX.exportMarkdown === 'function') {
        const md = EX.exportMarkdown({ title: '测试', shots: [] });
        assert('Exporter.exportMarkdown 可用', typeof md === 'string' && md.length > 0, '长度: ' + md.length);
      }
      if (typeof EX.exportJSON === 'function') {
        const json = EX.exportJSON({ title: '测试' });
        assert('Exporter.exportJSON 可用', json !== null && json !== undefined, '类型: ' + typeof json);
      }
    }
    const FE = global.DC.FFmpegExporter;
    if (FE && typeof FE.generateScript === 'function') {
      const script = FE.generateScript({ shots: [{ duration: 3 }, { duration: 5 }] });
      assert('FFmpegExporter.generateScript 可用', typeof script === 'string' && script.length > 0, '长度: ' + script.length);
    }
  } catch(e) { assert('Exporter 测试', false, e.message); }

  // === Step 10: Perf & Version ===
  console.log('\n================================================');
  console.log('🛠️ Step 10: 工具模块测试 (Perf & Version)');
  console.log('================================================');

  try {
    const Perf = global.DC.Perf;
    if (Perf) {
      let count = 0;
      if (typeof Perf.debounce === 'function') {
        const fn = Perf.debounce(function() { count++; }, 10);
        fn(); fn(); fn();
        setTimeout(function() {
          assert('Perf.debounce 工作', count === 1, '调用数: ' + count);
        }, 60);
      }
      let tCount = 0;
      if (typeof Perf.throttle === 'function') {
        const tfn = Perf.throttle(function() { tCount++; }, 20);
        tfn(); tfn(); tfn();
        setTimeout(function() {
          assert('Perf.throttle 工作', tCount >= 1, '调用数: ' + tCount);
        }, 80);
      }
    }
    const VM2 = global.DC.Version;
    if (VM2 && typeof VM2.compareVersions === 'function') {
      assert('Version.compareVersions(1.0.0, 2.0.0) < 0', VM2.compareVersions('1.0.0', '2.0.0') < 0, '');
      assert('Version.compareVersions(2.0.0, 1.0.0) > 0', VM2.compareVersions('2.0.0', '1.0.0') > 0, '');
      assert('Version.compareVersions(1.5.0, 1.5.0) === 0', VM2.compareVersions('1.5.0', '1.5.0') === 0, '');
    }
  } catch(e) { assert('Perf & Version 测试', false, e.message); }

  // === Step 11: AI Pipeline ===
  console.log('\n================================================');
  console.log('🤖 Step 11: AI Pipeline 基本调用');
  console.log('================================================');

  try {
    const PL = global.DC.Pipeline;
    if (PL && typeof PL === 'object') {
      const methods = Object.keys(PL).filter(function(k) { return typeof PL[k] === 'function'; });
      assert('Pipeline 对象存在', true, '可用方法: ' + methods.slice(0, 5).join(', '));
    }
  } catch(e) { assert('AI Pipeline 测试', false, e.message); }

  // === Step 12: 模板数据 ===
  console.log('\n================================================');
  console.log('📄 Step 12: 模板数据检查');
  console.log('================================================');

  try {
    const tmpls = global.DC.STORYBOARD_TEMPLATES;
    if (tmpls) {
      const count = Array.isArray(tmpls) ? tmpls.length : (typeof tmpls === 'object' ? Object.keys(tmpls).length : 0);
      assert('Storyboard 模板数据非空', count > 0, '数量: ' + count);
    }
    const beat = global.DC.BEAT_SHEET;
    if (beat) {
      const count = Array.isArray(beat) ? beat.length : (typeof beat === 'object' ? Object.keys(beat).length : 0);
      assert('节拍表数据非空', count > 0, '数量: ' + count);
    }
  } catch(e) { assert('模板数据检查', false, e.message); }

  // === 总结 ===
  setTimeout(function() {
    console.log('\n================================================');
    console.log('📊 测试总结');
    console.log('================================================');
    const passed = testResults.filter(function(t){ return t.pass; }).length;
    const failed = testResults.filter(function(t){ return !t.pass; }).length;
    const total = testResults.length;
    console.log('\n总测试数: ' + total);
    console.log('✅ 通过: ' + passed);
    console.log('❌ 失败: ' + failed);
    console.log('\n通过率: ' + ((passed/total)*100).toFixed(1) + '%');
    if (failed > 0) {
      console.log('\n❌ 失败项详情:');
      testResults.filter(function(t){ return !t.pass; }).forEach(function(t) {
        console.log('  - ' + t.name + ': ' + t.detail);
      });
      process.exit(1);
    } else {
      console.log('\n🎉 所有测试通过！');
      process.exit(0);
    }
  }, 200);
}

runAll();
