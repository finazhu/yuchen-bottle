// ════════════════════════════════════════════════
// 云函数名称：bottles-update
// 路径：POST /bottles-update
// 功能：粉丝修改自己的漂流瓶内容
// ════════════════════════════════════════════════

import cloud from '@lafjs/cloud'

const SENSITIVE_WORDS = [
  '操','草','妈的','傻逼','sb','fuck','shit','bitch','ass',
  '垃圾人','废物','滚蛋','死亡','去死',
  '赌博','博彩','诈骗','色情','毒品','枪支','黄赌毒',
  '暴力威胁','自杀','反动','推翻','恐怖',
  '微信号','QQ号','加我','私信我','wx:','qq:',
]

export default async function (ctx: FunctionContext) {
  ctx.response.setHeader('Access-Control-Allow-Origin', '*')
  ctx.response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.request.method === 'OPTIONS') return ctx.response.send('ok')

  const { id, user_id, content } = ctx.body

  if (!id || !user_id || !content) {
    return ctx.response.json({ ok: false, error: '参数缺失' })
  }
  if (content.trim().length < 5) {
    return ctx.response.json({ ok: false, error: '内容太短了~' })
  }
  if (content.length > 500) {
    return ctx.response.json({ ok: false, error: '内容不能超过500字' })
  }

  const lower = content.toLowerCase().replace(/\s/g, '')
  if (SENSITIVE_WORDS.some(w => lower.includes(w.toLowerCase()))) {
    return ctx.response.json({ ok: false, error: '内容包含不适词汇，请修改后再保存' })
  }

  const db = cloud.database()

  // 校验瓶子属于该用户
  const bottleResult = await db.collection('bottles').doc(id).get()
  if (!bottleResult.data) {
    return ctx.response.json({ ok: false, error: '找不到这个瓶子' })
  }
  if (bottleResult.data.user_id !== user_id) {
    return ctx.response.json({ ok: false, error: '这不是你的瓶子，无法修改' })
  }

  const now = new Date()
  await db.collection('bottles').doc(id).update({
    content: content.trim(),
    updated_at: now,
  })

  return ctx.response.json({
    ok: true,
    bottle: {
      id,
      ...bottleResult.data,
      content: content.trim(),
      updated_at: now,
    }
  })
}
