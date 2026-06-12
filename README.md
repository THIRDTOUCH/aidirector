# 🎬 AI 导演台 · Director Console

> AI 驱动的动漫短剧创作工具 —— 从剧本到分镜全流程，纯浏览器版

**当前版本：v1.0.0**
**发布日期：2026-06-12**
**运行环境：任何现代浏览器（Chrome / Edge / Firefox / Safari，推荐 Chromium 内核）**

---

## ✨ 功能亮点

| 模块 | 功能 |
|------|------|
| 📁 **项目管理** | 创建 / 编辑 / 删除 / 搜索 / 导出导入项目 |
| 📖 **故事大纲** | 输入一句话概要，AI 自动生成完整故事大纲 |
| ✍️ **剧本** | 基于大纲 AI 生成剧本；支持手动续写编辑 |
| 👥 **角色库** | 角色设定、外貌、性格、背景，AI 自动生成，参考图 |
| 🏞️ **场景库** | 场景描述、光影、道具、视角、绘图提示词 |
| 🎞️ **分镜脚本** | 剧本 → 景别 / 机位 / 运镜 / 时长 / 台词 / 画面描述 / 提示词 |
| ⏱️ **时间轴** | 可视化分镜时间轴、自动排序、预览播放 |
| 🤖 **智能体协作** | 创意总监 → 编剧 → 分镜师 → 角色设计师 → 美术指导 → 视觉生成 |
| ⚙️ **AI 设置** | 多供应商配置（OpenAI / Anthropic / 通义千问 / 自定义端点） |
| 📤 **导出** | JSON / Markdown / HTML 放映页 / FFmpeg 合成脚本 |
| 🔗 **工作流** | 五步流水线视图，一键串联从大纲到成片 |

---

## 🚀 快速开始

### 方式一：直接打开（最简单）

```bash
# 直接在浏览器中打开
open aidirector/index.html          # macOS
# 或者 Windows 下双击 index.html
```

### 方式二：本地启动 HTTP 服务（推荐，用于 Service Worker / PWA）

```bash
# 使用 Python（系统自带）
cd aidirector
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000

# 或者使用 npx
npx serve aidirector

# 或者使用 Node 自带
cd aidirector && npx http-server -p 8000
```

> 💡 **PWA 功能（离线缓存、添加到主屏幕）** 需要通过 `http://` 或 `https://` 协议访问才会生效（直接双击 `file://` 打开时 Service Worker 会被浏览器禁用）。

---

## 🔧 AI 配置

### 首次使用

1. 打开页面后点击右上角 ⚙️ 按钮，进入「AI 设置」
2. 选择供应商：**OpenAI / Anthropic / 通义千问 / 自定义**
3. 填入对应的 **API Key** 与 **模型名称**（例如 `gpt-4o-mini`、`claude-3-haiku-20240307`、`qwen-plus` 等）
4. 保存，顶部状态指示灯从灰色变为绿色即表示就绪

### 使用 ComfyUI 生图

1. 启动本地 ComfyUI：`python main.py --enable-cors-header`
2. 默认端点：`http://127.0.0.1:8188`
3. 在「分镜」页点击 🎬 **批量生成画面** 触发

---

## 📂 项目结构

