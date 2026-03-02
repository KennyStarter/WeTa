/**
 * 朋友圈人物分析 - 后端服务
 * 使用 Express.js 框架实现完整的 API 服务
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const { UserDB, ShareDB, ReportDB, OrderDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 从环境变量读取配置
const ARK_API_KEY = process.env.ARK_API_KEY;
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID || '';

const SYSTEM_PROMPT = '你是一个追求异性的高手，对于青春男女生的心理和外在表现，有非常强的洞察，也有一套很厉害的追求异性的技巧！擅长于输出详细、全面且实用的分析和建议。请基于朋友圈截图，从多个维度进行深度分析，并提供结构化的人物画像和追求攻略。';
const USER_PROMPT = '用户上传了多张某人的朋友圈截图，希望了解此人并与之发展恋爱关系。请基于这些朋友圈截图，从以下维度进行全面分析：\n\n【人物画像维度】\n1. 基本属性：年龄范围、职业特点、生活状态\n2. 性格特质：外向/内向、情绪稳定性、开放性、宜人性\n3. 兴趣爱好：运动、音乐、旅行、美食、阅读、电影等\n4. 价值观：生活态度、消费观念、人际关系\n5. 社交圈：社交活跃度、朋友类型、社交偏好\n6. 情感状态：单身状态、情感需求、理想伴侣类型\n7. 生活习惯：作息规律、饮食习惯、生活品质\n8. 沟通风格：语言风格、表达方式、沟通偏好\n\n【追求攻略维度】\n1. 破冰策略：初次接触方式、话题选择、沟通时机\n2. 互动技巧：聊天频率、回应方式、情感表达\n3. 约会建议：约会场景、活动安排、细节注意事项\n4. 礼物推荐：礼物类型、价值范围、赠送时机\n5. 长期发展：关系推进节奏、矛盾处理、共同目标\n6. 避坑指南：需避免的话题、行为雷区\n\n请输出结构化的分析结果，使用清晰的标题和分点，确保内容详细且实用。';

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(__dirname));
app.use('/style.css', express.static(path.join(__dirname, 'style.css')));
app.use('/app.js', express.static(path.join(__dirname, 'app.js')));

// JWT 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: '认证令牌无效' });
    }
    req.user = user;
    next();
  });
}

// 豆包 API 调用
async function callDoubaoAPI(images) {
  const content = [
    { type: 'text', text: USER_PROMPT },
    ...images.map((dataUrl) => ({
      type: 'image_url',
      image_url: { url: dataUrl },
    })),
  ];

  const body = JSON.stringify({
    model: ARK_ENDPOINT_ID,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content },
    ],
    extra_body: { enable_thinking: true },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'ark.cn-beijing.volces.com',
        port: 443,
        path: '/api/v3/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ARK_API_KEY}`,
          'Content-Length': Buffer.byteLength(body, 'utf8'),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode !== 200) {
              const errMsg = json.error?.message || json.message || data || 'API 调用失败';
              reject(new Error(errMsg));
              return;
            }
            const text = json.choices?.[0]?.message?.content || '';
            resolve(text);
          } catch (e) {
            reject(new Error('解析 API 响应失败'));
          }
        });
      }
    );

    req.on('error', (e) => reject(new Error(e.message)));
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    req.write(body);
    req.end();
  });
}

// ========== 用户认证 API ==========

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, password, nickname } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: '手机号和密码不能为空' });
    }

    const existingUser = await UserDB.findByPhone(phone);
    if (existingUser) {
      return res.status(400).json({ success: false, error: '该手机号已注册' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserDB.create({
      phone,
      passwordHash,
      nickname: nickname || `用户${phone.slice(-4)}`,
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        memberLevel: 'free',
      },
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ success: false, error: '注册失败' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: '手机号和密码不能为空' });
    }

    const user = await UserDB.findByPhone(phone);
    if (!user) {
      return res.status(401).json({ success: false, error: '手机号或密码错误' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: '手机号或密码错误' });
    }

    await UserDB.updateLastLogin(user.id);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        memberLevel: user.member_level,
        membershipExpiresAt: user.membership_expires_at,
      },
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

// 获取用户信息
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await UserDB.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        memberLevel: user.member_level,
        membershipExpiresAt: user.membership_expires_at,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

// ========== 会员套餐 API ==========

const MEMBER_PACKAGES = [
  { type: 'monthly', name: '月度会员', price: 19.9, days: 30 },
  { type: 'quarterly', name: '季度会员', price: 49.9, days: 90 },
  { type: 'yearly', name: '年度会员', price: 159.9, days: 365 },
];

app.get('/api/member/packages', (req, res) => {
  res.json({ success: true, packages: MEMBER_PACKAGES });
});

// 检查会员状态
function isUserPremium(user) {
  if (!user || !user.membership_expires_at) return false;
  return new Date(user.membership_expires_at) > new Date();
}

// ========== 分析 API ==========

app.post('/api/analyze', async (req, res) => {
  try {
    const { images, userId } = req.body;

    if (!Array.isArray(images) || images.length < 5) {
      return res.status(400).json({ success: false, error: '请至少上传 5 张截图' });
    }

    if (!ARK_API_KEY || !ARK_ENDPOINT_ID) {
      return res.status(500).json({ success: false, error: '服务未配置：请在 .env 中设置 ARK_API_KEY 和 ARK_ENDPOINT_ID' });
    }

    const content = await callDoubaoAPI(images);

    let reportId = null;
    if (userId) {
      try {
        const report = await ReportDB.create({
          userId,
          content,
          imagesCount: images.length,
        });
        reportId = report.id;
      } catch (e) {
        console.log('保存报告失败（可能未登录）:', e);
      }
    }

    res.json({ success: true, content, reportId });
  } catch (err) {
    console.error('分析失败:', err);
    const msg = err.message || '分析失败';
    res.status(500).json({ success: false, error: msg, message: msg });
  }
});

// 分析历史
app.get('/api/analyze/history', authenticateToken, async (req, res) => {
  try {
    const reports = await ReportDB.findByUserId(req.user.userId, 20);
    res.json({ success: true, reports });
  } catch (err) {
    console.error('获取分析历史失败:', err);
    res.status(500).json({ success: false, error: '获取分析历史失败' });
  }
});

// ========== 分享 API ==========

// 保存分享结果
app.post('/api/share/save', async (req, res) => {
  try {
    const { content, isPublic = true, reportId, userId } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: '分享内容不能为空' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const share = await ShareDB.create({
      userId: userId || 'anonymous',
      reportId,
      content,
      expiresAt: expiresAt.toISOString(),
      isPublic,
    });

    const shareUrl = `${req.protocol}://${req.get('host')}/share.html?id=${share.id}`;

    res.json({
      success: true,
      shareId: share.id,
      shareUrl,
    });
  } catch (err) {
    console.error('保存分享失败:', err);
    res.status(500).json({ success: false, error: '保存分享失败' });
  }
});

// 获取分享结果
app.get('/api/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const share = await ShareDB.findById(shareId);

    if (!share) {
      return res.status(404).json({ success: false, error: '分享不存在' });
    }

    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: '分享已过期' });
    }

    await ShareDB.incrementViewCount(shareId);

    res.json({
      success: true,
      data: {
        content: share.content,
        createdAt: share.created_at,
        viewCount: share.view_count,
      },
    });
  } catch (err) {
    console.error('获取分享失败:', err);
    res.status(500).json({ success: false, error: '获取分享失败' });
  }
});

// 记录访问次数
app.post('/api/share/:shareId/views', async (req, res) => {
  try {
    const { shareId } = req.params;
    await ShareDB.incrementViewCount(shareId);
    res.json({ success: true });
  } catch (err) {
    console.error('记录访问次数失败:', err);
    res.status(500).json({ success: false, error: '记录访问次数失败' });
  }
});

// 分享页面路由
app.get('/share', (req, res) => {
  res.sendFile(path.join(__dirname, 'share.html'));
});

app.get('/share.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'share.html'));
});

// 默认路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务
app.listen(PORT, () => {
  console.log(`朋友圈人物分析服务已启动: http://localhost:${PORT}`);
  if (!ARK_API_KEY) {
    console.warn('警告: 未设置 ARK_API_KEY，请在 .env 中配置后重启');
  }
  if (!ARK_ENDPOINT_ID || !ARK_ENDPOINT_ID.startsWith('ep-')) {
    console.warn('警告: 请将 ARK_ENDPOINT_ID 替换为火山方舟控制台中的实际 Endpoint ID');
  }
});
