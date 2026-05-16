// ════════════════════════════════════════════════
// 云函数名称：bottles-my
// 路径：POST /bottles-my
// 功能：查询粉丝自己的漂流瓶
// ════════════════════════════════════════════════

import cloud from '@lafjs/cloud'

export default async function (ctx: FunctionContext) {
  ctx.response.setHeader('Access-Control-Allow-Origin', '*')
  ctx.response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.request.method === 'OPTIONS') return ctx.response.send('ok')

  const { user_id } = ctx.body

  if (!user_id) {
    return ctx.response.json({ ok: false, error: '参数缺失' })
  }

  const db = cloud.database()
  const result = await db.collection('bottles').where({ user_id }).getOne()

  if (!result.data) {
    return ctx.response.json({ ok: true, bottle: null })
  }

  const b = result.data
  return ctx.response.json({
    ok: true,
    bottle: {
      id: b._id,
      user_id: b.user_id,
      content: b.content,
      created_at: b.created_at,
      updated_at: b.updated_at,
    }
  })
}
