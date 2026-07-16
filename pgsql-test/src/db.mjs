/*
 * @Date: 2026-07-14 11:18:07
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-14 16:28:58
 */
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function query(text, params) {
  return pool.query(text, params);
}

export { pool, query };
