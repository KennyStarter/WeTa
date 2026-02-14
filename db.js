const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'database.sqlite');

let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// 用户相关操作
const UserDB = {
  create: function(userData) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const id = uuidv4();
      const { phone, passwordHash, nickname, avatar } = userData;
      
      db.run(
        'INSERT INTO users (id, phone, password_hash, nickname, avatar) VALUES (?, ?, ?, ?, ?)',
        [id, phone, passwordHash, nickname || null, avatar || null],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...userData });
          }
        }
      );
    });
  },

  findByPhone: function(phone) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  findById: function(id) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  updateLastLogin: function(id) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  },

  updateMembership: function(userId, memberLevel, expiresAt) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'UPDATE users SET member_level = ?, membership_expires_at = ? WHERE id = ?',
        [memberLevel, expiresAt, userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
};

// 分享记录相关操作
const ShareDB = {
  create: function(shareData) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const id = uuidv4();
      const { userId, reportId, content, expiresAt, isPublic } = shareData;
      
      db.run(
        'INSERT INTO share_records (id, user_id, report_id, content, expires_at, is_public) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, reportId || null, content, expiresAt, isPublic !== false],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...shareData });
          }
        }
      );
    });
  },

  findById: function(id) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.get('SELECT * FROM share_records WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  incrementViewCount: function(id) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'UPDATE share_records SET view_count = view_count + 1 WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
};

// 分析报告相关操作
const ReportDB = {
  create: function(reportData) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const id = uuidv4();
      const { userId, content, imagesCount } = reportData;
      
      db.run(
        'INSERT INTO analysis_reports (id, user_id, content, images_count) VALUES (?, ?, ?, ?)',
        [id, userId, content, imagesCount || 0],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...reportData });
          }
        }
      );
    });
  },

  findByUserId: function(userId, limit = 10) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.all(
        'SELECT * FROM analysis_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }
};

// 订单相关操作
const OrderDB = {
  create: function(orderData) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const id = uuidv4();
      const { userId, orderNo, packageType, amount } = orderData;
      
      db.run(
        'INSERT INTO payment_orders (id, user_id, order_no, package_type, amount) VALUES (?, ?, ?, ?, ?)',
        [id, userId, orderNo, packageType, amount],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...orderData });
          }
        }
      );
    });
  },

  updateStatus: function(id, status, paymentMethod) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      db.run(
        'UPDATE payment_orders SET status = ?, payment_method = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, paymentMethod, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
};

module.exports = {
  getDatabase,
  closeDatabase,
  UserDB,
  ShareDB,
  ReportDB,
  OrderDB
};
