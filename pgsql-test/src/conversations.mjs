/*
 * @Date: 2026-07-14 11:23:32
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-14 16:44:36
 */
import { query } from "./db.mjs";

async function createConversation(userId, title) {
  const result = await query(
    "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *",
    [userId, title],
  );
  return result.rows[0];
}

async function getConversationById(id) {
  const result = await query("SELECT * FROM conversations WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

async function getConversationsByUserId(userId) {
  const result = await query(
    "SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );
  return result.rows;
}

async function getAllConversations() {
  const result = await query(
    "SELECT * FROM conversations ORDER BY created_at DESC",
  );
  return result.rows;
}

async function updateConversation(id, { title }) {
  const result = await query(
    "UPDATE conversations SET title = $1 WHERE id = $2 RETURNING *",
    [title, id],
  );
  return result.rows[0] ?? null;
}

async function deleteConversation(id) {
  const { rowCount } = await query("DELETE FROM conversations WHERE id = $1", [
    id,
  ]);
  return rowCount > 0;
}

export {
  createConversation,
  deleteConversation,
  getAllConversations,
  getConversationById,
  getConversationsByUserId,
  updateConversation,
};
