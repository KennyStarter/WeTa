/**
 * 朋友圈人物分析 - 后端代理服务
 * 接收前端上传的图片，调用豆包 API 进行分析，返回结果
 * API Key 和 Endpoint ID 通过环境变量配置，不暴露给前端
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// 从环境变量读取配置
const ARK_API_KEY = process.env.ARK_API_KEY;
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID || '';

const SYSTEM_PROMPT = '你是一个追求异性的高手，对于青春男女生的心理和外在表现，有非常强的洞察，也有一套很厉害的追求异性的技巧！擅长于输出详细、全面且实用的分析和建议。请基于朋友圈截图，从多个维度进行深度分析，并提供结构化的人物画像和追求攻略。';
const USER_PROMPT = '用户上传了多张某人的朋友圈截图，希望了解此人并与之发展恋爱关系。请基于这些朋友圈截图，从以下维度进行全面分析：\n\n【人物画像维度】\n1. 基本属性：年龄范围、职业特点、生活状态\n2. 性格特质：外向/内向、情绪稳定性、开放性、宜人性\n3. 兴趣爱好：运动、音乐、旅行、美食、阅读、电影等\n4. 价值观：生活态度、消费观念、人际关系\n5. 社交圈：社交活跃度、朋友类型、社交偏好\n6. 情感状态：单身状态、情感需求、理想伴侣类型\n7. 生活习惯：作息规律、饮食习惯、生活品质\n8. 沟通风格：语言风格、表达方式、沟通偏好\n\n【追求攻略维度】\n1. 破冰策略：初次接触方式、话题选择、沟通时机\n2. 互动技巧：聊天频率、回应方式、情感表达\n3. 约会建议：约会场景、活动安排、细节注意事项\n4. 礼物推荐：礼物类型、价值范围、赠送时机\n5. 长期发展：关系推进节奏、矛盾处理、共同目标\n6. 避坑指南：需避免的话题、行为雷区\n\n请输出结构化的分析结果，使用清晰的标题和分点，确保内容详细且实用。';

// MIME 类型
const MIMES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.ico': 'image/x-icon',
};

// 静态文件目录
const STATIC_DIR = path.join(__dirname);

function serveStatic(reqPath) {
  const ext = path.extname(reqPath);
  const fullPath = path.join(STATIC_DIR, reqPath === '/' ? 'index.html' : reqPath);
  if (!fullPath.startsWith(STATIC_DIR)) return null;
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;
  return { path: fullPath, contentType: MIMES[ext] || 'application/octet-stream' };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

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
    // 深度思考模式（若 endpoint 支持）
    extra_body: { enable_thinking: true },
  });

  const https = require('https');

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

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // API: POST /api/analyze
  if (pathname === '/api/analyze' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (!ARK_API_KEY || !ARK_ENDPOINT_ID) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: '服务未配置：请在 .env 中设置 ARK_API_KEY 和 ARK_ENDPOINT_ID' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const images = body.images || [];

      if (!Array.isArray(images) || images.length < 5) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: '请至少上传 5 张截图' }));
        return;
      }

      const content = await callDoubaoAPI(images);
      res.writeHead(200);
      res.end(JSON.stringify({ content }));
    } catch (err) {
      const msg = err.message || '分析失败';
      res.writeHead(500);
      res.end(JSON.stringify({ error: msg, message: msg }));
    }
    return;
  }

  // 静态文件
  const staticFile = serveStatic(pathname === '/' ? '/index.html' : pathname);
  if (staticFile) {
    const content = fs.readFileSync(staticFile.path);
    res.setHeader('Content-Type', staticFile.contentType);
    res.writeHead(200);
    res.end(content);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`朋友圈人物分析服务已启动: http://localhost:${PORT}`);
  if (!ARK_API_KEY) {
    console.warn('警告: 未设置 ARK_API_KEY，请在 .env 中配置后重启');
  }
  if (!ARK_ENDPOINT_ID || !ARK_ENDPOINT_ID.startsWith('ep-')) {
    console.warn('警告: 请将 ARK_ENDPOINT_ID 替换为火山方舟控制台中的实际 Endpoint ID');
  }
});
