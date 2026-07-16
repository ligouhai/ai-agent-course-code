/*
 * @Date: 2026-07-14 16:13:36
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-14 16:55:20
 */

import * as conversations from "./conversations.mjs";
import { pool } from "./db.mjs";
import * as messages from "./messages.mjs";
import * as users from "./users.mjs";

async function run() {
  console.log("=== 用户 CRUD ===");
  const user = await users.createUser("张三");
  console.log("用户创建成功", user);
  const fetchedUser = await users.getUserById(user.id);
  console.log("用户查询成功", fetchedUser);
  const updatedUser = await users.updateUser(user.id, "李四");
  console.log("用户更新成功", updatedUser);

  console.log("\n=== 会话 CRUD ===");

  const conversation = await conversations.createConversation(
    user.id,
    "第一次对话",
  );
  console.log("会话创建成功", conversation);
  const userConversations = await conversations.getConversationsByUserId(
    user.id,
  );
  console.log("用户的会话列表", userConversations);

  const updatedConversation = await conversations.updateConversation(
    conversation.id,
    { title: "更新后的标题" },
  );
  console.log("会话更新成功", updatedConversation);

  console.log("\n=== 消息 CRUD ===");

  const userMessage = await messages.createMessage(
    conversation.id,
    "user",
    "你好，请介绍下 PostgreSQL",
  );
  console.log("用户消息创建成功", userMessage);
  const assistantMessage = await messages.createMessage(
    conversation.id,
    "assistant",
    "PostgreSQL 是一个开源的关系型数据库管理系统，它具有高性能、高可靠性和高灵活性。",
  );
  console.log("创建 AI 消息：", assistantMessage);

  const conversationMessages = await messages.getMessagesByConversationId(
    conversation.id,
  );
  console.log("会话消息列表：", conversationMessages);

  const updatedMessage = await messages.updateMessage(
    userMessage.id,
    "你好，请介绍下 pgvector",
  );
  console.log("更新用户消息：", updatedMessage);

  console.log("\n=== 语义检索 ===");

  const seedMessages = [
    { role: "user", content: "PostgreSQL 支持哪些数据类型？" },
    {
      role: "assistant",
      content:
        "PostgreSQL 支持整数、文本、JSON、数组，以及 pgvector 扩展提供的向量类型。",
    },
    { role: "user", content: "怎么做相似度搜索？" },
    {
      role: "assistant",
      content:
        "可以使用 pgvector 的 cosine 距离运算符 <=>，配合 hnsw 索引加速向量检索。",
    },
  ];

  for (const message of seedMessages) {
    await messages.createMessage(
      conversation.id,
      message.role,
      message.content,
      true,
    );
  }
  console.log(`已写入 ${seedMessages.length} 条带 embedding 的消息`);

  const searchQueries = ["向量相似度怎么查", "关系型数据库有哪些类型"];

  for (const query of searchQueries) {
    console.log(`\n搜索 "${query}"：`);
    const results = await messages.searchSimilarMessages(
      conversation.id,
      query,
      3,
    );
    if (results.length === 0) {
      console.log("   无匹配结果");
      continue;
    }

    for (const [i, row] of results.entries()) {
      console.log(
        `  ${i + 1}. [${row.role}] ${row.content} (similarity: ${Number(row.similarity).toFixed(4)})`,
      );
    }
  }

  // console.log("\n=== 清理 ===");

  // await messages.deleteMessage(assistantMessage.id);
  // await messages.deleteMessage(updatedMessage.id);
  // await conversations.deleteConversation(conversation.id);
  // await users.deleteUser(user.id);

  // console.log("演示数据已清理");
}

run()
  .catch((error) => {
    console.error("运行失败:", error.message);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

export { conversations, messages, users };
