// ════════════════════════════════════════════════
// 云函数名称：send-code
// 路径：POST /send-code
// 功能：向粉丝邮箱发送6位数验证码
// ════════════════════════════════════════════════

import cloud from '@lafjs/cloud'
import * as nodemailer from 'nodemailer'

// ── 邮件配置（在 Laf 环境变量里设置，不要硬编码密码）──
// 去 https://mail.163.com 开启 SMTP，获取"授权码"
const MAIL_CONFIG = {
  host: 'smtp.163.com',      // 如用QQ邮箱改为 smtp.qq.com
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,   // 你的163邮箱地址
    pass: process.env.MAIL_PASS,   // 163邮箱的授权码（不是登录密码）
  }
}

export default async function (ctx: FunctionContext) {
  // ── 跨域头（允许所有来源访问）──
  ctx.response.setHeader('Access-Control-Allow-Origin', '*')
  ctx.response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.request.method === 'OPTIONS') return ctx.response.send('ok')

  const { contact } = ctx.body   // contact = 邮箱地址

  // ── 参数校验 ──
  if (!contact || !contact.includes('@')) {
    return ctx.response.json({ ok: false, error: '请输入有效邮箱地址' })
  }

  // ── 生成6位验证码 ──
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiredAt = new Date(Date.now() + 5 * 60 * 1000)  // 5分钟后过期

  // ── 存入数据库（覆盖旧验证码）──
  const db = cloud.database()
  await db.collection('verify_codes').where({ contact }).remove()  // 删旧的
  await db.collection('verify_codes').add({
    contact,
    code,
    expired_at: expiredAt,
    created_at: new Date(),
  })

  // ── 发送邮件 ──
  try {
    const transporter = nodemailer.createTransport(MAIL_CONFIG)
    await transporter.sendMail({
      from: `"宇辰的漂流瓶 🌊" <${process.env.MAIL_USER}>`,
      to: contact,
      subject: '【宇辰的漂流瓶】你的验证码来啦',
      html: `
        <div style="font-family:'PingFang SC',sans-serif;max-width:480px;margin:0 auto;
                    background:linear-gradient(135deg,#0a2a4a,#1a4a7a);
                    border-radius:16px;padding:32px;color:#fff;text-align:center">
          <div style="font-size:2rem;margin-bottom:8px">🌊</div>
          <h2 style="font-size:1.3rem;margin-bottom:16px;letter-spacing:2px">宇辰的漂流瓶</h2>
          <p style="color:rgba(255,255,255,0.75);font-size:0.9rem;margin-bottom:24px">
            你的专属验证码已漂来，请在 5 分钟内使用：
          </p>
          <div style="background:rgba(255,255,255,0.15);border-radius:12px;
                      padding:18px 32px;display:inline-block;margin-bottom:24px">
            <span style="font-size:2.2rem;letter-spacing:10px;font-weight:bold">${code}</span>
          </div>
          <p style="color:rgba(255,255,255,0.5);font-size:0.78rem">
            如非本人操作，请忽略此邮件
          </p>
        </div>
      `
    })
    return ctx.response.json({ ok: true })
  } catch (err) {
    console.error('邮件发送失败:', err)
    return ctx.response.json({ ok: false, error: '验证码发送失败，请检查邮件配置' })
  }
}
