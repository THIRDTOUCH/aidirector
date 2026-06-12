/**
 * AI 导演台 · 专业分镜脚本模板库
 * 源自 TVLIB storyboard-templates.js - 已迁移到 aidirector
 * 包含 4 大模板：虞姬舞剑（古装戏曲）/ 办公室调度 / 职场相遇（爱情） / 竹林对决（武侠动作）
 * 约定：挂在 window.DC.StoryboardTemplates
 */
(function () {
  'use strict';

  window.DC = window.DC || {};

  // ============================================================
  // 模板数据 —— 每个模板含完整分镜序列（镜头ID / 类型 / 场景 / 时长 / 情绪 / 运镜 / 角度）
  // ============================================================
  const TEMPLATES = {
    'yuji-sword-dance': {
      id: 'yuji-sword-dance',
      name: '虞姬舞剑',
      category: '古装戏曲',
      description: '虞姬在舞台上从持剑、舞剑到诀别，完整动作序列。水墨画风。',
      layout: '4x3',
      style: 'ink-wash',
      actors: { protagonist: '虞姬', protagonistDesc: '汉服女子，长剑，柔美中带坚毅' },
      shots: [
        { id: 1, type: '全景',   scene: '深夜戏曲舞台', duration: 0.8, mood: '凝重', camera: '固定',   angle: '正面',  content: '虞姬背对镜头立于空旷舞台，聚光灯如孤岛照亮她的背影', dialog: '[寂静中一声板鼓轻敲]', lighting: '顶光 · 聚光灯' },
        { id: 2, type: '中近景', scene: '舞台中央',     duration: 0.8, mood: '紧张', camera: '固定',   angle: '侧面',  content: '她缓缓转身，右手探向腰间剑鞘，动作微停',                     dialog: '[剑鞘轻响，金属与皮革摩擦声]', lighting: '侧光 · 轮廓分明' },
        { id: 3, type: '特写',   scene: '拔剑瞬间',     duration: 0.8, mood: '爆发', camera: '推镜+跟', angle: '侧面',  content: '剑刃猛然出鞘，寒光在聚光灯下划出冷冽弧线',              dialog: '[急促的剑刃出鞘金属摩擦声]', lighting: '强光逆光 · 金属反光' },
        { id: 4, type: '中景',   scene: '舞台',         duration: 0.8, mood: '决绝', camera: '横摇',   angle: '环绕',  content: '她猛然转身，裙摆随动作旋开，剑锋在空中划出半圆轨迹',       dialog: '[急促的剑穗飞旋声]', lighting: '正面主光 · 眼神光' },
        { id: 5, type: '近景',   scene: '舞台',         duration: 1.6, mood: '专注', camera: '固定',   angle: '正面',  content: '持剑于胸前，目光凝聚，剑刃划出严酷弧线',                    dialog: '[剑穗呼啸，剑风破空声]', lighting: '正面柔光 · 清晰' },
        { id: 6, type: '中近景', scene: '舞台',         duration: 0.8, mood: '激烈', camera: '跟镜',   angle: '侧面',  content: '纵身跃起，剑势旋斩，剑尖擦地',                                 dialog: '[踏足作响，剑与地面摩擦声]', lighting: '底光+主光 · 动感' },
        { id: 7, type: '特写',   scene: '剑穗',         duration: 0.8, mood: '飘逸', camera: '推镜',   angle: '特写',  content: '剑穗凌空摇曳，流苏飞荡，残影如弧',                              dialog: '[剑穗飘动声]', lighting: '侧逆光 · 轮廓光' },
        { id: 8, type: '中景',   scene: '舞台',         duration: 0.8, mood: '旋转', camera: '环绕',   angle: '俯拍',  content: '以剑尖为轴，剑穗随身飞旋，衣袂如绽放的花朵',                   dialog: '[衣袂猎猎作响]', lighting: '全方位光源 · 舞台效果' },
        { id: 9, type: '远景',   scene: '舞台全景',     duration: 0.8, mood: '悲壮', camera: '拉镜',   angle: '全景',  content: '剑光如银蛇狂舞，她的身影在光晕中忽隐忽现',                    dialog: '[剑啸声渐强]', lighting: '舞台顶光 · 整体照明' },
        { id: 10, type: '中景',  scene: '舞台',         duration: 0.8, mood: '高潮', camera: '固定',   angle: '仰视',  content: '纵身跃起，剑势如长虹贯日，剑气纵横',                              dialog: '[一声长啸]', lighting: '逆光+底光 · 剪影效果' },
        { id: 11, type: '特写',  scene: '虞姬面部',     duration: 0.8, mood: '决绝', camera: '推镜',   angle: '正面',  content: '立定，剑尖斜指，目光向右前方望去，眼神从凌厉转为悲凉',        dialog: '[一切声音渐寂]', lighting: '柔和顶光 · 泪光效果' },
        { id: 12, type: '大特写', scene: '虞姬面部',     duration: 1.2, mood: '悲怆', camera: '固定',   angle: '特写',  content: '眉头紧锁，眼眶噙泪，一滴泪缓缓滑落，嘴角却带着凄然微笑',      dialog: '[霸王……声音凄绝颤抖]', lighting: '顶光 · 聚光灯' }
      ]
    },

    'office-daily': {
      id: 'office-daily',
      name: '办公室日常调度',
      category: '职场日常',
      description: '职员从工位起身 → 走廊前往茶水间 → 接咖啡 → 返回工位。基础调度练习。',
      layout: '3x2',
      style: 'stick-figure',
      actors: { protagonist: '小林', protagonistDesc: '年轻白领，白衬衫，简约办公桌' },
      shots: [
        { id: 1, type: '中近景', scene: '工位',     duration: 2.0, mood: '平静', camera: '固定',   angle: '正面', content: '小林在电脑前工作，抬头看表，皱眉',                         dialog: '[键盘敲击声]', lighting: '自然光 · 柔和' },
        { id: 2, type: '中景',   scene: '工位通道', duration: 3.0, mood: '自然', camera: '跟拍',   angle: '侧面', content: '他从椅子上起身，将座椅推入，向门外走去',                       dialog: '[椅轮摩擦声]', lighting: '室内日光灯' },
        { id: 3, type: '中景',   scene: '走廊转角', duration: 2.5, mood: '自然', camera: '摇镜',   angle: '侧面', content: '走过走廊，阳光从玻璃窗斜照入，他的身影在光中移动',             dialog: '[脚步声]', lighting: '自然光 + 侧逆光' },
        { id: 4, type: '近景',   scene: '茶水间',   duration: 4.0, mood: '放松', camera: '固定',   angle: '正面', content: '进入茶水间，操作咖啡机，咖啡香气升腾（蒸汽动画）',              dialog: '[咖啡机咕嘟声]', lighting: '暖色氛围光' },
        { id: 5, type: '中景',   scene: '走廊',     duration: 3.0, mood: '自然', camera: '跟拍',   angle: '背面', content: '他端着咖啡走回，双手捧着热杯，微微吹气',                       dialog: '[轻轻吹气声]', lighting: '自然光' },
        { id: 6, type: '中近景', scene: '工位',     duration: 2.5, mood: '平静', camera: '固定',   angle: '正面', content: '回到座位，放下咖啡，深吸一口气，再次看向屏幕',                 dialog: '[咖啡杯轻放声]', lighting: '顶光' }
      ]
    },

    'office-romance': {
      id: 'office-romance',
      name: '职场相遇',
      category: '都市情感',
      description: '苏晚清与顾霆琛在公司走廊意外相撞，两人从慌乱到情愫暗生。',
      layout: '3x2',
      style: 'pencil-sketch',
      actors: { protagonist: '苏晚清', protagonistDesc: 'OL装，长发，温柔气质；配角：顾霆琛，西装精英' },
      shots: [
        { id: 1, type: '全景',   scene: '公司走廊', duration: 1.5, mood: '紧张', camera: '跟镜',   angle: '侧面', content: '苏晚清抱着文件快步前行，头看表，显得有些急',                     dialog: '[急促脚步声]', lighting: '室内自然光' },
        { id: 2, type: '中景',   scene: '走廊转角', duration: 1.0, mood: '冲击', camera: '推镜',   angle: '正面', content: '转角处与顾霆琛迎面相撞，文件四散飞舞',                            dialog: '[碰撞声+文件落地声]', lighting: '顶光' },
        { id: 3, type: '近景',   scene: '走廊',     duration: 1.5, mood: '慌乱', camera: '推镜',   angle: '正面', content: '两人同时抬头道歉，目光相遇，动作一停',                             dialog: '对不起/我没事…', lighting: '正面柔光' },
        { id: 4, type: '特写',   scene: '手部特写', duration: 1.5, mood: '暧昧', camera: '固定',   angle: '俯视', content: '两人的手同时伸向地面，手指不经意碰在一起，都顿了一下',            dialog: '[无声]', lighting: '柔和顶光' },
        { id: 5, type: '中景',   scene: '走廊',     duration: 1.5, mood: '微妙', camera: '固定',   angle: '侧面', content: '两人尴尬相视一笑，各自收拾散落的文件',                            dialog: '[轻笑声] 抱歉，我来捡', lighting: '侧光' },
        { id: 6, type: '特写',   scene: '面部特写', duration: 1.0, mood: '心动', camera: '固定',   angle: '正面', content: '苏晚清脸颊微红，目光微闪；顾霆琛嘴角有一抹察觉不到的笑意',        dialog: '[心跳声]', lighting: '暖调逆光' }
      ]
    },

    'bamboo-duel': {
      id: 'bamboo-duel',
      name: '竹林对决',
      category: '武侠动作',
      description: '竹林中两位剑客从对峙到出招、胜负分晓的完整战斗序列。',
      layout: '4x3',
      style: 'action-sketch',
      actors: { protagonist: '剑客', protagonistDesc: '黑衣侠客，长发束起，持长剑；对手：白衣剑客，气质冷' },
      shots: [
        { id: 1, type: '极超广角', scene: '青竹林',  duration: 3.0, mood: '肃杀', camera: '固定',      angle: '俯视', content: '清晨青竹林中雾气弥漫，两位黑衣与白衣剑客相对而立，静止如雕像',   dialog: '[风吹竹叶沙沙声]', lighting: '雾气中晨光 · 冷调' },
        { id: 2, type: '低角度',   scene: '竹林',     duration: 2.0, mood: '蓄势', camera: '推镜',      angle: '低角度', content: '镜头从地面仰拍，两人脚下竹叶微动，各自按剑的右手微微收紧',     dialog: '[剑鞘轻响]', lighting: '低角度侧光' },
        { id: 3, type: '仰角',     scene: '竹林',     duration: 2.0, mood: '爆发', camera: '手持跟拍', angle: '仰视', content: '黑衣率先出手，剑刃破空，白衣侧身闪避，竹叶被剑气斩落数片',    dialog: '[剑风呼啸声]', lighting: '动态高光' },
        { id: 4, type: '近景',     scene: '竹林',     duration: 1.5, mood: '激烈', camera: '手持跟拍', angle: '侧面', content: '双剑相交，金属撞击的火花四溅，两人眼神锐利对峙',                 dialog: '[双剑撞击声]', lighting: '侧光 + 火花高光' },
        { id: 5, type: '中景',     scene: '竹林',     duration: 2.0, mood: '灵动', camera: '侧移跟拍', angle: '侧面', content: '两人高速交锋，身影在竹间穿梭，竹影摇曳如墨',                      dialog: '[竹影晃动声]', lighting: '斑驳晨光' },
        { id: 6, type: '低角度',   scene: '竹林',     duration: 2.0, mood: '反击', camera: '快速移镜', angle: '低角度', content: '白衣一跃而起，剑自上而下劈砍，黑衣横剑挡开，两人脚下尘土飞起',   dialog: '[衣袂翻飞声]', lighting: '冷调' },
        { id: 7, type: '中近景',   scene: '竹林',     duration: 1.5, mood: '惊险', camera: '快速推镜', angle: '正面', content: '剑刃擦过黑衣肩头，他向后微闪，眼神一凛，随即出剑反击',          dialog: '[衣料撕裂声]', lighting: '聚光式' },
        { id: 8, type: '广角',     scene: '竹林',     duration: 2.0, mood: '震撼', camera: '快速摇镜', angle: '全景', content: '竹林全景，两人身影如墨点，一大片竹叶被剑气震落，漫天飞叶',       dialog: '[竹林震动声]', lighting: '大面积顶光' },
        { id: 9, type: '近景',     scene: '竹林',     duration: 3.0, mood: '密集', camera: '环绕',      angle: '侧面', content: '两人近身缠斗，剑法极快，镜头环绕捕捉密集动作',                    dialog: '[连续金属撞击声]', lighting: '移动光' },
        { id: 10, type: '仰角',    scene: '竹林',     duration: 2.5, mood: '高潮', camera: '慢速推镜', angle: '仰视', content: '黑衣使出杀招，剑如长虹贯日，从上方飞刺而下，白衣仰剑格挡',       dialog: '[一声金属大震]', lighting: '逆光剪影' },
        { id: 11, type: '中景',    scene: '竹林',     duration: 1.5, mood: '终结', camera: '快速推镜', angle: '侧面', content: '双剑交击的一瞬间定格，白衣剑刃微微倾斜，黑衣剑尖已抵其咽喉',     dialog: '[寂静无声]', lighting: '聚焦高光' },
        { id: 12, type: '极超广角', scene: '竹林',   duration: 3.0, mood: '落幕', camera: '拉远',      angle: '全景', content: '镜头拉回大远景，竹林恢复宁静，两人依旧保持对峙姿势，落叶缓缓落下', dialog: '[一声长叹，鸟鸣]', lighting: '冷调晨雾' }
      ]
    }
  };

  // ============================================================
  // 辅助：生成画面描述的英文提示词（用于图像 AI）
  // ============================================================
  function buildShotImagePrompt(shot, template) {
    const styleMap = {
      'ink-wash': 'traditional chinese ink wash painting, brush strokes, minimalist, zen atmosphere',
      'stick-figure': 'simple stick figure sketch, storyboard thumbnail, quick draft',
      'pencil-sketch': 'pencil sketch, graphite shading, clean line art, professional storyboard',
      'action-sketch': 'dynamic action sketch, motion lines, energy, comic book style'
    };
    const typeMap = {
      '全景': 'full shot, establishing scene', '中景': 'medium shot',
      '中近景': 'medium close-up, chest up', '近景': 'close-up framing',
      '特写': 'extreme close-up, intimate detail', '大特写': 'macro close-up',
      '极超广角': 'extreme wide shot, sweeping vista',
      '低角度': 'low-angle shot, power perspective', '仰角': 'low angle hero shot'
    };
    const moodMap = {
      '凝重': 'somber atmosphere, dramatic tension',
      '紧张': 'tense mood, high stakes, suspenseful',
      '爆发': 'explosive energy, dynamic action',
      '决绝': 'determined expression, resolute gaze',
      '专注': 'intense focus, sharp details',
      '激烈': 'fierce combat, rapid movement, chaos',
      '飘逸': 'ethereal quality, flowing motion',
      '悲壮': 'melancholic heroism, tragic grandeur',
      '悲怆': 'deep sorrow, tragic tears',
      '自然': 'natural, everyday mood',
      '放松': 'relaxed atmosphere, casual',
      '暧昧': 'romantic tension, subtle chemistry',
      '心动': 'heart-fluttering moment, romantic spark',
      '肃杀': 'menacing stillness, deathly silence',
      '蓄势': 'building tension, coiled-spring',
      '灵动': 'nimble, agile movement, lively',
      '震撼': 'jaw-dropping, awe-inspiring',
      '落幕': 'finale, serene aftermath'
    };
    return [
      styleMap[template.style] || 'cinematic illustration',
      typeMap[shot.type] || 'medium shot',
      moodMap[shot.mood] || 'dramatic',
      `scene: ${shot.scene}`,
      `camera movement: ${shot.camera}`,
      `shot composition: ${shot.angle}`,
      'professional film storyboard, highly detailed, cinematic lighting, movie scene',
      '8k, masterpiece, high quality'
    ].join(', ');
  }

  function buildShotVideoPrompt(shot) {
    const cameraMap = {
      '固定': 'static composition, stable framing', '推镜': 'slow push in, approaching subject',
      '推镜+跟': 'push in following action, dynamic', '横摇': 'smooth pan, horizontal sweep',
      '拉镜': 'pull back, revealing scene, expanding view', '跟拍': 'follow shot, immersive camera',
      '跟镜': 'follow shot, accompanying subject', '摇镜': 'smooth pan, revealing',
      '快速摇镜': 'quick pan, sudden reveal, shock effect',
      '环绕': 'orbit shot, 360-degree camera movement',
      '手持跟拍': 'handheld tracking, organic feel', '快速推镜': 'fast push in, urgency',
      '慢速推镜': 'slow deliberate push, building tension',
      '拉远': 'slow pull back, epic reveal',
      '侧移跟拍': 'lateral tracking, parallel camera movement'
    };
    return [cameraMap[shot.camera] || 'static camera movement', `mood: ${shot.mood}`, 'cinematic film look, 24fps, professional cinematography, film grain'].join(', ');
  }

  // ============================================================
  // 对外导出
  // ============================================================
  window.DC.StoryboardTemplates = {
    list: () => TEMPLATES,
    get: (id) => TEMPLATES[id] || null,
    names: () => Object.keys(TEMPLATES).map(id => ({ id, name: TEMPLATES[id].name, category: TEMPLATES[id].category, totalShots: TEMPLATES[id].shots.length, description: TEMPLATES[id].description })),
    buildImagePrompt: buildShotImagePrompt,
    buildVideoPrompt: buildShotVideoPrompt,
    // 将模板转换为 aidirector 项目的 shots 数组格式
    toProjectShots: (templateId, overrides = {}) => {
      const tpl = TEMPLATES[templateId];
      if (!tpl) return [];
      return tpl.shots.map((shot, idx) => ({
        id: `shot_${templateId}_${idx}`,
        shotNumber: idx + 1,
        scene: shot.scene,
        type: shot.type,
        mood: shot.mood,
        camera: shot.camera,
        angle: shot.angle,
        duration: shot.duration,
        content: shot.content,
        dialog: shot.dialog,
        lighting: shot.lighting,
        imagePrompt: buildShotImagePrompt(shot, tpl),
        videoPrompt: buildShotVideoPrompt(shot),
        ...overrides
      }));
    }
  };

  console.log('[DC] 分镜模板库已就绪，模板: ' + Object.keys(TEMPLATES).join(' / '));
})();
