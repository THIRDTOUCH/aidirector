/* =========================================================
   AI 导演台 · FFmpeg 视频合成脚本导出 (ffmpeg-exporter.js)
   - 把项目 shots + 视频文件列表 -> 生成 Windows / macOS / Linux 可用的脚本
   - 导出两种格式：
     1) FFmpeg concat script（纯命令行拼接）
     2) 项目 JSON（供上游工具二次处理）
   ========================================================= */

(function () {
  'use strict';

  const DC = window.DC;
  if (!DC) { console.error('DC 未初始化'); return; }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  function sanitizeFilename(name) {
    return (name || 'project').replace(/[\\/:*?"<>|]/g, '_');
  }

  function buildConcatList(shots) {
    // 约定：视频文件按分镜顺序命名为 shot_001.mp4, shot_002.mp4 ...
    // 如果用户提供自定义文件名，则使用 shot.videoFile 字段
    const lines = [];
    (shots || []).forEach((s, i) => {
      const file = s.videoFile || `shot_${String(i + 1).padStart(3, '0')}.mp4`;
      lines.push(`file '${file}'`);
      if (s.duration) lines.push(`duration ${s.duration}`);
    });
    return lines.join('\n');
  }

  function buildFFmpegScript(project, outName) {
    const base = sanitizeFilename(outName || project.name || 'output');
    const shots = project.shots || [];
    const concatListName = base + '_files.txt';

    const totalSeconds = shots.reduce((a, s) => a + (parseInt(s.duration, 10) || 3), 0);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    let shellScript = '#!/bin/bash\n';
    shellScript += '# ========================================================\n';
    shellScript += `# 项目: ${project.name || '未命名项目'}\n`;
    shellScript += `# 类型: ${project.genre || ''}  时长预估: ${mins}分${secs}秒\n`;
    shellScript += `# 分镜数: ${shots.length}\n`;
    shellScript += `# 用法: 将本脚本与所有 ${concatListName} 视频放在同一目录下，执行:\n`;
    shellScript += `#   bash ${base}_concat.sh\n`;
    shellScript += '# ========================================================\n\n';
    shellScript += `set -e\n\n`;
    shellScript += `CONCAT_FILE="${concatListName}"\n`;
    shellScript += `OUTPUT_FILE="${base}_final.mp4"\n\n`;
    shellScript += '# 检查 ffmpeg 是否安装\n';
    shellScript += 'if ! command -v ffmpeg &> /dev/null; then\n';
    shellScript += '  echo "[错误] 未检测到 ffmpeg，请先安装: https://ffmpeg.org/download.html"\n';
    shellScript += '  exit 1\n';
    shellScript += 'fi\n\n';
    shellScript += '# ========================================================\n';
    shellScript += '# 第一步: 统一每个分镜的编码参数（避免拼接失败）\n';
    shellScript += '# 如您的每个分镜已是标准 mp4，此步可跳过\n';
    shellScript += '# ========================================================\n\n';
    shellScript += 'mkdir -p normalized\n';
    shellScript += 'i=0\n';
    shellScript += `while IFS= read -r line; do\n`;
    shellScript += `  if [[ "$line" == file* ]]; then\n`;
    shellScript += `    fname=$(echo "$line" | sed -E "s/^file '(.*)'/\\1/")\n`;
    shellScript += `    if [ -f "$fname" ]; then\n`;
    shellScript += `      echo "归一化: $fname"\n`;
    shellScript += `      ffmpeg -y -i "$fname" -c:v libx264 -pix_fmt yuv420p -r 30 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:a aac -b:a 128k -ar 44100 "normalized/$fname" -loglevel error\n`;
    shellScript += `    fi\n`;
    shellScript += `  fi\n`;
    shellScript += `done < "$CONCAT_FILE"\n\n`;
    shellScript += '# 重新生成归一化后的 concat list\n';
    shellScript += `: > "normalized_${base}_files.txt"\n`;
    shellScript += `for f in normalized/*.mp4; do\n`;
    shellScript += `  [ -f "$f" ] && echo "file '../$f'" >> "normalized_${base}_files.txt"\n`;
    shellScript += `done\n\n`;
    shellScript += '# ========================================================\n';
    shellScript += '# 第二步: 拼接\n';
    shellScript += '# ========================================================\n\n';
    shellScript += `ffmpeg -y -f concat -safe 0 -i "normalized_${base}_files.txt" -c copy "$OUTPUT_FILE" || \\\n`;
    shellScript += `  ffmpeg -y -f concat -safe 0 -i "normalized_${base}_files.txt" -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k "$OUTPUT_FILE"\n\n`;
    shellScript += `echo ""\n`;
    shellScript += `echo "[完成] 已输出: $OUTPUT_FILE"\n`;

    // Windows batch 版本
    let batScript = '@echo off\r\n';
    batScript += 'REM ========================================================\r\n';
    batScript += `REM 项目: ${project.name || '未命名项目'}\r\n`;
    batScript += `REM 预估时长: ${mins}分${secs}秒  分镜数: ${shots.length}\r\n`;
    batScript += `REM 用法: 将本 .bat 与所有视频放在同一目录，双击运行\r\n`;
    batScript += 'REM ========================================================\r\n\r\n';
    batScript += 'where ffmpeg >nul 2>nul\r\n';
    batScript += 'if %errorlevel% neq 0 (\r\n';
    batScript += '  echo [错误] 未检测到 ffmpeg，请先安装: https://ffmpeg.org/download.html\r\n';
    batScript += '  pause\r\n';
    batScript += '  exit /b 1\r\n';
    batScript += ')\r\n\r\n';
    batScript += 'if not exist normalized mkdir normalized\r\n';
    batScript += `set "CONCAT=${concatListName}"\r\n`;
    batScript += `set "OUTPUT=${base}_final.mp4"\r\n\r\n`;
    batScript += 'echo [步骤 1] 归一化每个分镜...\r\n';
    batScript += `for /f "usebackq tokens=1,2 delims=' " %%a in ("%CONCAT%") do (\r\n`;
    batScript += '  if "%%a"=="file" (\r\n';
    batScript += '    echo   -> %%b\r\n';
    batScript += '    ffmpeg -y -i "%%b" -c:v libx264 -pix_fmt yuv420p -r 30 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:a aac -b:a 128k -ar 44100 "normalized/%%b" -loglevel error\r\n';
    batScript += '  )\r\n';
    batScript += ')\r\n\r\n';
    batScript += `type nul > normalized_${base}_files.txt\r\n`;
    batScript += 'for %%f in (normalized\\*.mp4) do echo file \'%%~ff\' >> normalized_'+base+'_files.txt\r\n\r\n';
    batScript += 'echo [步骤 2] 合成最终视频...\r\n';
    batScript += `ffmpeg -y -f concat -safe 0 -i normalized_${base}_files.txt -c copy "%OUTPUT%"\r\n`;
    batScript += 'if errorlevel 1 (\r\n';
    batScript += `  echo [回退] 重新编码合成中...\r\n`;
    batScript += `  ffmpeg -y -f concat -safe 0 -i normalized_${base}_files.txt -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k "%OUTPUT%"\r\n`;
    batScript += ')\r\n\r\n';
    batScript += `echo.\r\n`;
    batScript += `echo [完成] 已输出: %OUTPUT%\r\n`;
    batScript += 'pause\r\n';

    return {
      shellScript,
      batScript,
      concatList: buildConcatList(shots),
      projectJson: JSON.stringify({
        name: project.name,
        genre: project.genre,
        style: project.style,
        duration: project.duration,
        shots: shots.map((s, i) => ({
          order: i + 1,
          scene: s.scene,
          characterName: s.characterName,
          shotType: s.shotType,
          angle: s.angle,
          movement: s.movement,
          description: s.description,
          dialogue: s.dialogue,
          duration: s.duration,
          expectedVideoFile: s.videoFile || `shot_${String(i + 1).padStart(3, '0')}.mp4`,
        })),
      }, null, 2),
    };
  }

  // ---------- 导出面板 ----------
  function renderPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const p = DC.ProjectManager.getCurrent();
    const shots = (p && p.shots) || [];

    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">🎞️ 视频合成导出</div>
        <div class="panel-subtitle">导出 FFmpeg 拼接脚本，本地运行即可把 AI 生成的分镜视频合成为完整短片。</div>
      </div>
      <div class="panel-body" style="padding:16px;">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
          <span style="font-size:13px;">当前项目: <b>${p ? DC.Utils.escapeHtml(p.name) : '（未选择项目）'}</b></span>
          <span style="font-size:13px;color:var(--text-2);">分镜: ${shots.length} 个</span>
          <span style="font-size:13px;color:var(--text-2);">
            预估总时长: ${(() => { const total = shots.reduce((a, s) => a + (parseInt(s.duration, 10) || 3), 0); return Math.floor(total / 60) + '分' + (total % 60) + '秒'; })()}
          </span>
        </div>

        <div class="card" style="padding:12px;">
          <div style="font-weight:600;margin-bottom:6px;">步骤说明</div>
          <ol style="font-size:12px;line-height:1.8;padding-left:18px;margin:0;color:var(--text-2);">
            <li>点击下方按钮 → 下载 3 个文件（shell/bat/json）</li>
            <li>把每个分镜对应的视频文件命名为 <code style="background:var(--bg-1);padding:1px 6px;border-radius:4px;">shot_001.mp4</code>、<code style="background:var(--bg-1);padding:1px 6px;border-radius:4px;">shot_002.mp4</code>... 与脚本放在同一目录</li>
            <li>macOS/Linux 运行 <code style="background:var(--bg-1);padding:1px 6px;border-radius:4px;">bash xxx_concat.sh</code>，Windows 双击 <code style="background:var(--bg-1);padding:1px 6px;border-radius:4px;">xxx_concat.bat</code></li>
            <li>获得合成后的完整视频 <code style="background:var(--bg-1);padding:1px 6px;border-radius:4px;">xxx_final.mp4</code></li>
          </ol>
        </div>

        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="btnDownloadAll" ${shots.length === 0 ? 'disabled' : ''}>📦 一键下载全部（3 文件）</button>
          <button class="btn" id="btnDownloadJson" ${shots.length === 0 ? 'disabled' : ''}>📄 仅下载项目 JSON</button>
          <button class="btn" id="btnDownloadFileList" ${shots.length === 0 ? 'disabled' : ''}>📋 仅下载 files.txt（分镜清单）</button>
          <button class="btn" id="btnDownloadShots" ${shots.length === 0 ? 'disabled' : ''}>🎬 仅下载分镜表 CSV</button>
        </div>
        ${shots.length === 0 ? '<div class="hint" style="margin-top:12px;">⚠️ 当前项目尚无分镜，请前往分镜页或工作流页先生成分镜。</div>' : ''}

        <div style="margin-top:18px;padding:10px 12px;border:1px dashed var(--border);border-radius:8px;">
          <div style="font-weight:600;margin-bottom:4px;">当前分镜预览</div>
          ${shots.slice(0, 8).map((s, i) => `
            <div style="font-size:12px;color:var(--text-2);line-height:1.7;">
              #${i + 1} · ${s.duration || 5}s · ${s.shotType || '中景'} / ${s.angle || '平视'} / ${s.movement || '固定'}
              ${s.scene ? '· 场景: ' + DC.Utils.escapeHtml(s.scene) : ''}
              ${s.characterName ? '· 角色: ' + DC.Utils.escapeHtml(s.characterName) : ''}
              <span style="color:var(--text-1);">→ ${DC.Utils.escapeHtml((s.description || '').slice(0, 80))}</span>
            </div>
          `).join('') || '<div style="font-size:12px;color:var(--text-2);">（无分镜）</div>'}
          ${shots.length > 8 ? `<div style="font-size:12px;color:var(--text-2);">... 共 ${shots.length} 个分镜</div>` : ''}
        </div>
      </div>
    `;

    const btnAll = document.getElementById('btnDownloadAll');
    if (btnAll) btnAll.onclick = () => {
      const proj = DC.ProjectManager.getCurrent();
      if (!proj) return;
      const out = buildFFmpegScript(proj);
      const base = sanitizeFilename(proj.name || 'project');
      download(base + '_files.txt', out.concatList, 'text/plain;charset=utf-8');
      download(base + '_concat.sh', out.shellScript, 'text/x-shellscript;charset=utf-8');
      download(base + '_concat.bat', out.batScript, 'text/x-bat;charset=utf-8');
      download(base + '.json', out.projectJson, 'application/json;charset=utf-8');
      DC.toast('已下载 ' + base + '_files.txt/.sh/.bat/.json', 'success');
    };

    const btnJson = document.getElementById('btnDownloadJson');
    if (btnJson) btnJson.onclick = () => {
      const proj = DC.ProjectManager.getCurrent();
      if (!proj) return;
      const out = buildFFmpegScript(proj);
      download(sanitizeFilename(proj.name) + '.json', out.projectJson, 'application/json;charset=utf-8');
    };

    const btnFiles = document.getElementById('btnDownloadFileList');
    if (btnFiles) btnFiles.onclick = () => {
      const proj = DC.ProjectManager.getCurrent();
      if (!proj) return;
      const out = buildFFmpegScript(proj);
      download(sanitizeFilename(proj.name) + '_files.txt', out.concatList, 'text/plain;charset=utf-8');
    };

    const btnCsv = document.getElementById('btnDownloadShots');
    if (btnCsv) btnCsv.onclick = () => {
      const proj = DC.ProjectManager.getCurrent();
      if (!proj) return;
      const headers = ['序号', '场景', '角色', '景别', '机位', '运镜', '时长(秒)', '画面描述', '对白'];
      const rows = (proj.shots || []).map((s, i) => [
        String(i + 1),
        s.scene || '',
        s.characterName || '',
        s.shotType || '',
        s.angle || '',
        s.movement || '',
        String(s.duration || 5),
        (s.description || '').replace(/[\r\n,]/g, ' '),
        (s.dialogue || '').replace(/[\r\n,]/g, ' '),
      ]);
      const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      download(sanitizeFilename(proj.name) + '_shots.csv', csv, 'text/csv;charset=utf-8');
    };
  }

  DC.FFmpegExporter = {
    render: renderPanel,
    build: buildFFmpegScript,
  };
})();