```
aidirector/
├── index.html                  # 主页面（11 个 Tab + 模态框 + Toast）
├── style.css                   # 整体样式（1673 行）
├── manifest.json               # PWA 应用清单
├── service-worker.js           # PWA 离线缓存 Service Worker
├── version.json                # 版本信息（供检测更新）
├── package.json                # 项目元信息
├── favicon.svg                 # 浏览器标签图标
├── icons/                      # PWA 图标（72 / 96 / 128 / 144 / 152 / 192 / 384 / 512）
│   ├── icon-72.svg
│   ├── icon-96.svg
│   ├── icon-128.svg
│   ├── icon-144.svg
│   ├── icon-152.svg
│   ├── icon-192.svg
│   ├── icon-384.svg
│   └── icon-512.svg
├── js/
│   ├── core/                   # 核心框架
│   │   ├── app.js              # 页面主控制器（Tab/Modal/Toast/快捷键/初始化）
│   │   └── ai-core.js          # AI 设置页渲染 + 多供应商配置管理
│   ├── integrations/           # 外部服务集成
│   │   ├── app-llm.js          # LLM API 调用封装
│   │   └── app-comfyui.js      # ComfyUI 图像生成
│   └── modules/                # 业务模块
│       ├── project-manager.js  # 项目 CRUD + localStorage 持久化
│       ├── character-lib.js    # 角色库 + AI 生成角色
│       ├── scene-lib.js        # 场景库 + AI 生成场景
│       ├── storyboard.js       # 分镜脚本（含拖拽排序、批量提示词）
│       ├── timeline.js         # 时间轴可视化
│       ├── ai-pipeline.js      # 智能体协作流水线
│       ├── workflow-init.js    # 五步骤工作流页面
│       ├── script-parser.js    # 剧本解析工具
│       ├── exporter.js         # Markdown / JSON / HTML 导出
│       └── ffmpeg-exporter.js  # FFmpeg 视频合成脚本导出
└── README.md                   # 本文件
```

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `N` | 在当前 Tab 新建（项目 / 角色 / 场景 / 分镜） |
| `D` | 删除列表第一项 |
| `Ctrl / Cmd + S` | 保存（数据自动保存到 localStorage） |
| `Ctrl / Cmd + 1~9` | 快速切换 Tab |
| `Esc` | 关闭弹窗 |
| `/` 或 `?` | 显示快捷键帮助 |

---

## 💾 数据存储

所有项目数据（项目、大纲、剧本、角色、场景、分镜）都保存在浏览器 `localStorage` 中，**不会上传到任何服务器**。

键名前缀：项目使用 `directorProject_*`、当前项目上下文使用 `currentProjectId` 等。

可在「项目」页点击导出按钮导出 JSON 备份文件。

---

## 🎨 设计语言

- **主色（导演紫）**：`#6366f1` → `#4338ca` 渐变
- **强调色（导演金）**：`#f59e0b` → `#fbbf24`
- **背景**：`#0f1117` / `#12151d` / `#1a1e2a` / `#232838`
- **边框**：`#2a2f40`
- **字体**：系统中文字体栈（'Microsoft YaHei' / 'PingFang SC' / sans-serif）

---

## 📝 典型工作流

1. **新建项目** → 填写项目名、一句话概要、类型与风格
2. **生成大纲** → AI 根据概要生成完整故事大纲
3. **编写剧本** → AI 基于大纲生成剧本文本，手动微调
4. **拆解角色 & 场景** → 从剧本自动抽取人物锚点、核心场景
5. **生成分镜** → 剧本 → 逐镜头脚本（景别 / 运镜 / 时长 / 画面）
6. **批量生图** → 为每个分镜生成 AI 绘图提示词 / 调用 ComfyUI 出图
7. **导出成片** → 导出 HTML 放映页或 FFmpeg 合成脚本

---

## 🐛 常见问题

| 问题 | 解决 |
|------|------|
| **AI 按钮点击后无反应** | 检查右上角指示灯是否变绿；确认 API Key 已填并保存 |
| **生成时提示 "网络错误"** | 检查防火墙 / CORS；某些供应商需要国内网络环境或代理 |
| **分镜拖拽不生效** | 需要通过 `http://` 协议访问（`file://` 下部分 API 受限） |
| **PWA 不能安装** | 需要 HTTPS 或 localhost；打开 DevTools → Application → Manifest 检查 |
| **数据丢失** | 不要清空浏览器缓存；平时定期导出 JSON 做备份 |

---

## 📄 License

MIT © AI 导演台

> 本工具仅在本地浏览器运行，您的剧本与 AI Key 不会上传到任何第三方服务器（除了您配置的 LLM 供应商 API 外）。
