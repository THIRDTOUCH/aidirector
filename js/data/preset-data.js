/**
 * ============================================================
 * AI 导演台 · Data / Prompt Presets 合集
 *
 * 纯浏览器版 - 原生 JavaScript IIFE 挂载到 window.DC
 * 包含：
 *   DC.BRAND_REGISTRY
 *   DC.MODEL_DISPLAY_NAMES
 *   DC.CAMERA_DICTIONARY
 *   DC.DIRECTOR_PRESETS
 *   DC.VISUAL_STYLE_PRESETS
 *   DC.CINEMATOGRAPHY_PROFILES
 *   DC.CHARACTER_IDENTITY_ANCHORS
 *   DC.SCENE_PROMPT_TEMPLATES
 *
 * 原文件来源：aidirector/js 目录下上传的 142 个 TypeScript 文件
 * 其中 ~10 个为纯知识/预设/数据文件，其余为 React/Electron 框架代码
 * ============================================================
 */

(function () {
  'use strict';

  // ============================================================
  // ① 品牌注册表 (brand-mapping.ts)
  // ============================================================
  const BRAND_REGISTRY = {
    openai:       { displayName: 'OpenAI',              color: '#10A37F' },
    anthropic:    { displayName: 'Anthropic',           color: '#D97757' },
    google:       { displayName: 'Google',              color: '#4285F4' },
    deepseek:     { displayName: 'DeepSeek',            color: '#4D6BFE' },
    zhipu:        { displayName: 'ChatGLM (智谱)',       color: '#3485FF' },
    doubao:       { displayName: 'Doubao (豆包)',        color: '#A569FF' },
    kling:        { displayName: 'Kling (可灵)',         color: '#04A6F0' },
    midjourney:   { displayName: 'Midjourney',          color: '#000000' },
    flux:         { displayName: 'Flux',                color: '#333333' },
    grok:         { displayName: 'Grok (xAI)',          color: '#000000' },
    alibaba:      { displayName: 'Bailian (阿里云百炼)', color: '#FF6A00' },
    moonshot:     { displayName: 'Moonshot',            color: '#5B5BD6' },
    minimax:      { displayName: 'Minimax',             color: '#E2167E' },
    ollama:       { displayName: 'Ollama',              color: '#333333' },
    mistral:      { displayName: 'Mistral',             color: '#FA500F' },
    hunyuan:      { displayName: '腾讯',                 color: '#0055E9' },
    vidu:         { displayName: 'Vidu',                color: '#333333' },
    replicate:    { displayName: 'Replicate',           color: '#333333' },
    wenxin:       { displayName: 'Wenxin (文心)',        color: '#0A51C3' },
    siliconcloud: { displayName: 'SiliconFlow (硅基流动)', color: '#7C3AED' },
    spark:        { displayName: 'Spark (讯飞星火)',      color: '#3DC8F9' },
    fal:          { displayName: 'Fal-ai',              color: '#333333' },
    luma:         { displayName: 'Luma',                color: '#4400AA' },
    runway:       { displayName: 'Runway',              color: '#333333' },
    ideogram:     { displayName: 'Ideogram',            color: '#333333' },
    suno:         { displayName: 'Suno',                color: '#333333' },
    other:        { displayName: '其他',                color: '#6B7280' }
  };

  // ============================================================
  // ② 模型友好名 (model-display-names.ts) - 精选常见模型
  // ============================================================
  const MODEL_DISPLAY_NAMES = {
    // --- Google / Gemini ---
    'gemini-3.1-pro-image-preview': 'Nano Banana 2 (Gemini 3.1 Pro)',
    'gemini-3-pro-image-preview':   'Nano Banana Pro (Gemini 3 Pro)',
    'gemini-2.5-flash-image':       'Nano Banana (Gemini 2.5 Flash)',

    // --- OpenAI ---
    'gpt-image-1.5':                'GPT Image 1.5',
    'gpt-image-1':                  'GPT Image 1',
    'sora_image':                   'Sora 图片生成',
    'gpt-4o':                       'GPT-4o',
    'gpt-4o-mini':                  'GPT-4o Mini',
    'o3':                           'o3',
    'o1':                           'o1',

    // --- Flux ---
    'flux-dev':                     'Flux Dev',
    'flux-schnell':                 'Flux Schnell',
    'flux-pro':                     'Flux Pro',
    'flux-pro-1.1-ultra':           'Flux 1.1 Pro Ultra',
    'flux-2-pro':                   'Flux 2 Pro',

    // --- Qwen / 通义千问 ---
    'qwen3-max':                    'Qwen3 Max',
    'qwen-image-max':               '通义万相 Max',
    'qwen-image-plus':              '通义万相 Plus',

    // --- Anthropic ---
    'claude-sonnet-4-20250514':     'Claude Sonnet 4',
    'claude-opus-4-20250514':       'Claude Opus 4',
    'claude-opus-3-5':              'Claude Opus 3.5',
    'claude-sonnet-3-5':            'Claude Sonnet 3.5',
    'claude-sonnet-3-7':            'Claude Sonnet 3.7',
    'claude-haiku-4-20250715':      'Claude Haiku 4',

    // --- Kling / 可灵 ---
    'kling-v1.6-video':             '可灵 1.6 视频',
    'kling-v1.5-video':             '可灵 1.5 视频',
    'kling-v1-image-standard':      '可灵 1 标准图像',
    'kling-v1-image-pro':           '可灵 1 Pro 图像',

    // --- DeepSeek ---
    'deepseek-v3':                  'DeepSeek V3',
    'deepseek-r1':                  'DeepSeek R1',

    // --- Runway / Luma ---
    'runway-gen3':                  'Runway Gen-3',
    'luma-photon-1':                'Luma Photon 1',

    // --- Video / Vidu ---
    'vidu-v1':                      'Vidu v1',
    'hunyuan-video':                '腾讯混元视频'
  };

  // ============================================================
  // ③ 相机/镜头/光圈字典 (camera-dictionary.ts)
  // ============================================================
  const CAMERA_MAP = {
    'Compact Rangefinder':      'compact rangefinder camera',
    'ARRI Alexa IMAX 65mm':    'ARRI Alexa 65 IMAX cinema camera',
    'Modular 8K Digital':      'modular 8K digital cinema camera',
    'Red Komodo 6K':           'RED Komodo 6K cinema camera',
    'Sony Venice Full Frame':  'Sony Venice full-frame cinema camera',
    'Blackmagic URSA 12K':     'Blackmagic URSA 12K cinema camera'
  };

  const LENS_MAP = {
    'Cine Macro':              'cinema macro lens',
    'Vintage Anamorphic':      'vintage anamorphic lens',
    'Halation Diffusion':      'halation diffusion vintage lens',
    'Bokeh Master Portrait':   'bokeh master portrait lens',
    'Swirl Bokeh Portrait':    'swirl bokeh portrait lens',
    'Tilt-Shift Miniature':    'tilt-shift miniature lens',
    'Ultra Wide Rectilinear':  'ultra-wide rectilinear lens',
    'Fast Prime Cine':         'fast prime cinema lens',
    'Telephoto Cine':          'telephoto cinema lens',
    'Wide Angle Cine':         'wide-angle cinema lens',
    '70s Cinema Prime':        '70s cinema prime lens'
  };

  const FOCAL_PERSPECTIVE = {
    14:  'ultra-wide dramatic perspective with spatial distortion',
    24:  'wide environmental context with depth',
    35:  'natural cinematic perspective',
    50:  'standard human eye perspective',
    85:  'portrait compression, flattering perspective',
    200: 'extreme telephoto compression, stacked planes'
  };

  const APERTURE_EFFECT = {
    'f/1.4': 'extremely shallow depth of field, creamy bokeh, strong subject isolation',
    'f/2.8': 'moderate depth of field, gentle background separation',
    'f/8':   'deep focus, sharp from foreground to background'
  };

  /** 组装电影提示词 */
  function buildCinemaPrompt(basePrompt, camera, lens, focalLength, aperture) {
    const cameraDesc = CAMERA_MAP[camera] || camera;
    const lensDesc = LENS_MAP[lens] || lens;
    const perspective = FOCAL_PERSPECTIVE[focalLength] || '';
    const depthEffect = APERTURE_EFFECT[aperture] || '';

    const parts = [
      basePrompt,
      `shot on a ${cameraDesc}`,
      `using a ${lensDesc} at ${focalLength}mm (${perspective})`,
      `aperture ${aperture}`,
      depthEffect,
      'cinematic lighting',
      'natural color science',
      'high dynamic range',
      'professional photography, ultra-detailed, 8K resolution'
    ];

    return parts.filter(Boolean).join(', ');
  }

  // ============================================================
  // ④ 导演面板预设 (director-presets.ts) - 景别/时长/音效/运镜/天气
  // ============================================================
  const SHOT_SIZE_PRESETS = [
    { id: 'ws',  label: '远景',     labelEn: 'Wide Shot',               abbr: 'WS',  promptToken: 'wide shot, establishing shot, distant view' },
    { id: 'ls',  label: '全景',     labelEn: 'Long Shot',               abbr: 'LS',  promptToken: 'long shot, full body shot' },
    { id: 'mls', label: '中远景',   labelEn: 'Medium Long Shot',        abbr: 'MLS', promptToken: 'medium long shot, knee shot' },
    { id: 'ms',  label: '中景',     labelEn: 'Medium Shot',             abbr: 'MS',  promptToken: 'medium shot, waist shot' },
    { id: 'mcu', label: '中近景',   labelEn: 'Medium Close-Up',         abbr: 'MCU', promptToken: 'medium close-up, chest shot' },
    { id: 'cu',  label: '近景',     labelEn: 'Close-Up',                abbr: 'CU',  promptToken: 'close-up, face shot' },
    { id: 'ecu', label: '特写',     labelEn: 'Extreme Close-Up',        abbr: 'ECU', promptToken: 'extreme close-up, detail shot' },
    { id: 'pov', label: '主观镜头', labelEn: 'POV Shot',                abbr: 'POV', promptToken: 'point of view shot, first person perspective' }
  ];

  const SHOT_ANGLE_PRESETS = [
    { id: 'eye',      label: '平视',   labelEn: 'Eye Level',       promptToken: 'eye-level camera angle' },
    { id: 'low',      label: '仰拍',   labelEn: 'Low Angle',       promptToken: 'low angle shot, looking up, hero shot' },
    { id: 'high',     label: '俯拍',   labelEn: 'High Angle',      promptToken: 'high angle, looking down' },
    { id: 'bird',     label: '鸟瞰',   labelEn: 'Birds-Eye View',  promptToken: "bird's-eye view, top-down" },
    { id: 'dutch',    label: '荷兰角', labelEn: 'Dutch Angle',     promptToken: 'dutch angle, tilted horizon' },
    { id: 'overhead', label: '顶拍',   labelEn: 'Overhead',        promptToken: 'overhead shot, ceiling view' }
  ];

  const CAMERA_MOVEMENT_PRESETS = [
    { id: 'static',    label: '固定',     labelEn: 'Static',         promptToken: 'static shot, still camera' },
    { id: 'pan_left',  label: '左摇',     labelEn: 'Pan Left',       promptToken: 'camera pans to the left' },
    { id: 'pan_right', label: '右摇',     labelEn: 'Pan Right',      promptToken: 'camera pans to the right' },
    { id: 'tilt_up',   label: '上摇',     labelEn: 'Tilt Up',        promptToken: 'camera tilts upward' },
    { id: 'tilt_down', label: '下摇',     labelEn: 'Tilt Down',      promptToken: 'camera tilts downward' },
    { id: 'zoom_in',   label: '推进',     labelEn: 'Zoom In',        promptToken: 'slow zoom in' },
    { id: 'zoom_out',  label: '拉远',     labelEn: 'Zoom Out',       promptToken: 'zoom out, revealing the scene' },
    { id: 'dolly_in',  label: '轨道推进', labelEn: 'Dolly In',       promptToken: 'dolly-in, tracking shot toward subject' },
    { id: 'dolly_out', label: '轨道拉远', labelEn: 'Dolly Out',      promptToken: 'dolly-out, camera moves away' },
    { id: 'follow',    label: '跟随',     labelEn: 'Follow',         promptToken: 'steadicam follow shot, fluid camera movement' },
    { id: 'handheld',  label: '手持晃动', labelEn: 'Handheld',       promptToken: 'handheld shot, subtle camera shake, documentary feel' },
    { id: '360',       label: '360 环绕', labelEn: '360 Orbit',      promptToken: 'camera orbits 360 degrees around subject' },
    { id: 'crane_up',  label: '升降臂',   labelEn: 'Crane Up',       promptToken: 'crane / jib-arm rising shot' }
  ];

  const LIGHTING_PRESETS = [
    { id: 'natural',    label: '自然光', labelEn: 'Natural Daylight',  promptToken: 'soft natural daylight, window light' },
    { id: 'golden',     label: '黄金时刻', labelEn: 'Golden Hour',     promptToken: 'golden hour lighting, warm sunset' },
    { id: 'three-point', label: '三点布光', labelEn: 'Three-Point',   promptToken: 'three-point studio lighting setup' },
    { id: 'low_key',    label: '低调光', labelEn: 'Low-Key',           promptToken: 'low-key lighting, deep shadows, dramatic contrast' },
    { id: 'high_key',   label: '高调光', labelEn: 'High-Key',          promptToken: 'high-key bright studio lighting' },
    { id: 'rim',        label: '轮廓光', labelEn: 'Rim / Backlight',   promptToken: 'rim light from behind, silhouette halo' },
    { id: 'neon',       label: '霓虹',   labelEn: 'Neon',              promptToken: 'neon lighting, vibrant magenta & cyan' },
    { id: 'moonlight',  label: '月光',   labelEn: 'Moonlight',         promptToken: 'moonlight, cool blue ambient' },
    { id: 'volumetric', label: '丁达尔', labelEn: 'God Rays',          promptToken: 'volumetric god-rays, dramatic beams of light' },
    { id: 'fog',        label: '雾气',   labelEn: 'Fog / Haze',        promptToken: 'atmospheric fog & haze, soft diffusion' }
  ];

  const WEATHER_PRESETS = [
    { id: 'sunny',    label: '晴天', promptToken: 'bright sunny day, clear blue sky' },
    { id: 'cloudy',   label: '多云', promptToken: 'overcast cloudy sky, soft diffused light' },
    { id: 'rain',     label: '雨', promptToken: 'falling rain, wet streets & reflective puddles' },
    { id: 'storm',    label: '暴雨', promptToken: 'heavy storm, thunder, dramatic clouds' },
    { id: 'snow',     label: '雪', promptToken: 'fresh snowfall, white winter wonderland' },
    { id: 'fog',      label: '雾', promptToken: 'thick fog, mysterious silhouettes' },
    { id: 'sunset',   label: '日落', promptToken: 'dramatic sunset, orange-pink sky gradient' },
    { id: 'night',    label: '夜晚', promptToken: 'night scene, dark moody atmosphere' },
    { id: 'indoor',   label: '室内', promptToken: 'indoor scene, warm cozy interior light' }
  ];

  const SOUND_EFFECT_PRESETS = {
    nature: [
      { id: 'wind',       label: '风声',     promptToken: 'wind blowing sound' },
      { id: 'rain',       label: '雨声',     promptToken: 'rain falling sound' },
      { id: 'thunder',    label: '雷声',     promptToken: 'thunder rumbling' },
      { id: 'birds',      label: '鸟鸣',     promptToken: 'birds chirping' },
      { id: 'water',      label: '流水',     promptToken: 'water flowing sound' },
      { id: 'waves',      label: '海浪',     promptToken: 'ocean waves crashing' }
    ],
    action: [
      { id: 'footsteps',  label: '脚步声',   promptToken: 'footsteps sound' },
      { id: 'breathing',  label: '呼吸声',   promptToken: 'heavy breathing' },
      { id: 'heartbeat',  label: '心跳声',   promptToken: 'heartbeat pounding' },
      { id: 'fighting',   label: '打斗声',   promptToken: 'fighting impact sounds' },
      { id: 'running',    label: '奔跑声',   promptToken: 'running footsteps' }
    ],
    atmosphere: [
      { id: 'suspense',   label: '悬疑',     promptToken: 'suspenseful ambient sound' },
      { id: 'dramatic',   label: '戏剧性',   promptToken: 'dramatic sound effect' },
      { id: 'peaceful',   label: '平静',     promptToken: 'peaceful ambient sound' },
      { id: 'tense',      label: '紧张',     promptToken: 'tense atmosphere sound' },
      { id: 'epic',       label: '史诗',     promptToken: 'epic cinematic sound' }
    ],
    urban: [
      { id: 'traffic',    label: '车流',     promptToken: 'traffic noise' },
      { id: 'crowd',      label: '人群',     promptToken: 'crowd murmuring' },
      { id: 'siren',      label: '警笛',     promptToken: 'siren wailing' },
      { id: 'horn',       label: '喇叭',     promptToken: 'car horn honking' }
    ]
  };

  const DURATION_PRESETS = [
    { id: 3,  label: '3秒',  value: 3 },
    { id: 4,  label: '4秒',  value: 4 },
    { id: 5,  label: '5秒',  value: 5 },
    { id: 6,  label: '6秒',  value: 6 },
    { id: 8,  label: '8秒',  value: 8 },
    { id: 10, label: '10秒', value: 10 },
    { id: 12, label: '12秒', value: 12 },
    { id: 15, label: '15秒', value: 15 }
  ];

  // ============================================================
  // ⑤ 视觉风格预设 (visual-styles.ts) - 40+ 风格，正/负提示词
  // ============================================================
  const VISUAL_STYLE_PRESETS = [
    // --- 3D 风格 ---
    { id: '3d_xuanhuan',     name: '3D玄幻',     mediaType: 'cinematic', description: '中国风玄幻，仙侠，虚幻引擎渲染，光效华丽',
      prompt: '(best quality, masterpiece, 8k, high detailed:1.2), (stylized 3D Chinese animation character render:1.3), (Unreal Engine 5 style:1.2), (cinematic lighting, soft volumetric fog:1.1), ethereal atmosphere, glowing spiritual energy, beautiful facial features, sharp focus',
      negativePrompt: '(worst quality, low quality:1.4), (blurry, distorted:1.3), (2D, flat, anime:1.2), ugly, watermark, signature' },
    { id: '3d_american',     name: '3D美式',     mediaType: 'animation', description: '迪士尼/皮克斯风格，色彩鲜艳，角色可爱',
      prompt: '(best quality, masterpiece, 8k:1.2), (Disney Pixar style 3D animation:1.3), (expressive character design, large eyes:1.2), (subsurface scattering skin:1.1), vibrant colors, warm lighting, 3d render',
      negativePrompt: '(worst quality, low quality:1.4), (blurry:1.3), (2D, flat, sketch, anime:1.2), (dark, gritty)' },
    { id: '3d_q_version',    name: '3D Q版',     mediaType: 'animation', description: '盲盒/潮玩风格，Q版三维，软光',
      prompt: '(best quality, masterpiece, 8k:1.2), (Pop Mart blind box style:1.3), (chibi 3d rendering:1.2), plastic material, clean background, cute super deformed',
      negativePrompt: '(worst quality, low quality:1.4), (realistic skin texture), (2D, flat), dark, scary' },
    { id: '3d_realistic',    name: '3D写实',     mediaType: 'cinematic', description: '超写实3D，电影级光照，纹理细节丰富',
      prompt: '(best quality, masterpiece, 8k, high detailed:1.2), (photorealistic 3D render:1.3), (hyperrealistic details:1.2), Unreal Engine 5, (cinematic lighting, ray tracing:1.1), sharp focus, depth of field',
      negativePrompt: '(worst quality, low quality:1.4), (cartoon, anime, painting:1.3), (stylized, 2D, flat), blurry' },
    { id: '3d_block',        name: '3D块面',     mediaType: 'animation', description: '低多边形，简约几何',
      prompt: '(best quality, masterpiece, 8k:1.2), (low poly art style:1.3), (sharp edges, geometric shapes:1.2), flat shading, polygon art',
      negativePrompt: '(worst quality), (realistic, high poly, detailed texture), round organic' },
    { id: '3d_mobile',       name: '3D手游',     mediaType: 'animation', description: '3D手游风格，Unity渲染，cel-shaded',
      prompt: '(best quality, 8k:1.2), (unity engine mobile game style:1.3), (stylized 3D character:1.2), (cel shaded:1.1), clean textures, polished game asset',
      negativePrompt: '(worst quality, low quality:1.4), (realistic, photorealistic)' },
    { id: '3d_render_2d',    name: '3D渲染2D',   mediaType: 'animation', description: '三渲二，卡通渲染，原神风格',
      prompt: '(best quality, 8k:1.2), (Genshin Impact style:1.3), (cel shaded 3D:1.2), (anime style 3d rendering:1.2), clean lines, vibrant anime colors',
      negativePrompt: '(worst quality, low quality:1.4), (realistic, photorealistic:1.3), rough sketch lines, ugly' },

    // --- 2D 动画风格 ---
    { id: '2d_animation',    name: '2D动画',     mediaType: 'animation', description: '标准日式2D动画风格',
      prompt: '(best quality, masterpiece, 8k, high detailed:1.2), (standard Japanese anime style:1.3), clean lineart, flat color, detailed eyes, vibrant',
      negativePrompt: '(worst quality, low quality:1.4), (3D, realistic, photorealistic, cgi:1.3), messy sketch, ugly, bad anatomy' },
    { id: '2d_movie',        name: '2D电影',     mediaType: 'animation', description: '动画电影质感，新海诚风格，背景细致',
      prompt: '(best quality, masterpiece, 8k:1.2), (Makoto Shinkai style:1.3), breathtaking cinematic lighting, highly detailed background, clouds, starry sky, sentimental atmosphere',
      negativePrompt: '(worst quality), (simple, flat), (3D, realistic), dull colors' },
    { id: '2d_ghibli',       name: '2D吉卜力',   mediaType: 'animation', description: '宫崎骏风格，水彩背景，自然清新',
      prompt: '(best quality, 8k:1.2), (Studio Ghibli style:1.3), hand painted watercolor background, peaceful nature atmosphere, soft colors',
      negativePrompt: '(worst quality), neon colors, dark, scary, realistic photos' },
    { id: '2d_retro',        name: '2D复古动画', mediaType: 'animation', description: '90年代复古动画，赛璐璐风格',
      prompt: '(best quality, 8k:1.2), (90s retro anime style:1.3), (cel animation aesthetic:1.2), vintage VHS effect, lo-fi',
      negativePrompt: '(worst quality), modern digital art, (3D, realistic)' },
    { id: '2d_american',     name: '2D美式动画', mediaType: 'animation', description: '美式卡通，粗犷线条，能量感强',
      prompt: '(best quality, 8k:1.2), (Cartoon Network style:1.3), bold thick outlines, western cartoon aesthetic, energetic',
      negativePrompt: '(worst quality), (anime, manga style), (3D, realistic), delicate lines' },
    { id: '2d_horror',       name: '2D诡异惊悚', mediaType: 'animation', description: '伊藤润二风格，恐怖漫画，螺旋，怪诞',
      prompt: '(best quality, 8k:1.2), (Junji Ito horror manga:1.3), grotesque art style, heavy black ink, creepy atmosphere, body horror',
      negativePrompt: '(worst quality), cute, bright colors, (3D, realistic), soft, safe' },
    { id: '2d_pixel',        name: '2D像素',     mediaType: 'graphic', description: '像素艺术，16位游戏风格',
      prompt: '(best quality, 8k:1.2), (pixel art style:1.3), 16-bit game sprite, retro gaming aesthetic',
      negativePrompt: '(worst quality), smooth lines, (3D, realistic), anti-aliasing' },
    { id: '2d_watercolor',   name: '2D水彩',     mediaType: 'graphic', description: '水彩画风格，湿画法，艺术感',
      prompt: '(best quality, 8k:1.2), (watercolor painting style:1.3), (wet on wet technique:1.2), soft edges, paper texture',
      negativePrompt: '(worst quality), sharp hard lines, (3D, realistic), vector art' },

    // --- 真人 / 电影 ---
    { id: 'real_movie',      name: '真人电影',   mediaType: 'cinematic', description: '电影剧照，胶片感，电影调色',
      prompt: '(best quality, masterpiece, 8k, high detailed:1.2), (cinematic movie still:1.3), (35mm film grain:1.2), dramatic movie lighting, color graded, photorealistic, depth of field',
      negativePrompt: '(worst quality, low quality:1.4), (3D render, cgi, game), (anime, illustration, painting), artificial, fake' },
    { id: 'real_costume',    name: '真人古装',   mediaType: 'cinematic', description: '古装剧风格，汉服，古风摄影',
      prompt: '(best quality, 8k:1.2), (Chinese period drama style:1.3), Hanfu traditional costume, (exquisite embroidery:1.1), elegant ancient setting, photorealistic, cinematic lighting',
      negativePrompt: '(worst quality), modern clothing, glasses, (3D render, anime), western background' },
    { id: 'real_hk_retro',   name: '港风复古',   mediaType: 'cinematic', description: '港风复古，王家卫风格，霓虹灯',
      prompt: '(best quality, 8k:1.2), (90s Hong Kong movie style:1.3), (Wong Kar-wai aesthetic:1.2), neon lights, high contrast, motion blur, film grain, moody dreamy atmosphere',
      negativePrompt: '(worst quality), modern digital look, clean sharp sterile, (3D, anime), bright daylight' },
    { id: 'real_bloom',      name: '光晕',       mediaType: 'cinematic', description: '唯美光晕，逆光，梦幻光效',
      prompt: '(best quality, 8k:1.2), (dreamy soft focus photography:1.3), (strong bloom, lens flare:1.2), backlit by sun, ethereal lighting, photorealistic',
      negativePrompt: '(worst quality), harsh contrast, dark gloomy, (anime, 3D), flat lighting' }
  ];

  // ============================================================
  // ⑥ 摄影风格档案 (cinematography-profiles.ts) - 18+ 风格
  // ============================================================
  const CINEMATOGRAPHY_PROFILES = [
    { id: 'classic-cinematic', name: '经典电影',   emoji: '🎞️', description: '标准院线电影质感，三点布光，自然色温，匀速轨道运镜',
      lighting: 'natural three-point', focus: 'medium depth-of-field', rig: 'slow dolly',
      guidance: '遵循经典电影语法，三点布光为基础，暖色调营造温暖质感。轨道推拉保持画面稳定流畅，景深随叙事功能调整——对话用浅景深聚焦情绪，全景用深景深交代环境。' },
    { id: 'film-noir',         name: '黑色电影',   emoji: '🖤', description: '低调布光、强烈明暗对比、侧光为主、冷色调、雾气弥漫、手持呼吸感',
      lighting: 'low-key side-lit', focus: 'shallow', rig: 'handheld',
      guidance: '大面积阴影中只留一束侧光照亮人物，冷色调配合雾气营造不安感，手持微晃增加真实紧张感。尽量让人物半脸在黑暗中，暗示角色的双面性。' },
    { id: 'epic-blockbuster',  name: '史诗大片',   emoji: '⚔️', description: '高调明亮、正面光、深景深、摇臂大幅运动、镜头光晕、宏大感',
      lighting: 'high-key front', focus: 'deep focus', rig: 'crane',
      guidance: '史诗感来自空间纵深——用深景深和摇臂大幅升降展示宏大场面。正面高调光让画面明亮壮观，适当加入镜头光晕增加电影感。' },
    { id: 'intimate-drama',    name: '亲密剧情',   emoji: '🫂', description: '自然侧光、暖色温、浅景深、三脚架静态、聚焦人物情绪',
      lighting: 'natural side', focus: 'shallow', rig: 'tripod static',
      guidance: '亲密剧情用静态镜头和浅景深把观众拉入人物的内心世界。自然侧光创造面部的明暗层次，暖色温传递情感温度。摄影机几乎不动，让演员的微表情成为画面的全部焦点。' },
    { id: 'romantic-film',     name: '浪漫爱情',   emoji: '💕', description: '逆光黄金时段、极浅景深、斯坦尼康丝滑跟随、丁达尔光效',
      lighting: 'golden-hour backlight', focus: 'ultra-shallow', rig: 'steadicam follow',
      guidance: '浪漫感的核心是逆光——黄金时段的暖色逆光让人物轮廓发光。极浅景深把世界虚化成光斑，斯坦尼康轻柔跟随人物。偶尔飘落的花瓣或光束为画面增添诗意。' },
    { id: 'documentary',       name: '纪实手持',   emoji: '📹', description: '手持呼吸感、自然光、中等景深、无修饰、真实粗粝',
      lighting: 'natural daylight', focus: 'medium', rig: 'handheld breathing',
      guidance: '纪实风格追求在场感——手持摄影的轻微晃动让观众身临其境。完全使用自然光，不做任何人工修饰。跟焦跟随人物运动，允许偶尔焦点偏移，这种不完美反而增加真实感。' },
    { id: 'cyberpunk-neon',    name: '赛博朋克',   emoji: '🌃', description: '霓虹灯光、轮廓光、混合色温、浅景深、稳定器滑动、薄霾弥漫',
      lighting: 'neon rim, mixed temp', focus: 'shallow', rig: 'steadicam slow glide',
      guidance: '赛博朋克的视觉语言是冷暖冲突——霓虹紫红与冰蓝同框，轮廓光把人物从暗色背景剥离。浅景深让霓虹灯化为迷幻光斑，薄霾为光线增加体积感。镜头慢速滑过雨夜街道，营造未来都市的疏离感。' },
    { id: 'wuxia-classic',     name: '古典武侠',   emoji: '🗡️', description: '自然侧光、暖色温、中景深、摇臂升降、薄雾飘渺、古韵悠然',
      lighting: 'natural warm side', focus: 'medium', rig: 'crane rising',
      guidance: '古典武侠追求意境——山间薄雾与落叶营造江湖的苍茫感。摇臂从高处缓缓降至人物，如俯瞰天下的视角。自然侧光模拟透过竹林的斑驳光影。' },
    { id: 'horror-thriller',   name: '恐怖惊悚',   emoji: '👻', description: '低调布光、底光不安感、冷色调、浅景深、手持颤抖、浓雾遮蔽',
      lighting: 'low-key underlight', focus: 'shallow', rig: 'slow handheld creep',
      guidance: '恐怖片的摄影原则是隐藏比展示更恐怖——浅景深让背景模糊成未知的威胁，浓雾遮蔽视野制造不安。底光让面部出现不自然的阴影。关键时刻突然快速甩镜打破之前的缓慢节奏。' },
    { id: 'mv-style',          name: 'MV风格',     emoji: '🎵', description: '霓虹逆光、混合色温、极浅景深、斯坦尼康环绕、光粒子飞舞',
      lighting: 'neon backlight mixed', focus: 'ultra-shallow', rig: 'steadicam orbit',
      guidance: 'MV追求极致视觉冲击——每一帧都要像海报。极浅景深把一切虚化成五彩光斑，霓虹逆光勾勒人物轮廓。快速斯坦尼康环绕拍摄，配合频繁的速度变化。大量光粒子和镜头光晕增加梦幻感。' },
    { id: 'action-intense',    name: '动作激烈',   emoji: '💥', description: '高调侧光、中性色温、肩扛快速跟拍、尘土飞扬',
      lighting: 'high-key side', focus: 'medium', rig: 'shoulder fast follow',
      guidance: '动作戏的摄影追求动能传递——肩扛快速跟拍让观众感受冲击力，侧光强化肌肉轮廓和动作线条。关键动作瞬间可使用慢放突出力量感，尘土和火花增加物理碰撞的真实感。' },
    { id: 'hk-retro-90s',      name: '90年代港片', emoji: '🌙', description: '霓虹侧光、混合色温、手持晃动、薄霾弥漫、王家卫式忧郁',
      lighting: 'neon side, mixed', focus: 'medium', rig: 'handheld walking',
      guidance: '90年代港片的摄影DNA是都市霓虹+手持游走——混合色温的霓虹灯把城市街道染成红蓝交织的梦境。手持摄影在人群中穿梭，偶尔抽帧或降格制造虚影效果。薄霾笼罩的街头，每个路人都像有故事。侧光勾勒人物忧郁的轮廓。' },
    { id: 'golden-hollywood',  name: '好莱坞黄金时代', emoji: '⭐', description: '高调三点布光、暖色温、深景深、轨道优雅运动、光芒四射',
      lighting: 'high-key three-point warm', focus: 'deep', rig: 'dolly elegant',
      guidance: '好莱坞黄金时代的摄影追求完美——三点布光消除一切不美的阴影，让明星容光焕发。深景深和精心构图让每一帧都像油画，轨道缓慢优雅移动如华尔兹。暖色温赋予画面怀旧的金色光芒。一切都要端庄、华丽、无可挑剔。' }
  ];

  // ============================================================
  // ⑦ 角色身份锚点系统 (character-bible.ts) - 6 层锁定
  // ============================================================
  const CHARACTER_IDENTITY_ANCHORS = {
    // ① 骨相层 - 面部骨骼结构
    bone: [
      'oval face shape with soft jawline',
      'square jaw with angular cheekbones',
      'heart-shaped face with pointed chin',
      'round face with soft features',
      'diamond-shaped face with high cheekbones',
      'oblong/long face with balanced proportions'
    ],
    // ② 五官层 - 眼鼻唇精确描述
    eyes: [
      'almond-shaped eyes with double eyelids',
      'big round doe eyes with long lashes',
      'hooded eyes with slight epicanthic fold',
      'monolid Asian eyes with subtle crease',
      'upturned cat eyes with dark eyeliner'
    ],
    nose: [
      'straight nose bridge, rounded tip, medium width',
      'small refined nose with slightly upturned tip',
      'prominent straight nose with defined bridge',
      'button nose, petite and cute'
    ],
    lips: [
      'full lips with defined cupid\'s bow and soft pink tone',
      'medium balanced lips with natural pink shade',
      'thin lips with subtle outline, glossy finish'
    ],
    // ③ 辨识标记层 - 最强锚点
    uniqueMarks: [
      'small mole 2cm below left eye',
      'beauty mark above upper lip on right side',
      'tiny mole near corner of right eye',
      'faint scar across left eyebrow',
      'mole on the right side of the neck'
    ],
    // ④ 色彩锚点层 - Hex色值
    colors: {
      iris: ['#3D2314', '#6B4423', '#4A6633', '#2C5282', '#553C9A', '#1A202C'],
      hair: ['#1A1A1A', '#2C1810', '#8B4513', '#DAA520', '#F5DEB3', '#D4A373', '#C0C0C0', '#FF7F50', '#6B46C1'],
      skin: ['#FFE4C4', '#F4D9B6', '#D2B48C', '#8D5524', '#6B4226', '#C68642', '#E0AC69'],
      lip: ['#E91E63', '#D4574A', '#F08080', '#BA55D3', '#C2185B', '#FFAB91', '#8B0000']
    },
    // ⑤ 体型层 - 身高/体态/比例
    body: [
      'slim slender body, 175cm tall, graceful posture',
      'athletic muscular build, broad shoulders, 180cm',
      'petite delicate frame, 160cm, soft proportions',
      'curvy elegant figure, hourglass shape',
      'lean warrior physique with defined muscle tone'
    ],
    // ⑥ 风格层 - 服饰/发型/配饰
    style: {
      haircuts: ['long straight black hair', 'short messy silver hair', 'long wavy chestnut hair', 'ponytail high on head', 'bob cut chin-length'],
      outfits: ['flowing white silk robe with gold embroidery', 'black tailored suit with red tie', 'casual jeans and oversized hoodie', 'ancient Chinese Hanfu in deep blue', 'leather jacket and boots, urban style'],
      accessories: ['gold-rimmed round glasses', 'small silver ear studs', 'leather bracelet on left wrist', 'delicate gold necklace with small pendant', 'worn leather belt with brass buckle']
    }
  };

  // ============================================================
  // ⑧ 场景提示词模板 (scene-prompt-generator.ts) - 三层系统
  // ============================================================
  const SCENE_PROMPT_TEMPLATES = {
    // 首帧提示词 - 静态构图
    buildImagePrompt: function (scene, style) {
      const parts = [];
      parts.push('Cinematic composition,');
      parts.push(style || 'classic cinematic look,');
      if (scene.actors) parts.push(`${scene.actors} in the frame,`);
      if (scene.action) parts.push(`captured mid-action: ${scene.action},`);
      if (scene.setting) parts.push(`${scene.setting},`);
      if (scene.lighting) parts.push(`lighting: ${scene.lighting},`);
      parts.push('master-quality, sharp focus, professional color grading');
      return parts.filter(Boolean).join(' ');
    },
    // 尾帧提示词（若需要）
    buildEndFramePrompt: function (scene) {
      if (!scene.movement && !scene.transition) return '';
      return `Same scene, later moment - ${scene.movement || 'action resolved'}, same composition & lighting, subtle motion blur, consistent character appearance.`;
    },
    // 视频提示词 - 动态动作描述
    buildVideoPrompt: function (scene) {
      const parts = [];
      parts.push('Cinematic video shot:');
      if (scene.action) parts.push(scene.action);
      if (scene.movement) parts.push(` camera movement: ${scene.movement}`);
      if (scene.lighting) parts.push(` lighting: ${scene.lighting}`);
      if (scene.atmosphere) parts.push(` atmosphere: ${scene.atmosphere}`);
      parts.push(' realistic motion blur, natural camera shake if handheld, 24 fps film look');
      return parts.filter(Boolean).join(', ');
    },
    // 提示词生成角色的系统指令模板
    characterDesignSystemPrompt: `你是好莱坞顶级角色设计大师，深谙 Midjourney / Stable Diffusion 等 AI 绘图模型。请根据剧本来生成角色的多阶段视觉形象：
- 分析角色成长弧线（年龄、身份、状态变化）
- 设计 2-4 个阶段形象
- 保持一致性元素：面部特征、体型、独特标记
- 英文提示词 40-60 词，适合图像生成
- 中文提示词详细描述`,
    // 剧本拆分系统指令
    scriptSplitSystemPrompt: `请将以下剧本按场景拆解成分镜脚本。每个分镜包含：
- 景别（WS/LS/MS/MCU/CU/ECU）
- 机位角度
- 运镜
- 画面描述
- 台词
- 预计时长
使用标准电影语法，强调视觉叙事。`
  };

  // ============================================================
  // ⑨ 模型注册表精选 (model-registry.ts) - T2I / T2V 常见
  // ============================================================
  const T2I_MODELS = [
    { id: 'flux-dev',         name: 'Flux Dev',            endpoint: 'text-to-image', category: 'open-source' },
    { id: 'flux-schnell',     name: 'Flux Schnell',        endpoint: 'text-to-image', category: 'open-source' },
    { id: 'flux-pro',         name: 'Flux Pro',            endpoint: 'text-to-image', category: 'premium' },
    { id: 'flux-pro-1.1',     name: 'Flux 1.1 Pro Ultra',  endpoint: 'text-to-image', category: 'premium' },
    { id: 'flux-2-pro',       name: 'Flux 2 Pro',          endpoint: 'text-to-image', category: 'premium' },
    { id: 'kling-v1-pro',     name: '可灵 V1 Pro 图像',    endpoint: 'text-to-image', category: 'premium' },
    { id: 'midjourney-v6',    name: 'Midjourney V6',       endpoint: 'text-to-image', category: 'premium' },
    { id: 'sdxl-turbo',       name: 'SDXL Turbo',          endpoint: 'text-to-image', category: 'fast' },
    { id: 'qwen-image-max',   name: '通义万相 Max',         endpoint: 'text-to-image', category: 'premium' },
    { id: 'gemini-image',     name: 'Gemini 图像生成',      endpoint: 'text-to-image', category: 'premium' }
  ];

  const T2V_MODELS = [
    { id: 'kling-v1.6-video',  name: '可灵 1.6 视频',        endpoint: 'text-to-video', category: 'premium' },
    { id: 'kling-v1.5-video',  name: '可灵 1.5 视频',        endpoint: 'text-to-video', category: 'premium' },
    { id: 'runway-gen3-alpha', name: 'Runway Gen-3 Alpha',  endpoint: 'text-to-video', category: 'premium' },
    { id: 'luma-photon-1',     name: 'Luma Photon 1',       endpoint: 'text-to-video', category: 'premium' },
    { id: 'vidu-v1',           name: 'Vidu V1',             endpoint: 'text-to-video', category: 'premium' },
    { id: 'hunyuan-video',     name: '腾讯混元视频',         endpoint: 'text-to-video', category: 'premium' },
    { id: 'sora',              name: 'Sora',                endpoint: 'text-to-video', category: 'premium' }
  ];

  // ============================================================
  // Ⓜ 对外暴露
  // ============================================================
  window.DC = window.DC || {};
  window.DC.BRAND_REGISTRY = BRAND_REGISTRY;
  window.DC.MODEL_DISPLAY_NAMES = MODEL_DISPLAY_NAMES;
  window.DC.CAMERA_MAP = CAMERA_MAP;
  window.DC.LENS_MAP = LENS_MAP;
  window.DC.FOCAL_PERSPECTIVE = FOCAL_PERSPECTIVE;
  window.DC.APERTURE_EFFECT = APERTURE_EFFECT;
  window.DC.buildCinemaPrompt = buildCinemaPrompt;
  window.DC.SHOT_SIZE_PRESETS = SHOT_SIZE_PRESETS;
  window.DC.SHOT_ANGLE_PRESETS = SHOT_ANGLE_PRESETS;
  window.DC.CAMERA_MOVEMENT_PRESETS = CAMERA_MOVEMENT_PRESETS;
  window.DC.LIGHTING_PRESETS = LIGHTING_PRESETS;
  window.DC.WEATHER_PRESETS = WEATHER_PRESETS;
  window.DC.SOUND_EFFECT_PRESETS = SOUND_EFFECT_PRESETS;
  window.DC.DURATION_PRESETS = DURATION_PRESETS;
  window.DC.VISUAL_STYLE_PRESETS = VISUAL_STYLE_PRESETS;
  window.DC.CINEMATOGRAPHY_PROFILES = CINEMATOGRAPHY_PROFILES;
  window.DC.CHARACTER_IDENTITY_ANCHORS = CHARACTER_IDENTITY_ANCHORS;
  window.DC.SCENE_PROMPT_TEMPLATES = SCENE_PROMPT_TEMPLATES;
  window.DC.T2I_MODELS = T2I_MODELS;
  window.DC.T2V_MODELS = T2V_MODELS;

  console.log('[DC Data] 预设数据已加载：视觉风格=' + VISUAL_STYLE_PRESETS.length +
              '，摄影风格=' + CINEMATOGRAPHY_PROFILES.length +
              '，T2I模型=' + T2I_MODELS.length +
              '，T2V模型=' + T2V_MODELS.length);
})();
