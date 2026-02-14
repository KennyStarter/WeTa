# 朋友圈人物分析 H5 - 产品优化设计文档 (PRD 3.0)

## 1. 项目概述

### 1.1 项目定位
- **产品定位**：基于 AI 视觉理解的朋友圈人物分析工具，提供完整的用户系统和会员体系
- **核心价值**：智能化的人物洞察 + 个性化的追求攻略 + 完善的用户服务
- **目标用户**：18-35岁，希望通过朋友圈了解异性并发展恋爱关系的年轻用户

### 1.2 优化背景
- **现状**：核心功能已实现，但缺乏用户系统、分享功能不完整
- **问题**：
  - 没有注册、登录功能
  - 没有会员体系
  - 分享链接功能存在漏洞，无法保存和展示分析结果
  - 无法判断用户会员身份
- **目标**：建立完整的用户系统和会员体系，修复分享功能，提供更好的用户体验

## 2. 核心功能优化

### 2.1 用户系统 - 注册与登录

#### 2.1.1 用户注册
- **注册方式**
  - 手机号验证码注册
  - 微信登录（可选扩展）
  - 邮箱注册（可选扩展）
- **注册流程**
  1. 用户输入手机号
  2. 发送验证码
  3. 输入验证码和设置密码
  4. 完成注册
- **数据存储**
  - 用户 ID（UUID）
  - 手机号（加密存储）
  - 密码（bcrypt 加密）
  - 注册时间
  - 最后登录时间

#### 2.1.2 用户登录
- **登录方式**
  - 手机号 + 密码登录
  - 手机号 + 验证码登录
  - 记住登录状态（7天免登录）
- **登录流程**
  1. 用户输入手机号和密码
  2. 验证用户信息
  3. 生成登录 Token（JWT）
  4. 返回用户信息和 Token
- **会话管理**
  - JWT Token 认证
  - Token 有效期：7 天
  - 自动刷新 Token

#### 2.1.3 用户信息管理
- **用户资料**
  - 头像
  - 昵称
  - 性别
  - 年龄
  - 个人简介
- **修改密码**
  - 验证旧密码
  - 设置新密码
- **退出登录**
  - 清除本地 Token
  - 后端 Token 失效

### 2.2 会员系统

#### 2.2.1 会员等级
| 等级 | 权限 | 价格 | 有效期 |
|------|------|------|--------|
| 免费用户 | 基础分析、分享结果 | 免费 | 永久 |
| 月度会员 | 全部功能、无限分析、导出报告 | ¥19.9 | 30 天 |
| 季度会员 | 全部功能、无限分析、导出报告、优先客服 | ¥49.9 | 90 天 |
| 年度会员 | 全部功能、无限分析、导出报告、优先客服、专属功能 | ¥159.9 | 365 天 |

#### 2.2.2 会员权益
- **免费用户权益**
  - 每天 3 次免费分析
  - 查看基础分析结果
  - 分享分析结果（受限）
  - 基础客服支持

- **会员用户权益**
  - 无限次分析
  - 查看完整分析结果
  - 导出 PDF 分析报告
  - 优先客服支持
  - 专属会员功能
  - 无广告体验

#### 2.2.3 充值功能
- **充值方式**
  - 微信支付
  - 支付宝支付
  - 苹果内购（移动端）
- **充值流程**
  1. 选择会员套餐
  2. 选择支付方式
  3. 发起支付请求
  4. 支付成功回调
  5. 更新会员状态
- **会员状态管理**
  - 会员开始时间
  - 会员到期时间
  - 自动续费设置
  - 会员等级记录

### 2.3 分享功能优化

#### 2.3.1 问题分析
- **当前问题**：分享链接只是 Base64 编码，无法持久化存储，返回的是初始界面
- **根本原因**：缺少后端存储和分享结果查询接口

#### 2.3.2 分享功能设计

