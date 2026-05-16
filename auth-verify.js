// ════════════════════════════════════════════════
// 云函数名称：auth-verify
// 路径：POST /auth-verify
// 功能：验证验证码，完成登录/注册
// ════════════════════════════════════════════════

import cloud from '@lafjs/cloud'

export default async function (ctx: FunctionContext) {
  ctx.response.setHeader('Access-Control-Allow-Origin', '*')
  ctx.response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.request.method === 'OPTIONS') return ctx.response.send('ok')

  const { contact, code, nickname } = ctx.body

  // ── 参数校验 ──
  if (!contact || !code) {
    return ctx.response.json({ ok: false, error: '参数缺失' })
  }

  const db = cloud.database()

  // ── 查验证码 ──
  const codeResult = await db.collection('verify_codes')
    .where({ contact, code })
    .getOne()

  if (!codeResult.data) {
    return ctx.response.json({ ok: false, error: '验证码错误，请重新获取' })
  }

  // ── 检查是否过期 ──
  const expiredAt = new Date(codeResult.data.expired_at)
  if (new Date() > expiredAt) {
    await db.collection('verify_codes').where({ contact }).remove()
    return ctx.response.json({ ok: false, error: '验证码已过期，请重新获取' })
  }

  // ── 删除已使用的验证码 ──
  await db.collection('verify_codes').where({ contact }).remove()

  // ── 查找或创建用户 ──
  let userResult = await db.collection('users').where({ email: contact }).getOne()
  let user = userResult.data

  if (!user) {
    // 首次登录，创建新用户
    const safeNickname = sanitizeNickname(nickname) || '神秘粉丝'
    const newUser = {
      email: contact,
      nickname: safeNickname,
      role: 'fan',
      created_at: new Date(),
    }
    const addResult = await db.collection('users').add(newUser)
    user = { _id: addResult.id, ...newUser }
  } else if (nickname && nickname.trim() && nickname !== user.nickname) {
    // 如果用户提供了新昵称，更新它
    const safeNickname = sanitizeNickname(nickname)
    if (safeNickname) {
      await db.collection('users').doc(user._id).update({ nickname: safeNickname })
      user.nickname = safeNickname
    }
  }

  // ── 返回用户信息（用 _id 作为 id）──
  return ctx.response.json({
    ok: true,
    user: {
      id: user._id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    }
  })
}

// 昵称过滤：去掉特殊字符，限制长度
function sanitizeNickname(name) {
  if (!name) return ''
  return name.trim().replace(/[<>&"'\/\\]/g, '').slice(0, 12)
}
