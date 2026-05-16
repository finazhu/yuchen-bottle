// ════════════════════════════════════════════════
// 云函数名称：bottles-create
// 路径：POST /bottles-create
// 功能：粉丝创建漂流瓶（每人限一个）
// ════════════════════════════════════════════════

import cloud from '@lafjs/cloud'

// ── 敏感词列表（服务端权威过滤）──
const SENSITIVE_WORDS = [
  '操','草','妈的','傻逼','sb','fuck','shit','bitch','ass',
  '垃圾人','废物','滚蛋','死亡','去死',
  '赌博','博彩','诈骗','色情','毒品','枪支','黄赌毒',
  '暴力威胁','自杀','反动','推翻','恐怖',
  '微信号','QQ号','加我','私信我','wx:','qq:',  // 防引流
]

export default async function (ctx: FunctionContext) {
  ctx.response.setHeader('Access-Control-Allow-Origin', '*')
  ctx.response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.request.method === 'OPTIONS') return ctx.response.send('ok')

  const { user_id, nickname, content } = ctx.body

  // ── 参数校验 ──
  if (!user_id || !content) {
    return ctx.response.json({ ok: false, error: '参数缺失' })
  }
  if (content.trim().length < 5) {
    return ctx.response.json({ ok: false, error: '内容太短了，再多写几个字吧~' })
  }
  if (content.length > 500) {
    return ctx.response.json({ ok: false, error: '内容不能超过500字' })
  }

  // ── 敏感词过滤（服务端）──
  const lower = content.toLowerCase().replace(/\s/g, '')
  const hitWord = SENSITIVE_WORDS.find(w => lower.includes(w.toLowerCase()))
  if (hitWord) {
    return ctx.response.json({ ok: false, error: '内容包含不适词汇，请修改后再投递' })
  }

  const db = cloud.database()

  // ── 检查用户是否已有瓶子 ──
  const existing = await db.collection('bottles').where({ user_id }).getOne()
  if (existing.data) {
    return ctx.response.json({ ok: false, error: '你已经扔过一个漂流瓶了，可以修改它哦~' })
  }

  // ── 验证用户存在 ──
  const userResult = await db.collection('users').doc(user_id).get()
  if (!userResult.data) {
    return ctx.response.json({ ok: false, error: '用户不存在，请重新登录' })
  }

  // ── 创建漂流瓶 ──
  const now = new Date()
  const bottle = {
    user_id,
    nickname: userResult.data.nickname || nickname || '神秘粉丝',
    content: content.trim(),
    created_at: now,
    updated_at: now,
  }
  const result = await db.collection('bottles').add(bottle)

  return ctx.response.json({
    ok: true,
    bottle: { id: result.id, ...bottle }
  })
}
