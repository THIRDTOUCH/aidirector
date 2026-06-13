/**
 * ============================================================
 * AI 导演台 · Prompt Builder（提示词组装器）
 *
 * 纯浏览器版 — 基于魔因漫创 moyin-creator prompt-builder 设计
 * License: AGPL-3.0
 *
 * 核心原则：整合为语义层次，避免碎片化堆叠导致信号稀释
 *
 * Layer 1: 镜头设计 (Camera) — 最高优先级
 * Layer 1.5: 灯光设计 (Lighting)
 * Layer 2: 内容焦点 (Subject)
 * Layer 3: 氛围修饰 (Mood)
 * Layer 4: 场景音频 (Setting & Audio)
 * Layer 5: 视觉风格 (Style)
 * Base: 用户提示词
 *
 * 媒介类型(MediaType) 翻译策略:
 *   cinematic:  完整物理摄影词汇（真人/写实3D）
 *   animation: 动画运镜适配（2D动画/风格化3D）
 *   stop-motion: 微缩实拍约束（定格动画）
 *   graphic:   仅色彩/情绪/节奏（像素/水彩/简笔画）
 * ============================================================
 */

(function () {
  'use strict';

  // ============================================================
  // 摄影参数预设（用于 translateToken 翻译）
  // ============================================================

  const SHOT_SIZE_PRESETS_B = [
    { id: 'ws',  label: '远景',     labelEn: 'Wide Shot',               abbr: 'WS', promptToken: 'wide shot, establishing shot, distant view' },
    { id: 'ls',  label: '全景',     labelEn: 'Long Shot',               abbr: 'LS', promptToken: 'long shot, full body shot' },
    { id: 'mls', label: '中远景',   labelEn: 'Medium Long Shot',        abbr: 'MLS', promptToken: 'medium long shot, knee shot' },
    { id: 'ms',  label: '中景',     labelEn: 'Medium Shot',             abbr: 'MS',  promptToken: 'medium shot, waist shot' },
    { id: 'mcu', label: '中近景',   labelEn: 'Medium Close-Up',         abbr: 'MCU', promptToken: 'medium close-up, chest shot' },
    { id: 'cu',  label: '近景',     labelEn: 'Close-Up',                abbr: 'CU',  promptToken: 'close-up, face shot' },
    { id: 'ecu', label: '特写',     labelEn: 'Extreme Close-Up',        abbr: 'ECU', promptToken: 'extreme close-up, detail shot' },
    { id: 'pov', label: '主观镜头', labelEn: 'POV Shot',                abbr: 'POV', promptToken: 'point of view shot, first person perspective' }
  ];

  const CAMERA_RIG_PRESETS = [
    { id: 'tripod',    label: '三脚架',   promptToken: 'tripod mounted, static shot',       promptToken_anim: 'static shot on tripod' },
    { id: 'dolly',     label: '轨道',     promptToken: 'dolly shot, smooth tracking movement', promptToken_anim: 'dolly tracking shot' },
    { id: 'steadicam',  label: '斯坦尼康', promptToken: 'steadicam follow shot, fluid camera movement', promptToken_anim: 'steadicam smooth follow' },
    { id: 'handheld',  label: '手持',     promptToken: 'handheld shot, subtle camera shake', promptToken_anim: 'handheld style, organic movement' },
    { id: 'shoulder',  label: '肩扛',     promptToken: 'shoulder mounted, documentary style', promptToken_anim: 'documentary shoulder style' },
    { id: 'crane',     label: '摇臂',     promptToken: 'crane / jib-arm rising shot',     promptToken_anim: 'crane rising shot' },
    { id: 'drone',     label: '航拍',     promptToken: 'aerial drone shot, bird\'s eye view', promptToken_anim: 'aerial drone shot' },
    { id: 'none',      label: '无',        promptToken: '',                                promptToken_anim: '' }
  ];

  const MOVEMENT_SPEED_PRESETS = [
    { id: 'very-slow', label: '极慢', promptToken: 'very slow movement',       promptToken_anim: 'very slow cinematic movement' },
    { id: 'slow',       label: '慢',   promptToken: 'slow cinematic movement',    promptToken_anim: 'slow flowing movement' },
    { id: 'normal',     label: '正常',  promptToken: 'normal pacing',            promptToken_anim: 'standard animation pacing' },
    { id: 'fast',       label: '快',   promptToken: 'fast dynamic movement',     promptToken_anim: 'fast dynamic motion' },
    { id: 'very-fast',  label: '极快',  promptToken: 'very fast rapid movement',  promptToken_anim: 'rapid energetic motion' }
  ];

  const DEPTH_OF_FIELD_PRESETS = [
    { id: 'ultra-shallow', label: '极浅景深', promptToken: 'ultra shallow depth of field, only subject in focus', promptToken_anim: 'strong background blur, bokeh effect' },
    { id: 'shallow',       label: '浅景深',   promptToken: 'shallow depth of field, subject sharp, soft background', promptToken_anim: 'moderate background blur' },
    { id: 'medium',         label: '中等景深', promptToken: 'medium depth of field',                              promptToken_anim: 'balanced focus' },
    { id: 'deep',           label: '深景深',   promptToken: 'deep depth of field, everything in focus',           promptToken_anim: 'full scene in focus, sharp details' },
    { id: 'none',           label: '无景深',   promptToken: '',                                                   promptToken_anim: '' }
  ];

  const FOCUS_TRANSITION_PRESETS = [
    { id: 'none',           label: '无转焦',   promptToken: '',                              promptToken_anim: '' },
    { id: 'rack-between',   label: '双主体跟焦', promptToken: 'rack focus between subjects',  promptToken_anim: 'focus transition between elements' },
    { id: 'rack-to-fg',     label: '焦到前景',  promptToken: 'rack focus to foreground',    promptToken_anim: 'focus shifts to foreground' },
    { id: 'rack-to-bg',     label: '焦到背景',  promptToken: 'rack focus to background',    promptToken_anim: 'focus shifts to background' },
    { id: 'pull-focus',     label: '拉焦',      promptToken: 'pull focus to new subject',    promptToken_anim: 'smooth focus pull' }
  ];

  const LIGHTING_STYLE_PRESETS = [
    { id: 'natural',     label: '自然光',   promptToken: 'natural soft daylight',              promptToken_anim: 'soft natural lighting' },
    { id: 'high-key',    label: '高调光',   promptToken: 'high-key bright lighting',            promptToken_anim: 'bright flat animation lighting' },
    { id: 'low-key',     label: '低调光',   promptToken: 'low-key lighting, deep shadows, dramatic contrast', promptToken_anim: 'dramatic contrast, limited lighting' },
    { id: 'golden-hour', label: '黄金时段', promptToken: 'golden hour warm backlight, sun flare', promptToken_anim: 'warm golden backlight glow' },
    { id: 'neon',        label: '霓虹',     promptToken: 'neon lighting, vibrant magenta and cyan', promptToken_anim: 'vibrant neon color lighting' },
    { id: 'moonlight',   label: '月光',     promptToken: 'cool blue moonlight, night ambiance',  promptToken_anim: 'cool blue night lighting' },
    { id: 'volumetric',  label: '丁达尔',   promptToken: 'volumetric god-rays, dramatic light beams', promptToken_anim: 'magical light rays, atmospheric glow' },
    { id: 'rim',         label: '轮廓光',   promptToken: 'rim light from behind, silhouette halo', promptToken_anim: 'glowing rim light outline' },
    { id: 'practical',   label: '实景光',   promptToken: 'practical lighting from visible sources', promptToken_anim: 'scene-lit, character illumination' },
    { id: 'mixed',       label: '混合光',   promptToken: 'mixed color temperature lighting',     promptToken_anim: 'mixed color ambient lighting' }
  ];

  const LIGHTING_DIRECTION_PRESETS = [
    { id: 'front',    label: '正面光', promptToken: 'front lit, evenly illuminated',      promptToken_anim: 'front illuminated, flat shading' },
    { id: 'side',     label: '侧光',   promptToken: 'side lit, dramatic shadows',        promptToken_anim: 'side lit, dimensional shading' },
    { id: 'back',     label: '逆光',   promptToken: 'backlit, silhouette or rim glow',   promptToken_anim: 'backlit, glowing outline' },
    { id: 'bottom',   label: '底光',   promptToken: 'underlighting, unsettling low-angle illumination', promptToken_anim: 'unusual low angle lighting' },
    { id: 'three-point', label: '三点布光', promptToken: 'three-point lighting setup',   promptToken_anim: 'three-point animation lighting' },
    { id: 'top',      label: '顶光',   promptToken: 'overhead lighting, top-down illumination', promptToken_anim: 'overhead studio lighting' }
  ];

  const COLOR_TEMP_PRESETS = [
    { id: 'warm',    label: '暖色调', promptToken: 'warm color temperature, orange-amber tones',     promptToken_anim: 'warm color palette, amber glow' },
    { id: 'cool',    label: '冷色调', promptToken: 'cool color temperature, blue-cyan tones',       promptToken_anim: 'cool color palette, blue tones' },
    { id: 'neutral', label: '中性色', promptToken: 'neutral color balance, natural tones',          promptToken_anim: 'neutral balanced colors' },
    { id: 'mixed',   label: '混合色', promptToken: 'mixed color temperature, contrasting warmth and cool', promptToken_anim: 'vibrant mixed color temperature' }
  ];

  const CAMERA_ANGLE_PRESETS = [
    { id: 'eye-level',    label: '平视',    promptToken: 'eye-level camera angle',            promptToken_anim: 'neutral eye-level view' },
    { id: 'low-angle',    label: '仰拍',    promptToken: 'low angle shot, looking up, heroic', promptToken_anim: 'upward angle, heroic perspective' },
    { id: 'high-angle',   label: '俯拍',    promptToken: 'high angle shot, looking down',      promptToken_anim: 'downward angle, diminishment' },
    { id: 'bird-eye',     label: '鸟瞰',    promptToken: "bird's eye view, top-down overhead", promptToken_anim: "bird's eye overhead view" },
    { id: 'dutch',        label: '荷兰角',  promptToken: 'dutch angle, tilted horizon',         promptToken_anim: 'tilted frame, dynamic angle' },
    { id: 'overhead',     label: '顶拍',    promptToken: 'overhead straight-down shot',          promptToken_anim: 'straight overhead view' },
    { id: 'profile',      label: '侧面',    promptToken: 'profile shot, side view',             promptToken_anim: 'side profile view' }
  ];

  const FOCAL_LENGTH_PRESETS = [
    { id: '14mm', label: '14mm 超广',  promptToken: '14mm ultra-wide lens, dramatic spatial distortion', promptToken_anim: 'wide angle perspective distortion' },
    { id: '24mm', label: '24mm 广角',  promptToken: '24mm wide angle, environmental context',  promptToken_anim: 'wide angle environmental shot' },
    { id: '35mm', label: '35mm',       promptToken: '35mm natural cinematic perspective',     promptToken_anim: 'standard wide angle' },
    { id: '50mm', label: '50mm 标准',  promptToken: '50mm standard lens, natural human eye perspective', promptToken_anim: 'neutral perspective, balanced' },
    { id: '85mm', label: '85mm 人像', promptToken: '85mm portrait lens, flattering compression', promptToken_anim: 'portrait compression, soft background' },
    { id: '135mm', label: '135mm 长焦', promptToken: '135mm telephoto, strong subject compression', promptToken_anim: 'compressed telephoto perspective' },
    { id: '200mm', label: '200mm 超长', promptToken: '200mm extreme telephoto, stacked planes', promptToken_anim: 'extreme compression, flattened planes' }
  ];

  const TECHNIQUE_PRESETS = [
    { id: 'bokeh',         label: '焦外光斑', promptToken: 'beautiful bokeh, out of focus light circles', promptToken_anim: 'glowing bokeh circles in background' },
    { id: 'high-speed',    label: '高速摄影', promptToken: 'high speed photography, frozen action moment', promptToken_anim: 'dramatic slow motion, detailed motion blur' },
    { id: 'reflection',    label: '镜面反射', promptToken: 'reflection in glass or water',              promptToken_anim: 'reflective surface detail' },
    { id: 'anamorphic',    label: '变形宽荧', promptToken: 'anamorphic lens, horizontal lens flares',   promptToken_anim: 'cinematic letterbox feel' },
    { id: 'tilt-shift',    label: '移轴',   promptToken: 'tilt-shift miniature effect',               promptToken_anim: 'miniature world look' },
    { id: 'none',          label: '无',     promptToken: '',                                           promptToken_anim: '' }
  ];

  const PLAYBACK_SPEED_PRESETS = [
    { id: '0.25x',  label: '极慢 0.25x', promptToken: 'ultra slow motion 0.25x speed, cinematic slow-mo',  promptToken_anim: 'extreme slow motion' },
    { id: '0.5x',   label: '慢动作 0.5x', promptToken: 'slow motion 0.5x speed, dramatic slow-mo',        promptToken_anim: 'slow motion' },
    { id: 'normal', label: '正常 1x',     promptToken: 'normal real-time speed',                           promptToken_anim: 'standard animation speed' },
    { id: '2x',    label: '快动作 2x',   promptToken: 'time lapse 2x speed',                              promptToken_anim: 'fast paced, time compressed' },
    { id: '4x',    label: '极快 4x',     promptToken: 'rapid time lapse 4x speed',                       promptToken_anim: 'rapid scene transition' }
  ];

  // ============================================================
  // 情绪标签预设
  // ============================================================
  const EMOTION_PRESETS = {
    basic: [
      { id: 'joy',     label: '欢乐',      promptToken: 'joyful, happy atmosphere' },
      { id: 'sad',     label: '悲伤',      promptToken: 'sad, melancholic mood' },
      { id: 'anger',   label: '愤怒',      promptToken: 'angry, tense atmosphere' },
      { id: 'fear',     label: '恐惧',      promptToken: 'fearful, eerie mood' },
      { id: 'surprise', label: '惊讶',     promptToken: 'surprised, shocked moment' },
      { id: 'love',     label: '爱情',     promptToken: 'romantic, loving atmosphere' }
    ],
    atmosphere: [
      { id: 'peaceful',   label: '宁静',   promptToken: 'peaceful, tranquil atmosphere' },
      { id: 'tension',    label: '紧张',   promptToken: 'tense, suspenseful atmosphere' },
      { id: 'mysterious', label: '神秘',   promptToken: 'mysterious, enigmatic mood' },
      { id: 'epic',       label: '史诗',   promptToken: 'epic, grand, awe-inspiring' },
      { id: 'dreamy',     label: '梦幻',   promptToken: 'dreamy, surreal atmosphere' },
      { id: 'dark',       label: '暗黑',   promptToken: 'dark, ominous atmosphere' }
    ],
    tone: [
      { id: 'nostalgic',  label: '怀旧',   promptToken: 'nostalgic, bittersweet tone' },
      { id: 'hopeful',    label: '希望',   promptToken: 'hopeful, uplifting tone' },
      { id: 'ironic',     label: '讽刺',   promptToken: 'ironic, darkly humorous' },
      { id: 'melancholy', label: '忧郁',   promptToken: 'melancholic, wistful tone' }
    ]
  };

  // 氛围特效预设
  const ATMOSPHERIC_EFFECT_PRESETS = {
    weather: [
      { id: 'rain',       label: '雨',      promptToken: 'rain falling, wet reflections' },
      { id: 'snow',       label: '雪',      promptToken: 'falling snow, winter atmosphere' },
      { id: 'fog',        label: '浓雾',   promptToken: 'thick fog, obscured visibility' },
      { id: 'haze',       label: '薄霾',   promptToken: 'atmospheric haze, soft visibility' },
      { id: 'storm',      label: '暴风雨', promptToken: 'torrential rain and thunder' }
    ],
    environment: [
      { id: 'dust',    label: '尘土',   promptToken: 'floating dust particles' },
      { id: 'smoke',   label: '烟雾',   promptToken: 'wisps of smoke, foggy atmosphere' },
      { id: 'mist',    label: '薄雾',   promptToken: 'thin mist, ethereal atmosphere' },
      { id: 'leaves',  label: '落叶',   promptToken: 'falling autumn leaves, swirling in wind' }
    ],
    artistic: [
      { id: 'lens-flare', label: '镜头光晕', promptToken: 'beautiful lens flare, cinematic glow' },
      { id: 'light-rays', label: '光束',     promptToken: 'dramatic god-rays, shafts of light' },
      { id: 'particles',  label: '光粒子',   promptToken: 'floating light particles, magical sparkles' },
      { id: 'bokeh',      label: '焦外光斑', promptToken: 'out of focus bokeh circles' },
      { id: 'bloom',       label: '光晕',     promptToken: 'soft bloom, ethereal glow' },
      { id: 'cherry-blossom', label: '樱花',  promptToken: 'cherry blossom petals floating in air' }
    ]
  };

  const EFFECT_INTENSITY_PRESETS = [
    { id: 'subtle',   label: '轻微', promptToken: 'subtle, understated' },
    { id: 'moderate', label: '适中', promptToken: 'moderate intensity' },
    { id: 'heavy',    label: '浓重', promptToken: 'heavy, intense, overwhelming' }
  ];

  // ============================================================
  // 核心翻译引擎：MediaType-aware token 翻译
  // ============================================================

  /**
   * 根据媒介类型(MediaType)翻译摄影参数 token
   * @param {string} mediaType - cinematic | animation | stop-motion | graphic
   * @param {string} field - 参数字段名
   * @param {string} presetId - 预设 ID
   * @param {string} cinematicToken - 电影/写实风格的 prompt token
   */
  function translateToken(mediaType, field, presetId, cinematicToken) {
    if (!presetId || presetId === 'none') return '';

    const presetMaps = {
      cameraRig:      CAMERA_RIG_PRESETS,
      movementSpeed:  MOVEMENT_SPEED_PRESETS,
      depthOfField:   DEPTH_OF_FIELD_PRESETS,
      focusTransition:FOCUS_TRANSITION_PRESETS,
      lightingStyle:  LIGHTING_STYLE_PRESETS,
      lightingDirection: LIGHTING_DIRECTION_PRESETS,
      colorTemperature:COLOR_TEMP_PRESETS,
      cameraAngle:    CAMERA_ANGLE_PRESETS,
      focalLength:    FOCAL_LENGTH_PRESETS,
      photographyTechnique:TECHNIQUE_PRESETS,
      playbackSpeed: PLAYBACK_SPEED_PRESETS
    };

    const map = presetMaps[field];
    if (!map) return cinematicToken || '';

    const preset = map.find(p => p.id === presetId);
    if (!preset) return cinematicToken || '';

    // 动画/定格/图形风格使用替代 token
    if (mediaType === 'animation' && preset.promptToken_anim) {
      return preset.promptToken_anim;
    }
    if (mediaType === 'stop-motion' && preset.promptToken_stop) {
      return preset.promptToken_stop;
    }
    if (mediaType === 'graphic' && preset.promptToken_graphic) {
      return preset.promptToken_graphic;
    }
    if (mediaType === 'graphic') {
      // graphic 风格：移除所有物理摄影词汇，使用色彩/情绪替代
      const cinematic = preset.promptToken || cinematicToken || '';
      return cinematic
        .replace(/depth of field/gi, 'soft focus')
        .replace(/focus/gi, 'blur')
        .replace(/bokeh/gi, 'color splash');
    }

    return preset.promptToken || cinematicToken || '';
  }

  // ============================================================
  // 辅助函数
  // ============================================================

  /** 构建情绪描述 */
  function buildEmotionDescription(emotionTags) {
    if (!emotionTags || !emotionTags.length) return '';
    const allPresets = [
      ...EMOTION_PRESETS.basic,
      ...EMOTION_PRESETS.atmosphere,
      ...EMOTION_PRESETS.tone
    ];
    const labels = emotionTags
      .map(id => {
        const p = allPresets.find(e => e.id === id);
        return p ? p.promptToken : id;
      })
      .filter(Boolean);

    if (!labels.length) return '';
    if (labels.length === 1) return labels[0];
    return labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
  }

  /** 查找预设 token */
  function findPresetToken(presets, id, mediaType, field) {
    if (!id || id === 'none') return '';
    const preset = presets.find(p => p.id === id);
    if (!preset) return '';
    const base = preset.promptToken || '';
    const translated = translateToken(mediaType || 'cinematic', field, id, base);
    return translated;
  }

  // ============================================================
  // 核心 Prompt Builder
  // ============================================================

  /**
   * 构建完整分镜提示词（图像生成用）
   *
   * @param {Object} shot - 分镜数据
   * @param {Object} cinProfile - 摄影风格档案（可选）
   * @param {Object} config - { stylePrompt, styleNegativePrompt, mediaType }
   */
  function buildShotImagePrompt(shot, cinProfile, config) {
    config = config || {};
    const mediaType = config.mediaType || 'cinematic';
    const parts = [];

    // ---------- Layer 1: 镜头设计 ----------
    const cameraParts = [];

    // 1.1 器材类型
    const effRig = shot.cameraRig || cinProfile?.rig;
    const rigToken = findPresetToken(CAMERA_RIG_PRESETS, effRig, mediaType, 'cameraRig');
    if (rigToken) cameraParts.push(rigToken);

    // 1.2 景别
    const effShotSize = shot.shotType || shot.shotSize;
    if (effShotSize) {
      const shotPreset = SHOT_SIZE_PRESETS_B.find(p => p.id === effShotSize || p.label === effShotSize);
      if (shotPreset) cameraParts.push(shotPreset.promptToken);
    }

    // 1.3 运动方式
    const effMovement = shot.movement || shot.cameraMovement;
    if (effMovement && effMovement !== 'none') {
      // 先找预设，找不到用原始值
      const movePreset = CAMERA_RIG_PRESETS.find(p => p.id === effMovement)
        || MOVEMENT_SPEED_PRESETS.find(p => p.id === effMovement);
      if (movePreset) {
        const t = translateToken(mediaType, 'cameraRig', movePreset.id, movePreset.promptToken);
        if (t) cameraParts.push(t);
      } else {
        cameraParts.push(effMovement);
      }
    }

    // 1.4 拍摄角度
    const effAngle = shot.angle || shot.cameraAngle;
    const angleToken = findPresetToken(CAMERA_ANGLE_PRESETS, effAngle, mediaType, 'cameraAngle');
    if (angleToken) cameraParts.push(angleToken);

    // 1.5 运动速度
    const effSpeed = shot.movementSpeed;
    const speedToken = findPresetToken(MOVEMENT_SPEED_PRESETS, effSpeed, mediaType, 'movementSpeed');
    if (speedToken) cameraParts.push(speedToken);

    // 1.6 景深
    const effDof = shot.depthOfField;
    const dofToken = findPresetToken(DEPTH_OF_FIELD_PRESETS, effDof, mediaType, 'depthOfField');
    if (dofToken) cameraParts.push(dofToken);

    // 1.7 焦距
    const effFL = shot.focalLength;
    const flToken = findPresetToken(FOCAL_LENGTH_PRESETS, effFL, mediaType, 'focalLength');
    if (flToken) cameraParts.push(flToken);

    // 1.8 摄影技法
    const effTech = shot.technique || shot.photographyTechnique;
    const techToken = findPresetToken(TECHNIQUE_PRESETS, effTech, mediaType, 'photographyTechnique');
    if (techToken) cameraParts.push(techToken);

    if (cameraParts.length > 0) {
      parts.push('Camera: ' + cameraParts.join(', '));
    }

    // ---------- Layer 1.5: 灯光设计 ----------
    const lightingParts = [];

    const effLs = shot.lightingStyle || cinProfile?.lightingStyle;
    const lsToken = findPresetToken(LIGHTING_STYLE_PRESETS, effLs, mediaType, 'lightingStyle');
    if (lsToken) lightingParts.push(lsToken);

    const effLd = shot.lightingDirection || cinProfile?.lightingDirection;
    const ldToken = findPresetToken(LIGHTING_DIRECTION_PRESETS, effLd, mediaType, 'lightingDirection');
    if (ldToken) lightingParts.push(ldToken);

    const effCt = shot.colorTemperature || cinProfile?.colorTemperature;
    const ctToken = findPresetToken(COLOR_TEMP_PRESETS, effCt, mediaType, 'colorTemperature');
    if (ctToken) lightingParts.push(ctToken);

    if (lightingParts.length > 0) {
      parts.push('Lighting: ' + lightingParts.join(' '));
    }

    // ---------- Layer 2: 内容焦点 ----------
    const subjectParts = [];

    // 角色名
    if (shot.characterName) subjectParts.push(shot.characterName);
    // 画面描述
    if (shot.description) subjectParts.push(shot.description);
    // 场景
    if (shot.sceneName || shot.scene) subjectParts.push(shot.sceneName || shot.scene);

    if (subjectParts.length > 0) {
      parts.push('Subject: ' + subjectParts.join(', '));
    }

    // ---------- Layer 3: 氛围修饰 ----------
    // 情绪标签
    const emotionDesc = buildEmotionDescription(shot.emotionTags);
    if (emotionDesc) {
      parts.push('Mood: ' + emotionDesc);
    }

    // 氛围特效
    const atmEffects = shot.atmosphericEffects || cinProfile?.atmosphericEffects;
    const effIntensity = shot.effectIntensity || cinProfile?.effectIntensity;
    if (atmEffects && atmEffects.length) {
      const effectTokens = [];
      for (const eid of atmEffects) {
        const allEffects = [
          ...ATMOSPHERIC_EFFECT_PRESETS.weather,
          ...ATMOSPHERIC_EFFECT_PRESETS.environment,
          ...ATMOSPHERIC_EFFECT_PRESETS.artistic
        ];
        const e = allEffects.find(ef => ef.id === eid);
        if (e) effectTokens.push(e.promptToken);
      }
      if (effectTokens.length) {
        const intensityP = EFFECT_INTENSITY_PRESETS.find(i => i.id === effIntensity);
        const prefix = intensityP ? intensityP.promptToken + ' ' : '';
        parts.push('Atmosphere: ' + prefix + effectTokens.join(', '));
      }
    }

    // ---------- Layer 4: 场景信息 ----------
    if (shot.sceneName) parts.push('Setting: ' + shot.sceneName);
    if (shot.timeOfDay) parts.push('Time: ' + shot.timeOfDay);

    // ---------- Layer 5: 视觉风格 ----------
    if (config.stylePrompt) parts.push('Style: ' + config.stylePrompt);

    // ---------- Base: 用户提示词 ----------
    if (shot.prompt) parts.push(shot.prompt);

    // ---------- 速度控制 ----------
    const effPb = shot.playbackSpeed || cinProfile?.playbackSpeed;
    const pbToken = findPresetToken(PLAYBACK_SPEED_PRESETS, effPb, mediaType, 'playbackSpeed');
    if (pbToken) parts.push(pbToken);

    return parts.join('. ');
  }

  /**
   * 构建完整视频提示词（视频生成用）
   * 在图像提示词基础上增加动作和对白
   */
  function buildShotVideoPrompt(shot, cinProfile, config) {
    config = config || {};
    const mediaType = config.mediaType || 'cinematic';

    const parts = [];

    // 摄像机描述（简短）
    const camParts = [];
    const effRig = shot.cameraRig || cinProfile?.rig;
    const rigToken = findPresetToken(CAMERA_RIG_PRESETS, effRig, mediaType, 'cameraRig');
    if (rigToken) camParts.push(rigToken);

    const effAngle = shot.angle || shot.cameraAngle;
    const angleToken = findPresetToken(CAMERA_ANGLE_PRESETS, effAngle, mediaType, 'cameraAngle');
    if (angleToken) camParts.push(angleToken);

    const effSpeed = shot.movementSpeed;
    const speedToken = findPresetToken(MOVEMENT_SPEED_PRESETS, effSpeed, mediaType, 'movementSpeed');
    if (speedToken) camParts.push(speedToken);

    if (camParts.length) parts.push('Camera: ' + camParts.join(', '));

    // 灯光
    const litParts = [];
    const effLs = shot.lightingStyle || cinProfile?.lightingStyle;
    const lsToken = findPresetToken(LIGHTING_STYLE_PRESETS, effLs, mediaType, 'lightingStyle');
    if (lsToken) litParts.push(lsToken);
    if (litParts.length) parts.push('Lighting: ' + litParts.join(' '));

    // 内容（包含角色和动作）
    const contentParts = [];
    if (shot.characterName) contentParts.push(shot.characterName);
    if (shot.description) contentParts.push(shot.description);
    if (shot.action) contentParts.push(shot.action);
    if (contentParts.length) parts.push('Action: ' + contentParts.join(', '));

    // 对白
    if (shot.dialogue) parts.push('Dialogue: "' + shot.dialogue + '"');
    if (shot.ambientSound) parts.push('Ambient: ' + shot.ambientSound);

    // 情绪
    const emotionDesc = buildEmotionDescription(shot.emotionTags);
    if (emotionDesc) parts.push('Mood: ' + emotionDesc);

    // 风格
    if (config.stylePrompt) parts.push('Style: ' + config.stylePrompt);

    // 用户提示词
    if (shot.prompt) parts.push(shot.prompt);

    return parts.join('. ');
  }

  /**
   * 从视觉风格 ID 获取 prompt 和 negativePrompt
   */
  function getStylePrompts(styleId) {
    if (!styleId || !window.DC || !window.DC.VISUAL_STYLE_PRESETS) {
      return { prompt: '', negativePrompt: '' };
    }
    const style = window.DC.VISUAL_STYLE_PRESETS.find(s => s.id === styleId);
    if (!style) return { prompt: '', negativePrompt: '' };
    return {
      prompt: style.prompt || '',
      negativePrompt: style.negativePrompt || '',
      mediaType: style.mediaType || 'cinematic'
    };
  }

  /**
   * 获取分镜的完整图像生成提示词（一键组装）
   * @param {Object} shot - 分镜数据
   * @param {string} styleId - 视觉风格 ID
   * @param {Object} cinProfile - 摄影风格档案（可选）
   */
  function buildFullShotPrompt(shot, styleId, cinProfile) {
    const { prompt: stylePrompt, negativePrompt: styleNeg, mediaType } = getStylePrompts(styleId);
    return {
      prompt: buildShotImagePrompt(shot, cinProfile, { stylePrompt, mediaType }),
      negativePrompt: styleNeg || 'worst quality, low quality, blurry, distorted, watermark, text',
      styleId,
      mediaType
    };
  }

  /**
   * 为角色卡片构建 AI 提示词
   */
  function buildCharacterPrompt(character, styleId) {
    const { prompt: stylePrompt, negativePrompt: styleNeg, mediaType } = getStylePrompts(styleId);

    const parts = [];
    if (character.name) parts.push('Character: ' + character.name);
    if (character.role) parts.push('Role: ' + character.role);
    if (character.age) parts.push('Age: ' + character.age);
    if (character.gender) parts.push('Gender: ' + character.gender);
    if (character.appearance) parts.push('Appearance: ' + character.appearance);
    if (character.personality) parts.push('Personality: ' + character.personality);
    if (character.background) parts.push('Background: ' + character.background);

    const prompt = parts.join('. ');
    return {
      prompt: stylePrompt ? prompt + '. ' + stylePrompt : prompt,
      negativePrompt: styleNeg,
      mediaType
    };
  }

  /**
   * 为场景构建 AI 提示词
   */
  function buildScenePrompt(scene, styleId) {
    const { prompt: stylePrompt, negativePrompt: styleNeg, mediaType } = getStylePrompts(styleId);

    const parts = [];
    if (scene.name) parts.push('Scene: ' + scene.name);
    if (scene.time) parts.push('Time of day: ' + scene.time);
    if (scene.location) parts.push('Location: ' + scene.location);
    if (scene.description) parts.push('Description: ' + scene.description);
    if (scene.lighting) parts.push('Lighting: ' + scene.lighting);
    if (scene.props) parts.push('Props: ' + scene.props);

    const prompt = parts.join('. ');
    return {
      prompt: stylePrompt ? prompt + '. ' + stylePrompt : prompt,
      negativePrompt: styleNeg,
      mediaType
    };
  }

  // ============================================================
  // 对外暴露
  // ============================================================
  window.DC = window.DC || {};

  // 预设常量
  window.DC.SHOT_SIZE_PRESETS_B     = SHOT_SIZE_PRESETS_B;
  window.DC.CAMERA_RIG_PRESETS      = CAMERA_RIG_PRESETS;
  window.DC.MOVEMENT_SPEED_PRESETS  = MOVEMENT_SPEED_PRESETS;
  window.DC.DEPTH_OF_FIELD_PRESETS   = DEPTH_OF_FIELD_PRESETS;
  window.DC.FOCUS_TRANSITION_PRESETS = FOCUS_TRANSITION_PRESETS;
  window.DC.LIGHTING_STYLE_PRESETS  = LIGHTING_STYLE_PRESETS;
  window.DC.LIGHTING_DIRECTION_PRESETS = LIGHTING_DIRECTION_PRESETS;
  window.DC.COLOR_TEMP_PRESETS      = COLOR_TEMP_PRESETS;
  window.DC.CAMERA_ANGLE_PRESETS    = CAMERA_ANGLE_PRESETS;
  window.DC.FOCAL_LENGTH_PRESETS    = FOCAL_LENGTH_PRESETS;
  window.DC.TECHNIQUE_PRESETS       = TECHNIQUE_PRESETS;
  window.DC.PLAYBACK_SPEED_PRESETS   = PLAYBACK_SPEED_PRESETS;
  window.DC.EMOTION_PRESETS         = EMOTION_PRESETS;
  window.DC.ATMOSPHERIC_EFFECT_PRESETS = ATMOSPHERIC_EFFECT_PRESETS;
  window.DC.EFFECT_INTENSITY_PRESETS = EFFECT_INTENSITY_PRESETS;

  // 核心函数
  window.DC.PromptBuilder = {
    buildShotImagePrompt,
    buildShotVideoPrompt,
    buildFullShotPrompt,
    buildCharacterPrompt,
    buildScenePrompt,
    buildEmotionDescription,
    translateToken,
    getStylePrompts
  };

  console.log('[DC] Prompt Builder 已就绪（5层结构化组装 + MediaType智能翻译）');
})();
