/**
 * 税务风险自测工具 - API 提交接口
 * 
 * 部署到 Vercel 后，前端提交的数据会发到这里
 * 然后通过多个渠道通知你：
 *   1. 企业微信机器人（推荐，免费）
 *   2. Server酱（WeChat推送，免费）
 *   3. 邮箱（备用）
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const SERVERCHAN_KEY = process.env.SERVERCHAN_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

export default async function handler(req, res) {
  // 只接受 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // 验证必填字段
    if (!data.name || !data.phone) {
      return res.status(400).json({ error: '缺少必填信息' });
    }

    // 格式化消息
    const message = formatMessage(data);
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    let results = [];

    // 渠道1：企业微信机器人（推荐）
    if (WEBHOOK_URL) {
      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
              content: `## 📋 新的财税诊断线索\n\n**时间：** ${now}\n\n> ${message.replace(/\n/g, '\n> ')}`
            }
          })
        });
        results.push('企业微信: ✅');
      } catch (e) {
        results.push('企业微信: ❌ ' + e.message);
      }
    }

    // 渠道2：Server酱 WeChat 推送
    if (SERVERCHAN_KEY) {
      try {
        await fetch(`https://sctapi.ftqq.com/${SERVERCHAN_KEY}.send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `📋 新的财税诊断线索 - ${data.name}`,
            desp: message
          })
        });
        results.push('Server酱: ✅');
      } catch (e) {
        results.push('Server酱: ❌ ' + e.message);
      }
    }

    // 渠道3：邮箱（走免费SMTP）
    if (ADMIN_EMAIL) {
      // 留空，需要时接入 SendGrid / 阿里云邮件
    }

    console.log('新线索:', JSON.stringify(data));

    return res.status(200).json({
      success: true,
      message: '提交成功',
      results
    });

  } catch (error) {
    console.error('处理失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}

function formatMessage(data) {
  return [
    `**姓名：** ${data.name}`,
    `**电话：** ${data.phone}`,
    `**企业：** ${data.company || '未填写'}`,
    `**评分：** ${data.score} 分 · ${data.level}`,
    `**风险点：** ${data.risks || '无'}`,
    `**来源：** ${data.source || 'H5自测工具'}`
  ].join('\n');
}
