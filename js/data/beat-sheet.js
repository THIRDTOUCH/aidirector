/**
 * AI 导演台 · 节拍表（Beat Sheet）模板库
 * 源自 TVLIB app-phase3.js - 已迁移到 aidirector
 * 支持三种结构：三幕式(three-act) / 四幕式(four-act) / 救猫咪(save-the-cat)
 * 约定：挂在 window.DC.BeatSheet
 */
(function () {
  'use strict';

  window.DC = window.DC || {};

  const STRUCTURES = {
    'three-act': {
      name: '三幕式结构',
      description: '最经典的戏剧结构：开场-冲突-解决，适用于绝大多数短片与电影。',
      totalMinutes: 120,
      beats: [
        { act: '第一幕 · 开端 (0-30分钟)', name: '开场画面', minutes: '0-5', description: '展示主角现状、世界观与基本人物关系' },
        { act: '第一幕 · 开端 (0-30分钟)', name: '催化事件', minutes: '5-15', description: '某个事件发生，彻底打破主角的平衡生活' },
        { act: '第一幕 · 开端 (0-30分钟)', name: '拒绝冒险', minutes: '15-25', description: '主角因恐惧/责任试图回避挑战，最终被更大压力推动' },
        { act: '第一幕 · 开端 (0-30分钟)', name: '第一转折点', minutes: '25-30', description: '主角正式进入新世界，第一幕结束' },
        { act: '第二幕 · 冲突 (30-90分钟)', name: '上升行动', minutes: '30-60', description: '主角不断面对障碍，目标逐渐清晰，盟友与敌人现身' },
        { act: '第二幕 · 冲突 (30-90分钟)', name: '中点', minutes: '60', description: '故事的真正中心，主角获得新信息或状态反转，目标从被动变主动' },
        { act: '第二幕 · 冲突 (30-90分钟)', name: '坏家伙逼近', minutes: '60-80', description: '反派力量集中攻击，主角遭受严重损失' },
        { act: '第二幕 · 冲突 (30-90分钟)', name: '至暗时刻', minutes: '80-90', description: '一切看似失败，主角走到最低谷，第二幕在此结束' },
        { act: '第三幕 · 解决 (90-120分钟)', name: '第三转折点', minutes: '90-95', description: '主角从至暗中领悟，找到真正解决问题的核心钥匙' },
        { act: '第三幕 · 解决 (90-120分钟)', name: '高潮', minutes: '95-110', description: '与反派最终对决，所有伏笔与设定在这一刻集中兑现' },
        { act: '第三幕 · 解决 (90-120分钟)', name: '终局画面', minutes: '110-120', description: '新世界秩序建立，主角的变化被视觉化展示' }
      ]
    },

    'four-act': {
      name: '四幕式结构',
      description: '更适合电视剧/网络短剧/长篇小说：清晰的四个阶段，节奏感更强。',
      totalMinutes: 120,
      beats: [
        { act: '第一幕 · 引入 (0-25)', name: '引子', minutes: '0-5', description: '主角日常生活、基本性格' },
        { act: '第一幕 · 引入 (0-25)', name: '催化事件', minutes: '5-15', description: '关键事件打破平衡' },
        { act: '第一幕 · 引入 (0-25)', name: '行动号召', minutes: '15-25', description: '主角被迫做出重大决定，进入新世界' },
        { act: '第二幕 · 上升 (25-55)', name: '新世界探索', minutes: '25-35', description: '主角在陌生环境/规则下尝试适应，结交盟友与敌人' },
        { act: '第二幕 · 上升 (25-55)', name: '首次成功', minutes: '35-45', description: '小胜建立信心，但也暴露了自己' },
        { act: '第二幕 · 上升 (25-55)', name: '升势结束', minutes: '45-55', description: '反派开始真正反击，主角首次直面压力' },
        { act: '第三幕 · 反转 (55-85)', name: '中点反转', minutes: '55', description: '一次重大反转，主角发现之前的认知都是错的' },
        { act: '第三幕 · 反转 (55-85)', name: '盟友背叛', minutes: '55-70', description: '信任的人倒戈，主角陷入孤立' },
        { act: '第三幕 · 反转 (55-85)', name: '重大失败', minutes: '70-85', description: '看似无法挽回的惨败' },
        { act: '第四幕 · 解决 (85-120)', name: '觉醒', minutes: '85-95', description: '从失败中总结，获得新的认知与动力' },
        { act: '第四幕 · 解决 (85-120)', name: '最终决战', minutes: '95-110', description: '主角以全新自我与反派对抗' },
        { act: '第四幕 · 解决 (85-120)', name: '尾声', minutes: '110-120', description: '新秩序建立，人物命运收束' }
      ]
    },

    'save-the-cat': {
      name: '救猫咪 (Save the Cat)',
      description: 'Blake Snyder 的商业剧本结构：10节拍 + 4张牌，最受好莱坞欢迎的模板。',
      totalMinutes: 110,
      beats: [
        { act: '开幕影像 (Logline 0-10)', name: '开场画面', minutes: '0-5', description: '展示主角之前的状态，以及世界"之前"的样子，埋下主题伏笔' },
        { act: '开幕影像 (0-10)', name: '主题提出', minutes: '5-10', description: '用一句对话/事件暗示电影探讨的核心主题（如"忠诚值多少钱？"）' },
        { act: '设置 (Set-up 10-30)', name: '设置', minutes: '10-20', description: '介绍主角、目标、缺陷、需求、对手、潜在冲突' },
        { act: '设置 (10-30)', name: '催化事件', minutes: '20-25', description: '一件不可逆转的事情发生，迫使主角行动' },
        { act: '设置 (10-30)', name: '辩论', minutes: '25-30', description: '主角与自己或他人辩论：要不要去？值得吗？' },
        { act: '分幕 (Break into Two 30)', name: '分幕转折', minutes: '30', description: '主角跨入第二幕的决定性行动，不可逆' },
        { act: 'B 故事 (B Story 30-55)', name: 'B 故事启动', minutes: '30-40', description: '次要故事线启动——通常是爱情/友谊线，承载主题的情感核心' },
        { act: 'B 故事 (30-55)', name: '乐趣与游戏', minutes: '40-55', description: '故事最"电影感"的部分——预告片素材、类型片的核心满足感' },
        { act: '中点 (Midpoint 55)', name: '中点', minutes: '55', description: '一个"伪胜利"或"伪失败"，让主角误以为掌握主动或放弃，实际是故事压力升级的开始' },
        { act: '坏家伙逼近 (Bad Guys Close In 55-75)', name: '内忧外患', minutes: '55-65', description: '反派力量增强，主角团队内部矛盾浮现' },
        { act: '坏家伙逼近 (55-75)', name: '一切都在失去', minutes: '65-75', description: '主角被迫做出艰难抉择，盟友受损，资源枯竭' },
        { act: '一无所有 (All is Lost 75)', name: '至暗时刻', minutes: '75', description: '死亡气息——有人离世/象征死亡，主角跌入谷底' },
        { act: '黑夜里的灵魂 (Dark Night of the Soul 75-85)', name: '黑夜反思', minutes: '75-85', description: '主角在绝望中反思，从导师/记忆/主题中获得新领悟' },
        { act: '分幕三 (Break into Three 85)', name: '第三幕突破', minutes: '85', description: '主角以全新自我、新计划重新出发' },
        { act: '结局 (Finale 85-105)', name: '高潮序列', minutes: '85-100', description: '层层叠加的最终对决，主题在此得到戏剧化体现' },
        { act: '结局 (85-105)', name: '核心高潮', minutes: '100-105', description: '最关键一击，所有伏笔集中兑现' },
        { act: '终幕画面 (Final Image 105-110)', name: '终幕画面', minutes: '105-110', description: '与开场画面形成对照，展示主角与世界"之后"的状态' }
      ]
    }
  };

  function createEmptyBeats(structureId) {
    const tpl = STRUCTURES[structureId];
    if (!tpl) return [];
    return tpl.beats.map(b => ({ name: b.name, description: b.description, minutes: b.minutes, act: b.act, content: '' }));
  }

  window.DC.BeatSheet = {
    structures: STRUCTURES,
    listStructures: () => Object.keys(STRUCTURES).map(id => ({ id, name: STRUCTURES[id].name, description: STRUCTURES[id].description, totalMinutes: STRUCTURES[id].totalMinutes, beatCount: STRUCTURES[id].beats.length })),
    getStructure: (id) => STRUCTURES[id] || null,
    createEmptyBeats,
    // 将节拍表转换为大纲文本（用于填充项目大纲）
    toOutline: (beats, structureId) => {
      const structure = STRUCTURES[structureId];
      const lines = [];
      lines.push(`# ${structure ? structure.name : '故事大纲'} · 节拍表\n`);
      let lastAct = null;
      beats.forEach((beat, idx) => {
        if (beat.act !== lastAct) {
          lines.push(`\n## ${beat.act}`);
          lastAct = beat.act;
        }
        lines.push(`\n### ${idx + 1}. ${beat.name} (${beat.minutes})`);
        if (beat.description) lines.push(`> ${beat.description}`);
        if (beat.content) lines.push(`\n${beat.content}`);
      });
      return lines.join('\n');
    },
    // 完成度计算
    completion: (beats) => {
      if (!beats || !beats.length) return 0;
      const filled = beats.filter(b => b.content && b.content.trim()).length;
      return Math.round((filled / beats.length) * 100);
    }
  };

  console.log('[DC] 节拍表系统已就绪，结构: ' + Object.keys(STRUCTURES).map(id => STRUCTURES[id].name).join(' / '));
})();
