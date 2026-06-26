/*
 * @Date: 2026-06-26 10:01:41
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-26 10:30:00
 */
import { Client } from "@elastic/elasticsearch";
const client = new Client({
  node: "http://localhost:9200",
});

const INDEX_NAME = "travel_journal";

async function createDocument() {
  const now = new Date().toISOString();
  const doc = {
    node_title: "夜跑复盘",
    node_body: "今天夜跑 5 公里，配速稳定，结束后做了拉伸。",
    tags: ["运动", "夜跑"],
    mood: "focused",
    priority: 2,
    created_at: now,
    updated_at: now,
  };
  const response = await client.index({
    index: INDEX_NAME,
    document: doc,
    refresh: true,
  });
  console.log(`新增成功，ID: ${response._id}`);
  return response._id;
}

async function getDocument(id) {
  const response = await client.get({
    index: INDEX_NAME,
    id,
  });
  console.log(`查询结果:`, response._source);
}

async function updateDocument(id) {
  const response = await client.update({
    index: INDEX_NAME,
    id,
    doc: {
      node_body: "今天夜跑 6 公里，状态不错，拉伸后恢复很快。",
      tags: ["运动", "夜跑", "训练"],
      updated_at: new Date().toISOString(),
    },
    refresh: true,
  });
  console.log(`更新成功，ID: ${id}，版本: ${response._version}`);
}

async function searchDocuments() {
  const res = await client.search({
    index: INDEX_NAME,
    query: {
      match: {
        node_body: {
          query: "慢跑以及骑行",
          analyzer: "ik_smart",
        },
      },
    },
  });

  const rows = res.hits.hits.map((item) => ({ id: item._id, ...item._source }));
  console.log(`查询结果:`, rows);
}

async function deleteDocument(id) {
  await client.delete({
    index: INDEX_NAME,
    id,
    refresh: true,
  });
  console.log(`删除成功，ID: ${id}`);
}

async function main() {
  //   const id = await createDocument();
  //   await getDocument(id);
  //   console.log("docId", id);
  const id = "Xiq9AZ8BUQFyMLomtL3k";
  //   await updateDocument(id);
  //   await getDocument(id);
  //   await searchDocuments();
  //   await deleteDocument(id);
  await getDocument(id);
}

main().catch((error) => {
  console.error("操作失败:", error);
  process.exit(1);
});
