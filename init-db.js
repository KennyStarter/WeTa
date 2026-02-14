const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
  } else {
    console.log('数据库连接成功');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // 用户表
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nickname VARCHAR(50),
        avatar VARCHAR(255),
        gender TEXT CHECK(gender IN ('male', 'female', 'other')),
        birthday DATE,
        member_level TEXT CHECK(member_level IN ('free', 'monthly', 'quarterly', 'yearly')) DEFAULT 'free',
        membership_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      )
    `, (err) => {
      if (err) {
        console.error('创建 users 表失败:', err);
      } else {
        console.log('users 表创建成功');
      }
    });

    // 分析报告表
    db.run(`
      CREATE TABLE IF NOT EXISTS analysis_reports (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        images_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('创建 analysis_reports 表失败:', err);
      } else {
        console.log('analysis_reports 表创建成功');
      }
    });

    // 分享记录表
    db.run(`
      CREATE TABLE IF NOT EXISTS share_records (
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
      )
    `, (err) => {
      if (err) {
        console.error('创建 share_records 表失败:', err);
      } else {
        console.log('share_records 表创建成功');
      }
    });

    // 支付订单表
    db.run(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        order_no VARCHAR(50) UNIQUE NOT NULL,
        package_type TEXT CHECK(package_type IN ('monthly', 'quarterly', 'yearly')) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status TEXT CHECK(status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
        payment_method TEXT CHECK(payment_method IN ('wechat', 'alipay')),
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('创建 payment_orders 表失败:', err);
      } else {
        console.log('payment_orders 表创建成功');
      }
    });

    console.log('数据库初始化完成');
    db.close();
  });
}
