// ════════════════════════════════════════════════
// 云函数名称：bottles-list-public
// 路径：POST /bottles-list-public
// 功能：粉丝广场——返回所有瓶子，完全脱敏匿名
//       不返回 user_id 和 nickname
//       仅标记 is_mine（是否是自己的瓶子）
// ════════════════════════════════════════════════

import cloud from '@lafjs/cloud'

export default async function (ctx: FunctionContext) {
  ctx.response.setHeader('Access-Control-Allow-Origin', '*')
  ctx.response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.request.method === 'OPTIONS') return ctx.response.send('ok')

  const { user_id } = ctx.body   // 可为空（未登录用户）

  const db = cloud.database()

  // 获取全部瓶子，按创建时间倒序
  const result = await db.collection('bottles')
    .orderBy('created_at', 'desc')
    .limit(200)   // 最多显示200个，够用了
    .get()

  const bottles = (result.data || []).map(b => ({
    id: b._id,
    content: b.content,
    created_at: b.created_at,
    updated_at: b.updated_at,
    is_mine: user_id ? (b.user_id === user_id) : false,
    // ⚠️ 注意：这里故意不返回 user_id 和 nickname
    // 粉丝端永远看不到是谁写的
  }))

  return ctx.response.json({ ok: true, bottles })
}
