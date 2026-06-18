/*
 * @Date: 2026-05-18 15:30:36
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-16 18:10:35
 */
import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    multipleStatements: true
  });

  try {
    // 创建 database
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS hello CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
    );
    await connection.query(`USE hello`);

    // 创建好友表
    await connection.query(`
        CREATE TABLE IF NOT EXISTS friends (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            gender VARCHAR(10), -- 性别
            birth_date DATE,   -- 出生日期
            company VARCHAR(100), -- 公司
            title VARCHAR(100), -- 职位
            phone VARCHAR(20),  -- 当前手机号
            wechat VARCHAR(50)  -- 微信号
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 插入 demo 数据
    const insertSql = `
        INSERT INTO friends (name, gender, birth_date, company, title, phone, wechat) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      '张三', // 姓名
      '男', // 性别
      '1990-01-01', // 出生日期
      '字节跳动', // 公司
      '产品经理/产品总监', // 职位
      '13800138000', // 当前手机号
      'zhangsan' // 微信号
    ];
    const [result] = await connection.query(insertSql, values);
    console.log(
      '成功创建数据库和表，并插入 demo 数据，插入ID:',
      result.insertId
    );
  } catch (error) {
    console.error('执行出错', error);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('执行出错', error);
});