**数据模型**
```javascript
{
  id: "report_xxxxx",              // 分享 ID
  userId: "user_xxxxx",             // 创建用户 ID
  resultContent: "...",             // 分析结果内容
  createdAt: "2026-02-14T...",     // 创建时间
  viewCount: 0,                      // 查看次数
  expiresAt: "2026-03-14T...",     // 过期时间（30天）
  isPublic: true                     // 是否公开
}
```

**API 接口设计**

1. **保存分析结果**
   - **接口**：`POST /api/share/save`
   - **请求**：
     ```json
     {
       "content": "分析结果内容",
       "isPublic": true
     }
     ```
   - **响应**：
     ```json
     {
       "success": true,
       "shareId": "report_xxxxx",
       "shareUrl": "https://example.com/share/report_xxxxx"
     }
     ```

2. **获取分享结果**
   - **接口**：`GET /api/share/:shareId`
   - **响应**：
     ```json
     {
       "success": true,
       "data": {
         "content": "分析结果内容",
         "createdAt": "2026-02-14T...",
         "viewCount": 1
       }
     }
     ```

3. **访问分享页面**
   - **路由**：`/share/:shareId`
   - **展示**：显示完整的分析结果
   - **功能**：
     - 查看分析结果
     - 提示注册/登录（可选）
     - 分享给其他用户

#### 2.3.3 分享页面设计
- **页面布局**
  - 顶部：标题和分享信息
  - 中间：分析结果展示（与原页面一致）
  - 底部：操作按钮（复制、再分析、注册提示）
- **用户引导**
  - 分享页访客可以查看分析结果
  - 引导访客注册使用完整功能
  - 提供快速注册入口

### 2.4 会员判断机制

#### 2.4.1 会员状态存储
- **后端存储**
  - 用户表中的会员字段
  - 会员开始时间
  - 会员到期时间
  - 会员等级
- **前端存储**
  - 用户信息（包含会员状态）
  - 本地缓存（过期自动更新）

#### 2.4.2 会员判断流程

**后端判断**
```javascript
function isUserPremium(userId) {
  const user = getUserById(userId);
  if (!user) return false;
  
  const now = new Date();
  return user.membershipExpiresAt && 
         new Date(user.membershipExpiresAt) > now;
}

function getMemberLevel(userId) {
  const user = getUserById(userId);
  return user?.memberLevel || 'free';
}
```

**前端判断**
```javascript
function isUserPremium() {
  const user = getCurrentUser();
  if (!user) return false;
  
  const now = new Date();
  return user.membershipExpiresAt && 
         new Date(user.membershipExpiresAt) > now;
}
```

#### 2.4.3 权限控制
- **API 权限**
  - 导出报告接口：需要会员权限
  - 无限分析接口：需要会员权限
  - 会员专属功能：需要会员权限
- **前端权限**
  - 会员功能按钮：非会员显示升级提示
  - 功能入口：根据会员状态显示/隐藏
  - 升级引导：在关键位置展示升级提示

### 2.5 数据库设计

#### 2.5.1 用户表 (users)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR | 用户 ID（主键） |
| phone | VARCHAR | 手机号（唯一） |
| password_hash | VARCHAR | 密码哈希 |
| nickname | VARCHAR | 昵称 |
| avatar | VARCHAR | 头像 URL |
| gender | ENUM | 性别 |
| birthday | DATE | 生日 |
| member_level | ENUM | 会员等级 (free/monthly/quarterly/yearly) |
| membership_expires_at | DATETIME | 会员到期时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |
| last_login_at | DATETIME | 最后登录时间 |

#### 2.5.2 分析报告表 (analysis_reports)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR | 报告 ID（主键） |
| user_id | VARCHAR | 用户 ID（外键） |
| content | TEXT | 分析结果内容 |
| images_count | INT | 图片数量 |
| created_at | DATETIME | 创建时间 |

#### 2.5.3 分享记录表 (share_records)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR | 分享 ID（主键） |
| user_id | VARCHAR | 用户 ID（外键） |
| report_id | VARCHAR | 报告 ID（外键） |
| content | TEXT | 分享内容 |
| view_count | INT | 查看次数 |
| expires_at | DATETIME | 过期时间 |
| is_public | BOOLEAN | 是否公开 |
| created_at | DATETIME | 创建时间 |

