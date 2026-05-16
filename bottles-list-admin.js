// ════════════════════════════════════════════════
// 云函数名称：bottles-list-admin
// 路径：POST /bottles-list-admin
// 功能：偶像后台——返回所有瓶子，含粉丝昵称
//       需要偶像密钥验证，防止粉丝绕过前端直接调用
// ════════════════════════════════════════════════

import cloud from '@lafjs/cloud'

// 偶像专属密钥（和前端 CONFIG.IDOL_PASS 保持一致）
// 建议生产环境改用 process.env.IDOL_SECRET
const IDOL_SECRET = process.env.IDOL_SECRET || 'YuChen2024!'

export default async function (ctx: FunctionContext) {
  ctx.response.setHeader('Access-Control-Allow-Origin', '*')
  ctx.response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.request.method === 'OPTIONS') return ctx.response.send('ok')

  const { idol_secret } = ctx.body

  // ── 偶像身份验证 ──
  if (idol_secret !== IDOL_SECRET) {
    return ctx.response.json({ ok: false, error: '无权访问，请确认偶像身份' })
  }

  const db = cloud.database()

  const result = await db.collection('bottles')
    .orderBy('created_at', 'desc')
    .limit(500)
    .get()

  const bottles = (result.data || []).map(b => ({
    id: b._id,
    user_id: b.user_id,
    nickname: b.nickname || '神秘粉丝',   // ✅ 偶像能看到昵称
    content: b.content,
    created_at: b.created_at,
    updated_at: b.updated_at,
  }))

  return ctx.response.json({
    ok: true,
    bottles,
    total: bottles.length,
  })
}
