// 用户 → 会话（一对多）
curl -s http://localhost:3005/conversations/users/2 | jq

// 会话 → 消息（一对多）
curl -s http://localhost:3005/conversations/3/messages | jq

// 语义检索（需 messages.embedding 非空；会话 3/4/5 有向量，1/2 没有）
curl -s -X POST http://localhost:3005/conversations/3/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"向量相似度怎么查","limit":3}' | jq

curl -s -X POST 'http://localhost:3005/conversations/3/search?limit=5' \
  -H 'Content-Type: application/json' \
  -d '{"query":"PostgreSQL 支持哪些数据类型"}' | jq
