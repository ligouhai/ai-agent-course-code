/*
 * @Date: 2026-06-26 09:44:12
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-26 10:00:41
 */
import { Client } from "@elastic/elasticsearch";
const client = new Client({
  node: "http://localhost:9200",
});

const INDEX_NAME = "travel_journal";

async function createIndex() {
  // 检查索引是否存在
  const indexExists = await client.indices.exists({ index: INDEX_NAME });
  if (indexExists) {
    console.log(`索引已存在：${INDEX_NAME}`);
    return;
  }
  // 创建索引
  await client.indices.create({
    index: INDEX_NAME,
    mappings: {
      properties: {
        node_title: {
          type: "text",
          analyzer: "ik_max_word",
          search_analyzer: "ik_smart",
        },
        node_body: {
          type: "text",
          analyzer: "ik_max_word",
          search_analyzer: "ik_smart",
        },
        tags: { type: "keyword" },
        mood: { type: "keyword" },
        priority: { type: "integer" },
        created_at: { type: "date" },
        updated_at: { type: "date" },
      },
    },
  });
  console.log(`索引 ${INDEX_NAME} 创建成功`);
}

async function seedData() {
  const now = new Date().toISOString();
  const docs = [
    {
      node_title: "杭州西湖半日游",
      node_body: "早上绕湖慢跑，中午吃片儿川，下午在断桥拍照放松。",
      tags: ["旅行", "周末", "杭州"],
      mood: "relaxed",
      priority: 2,
      created_at: now,
      updated_at: now,
    },
    {
      node_title: "城市骑行计划",
      node_body: "周六沿江骑行 20 公里，带上水和简易修车工具。",
      tags: ["运动", "骑行"],
      mood: "energetic",
      priority: 3,
      created_at: now,
      updated_at: now,
    },
    {
      node_title: "雨天宅家阅读",
      node_body: "下雨天在家看书，整理本周笔记并做晚餐。",
      tags: ["生活", "阅读"],
      mood: "calm",
      priority: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  // 批量插入数据
  const operations = docs.flatMap((doc) => [
    { index: { _index: INDEX_NAME } },
    doc,
  ]);

  await client.bulk({ refresh: true, operations });
  console.log(`初始化数据完成，共 ${docs.length} 条数据`);
}

async function main() {
  await createIndex();
  await seedData();
}

main().catch((error) => {
  console.error("创建失败:", error);
  process.exit(1);
});
