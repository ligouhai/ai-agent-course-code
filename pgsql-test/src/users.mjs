/*
 * @Date: 2026-07-14 11:19:52
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-14 11:22:20
 */
import { query } from "./db.mjs";

async function createUser(name) {
  const result = await query(
    "INSERT INTO users (name) VALUES ($1) RETURNING *",
    [name],
  );
  return result.rows[0];
}

async function getUserById(id) {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

async function getAllUsers() {
  const result = await query("SELECT * FROM users ORDER BY id");
  return result.rows;
}

async function updateUser(id, name) {
  const result = await query(
    "UPDATE users SET name = $1 WHERE id = $2 RETURNING *",
    [name, id],
  );
  return result.rows[0] ?? null;
}

async function deleteUser(id) {
  const { rowCount } = await query(
    "DELETE FROM users WHERE id = $1 RETURNING *",
    [id],
  );
  return rowCount > 0;
}

export { createUser, deleteUser, getAllUsers, getUserById, updateUser };
