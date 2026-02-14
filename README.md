# 朋友圈人物分析 H5

基于对方朋友圈截图，通过豆包大模型（doubao-seed-1.6-thinking）分析人物画像和追求攻略，帮助用户与目标对象发展恋爱关系。

## 功能

- 单页设计：上传、加载、结果同页完成
- 上传 5+ 张朋友圈截图（JPG / PNG / WebP，单张 ≤ 5MB）
- 支持点击上传、拖拽上传
- 预览与删除单张图片
- 调用豆包视觉理解 API，深度思考模式
- 输出人物画像 + 追求攻略

## 快速开始

### 1. 配置火山方舟

1. 登录 [火山方舟控制台](https://console.volcengine.com/ark)
2. **API Key**：在「API Key 管理」中创建并复制
3. **Endpoint**：在「模型推理」-「模型接入点」中创建接入点，选择 `doubao-seed-1.6-thinking`（支持多模态与深度思考），获取 Endpoint ID（形如 `ep-xxxxxxxxxx`）

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 ARK_API_KEY 和 ARK_ENDPOINT_ID
```

### 3. 安装依赖并启动

```bash
npm install
npm start
```

浏览器访问 http://localhost:3000

## 项目结构

```
├── index.html      # 单页 H5
├── style.css       # 样式
├── app.js          # 前端逻辑
├── server.js       # 后端代理（调用豆包 API）
├── package.json
├── .env.example    # 环境变量示例
├── PRD.md          # 产品需求文档
└── README.md
```

## 技术说明

- **前端**：原生 HTML/CSS/JS，适配移动端
- **后端**：Node.js HTTP 服务，静态资源 + `/api/analyze` 代理
- **API**：火山方舟 ChatCompletions 视觉理解 API，`https://ark.cn-beijing.volces.com/api/v3/chat/completions`

## 合规与免责

本工具仅供个人了解参考，不构成专业建议。请勿在未经他人同意的情况下过度收集其隐私信息。截图仅用于分析，服务端不存储、不分享。
