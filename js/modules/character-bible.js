/**
 * ============================================================
 * AI 导演台 · Character Bible（角色圣经系统）
 *
 * 纯浏览器版 — 基于魔因漫创 moyin-creator character-bible 设计
 * License: AGPL-3.0
 *
 * 核心功能：
 *  - 6 层身份锚点锁定角色外貌一致性
 *  - 风格词(Consistency Tokens)确保跨分镜角色不崩
 *  - 多阶段形象（少年/成年/老年等）
 *  - 智能合并多张参考图的视觉特征
 *  - 为每个分镜自动注入一致性前缀
 * ============================================================
 */

(function () {
  'use strict';

  // ============================================================
  // 6 层身份锚点定义（骨相层 → 风格层）
  // ============================================================

  /** 骨相层 - 面部骨骼结构（对一致性影响最大） */
  const BONE_PRESETS = [
    { id: 'oval-soft',       label: '鹅蛋脸（柔）',     token: 'oval face shape with soft jawline', token_anim: 'anime oval face, soft jawline, delicate features' },
    { id: 'oval-sharp',      label: '鹅蛋脸（锐）',     token: 'sharp oval face with defined jaw', token_anim: 'anime sharp oval face, defined jawline, stylish' },
    { id: 'square',           label: '国字脸',           token: 'square jaw with angular cheekbones', token_anim: 'anime square jaw, angular cheeks, strong features' },
    { id: 'heart',           label: '心形脸',           token: 'heart-shaped face with pointed chin', token_anim: 'anime heart-shaped face, cute pointed chin' },
    { id: 'round',           label: '圆脸',             token: 'round face with soft features', token_anim: 'anime round face, soft features, adorable' },
    { id: 'diamond',         label: '菱形脸',           token: 'diamond-shaped face with high cheekbones', token_anim: 'anime diamond face, high cheekbones, elegant' },
    { id: 'oblong',          label: '长脸',             token: 'oblong/long face with balanced proportions', token_anim: 'anime long face, elegant proportions' },
    { id: 'rectangular',     label: '矩形脸',           token: 'rectangular face with strong jawline', token_anim: 'anime rectangular face, strong jaw, mature' },
    { id: 'triangular',      label: '倒三角脸',         token: 'inverted triangular face, tapered chin', token_anim: 'anime v-shaped face, tapered chin, slender' },
    { id: 'round-chubby',    label: '婴儿圆脸',         token: 'chubby round face, full cheeks', token_anim: 'anime chubby round face, full cheeks, babyface' }
  ];

  /** 五官层 - 眼鼻唇精确描述 */
  const FEATURE_PRESETS = {
    eyes: [
      { id: 'almond',      label: '杏仁眼',    token: 'almond-shaped eyes' },
      { id: 'round-big',   label: '圆大眼',   token: 'large round expressive eyes' },
      { id: 'narrow',      label: '细长眼',   token: 'narrow, sharp, elongated eyes' },
      { id: 'droopy',      label: '下垂眼',   token: 'gentle droopy eyes with soft lids' },
      { id: 'upturned',    label: '上挑眼',   token: 'upturned, cat-like eyes' },
      { id: 'deep-set',    label: '深陷眼',   token: 'deep-set eyes with prominent brow ridge' },
      { id: 'wide',        label: '宽眼距',   token: 'wide-set eyes with serene expression' },
      { id: 'monolid',     label: '单眼皮',   token: 'monolid eyes with smooth lid' },
      { id: 'hooded',      label: '内双眼',   token: 'hooded almond-shaped eyes' }
    ],
    nose: [
      { id: 'small-delicate', label: '小巧精致', token: 'small delicate nose with straight bridge' },
      { id: 'high-bridge',    label: '高鼻梁',   token: 'high nose bridge with defined bridge' },
      { id: 'broad',          label: '宽鼻',     token: 'broad nose with full nostrils' },
      { id: 'snub',           label: '翘鼻',    token: 'snub nose with upturned tip' },
      { id: 'aquiline',       label: '鹰钩鼻',  token: 'aquiline roman nose with pronounced bridge' },
      { id: 'flat',           label: '扁平鼻',   token: 'flat nose with wide bridge' }
    ],
    lips: [
      { id: 'full',     label: '饱满唇',     token: 'full, plump lips' },
      { id: 'thin',     label: '薄唇',       token: 'thin, well-defined lips' },
      { id: 'heart-shaped', label: '心形唇', token: 'heart-shaped upper lip with defined cupid bow' },
      { id: 'bow-shaped',   label: '弓形唇', token: 'bow-shaped lips with defined peaks' },
      { id: 'soft',         label: '柔软唇', token: 'soft natural lips' }
    ],
    eyebrows: [
      { id: 'arched',   label: '柳叶眉',   token: 'arched elegant eyebrows' },
      { id: 'straight', label: '剑眉',     token: 'straight bold eyebrows' },
      { id: 'rounded',  label: '弯眉',     token: 'rounded, soft eyebrows' },
      { id: 'bushy',    label: '浓眉',     token: 'bushy natural eyebrows' },
      { id: 'thin',     label: '细眉',     token: 'thin, perfectly groomed eyebrows' }
    ]
  };

  /** 风格层 - 角色设计风格关键词 */
  const STYLE_PRESETS = [
    { id: 'realistic',   label: '写实',    token: 'photorealistic, natural features, realistic proportions' },
    { id: 'anime',       label: '动漫',    token: 'anime style, stylized facial features, large expressive eyes' },
    { id: 'semi-real',   label: '半写实',  token: 'semi-realistic, anime-inspired with natural proportions' },
    { id: 'cartoon',     label: '卡通',    token: 'cartoon character design, exaggerated features' },
    { id: 'comic',       label: '美漫',    token: 'comic book style, bold linework, vibrant colors' },
    { id: 'gothic',      label: '哥特',    token: 'gothic aesthetic, pale skin, dramatic features' },
    { id: 'fantasy',     label: '奇幻',    token: 'fantasy character design, ethereal and otherworldly' },
    { id: 'vintage',     label: '复古',    token: 'retro vintage aesthetic, old Hollywood glamour' },
    { id: 'cyberpunk',   label: '赛博',    token: 'cyberpunk aesthetic, neon accents, tech details' },
    { id: 'ethnic',      label: '民族',    token: 'distinct ethnic features, cultural authenticity' }
  ];

  /** 肤色层 */
  const SKIN_TONE_PRESETS = [
    { id: 'porcelain', label: '瓷白',   token: 'porcelain pale skin, ivory tone' },
    { id: 'fair',      label: '白皙',   token: 'fair skin, light natural tone' },
    { id: 'light',     label: '浅色',   token: 'light medium skin tone' },
    { id: 'olive',     label: '橄榄',   token: 'olive skin tone with warm undertones' },
    { id: 'tan',       label: '古铜',   token: 'tan golden skin tone' },
    { id: 'brown',     label: '棕色',   token: 'rich brown skin tone' },
    { id: 'dark',      label: '深色',   token: 'deep dark skin tone' },
    { id: 'ebony',     label: '乌木',   token: 'ebony deep dark skin tone' },
    { id: 'mixed',     label: '混血',   token: 'mixed race with ambiguous features' }
  ];

  /** 发型层 */
  const HAIR_PRESETS = [
    { id: 'straight-long',    label: '长直发',  token: 'long straight hair' },
    { id: 'straight-short',   label: '短直发',  token: 'short straight hair' },
    { id: 'wavy-long',        label: '长卷发',  token: 'long wavy hair with soft curls' },
    { id: 'wavy-short',      label: '短卷发',  token: 'short wavy curly hair' },
    { id: 'curly',           label: '大卷发',  token: 'voluminous curly hair' },
    { id: 'braided',         label: '编发',    token: 'elaborate braided hairstyle' },
    { id: 'bun',             label: '发髻',    token: 'elegant bun hairstyle' },
    { id: 'ponytail',       label: '马尾',    token: 'high ponytail' },
    { id: 'bob',             label: '波波头',  token: 'bob cut, shoulder-length hair' },
    { id: 'pixie',           label: '精灵短发', token: 'pixie cut, very short styled hair' },
    { id: 'mohawk',          label: '莫西干',  token: 'mohawk styled hair' },
    { id: 'bald',            label: '光头',    token: 'bald, no hair' },
    { id: 'bangs',           label: '刘海',    token: 'bangs / fringe covering forehead' },
    { id: 'half-shaved',     label: '半剃',   token: 'half-shaved asymmetrical hair' }
  ];

  /** 发色层 */
  const HAIR_COLOR_PRESETS = [
    { id: 'black',   label: '纯黑',    token: 'jet black hair' },
    { id: 'dark-brown', label: '深棕',  token: 'dark brown hair' },
    { id: 'brown',   label: '棕色',    token: 'brown hair' },
    { id: 'light-brown', label: '浅棕', token: 'light brown hair' },
    { id: 'blonde',  label: '金色',    token: 'blonde hair' },
    { id: 'platinum',label: '铂金',    token: 'platinum blonde hair' },
    { id: 'red',     label: '红色',    token: 'red hair' },
    { id: 'ginger',  label: '姜红',    token: 'ginger auburn hair' },
    { id: 'gray',    label: '灰白',    token: 'gray silver hair' },
    { id: 'white',   label: '纯白',    token: 'white platinum hair' },
    { id: 'blue',    label: '蓝色',    token: 'blue dyed hair' },
    { id: 'purple',  label: '紫色',    token: 'purple dyed hair' },
    { id: 'pink',    label: '粉色',    token: 'pink dyed hair' },
    { id: 'green',   label: '绿色',    token: 'green dyed hair' }
  ];

  /** 身材层 */
  const BODY_PRESETS = [
    { id: 'slim',      label: '纤细',   token: 'slim, slender build' },
    { id: 'athletic', label: '健壮',   token: 'athletic, muscular build' },
    { id: 'petite',   label: '娇小',   token: 'petite, small frame' },
    { id: 'average',  label: '普通',   token: 'average height and build' },
    { id: 'tall',     label: '高挑',   token: 'tall, elegant build' },
    { id: 'heavy',    label: '丰满',   token: 'heavier, full-figured build' },
    { id: 'muscular', label: '肌肉',   token: 'muscular, well-defined physique' },
    { id: 'skeletal', label: '骨感',   token: 'thin, skeletal frame' }
  ];

  // ============================================================
  // Character Bible 数据结构
  // ============================================================

  /**
   * 创建新的角色圣经
   * @param {Object} character - 角色基础数据
   * @returns {Object} - 角色圣经对象
   */
  function createBible(character) {
    const id = character.id || ('bible_' + Date.now());
    const bible = {
      id,
      characterId: character.id || id,
      name: character.name || 'Unnamed Character',

      // 6 层身份锚点
      bone: null,
      features: { eyes: null, nose: null, lips: null, eyebrows: null },
      skinTone: null,
      hair: null,
      hairColor: null,
      body: null,

      // 扩展描述
      visualTraits: character.appearance || '',
      styleTokens: [],
      colorPalette: [],
      personality: character.personality || '',

      // 参考图
      referenceImages: character.refImages || [],
      threeViewImages: { front: null, side: null, back: null },

      // 多阶段形象
      stages: [],

      // 一致性提示词
      consistencyPrompt: '',

      // 自定义备注
      notes: ''
    };
    // 先猜测锚点（基于外貌描述）
    guessAnchorsFromAppearance(bible, character.appearance || '');
    // 再生成一致性提示词
    updateConsistencyPrompt(bible, 'cinematic');
    return bible;
  }

  // ============================================================
  // 一致性词生成（核心算法）
  // ============================================================

  /**
   * 从预设 token 映射生成一致性描述
   */
  function generateConsistencyTokens(bible, mediaType) {
    const tokens = [];
    const isAnim = mediaType === 'animation';

    if (bible.bone) {
      const p = BONE_PRESETS.find(x => x.id === bible.bone);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }
    if (bible.features?.eyes) {
      const p = FEATURE_PRESETS.eyes.find(x => x.id === bible.features.eyes);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }
    if (bible.features?.nose) {
      const p = FEATURE_PRESETS.nose.find(x => x.id === bible.features.nose);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }
    if (bible.features?.lips) {
      const p = FEATURE_PRESETS.lips.find(x => x.id === bible.features.lips);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }
    if (bible.features?.eyebrows) {
      const p = FEATURE_PRESETS.eyebrows.find(x => x.id === bible.features.eyebrows);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }
    if (bible.skinTone) {
      const p = SKIN_TONE_PRESETS.find(x => x.id === bible.skinTone);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }
    if (bible.hair) {
      const p = HAIR_PRESETS.find(x => x.id === bible.hair);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }
    if (bible.hairColor) {
      const p = HAIR_COLOR_PRESETS.find(x => x.id === bible.hairColor);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }
    if (bible.body) {
      const p = BODY_PRESETS.find(x => x.id === bible.body);
      if (p) tokens.push(isAnim && p.token_anim ? p.token_anim : p.token);
    }

    return tokens;
  }

  /**
   * 生成完整的角色一致性提示词
   * 用于注入到每个分镜的 prompt 前缀中
   */
  function generateConsistencyPrompt(bible, mediaType) {
    if (!bible) return '';

    const tokens = generateConsistencyTokens(bible, mediaType);
    const hasTokens = tokens.length > 0;
    const baseDesc = hasTokens ? tokens.join(', ') : (bible.visualTraits || bible.appearance || '');

    // 动画风格特殊处理：确保始终包含 anime 风格关键词
    if (mediaType === 'animation') {
      let animDesc = baseDesc;
      if (hasTokens) {
        // 替换某些写实描述为动画版本
        animDesc = tokens.map(t => String(t)
          .replace('porcelain pale skin', 'smooth anime skin, pale')
          .replace('natural features', 'anime aesthetic')
          .replace('realistic proportions', 'anime proportions')
        ).join(', ');
      }
      // 确保包含 anime 关键词（去重）
      const lower = animDesc.toLowerCase();
      let prefix = '';
      if (lower.indexOf('anime') < 0 && lower.indexOf('manga') < 0) {
        prefix = 'anime style character, ';
      }
      return bible.name + ', ' + prefix + animDesc;
    }

    return bible.name + ', ' + baseDesc;
  }

  /**
   * 生成色板描述
   */
  function generateColorPalette(bible) {
    if (!bible) return [];
    if (bible.colorPalette && bible.colorPalette.length) return bible.colorPalette;

    const palette = [];
    const skinToneP = SKIN_TONE_PRESETS.find(x => x.id === bible.skinTone);
    const hairColorP = HAIR_COLOR_PRESETS.find(x => x.id === bible.hairColor);
    if (skinToneP) palette.push(skinToneP.label + ' skin');
    if (hairColorP) palette.push(hairColorP.label + ' hair');

    return palette;
  }

  /**
   * 更新角色圣经的一致性提示词
   */
  function updateConsistencyPrompt(bible, mediaType) {
    bible.consistencyPrompt = generateConsistencyPrompt(bible, mediaType);
    bible.styleTokens = generateConsistencyTokens(bible, mediaType);
    bible.colorPalette = generateColorPalette(bible);
    return bible;
  }

  // ============================================================
  // Character Stage（多阶段形象）
  // ============================================================

  /**
   * 创建多阶段形象
   * @param {string} stageId - 阶段ID（如 'young' / 'adult' / 'elder'）
   * @param {string} label - 阶段标签（如 '少年' / '成年' / '老年'）
   * @param {string} description - 描述
   */
  function createStage(stageId, label, description) {
    return {
      id: stageId,
      label,
      description,
      referenceImages: [],
      appearanceTokens: [],
      ageRange: ''
    };
  }

  // 预设阶段模板
  const STAGE_TEMPLATES = [
    createStage('child',  '童年', '童年期（6-12岁），稚嫩可爱'),
    createStage('teen',   '少年', '少年期（13-18岁），青春活力'),
    createStage('young',  '青年', '青年期（19-30岁），风华正茂'),
    createStage('adult',  '中年', '中年期（40-55岁），成熟稳重'),
    createStage('elder',  '老年', '老年期（60岁以上），苍老从容'),
    createStage('ghost',  '灵体', '幽灵/鬼魂形态，半透明飘渺'),
    createStage('armor',  '战甲', '穿着铠甲/盔甲的战斗形态'),
    createStage('casual', '便装', '日常生活装束，随性自然'),
    createStage('formal', '正装', '正式场合服装，端庄得体')
  ];

  // ============================================================
  // Character Bible 管理器
  // ============================================================

  const _bibles = new Map(); // bibleId -> bible

  function saveBible(bible) {
    if (!bible.id) bible.id = 'bible_' + Date.now();
    _bibles.set(bible.id, { ...bible });
    // 持久化到 localStorage
    try {
      const all = {};
      _bibles.forEach((b, id) => { all[id] = b; });
      localStorage.setItem('dc_character_bibles', JSON.stringify(all));
    } catch (e) {}
    return bible;
  }

  function loadBibles() {
    try {
      const raw = localStorage.getItem('dc_character_bibles');
      if (raw) {
        const all = JSON.parse(raw);
        Object.values(all).forEach(b => _bibles.set(b.id, b));
      }
    } catch (e) {}
  }

  function getBible(id) {
    return _bibles.get(id) || null;
  }

  function getAllBibles() {
    return Array.from(_bibles.values());
  }

  function deleteBible(id) {
    _bibles.delete(id);
    try {
      const all = {};
      _bibles.forEach((b, bid) => { all[bid] = b; });
      localStorage.setItem('dc_character_bibles', JSON.stringify(all));
    } catch (e) {}
  }

  /**
   * 为角色创建/更新圣经
   */
  function ensureBible(character) {
    if (!character) return null;

    // 尝试查找已有的
    let bible = null;
    _bibles.forEach(b => {
      if (b.characterId === character.id) bible = b;
    });

    if (!bible) {
      bible = createBible(character);
      // 从现有角色数据猜测锚点
      guessAnchorsFromAppearance(bible, character.appearance || '');
    }

    // 更新基础数据
    bible.name = character.name || bible.name;
    bible.personality = character.personality || bible.personality;
    bible.referenceImages = character.refImages || bible.referenceImages;
    bible.visualTraits = character.appearance || bible.visualTraits;

    updateConsistencyPrompt(bible, 'cinematic');
    saveBible(bible);
    return bible;
  }

  /**
   * 简单从外貌描述猜测锚点（启发式）
   */
  function guessAnchorsFromAppearance(bible, appearance) {
    if (!appearance) return;
    const text = appearance.toLowerCase();

    if (text.includes('鹅蛋') || text.includes('oval')) bible.bone = 'oval-soft';
    else if (text.includes('国字') || text.includes('方') || text.includes('square')) bible.bone = 'square';
    else if (text.includes('圆') && !text.includes('圆脸')) bible.bone = 'round';
    else if (text.includes('菱形')) bible.bone = 'diamond';

    if (text.includes('单眼皮')) bible.features.eyes = 'monolid';
    else if (text.includes('下垂')) bible.features.eyes = 'droopy';
    else if (text.includes('细长') || text.includes('丹凤')) bible.features.eyes = 'narrow';

    if (text.includes('鹰钩')) bible.features.nose = 'aquiline';
    else if (text.includes('小巧') || text.includes('精致')) bible.features.nose = 'small-delicate';

    if (text.includes('饱满')) bible.features.lips = 'full';
    else if (text.includes('薄')) bible.features.lips = 'thin';

    if (text.includes('瓷白') || text.includes('白皙')) bible.skinTone = 'fair';
    else if (text.includes('古铜') || text.includes('小麦')) bible.skinTone = 'tan';
    else if (text.includes('棕色') || text.includes('深色')) bible.skinTone = 'brown';
  }

  /**
   * 获取分镜的角色一致性提示词（用于注入 prompt）
   * @param {string} characterId - 角色ID
   * @param {string} mediaType - 媒介类型
   */
  function getShotConsistencyPrompt(characterId, mediaType) {
    let bible = null;
    _bibles.forEach(b => {
      if (b.characterId === characterId) bible = b;
    });
    if (!bible) return '';
    return generateConsistencyPrompt(bible, mediaType);
  }

  // ============================================================
  // 对外暴露
  // ============================================================
  window.DC = window.DC || {};

  window.DC.BONE_PRESETS     = BONE_PRESETS;
  window.DC.FEATURE_PRESETS  = FEATURE_PRESETS;
  window.DC.STYLE_PRESETS    = STYLE_PRESETS;
  window.DC.SKIN_TONE_PRESETS = SKIN_TONE_PRESETS;
  window.DC.HAIR_PRESETS     = HAIR_PRESETS;
  window.DC.HAIR_COLOR_PRESETS = HAIR_COLOR_PRESETS;
  window.DC.BODY_PRESETS     = BODY_PRESETS;
  window.DC.STAGE_TEMPLATES  = STAGE_TEMPLATES;

  window.DC.CharacterBible = {
    // 创建/管理
    createBible,
    saveBible,
    getBible,
    getAllBibles,
    deleteBible,
    ensureBible,
    loadBibles,
    // 一致性
    generateConsistencyPrompt,
    generateConsistencyTokens,
    generateColorPalette,
    updateConsistencyPrompt,
    getShotConsistencyPrompt,
    // 多阶段
    createStage,
    // 锚点猜测
    guessAnchorsFromAppearance
  };

  // 自动加载已有的角色圣经
  loadBibles();

  console.log('[DC] Character Bible 已就绪（6层身份锚点 + 多阶段形象）');
})();