#### 2.5.4 支付订单表 (payment_orders)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR | 订单 ID（主键） |
| user_id | VARCHAR | 用户 ID（外键） |
| order_no | VARCHAR | 订单号 |
| package_type | ENUM | 套餐类型 |
| amount | DECIMAL | 金额 |
| status | ENUM | 状态 (pending/paid/failed/refunded) |
| payment_method | ENUM | 支付方式 |
| paid_at | DATETIME | 支付时间 |
| created_at | DATETIME | 创建时间 |

### 2.6 页面设计

#### 2.6.1 导航栏
- **登录前**
  - Logo
  - 注册按钮
  - 登录按钮
- **登录后**
  - Logo
  - 用户头像/昵称
  - 会员状态标识
  - 退出登录

#### 2.6.2 登录/注册页面
- **登录页**
  - 手机号输入
  - 密码/验证码输入
  - 登录按钮
  - 忘记密码
  - 注册入口
- **注册页**
  - 手机号输入
  - 验证码输入
  - 密码设置
  - 注册按钮
  - 登录入口

#### 2.6.3 会员充值页面
- **会员套餐展示**
  - 套餐卡片
  - 价格显示
  - 权益对比
  - 推荐标识
- **支付方式选择**
  - 微信支付
  - 支付宝支付
- **支付流程**
  - 确认订单
  - 发起支付
  - 支付结果

#### 2.6.4 个人中心页面
- **用户信息**
  - 头像
  - 昵称
  - 会员状态
  - 会员到期时间
- **操作菜单**
  - 编辑资料
  - 修改密码
  - 充值会员
  - 我的报告
  - 退出登录

## 3. 技术实现方案

### 3.1 后端技术栈

- **运行时**：Node.js
- **框架**：Express.js（可选，替代原生 HTTP）
- **数据库**：
  - SQLite（开发环境）
  - MySQL/PostgreSQL（生产环境）
- **ORM**：Sequelize 或 Prisma
- **认证**：JWT (jsonwebtoken)
- **密码加密**：bcrypt
- **支付集成**：
  - 微信支付 SDK
  - 支付宝 SDK

### 3.2 前端技术栈

- **框架**：原生 JS（或考虑 Vue/React）
- **状态管理**：localStorage
- **路由**：前端路由（可选）
- **UI 组件**：原生组件
- **HTTP 请求**：fetch API

### 3.3 后端 API 设计

#### 3.3.1 用户认证接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/register | POST | 用户注册 |
| /api/auth/login | POST | 用户登录 |
| /api/auth/logout | POST | 用户登出 |
| /api/auth/refresh | POST | 刷新 Token |
| /api/user/profile | GET | 获取用户信息 |
| /api/user/profile | PUT | 更新用户信息 |
| /api/user/password | PUT | 修改密码 |

#### 3.3.2 会员接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/member/packages | GET | 获取会员套餐 |
| /api/member/order | POST | 创建订单 |
| /api/member/pay | POST | 发起支付 |
| /api/member/callback | POST | 支付回调 |
| /api/member/status | GET | 获取会员状态 |

#### 3.3.3 分享接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/share/save | POST | 保存分享结果 |
| /api/share/:id | GET | 获取分享结果 |
| /api/share/:id/views | POST | 记录访问次数 |

#### 3.3.4 分析接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/analyze | POST | 分析图片 |
| /api/analyze/history | GET | 分析历史 |
| /api/analyze/export | GET | 导出报告（会员） |

### 3.4 数据库初始化

