/* =========================================================
   AI 导演台 · ComfyUI 图像生成集成 (app-comfyui.js)
   - 连接本地 ComfyUI 实例
   - 使用 /prompt 接口提交文生图工作流
   - 为每个分镜生成图像并写回
   ========================================================= */

(function () {
  'use strict';
  const DC = window.DC;
  if (!DC) return;

  const CONFIG_KEY = 'dc_comfyui_v1';

  function loadConfig() {
    const saved = DC.Storage.get(CONFIG_KEY, null);
    if (saved) return saved;
    return {
      endpoint: 'http://127.0.0.1:8188',
      model: 'flux_dev_schnell_fp8.safetensors',
      width: 1024,
      height: 576,
      steps: 6,
    };
  }

  function saveConfig(cfg) { DC.Storage.set(CONFIG_KEY, cfg); }

  async function testConnection() {
    const cfg = loadConfig();
    try {
      const r = await fetch(cfg.endpoint.replace(/\/$/, '') + '/system_stats');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { ok: true, message: 'ComfyUI 已连接' };
    } catch (e) {
      return { ok: false, message: '无法连接 ComfyUI：' + e.message };
    }
  }

  async function listModels() {
    const cfg = loadConfig();
    try {
      const r = await fetch(cfg.endpoint.replace(/\/$/, '') + '/object_info');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      return Object.keys(data['CheckpointLoaderSimple'] || {});
    } catch (e) {
      return [];
    }
  }

  function buildWorkflow(prompt, cfg) {
    // 简单的 text → image 工作流（k-sampler + vae + save）
    return {
      '3': { inputs: { seed: Math.floor(Math.random() * 1e10), steps: cfg.steps || 6, cfg: 1, sampler_name: 'dpmpp_2m_sde_gpu', scheduler: 'karras', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] }, class_type: 'KSampler', _meta: {} },
      '4': { inputs: { ckpt_name: cfg.model || 'flux_dev_schnell_fp8.safetensors' }, class_type: 'CheckpointLoaderSimple', _meta: {} },
      '5': { inputs: { width: cfg.width || 1024, height: cfg.height || 576, batch_size: 1 }, class_type: 'EmptyLatentImage', _meta: {} },
      '6': { inputs: { text: prompt, clip: ['4', 1] }, class_type: 'CLIPTextEncode', _meta: {} },
      '7': { inputs: { text: 'low quality, blurry, bad anatomy, watermark, ugly, deformed' }, class_type: 'CLIPTextEncode', _meta: {} },
      '8': { inputs: { samples: ['3', 0], vae: ['4', 2] }, class_type: 'VAEDecode', _meta: {} },
      '9': { inputs: { filename_prefix: 'AIDirector_', images: ['8', 0] }, class_type: 'SaveImage', _meta: {} },
    };
  }

  async function generateOne(prompt, width, height) {
    const cfg = loadConfig();
    const body = { prompt: buildWorkflow(prompt, Object.assign({}, cfg, { width: width || cfg.width, height: height || cfg.height })) };
    const url = cfg.endpoint.replace(/\/$/, '') + '/prompt';
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const promptId = data.prompt_id;
    // 轮询获取图片：最多 30 秒
    const imgUrl = await waitForImage(promptId, cfg.endpoint);
    return imgUrl;
  }

  async function waitForImage(promptId, endpoint) {
    const historyUrl = endpoint.replace(/\/$/, '') + '/history/' + promptId;
    const maxWait = 60;
    for (let i = 0; i < maxWait; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      try {
        const r = await fetch(historyUrl);
        if (!r.ok) continue;
        const data = await r.json();
        if (data[promptId] && data[promptId].outputs) {
          for (const nodeId in data[promptId].outputs) {
            const out = data[promptId].outputs[nodeId];
            if (out && out.images && out.images.length) {
              const img = out.images[0];
              return endpoint.replace(/\/$/, '') + '/view?filename=' + encodeURIComponent(img.filename) + '&subfolder=&type=output';
            }
          }
        }
      } catch (e) {}
    }
    throw new Error('生成超时（60秒未收到图像）');
  }

  async function generateForShots() {
    const p = DC.ProjectManager.getCurrent();
    if (!p) { DC.toast('请先选择项目', 'warning'); return; }
    const shots = (p.shots || []).slice();
    const targets = shots.filter((s) => !s.imageUrl && s.prompt && s.prompt.length > 5);
    if (targets.length === 0) { DC.toast('没有需要生成图像的分镜（请确保分镜已有 prompt）', 'warning'); return; }
    const conn = await testConnection();
    if (!conn.ok) { DC.toast(conn.message, 'error'); return; }
    if (DC.Log) DC.Log.info(`🖼️ ComfyUI 开始为 ${targets.length} 个分镜生成图像...`);
    for (let i = 0; i < targets.length; i++) {
      const s = targets[i];
      try {
        if (DC.Log) DC.Log.info(`  → [#${i + 1}/${targets.length}] ${s.sceneName || '分镜'}`);
        const imgUrl = await generateOne(s.prompt, 1024, 576);
        s.imageUrl = imgUrl;
        const idx = shots.findIndex((x) => x.id === s.id);
        if (idx !== -1) shots[idx] = s;
        DC.ProjectManager.updateShots(shots);
        if (DC.Log) DC.Log.success(`  ✅ [#${i + 1}] 图像已生成`);
      } catch (e) {
        if (DC.Log) DC.Log.error(`  ❌ [#${i + 1}] 失败：${e.message}`);
      }
    }
    if (DC.Log) DC.Log.success('🖼️ 图像生成完成');
    if (DC.Storyboard && DC.Storyboard.render) DC.Storyboard.render();
    DC.toast('图像生成完成', 'success');
  }

  function showSettings() {
    const cfg = loadConfig();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div style="font-size:13px;color:var(--text-2);margin-bottom:10px;">ComfyUI 需要在本地运行，并允许跨域请求（通常默认已启用）。</div>
      <div class="form-grid">
        <label class="full">服务地址（必须带端口）：<input id="cf-endpoint" value="${DC.Utils.escapeHtml(cfg.endpoint)}" placeholder="http://127.0.0.1:8188" /></label>
        <label>模型文件名：<input id="cf-model" value="${DC.Utils.escapeHtml(cfg.model)}" placeholder="flux_dev_schnell_fp8.safetensors" /></label>
        <label>宽度(px)：<input id="cf-width" type="number" value="${cfg.width}" /></label>
        <label>高度(px)：<input id="cf-height" type="number" value="${cfg.height}" /></label>
        <label>步数：<input id="cf-steps" type="number" value="${cfg.steps}" /></label>
        <label class="full" style="color:var(--accent);cursor:pointer;" onclick="DC.ComfyUI.testAndShow()">🔌 点击测试连接</label>
      </div>`;
    DC.modal.open({
      title: '🖼️ ComfyUI 设置',
      body: wrapper,
      confirmText: '保存',
      onConfirm: () => {
        const newCfg = {
          endpoint: wrapper.querySelector('#cf-endpoint').value.trim() || cfg.endpoint,
          model: wrapper.querySelector('#cf-model').value.trim() || cfg.model,
          width: parseInt(wrapper.querySelector('#cf-width').value) || cfg.width,
          height: parseInt(wrapper.querySelector('#cf-height').value) || cfg.height,
          steps: parseInt(wrapper.querySelector('#cf-steps').value) || cfg.steps,
        };
        saveConfig(newCfg);
        DC.toast('ComfyUI 配置已保存', 'success');
      },
    });
  }

  async function testAndShow() {
    const r = await testConnection();
    if (r.ok) DC.toast('✅ ' + r.message, 'success');
    else DC.toast('❌ ' + r.message, 'error');
  }

  DC.ComfyUI = {
    init() {
      // 在 AI 设置弹窗（app-llm.js）中已预留 ComfyUI 入口按钮的钩子
      // 若存在 btnBatchGen，则允许用户点击后通过 ComfyUI 生成图像
      const btn = document.getElementById('btnBatchGen');
      if (btn) {
        // 在按钮旁注入「🎨 用 ComfyUI 成图」的链接
        btn.addEventListener('dblclick', () => DC.ComfyUI.generateForShots());
      }
    },
    generateForShots,
    showSettings,
    testAndShow,
    testConnection,
    getConfig() { return loadConfig(); },
  };
})();
