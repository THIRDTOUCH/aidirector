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
    { id: 'oval-soft',       label: '鹅蛋脸（柔）',     token: 'oval face shape with soft jawline', token_anim: 'anime oval face, soft jawline, delicate features', token_stopmotion: 'claymation oval face, soft jawline, puppet-like features', token_graphic: 'flat graphic oval face, minimal jawline definition, stylized' },
    { id: 'oval-sharp',      label: '鹅蛋脸（锐）',     token: 'sharp oval face with defined jaw', token_anim: 'anime sharp oval face, defined jawline, stylish', token_stopmotion: 'claymation sharp oval face, defined jaw, sculpted look', token_graphic: 'flat graphic sharp oval face, bold defined jaw, vector style' },
    { id: 'square',           label: '国字脸',           token: 'square jaw with angular cheekbones', token_anim: 'anime square jaw, angular cheeks, strong features', token_stopmotion: 'claymation square jaw, angular cheeks, puppet sculpture', token_graphic: 'flat graphic square jaw, angular geometric cheeks, bold lines' },
    { id: 'heart',           label: '心形脸',           token: 'heart-shaped face with pointed chin', token_anim: 'anime heart-shaped face, cute pointed chin', token_stopmotion: 'claymation heart-shaped face, cute pointed chin, doll-like', token_graphic: 'flat graphic heart-shaped face, cute pointed chin, simplified' },
    { id: 'round',           label: '圆脸',             token: 'round face with soft features', token_anim: 'anime round face, soft features, adorable', token_stopmotion: 'claymation round face, soft features, chibi puppet', token_graphic: 'flat graphic round face, soft rounded features, kawaii style' },
    { id: 'diamond',         label: '菱形脸',           token: 'diamond-shaped face with high cheekbones', token_anim: 'anime diamond face, high cheekbones, elegant', token_stopmotion: 'claymation diamond face, high cheekbones, marionette style', token_graphic: 'flat graphic diamond face, high cheekbones, geometric art' },
    { id: 'oblong',          label: '长脸',             token: 'oblong/long face with balanced proportions', token_anim: 'anime long face, elegant proportions', token_stopmotion: 'claymation long face, elegant proportions, string puppet', token_graphic: 'flat graphic long face, elegant simplified proportions, vector' },
    { id: 'rectangular',     label: '矩形脸',           token: 'rectangular face with strong jawline', token_anim: 'anime rectangular face, strong jaw, mature', token_stopmotion: 'claymation rectangular face, strong jaw, articulated puppet', token_graphic: 'flat graphic rectangular face, strong jaw, bold rectangular shapes' },
    { id: 'triangular',      label: '倒三角脸',         token: 'inverted triangular face, tapered chin', token_anim: 'anime v-shaped face, tapered chin, slender', token_stopmotion: 'claymation v-shaped face, tapered chin, delicate puppet', token_graphic: 'flat graphic v-shaped face, tapered chin, triangular composition' },
    { id: 'round-chubby',    label: '婴儿圆脸',         token: 'chubby round face, full cheeks', token_anim: 'anime chubby round face, full cheeks, babyface', token_stopmotion: 'claymation chubby round face, full cheeks, cute blob puppet', token_graphic: 'flat graphic chubby round face, full cheeks, chibi illustration' }
  ];

  /** 五官层 - 眼鼻唇精确描述 */
  const FEATURE_PRESETS = {
    eyes: [
      { id: 'almond',      label: '杏仁眼',    token: 'almond-shaped eyes', token_anim: 'anime almond eyes, large expressive', token_stopmotion: 'claymation almond eyes, puppet eyes, articulated', token_graphic: 'flat graphic almond eyes, simplified, bold outlines' },
      { id: 'round-big',   label: '圆大眼',   token: 'large round expressive eyes', token_anim: 'anime large round eyes, sparkly, expressive', token_stopmotion: 'claymation big round googly eyes, expressive puppet', token_graphic: 'flat graphic big round eyes, kawaii style, minimal detail' },
      { id: 'narrow',      label: '细长眼',   token: 'narrow, sharp, elongated eyes', token_anim: 'anime narrow sharp eyes, confident gaze', token_stopmotion: 'claymation narrow slit eyes, reptilian puppet', token_graphic: 'flat graphic narrow eyes, sleek vector, stylized' },
      { id: 'droopy',      label: '下垂眼',   token: 'gentle droopy eyes with soft lids', token_anim: 'anime gentle droopy eyes, sleepy charm', token_stopmotion: 'claymation droopy sleepy eyes, soft puppet', token_graphic: 'flat graphic droopy eyes, mellow illustration' },
      { id: 'upturned',    label: '上挑眼',   token: 'upturned, cat-like eyes', token_anim: 'anime cat-like upturned eyes, alluring', token_stopmotion: 'claymation cat-like upturned eyes, feline puppet', token_graphic: 'flat graphic upturned cat eyes, bold graphic' },
      { id: 'deep-set',    label: '深陷眼',   token: 'deep-set eyes with prominent brow ridge', token_anim: 'anime deep-set eyes, dramatic', token_stopmotion: 'claymation deep-set eyes, hollow puppet', token_graphic: 'flat graphic deep-set eyes, shadowed graphic' },
      { id: 'wide',        label: '宽眼距',   token: 'wide-set eyes with serene expression', token_anim: 'anime wide-set eyes, innocent look', token_stopmotion: 'claymation wide-set eyes, surprised puppet', token_graphic: 'flat graphic wide-set eyes, spaced illustration' },
      { id: 'monolid',     label: '单眼皮',   token: 'monolid eyes with smooth lid', token_anim: 'anime monolid eyes, unique beauty', token_stopmotion: 'claymation monolid eyes, flat puppet', token_graphic: 'flat graphic monolid eyes, minimalist' },
      { id: 'hooded',      label: '内双眼',   token: 'hooded almond-shaped eyes', token_anim: 'anime hooded eyes, mysterious', token_stopmotion: 'claymation hooded eyes, half-closed puppet', token_graphic: 'flat graphic hooded eyes, stylized lids' }
    ],
    nose: [
      { id: 'small-delicate', label: '小巧精致', token: 'small delicate nose with straight bridge', token_anim: 'anime small delicate nose, cute', token_stopmotion: 'claymation small delicate nose, puppet nose', token_graphic: 'flat graphic small nose, simplified dot' },
      { id: 'high-bridge',    label: '高鼻梁',   token: 'high nose bridge with defined bridge', token_anim: 'anime high nose bridge, elegant', token_stopmotion: 'claymation high nose bridge, sculpted puppet', token_graphic: 'flat graphic high nose, geometric line' },
      { id: 'broad',          label: '宽鼻',     token: 'broad nose with full nostrils', token_anim: 'anime broad nose, stylized', token_stopmotion: 'claymation broad flat nose, blob puppet', token_graphic: 'flat graphic broad nose, bold shapes' },
      { id: 'snub',           label: '翘鼻',    token: 'snub nose with upturned tip', token_anim: 'anime snub nose, cute upturned', token_stopmotion: 'claymation snub upturned nose, button puppet', token_graphic: 'flat graphic snub nose, tiny uplifted' },
      { id: 'aquiline',       label: '鹰钩鼻',  token: 'aquiline roman nose with pronounced bridge', token_anim: 'anime aquiline nose, dramatic', token_stopmotion: 'claymation aquiline roman nose, hooked puppet', token_graphic: 'flat graphic aquiline nose, curved line' },
      { id: 'flat',           label: '扁平鼻',   token: 'flat nose with wide bridge', token_anim: 'anime flat nose, minimal', token_stopmotion: 'claymation flat wide nose, squashed puppet', token_graphic: 'flat graphic flat nose, two dots' }
    ],
    lips: [
      { id: 'full',     label: '饱满唇',     token: 'full, plump lips', token_anim: 'anime full plump lips, vibrant', token_stopmotion: 'claymation full lips, rubber puppet', token_graphic: 'flat graphic full lips, bold color' },
      { id: 'thin',     label: '薄唇',       token: 'thin, well-defined lips', token_anim: 'anime thin lips, elegant', token_stopmotion: 'claymation thin lips, flat puppet', token_graphic: 'flat graphic thin lips, simple line' },
      { id: 'heart-shaped', label: '心形唇', token: 'heart-shaped upper lip with defined cupid bow', token_anim: 'anime heart-shaped lips, cute', token_stopmotion: 'claymation heart lips, mold puppet', token_graphic: 'flat graphic heart-shaped lips, stylized' },
      { id: 'bow-shaped',   label: '弓形唇', token: 'bow-shaped lips with defined peaks', token_anim: 'anime bow-shaped lips, defined', token_stopmotion: 'claymation bow lips, shaped puppet', token_graphic: 'flat graphic bow lips, graphic peaks' },
      { id: 'soft',         label: '柔软唇', token: 'soft natural lips', token_anim: 'anime soft natural lips, gentle', token_stopmotion: 'claymation soft lips, squishy puppet', token_graphic: 'flat graphic soft lips, rounded illustration' }
    ],
    eyebrows: [
      { id: 'arched',   label: '柳叶眉',   token: 'arched elegant eyebrows', token_anim: 'anime arched eyebrows, graceful', token_stopmotion: 'claymation arched brows, wire puppet', token_graphic: 'flat graphic arched brows, curved lines' },
      { id: 'straight', label: '剑眉',     token: 'straight bold eyebrows', token_anim: 'anime straight brows, fierce', token_stopmotion: 'claymation straight brows, flat puppet', token_graphic: 'flat graphic straight brows, bold horizontal' },
      { id: 'rounded',  label: '弯眉',     token: 'rounded, soft eyebrows', token_anim: 'anime rounded brows, gentle', token_stopmotion: 'claymation rounded brows, soft puppet', token_graphic: 'flat graphic rounded brows, soft curves' },
      { id: 'bushy',    label: '浓眉',     token: 'bushy natural eyebrows', token_anim: 'anime bushy brows, wild', token_stopmotion: 'claymation bushy brows, fuzzy puppet', token_graphic: 'flat graphic bushy brows, thick strokes' },
      { id: 'thin',     label: '细眉',     token: 'thin, perfectly groomed eyebrows', token_anim: 'anime thin brows, delicate', token_stopmotion: 'claymation thin brows, wispy puppet', token_graphic: 'flat graphic thin brows, fine lines' }
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
    { id: 'ethnic',      label: '民族',    token: 'distinct ethnic features, cultural authenticity' },
    { id: 'stop-motion', label: '定格',    token: 'stop motion animation style, claymation aesthetic, frame by frame, puppet-like characters' },
    { id: 'graphic',     label: '平面',    token: 'flat graphic illustration style, vector art, bold colors, clean lines, minimalist design' }
  ];

  /** 肤色层 */
  const SKIN_TONE_PRESETS = [
    { id: 'porcelain', label: '瓷白',   token: 'porcelain pale skin, ivory tone', token_anim: 'anime pale porcelain skin, smooth', token_stopmotion: 'claymation porcelain pale skin, smooth rubber', token_graphic: 'flat graphic pale ivory skin, solid color' },
    { id: 'fair',      label: '白皙',   token: 'fair skin, light natural tone', token_anim: 'anime fair skin, light glow', token_stopmotion: 'claymation fair skin, light tone puppet', token_graphic: 'flat graphic fair skin, light solid' },
    { id: 'light',     label: '浅色',   token: 'light medium skin tone', token_anim: 'anime light skin, medium tone', token_stopmotion: 'claymation light medium skin, smooth', token_graphic: 'flat graphic light skin, medium flat' },
    { id: 'olive',     label: '橄榄',   token: 'olive skin tone with warm undertones', token_anim: 'anime olive skin, warm tone', token_stopmotion: 'claymation olive skin, warm puppet', token_graphic: 'flat graphic olive skin, warm solid' },
    { id: 'tan',       label: '古铜',   token: 'tan golden skin tone', token_anim: 'anime tan golden skin, warm', token_stopmotion: 'claymation tan golden skin, sun-kissed puppet', token_graphic: 'flat graphic tan skin, golden flat' },
    { id: 'brown',     label: '棕色',   token: 'rich brown skin tone', token_anim: 'anime brown skin, warm rich', token_stopmotion: 'claymation rich brown skin, earthy puppet', token_graphic: 'flat graphic brown skin, solid brown' },
    { id: 'dark',      label: '深色',   token: 'deep dark skin tone', token_anim: 'anime dark skin, deep tone', token_stopmotion: 'claymation deep dark skin, shadow puppet', token_graphic: 'flat graphic dark skin, deep solid' },
    { id: 'ebony',     label: '乌木',   token: 'ebony deep dark skin tone', token_anim: 'anime ebony skin, rich dark', token_stopmotion: 'claymation ebony dark skin, deep puppet', token_graphic: 'flat graphic ebony skin, rich dark flat' },
    { id: 'mixed',     label: '混血',   token: 'mixed race with ambiguous features', token_anim: 'anime mixed features, blended', token_stopmotion: 'claymation mixed features, diverse puppet', token_graphic: 'flat graphic mixed skin, blended flat' }
  ];

  /** 发型层 */
  const HAIR_PRESETS = [
    { id: 'straight-long',    label: '长直发',  token: 'long straight hair', token_anim: 'anime long straight hair, flowing', token_stopmotion: 'claymation long straight hair, articulated strands', token_graphic: 'flat graphic long straight hair, solid shapes' },
    { id: 'straight-short',   label: '短直发',  token: 'short straight hair', token_anim: 'anime short straight hair, neat', token_stopmotion: 'claymation short straight hair, rigid strands', token_graphic: 'flat graphic short straight hair, simple flat' },
    { id: 'wavy-long',        label: '长卷发',  token: 'long wavy hair with soft curls', token_anim: 'anime long wavy hair, flowing curls', token_stopmotion: 'claymation long wavy hair, springy curls', token_graphic: 'flat graphic long wavy hair, stylized curls' },
    { id: 'wavy-short',      label: '短卷发',  token: 'short wavy curly hair', token_anim: 'anime short wavy curly hair, bouncy', token_stopmotion: 'claymation short wavy curly hair, frizzy puppet', token_graphic: 'flat graphic short wavy hair, cartoon curls' },
    { id: 'curly',           label: '大卷发',  token: 'voluminous curly hair', token_anim: 'anime voluminous curly hair, big bounces', token_stopmotion: 'claymation voluminous curly hair, puffy ringlets', token_graphic: 'flat graphic curly hair, big solid curls' },
    { id: 'braided',         label: '编发',    token: 'elaborate braided hairstyle', token_anim: 'anime braided hairstyle, detailed', token_stopmotion: 'claymation braided hair, woven puppet', token_graphic: 'flat graphic braided hair, pattern style' },
    { id: 'bun',             label: '发髻',    token: 'elegant bun hairstyle', token_anim: 'anime elegant bun, neat swirl', token_stopmotion: 'claymation bun hairstyle, dough puppet', token_graphic: 'flat graphic bun, circle shape' },
    { id: 'ponytail',       label: '马尾',    token: 'high ponytail', token_anim: 'anime high ponytail, bouncy', token_stopmotion: 'claymation ponytail, articulated strand', token_graphic: 'flat graphic ponytail, simple tail' },
    { id: 'bob',             label: '波波头',  token: 'bob cut, shoulder-length hair', token_anim: 'anime bob cut, cute blunt', token_stopmotion: 'claymation bob hair, boxy puppet', token_graphic: 'flat graphic bob, solid block' },
    { id: 'pixie',           label: '精灵短发', token: 'pixie cut, very short styled hair', token_anim: 'anime pixie cut, spiky chic', token_stopmotion: 'claymation pixie cut, short fuzz', token_graphic: 'flat graphic pixie, tiny shapes' },
    { id: 'mohawk',          label: '莫西干',  token: 'mohawk styled hair', token_anim: 'anime mohawk, dramatic spikes', token_stopmotion: 'claymation mohawk, stiff quills', token_graphic: 'flat graphic mohawk, bold stripes' },
    { id: 'bald',            label: '光头',    token: 'bald, no hair', token_anim: 'anime bald head, smooth', token_stopmotion: 'claymation bald, smooth dome', token_graphic: 'flat graphic bald, simple shape' },
    { id: 'bangs',           label: '刘海',    token: 'bangs / fringe covering forehead', token_anim: 'anime bangs, sweeping fringe', token_stopmotion: 'claymation bangs, curtain puppet', token_graphic: 'flat graphic bangs, straight across' },
    { id: 'half-shaved',     label: '半剃',   token: 'half-shaved asymmetrical hair', token_anim: 'anime half-shaved, edgy asymmetric', token_stopmotion: 'claymation half-shaved, mixed media puppet', token_graphic: 'flat graphic half-shaved, bold asymmetric' }
  ];

  /** 发色层 */
  const HAIR_COLOR_PRESETS = [
    { id: 'black',   label: '纯黑',    token: 'jet black hair', token_anim: 'anime jet black hair, glossy', token_stopmotion: 'claymation jet black hair, glossy puppet', token_graphic: 'flat graphic jet black hair, solid black' },
    { id: 'dark-brown', label: '深棕',  token: 'dark brown hair', token_anim: 'anime dark brown hair, rich', token_stopmotion: 'claymation dark brown hair, brown puppet', token_graphic: 'flat graphic dark brown hair, brown solid' },
    { id: 'brown',   label: '棕色',    token: 'brown hair', token_anim: 'anime brown hair, warm', token_stopmotion: 'claymation brown hair, warm puppet', token_graphic: 'flat graphic brown hair, warm brown' },
    { id: 'light-brown', label: '浅棕', token: 'light brown hair', token_anim: 'anime light brown hair, soft', token_stopmotion: 'claymation light brown hair, light puppet', token_graphic: 'flat graphic light brown hair, light tan' },
    { id: 'blonde',  label: '金色',    token: 'blonde hair', token_anim: 'anime blonde hair, bright', token_stopmotion: 'claymation blonde hair, yellow puppet', token_graphic: 'flat graphic blonde hair, bright yellow' },
    { id: 'platinum',label: '铂金',    token: 'platinum blonde hair', token_anim: 'anime platinum hair, silver glow', token_stopmotion: 'claymation platinum hair, silvery puppet', token_graphic: 'flat graphic platinum hair, silver solid' },
    { id: 'red',     label: '红色',    token: 'red hair', token_anim: 'anime red hair, fiery', token_stopmotion: 'claymation red hair, crimson puppet', token_graphic: 'flat graphic red hair, bright red' },
    { id: 'ginger',  label: '姜红',    token: 'ginger auburn hair', token_anim: 'anime ginger hair, auburn warmth', token_stopmotion: 'claymation ginger hair, orange puppet', token_graphic: 'flat graphic ginger hair, orange flat' },
    { id: 'gray',    label: '灰白',    token: 'gray silver hair', token_anim: 'anime gray silver hair, elegant', token_stopmotion: 'claymation gray hair, silvery puppet', token_graphic: 'flat graphic gray hair, grey solid' },
    { id: 'white',   label: '纯白',    token: 'white platinum hair', token_anim: 'anime white platinum hair, ethereal', token_stopmotion: 'claymation white hair, ghostly puppet', token_graphic: 'flat graphic white hair, pure white' },
    { id: 'blue',    label: '蓝色',    token: 'blue dyed hair', token_anim: 'anime blue dyed hair, vibrant', token_stopmotion: 'claymation blue hair, neon puppet', token_graphic: 'flat graphic blue hair, bright blue' },
    { id: 'purple',  label: '紫色',    token: 'purple dyed hair', token_anim: 'anime purple dyed hair, mystical', token_stopmotion: 'claymation purple hair, violet puppet', token_graphic: 'flat graphic purple hair, vivid purple' },
    { id: 'pink',    label: '粉色',    token: 'pink dyed hair', token_anim: 'anime pink dyed hair, sweet', token_stopmotion: 'claymation pink hair, bubblegum puppet', token_graphic: 'flat graphic pink hair, bright pink' },
    { id: 'green',   label: '绿色',    token: 'green dyed hair', token_anim: 'anime green dyed hair, nature tech', token_stopmotion: 'claymation green hair, emerald puppet', token_graphic: 'flat graphic green hair, vivid green' }
  ];

  /** 身材层 */
  const BODY_PRESETS = [
    { id: 'slim',      label: '纤细',   token: 'slim, slender build', token_anim: 'anime slim slender build, elegant', token_stopmotion: 'claymation slim build, thin puppet', token_graphic: 'flat graphic slim body, thin stylized' },
    { id: 'athletic', label: '健壮',   token: 'athletic, muscular build', token_anim: 'anime athletic build, toned', token_stopmotion: 'claymation athletic build, strong puppet', token_graphic: 'flat graphic athletic body, muscular outline' },
    { id: 'petite',   label: '娇小',   token: 'petite, small frame', token_anim: 'anime petite small frame, cute', token_stopmotion: 'claymation petite frame, tiny puppet', token_graphic: 'flat graphic petite body, small cute' },
    { id: 'average',  label: '普通',   token: 'average height and build', token_anim: 'anime average build, normal proportions', token_stopmotion: 'claymation average build, standard puppet', token_graphic: 'flat graphic average body, normal stylized' },
    { id: 'tall',     label: '高挑',   token: 'tall, elegant build', token_anim: 'anime tall elegant build, willowy', token_stopmotion: 'claymation tall build, elongated puppet', token_graphic: 'flat graphic tall body, stretched stylized' },
    { id: 'heavy',    label: '丰满',   token: 'heavier, full-figured build', token_anim: 'anime full-figured build, curvy', token_stopmotion: 'claymation heavy build, rounded puppet', token_graphic: 'flat graphic heavy body, big stylized' },
    { id: 'muscular', label: '肌肉',   token: 'muscular, well-defined physique', token_anim: 'anime muscular physique, hero build', token_stopmotion: 'claymation muscular build, brawny puppet', token_graphic: 'flat graphic muscular body, bold shapes' },
    { id: 'skeletal', label: '骨感',   token: 'thin, skeletal frame', token_anim: 'anime thin skeletal frame, gaunt', token_stopmotion: 'claymation skeletal frame, thin puppet', token_graphic: 'flat graphic skeletal body, thin angular' }
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
    const isStopMotion = mediaType === 'stop-motion';
    const isGraphic = mediaType === 'graphic';

    const getToken = (p, isStyle) => {
      if (isStopMotion && p.token_stopmotion) return p.token_stopmotion;
      if (isGraphic && p.token_graphic) return p.token_graphic;
      if (isAnim && p.token_anim) return p.token_anim;
      return p.token;
    };

    if (bible.bone) {
      const p = BONE_PRESETS.find(x => x.id === bible.bone);
      if (p) tokens.push(getToken(p));
    }
    if (bible.features?.eyes) {
      const p = FEATURE_PRESETS.eyes.find(x => x.id === bible.features.eyes);
      if (p) tokens.push(getToken(p));
    }
    if (bible.features?.nose) {
      const p = FEATURE_PRESETS.nose.find(x => x.id === bible.features.nose);
      if (p) tokens.push(getToken(p));
    }
    if (bible.features?.lips) {
      const p = FEATURE_PRESETS.lips.find(x => x.id === bible.features.lips);
      if (p) tokens.push(getToken(p));
    }
    if (bible.features?.eyebrows) {
      const p = FEATURE_PRESETS.eyebrows.find(x => x.id === bible.features.eyebrows);
      if (p) tokens.push(getToken(p));
    }
    if (bible.skinTone) {
      const p = SKIN_TONE_PRESETS.find(x => x.id === bible.skinTone);
      if (p) tokens.push(getToken(p));
    }
    if (bible.hair) {
      const p = HAIR_PRESETS.find(x => x.id === bible.hair);
      if (p) tokens.push(getToken(p));
    }
    if (bible.hairColor) {
      const p = HAIR_COLOR_PRESETS.find(x => x.id === bible.hairColor);
      if (p) tokens.push(getToken(p));
    }
    if (bible.body) {
      const p = BODY_PRESETS.find(x => x.id === bible.body);
      if (p) tokens.push(getToken(p));
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

    // stop-motion 风格特殊处理：确保始终包含 stop motion 关键词
    if (mediaType === 'stop-motion') {
      let smDesc = baseDesc;
      if (hasTokens) {
        // 替换某些描述为 stop-motion 版本
        smDesc = tokens.map(t => String(t)
          .replace('porcelain pale skin', 'smooth clay skin, pale')
          .replace('natural features', 'claymation aesthetic')
          .replace('realistic proportions', 'puppet proportions')
        ).join(', ');
      }
      // 确保包含 stop motion 关键词（去重）
      const lower = smDesc.toLowerCase();
      let prefix = '';
      if (lower.indexOf('stop motion') < 0 && lower.indexOf('claymation') < 0) {
        prefix = 'stop motion animation, ';
      }
      return bible.name + ', ' + prefix + smDesc;
    }

    // graphic 风格特殊处理：确保始终包含 flat illustration 或 vector art 关键词
    if (mediaType === 'graphic') {
      let gDesc = baseDesc;
      if (hasTokens) {
        // 替换某些描述为 graphic 版本
        gDesc = tokens.map(t => String(t)
          .replace('porcelain pale skin', 'flat graphic skin, solid color')
          .replace('natural features', 'vector art style')
          .replace('realistic proportions', 'flat proportions')
        ).join(', ');
      }
      // 确保包含 flat illustration 或 vector art 关键词（去重）
      const lower = gDesc.toLowerCase();
      let prefix = '';
      if (lower.indexOf('flat') < 0 && lower.indexOf('vector') < 0 && lower.indexOf('graphic') < 0) {
        prefix = 'flat graphic illustration, ';
      }
      return bible.name + ', ' + prefix + gDesc;
    }

    return bible.name + ', ' + baseDesc;
  }

  /**
   * 生成所有风格的角色一致性提示词
   * 返回一个对象，包含 cinematic, animation, stopMotion, graphic 四种风格
   */
  function generateAllStylePrompts(bible) {
    return {
      cinematic: generateConsistencyPrompt(bible, 'cinematic'),
      animation: generateConsistencyPrompt(bible, 'animation'),
      stopMotion: generateConsistencyPrompt(bible, 'stop-motion'),
      graphic: generateConsistencyPrompt(bible, 'graphic')
    };
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
    generateAllStylePrompts,
    // 多阶段
    createStage,
    // 锚点猜测
    guessAnchorsFromAppearance
  };

  // 自动加载已有的角色圣经
  loadBibles();

  console.log('[DC] Character Bible 已就绪（6层身份锚点 + 多阶段形象）');
})();