```javascript
-- 用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar VARCHAR(255),
  gender ENUM('male', 'female', 'other'),
  birthday DATE,
  member_level ENUM('free', 'monthly', 'quarterly', 'yearly') DEFAULT 'free',
  membership_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- 分析报告表
CREATE TABLE analysis_reports (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  images_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 分享记录表
CREATE TABLE share_records (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  report_id VARCHAR(36),
  content TEXT NOT NULL,
  view_count INT DEFAULT 0,
  expires_at DATETIME NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (report_id) REFERENCES analysis_reports(id)
);

-- 支付订单表
CREATE TABLE payment_orders (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  package_type ENUM('monthly', 'quarterly', 'yearly') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  payment_method ENUM('wechat', 'alipay'),
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 4. 产品路线图

### 4.1 第一阶段：用户系统（2 周）
- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] 用户信息管理
- [ ] JWT 认证实现
- [ ] 数据库设计和实现

### 4.2 第二阶段：分享功能（1 周）
- [ ] 分享结果保存
- [ ] 分享页面展示
- [ ] 分享链接访问
- [ ] 分享记录管理

### 4.3 第三阶段：会员系统（2 周）
- [ ] 会员等级设计
- [ ] 会员权益实现
- [ ] 充值支付功能
- [ ] 会员状态管理

### 4.4 第四阶段：测试与优化（1 周）
- [ ] 功能测试
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] Bug 修复

## 5. 调试和测试指南

### 5.1 本地调试环境搭建

#### 5.1.1 后端调试
1. **启动服务**
   ```bash
   npm run dev
   ```

2. **日志调试**
   - 查看控制台输出
   - 使用 `console.log` 输出关键变量
   - 检查 API 响应

3. **接口调试工具**
   - Postman
   - curl
   - 浏览器开发者工具

#### 5.1.2 前端调试
1. **浏览器开发者工具**
   - Elements：检查 DOM 结构
   - Console：查看 JS 错误和日志
   - Network：查看网络请求
   - Application：查看本地存储

2. **调试技巧**
   - 使用 `debugger` 语句断点调试
   - 使用 `console.log` 输出调试信息
   - 检查错误堆栈信息

### 5.2 功能测试

#### 5.2.1 用户系统测试
- [ ] 注册功能测试
- [ ] 登录功能测试
- [ ] 密码修改测试
- [ ] 退出登录测试
- [ ] Token 过期测试

#### 5.2.2 分享功能测试
- [ ] 保存分享结果测试
- [ ] 分享链接访问测试
- [ ] 分享过期测试
- [ ] 访问统计测试

#### 5.2.3 会员系统测试
- [ ] 会员状态判断测试
- [ ] 权限控制测试
- [ ] 支付流程测试
- [ ] 会员过期测试

### 5.3 性能测试

#### 5.3.1 后端性能
- API 响应时间
- 数据库查询优化
- 并发处理能力

#### 5.3.2 前端性能
- 页面加载速度
- 动画流畅度
- 内存使用情况

### 5.4 安全测试

#### 5.4.1 认证安全
- 密码加密存储
- Token 安全性
- SQL 注入防护

#### 5.4.2 数据安全
- 用户隐私保护
- 数据访问权限
- 支付安全

## 6. 风险评估

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 用户隐私安全 | 高影响 | 数据加密、权限控制、合规审查 |
| 支付安全 | 高影响 | 官方 SDK、回调验证、订单审计 |
| 数据库性能 | 中影响 | 索引优化、缓存策略、读写分离 |
| 用户体验 | 中影响 | 渐进式加载、错误处理、用户引导 |
| 第三方依赖 | 低影响 | 备用方案、降级策略、监控告警 |

## 7. 总结

通过本次产品优化，朋友圈人物分析 H5 将建立完整的用户系统和会员体系，修复分享功能漏洞，提供更好的用户体验和商业变现能力。

### 7.1 核心改进
- ✅ 完整的用户注册登录系统
- ✅ 会员体系和充值功能
- ✅ 修复分享功能，支持持久化存储
- ✅ 完善的会员权限判断机制
- ✅ 清晰的调试和测试指南

### 7.2 商业价值
- 📈 用户留存率提升
- 💰 会员付费收入
- 🔗 分享传播效应
- 👥 用户规模增长

### 7.3 技术价值
- 🛡️ 更安全的用户系统
- ⚡ 更好的性能表现
- 🔧 更完善的调试工具
- 📊 更清晰的数据分析

产品将从一个功能单一的工具，升级为一个完整的商业应用，为用户提供更优质的服务，为产品创造更大的价值。