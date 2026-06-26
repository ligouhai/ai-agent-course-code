# Elasticsearch IK 分词版操作手册

索引：`life_note`  
字段全部配置 IK 分词：入库 `ik_max_word` / 查询 `ik_smart`

## 1. 查看所有索引

```http
GET /_cat/indices?v&h=health,status,index,docs.count
```

## 2. 创建索引（生活笔记场景 + IK 双分词）

```http
PUT /life_note
```

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "content": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "type": {
        "type": "keyword"
      },
      "author": {
        "type": "keyword"
      },
      "record_time": {
        "type": "date"
      }
    }
  }
}
```

## 3. 查看索引结构

```http
GET /life_note/_mapping
```

## 4. 查看索引配置

```http
GET /life_note/_settings
```

## 5. 删除索引

```http
DELETE /life_note
```

---

## 文档 增删改查（生活日常案例）

### 1. 新增文档（自动生成 ID）

```http
POST /life_note/_doc
```

```json
{
  "title": "周末城市短途旅行攻略",
  "content": "周末适合周边短途出行，打卡公园、小吃街，放松日常工作压力，出行尽量避开早晚高峰",
  "type": "旅行生活",
  "author": "日常记录",
  "record_time": "2026-04-27"
}
```

### 2. 新增文档（指定自定义 ID）

```http
PUT /life_note/_doc/3001
```

```json
{
  "title": "健康饮食与居家养生",
  "content": "规律作息、清淡饮食，多吃蔬菜水果，减少熬夜，合理运动才能保持身体健康",
  "type": "健康生活",
  "author": "生活达人",
  "record_time": "2026-04-27"
}
```

### 3. 根据 ID 查询单条

```http
GET /life_note/_doc/3001
```

### 4. 查询全部文档

```http
GET /life_note/_search
```

```json
{
  "query": {
    "match_all": {}
  }
}
```

### 5. 全文分词检索（IK 中文分词，搜：健康 作息 旅行）

```http
GET /life_note/_search
```

```json
{
  "query": {
    "match": {
      "content": "健康 作息 旅行"
    }
  }
}
```

### 6. 精确匹配查询（keyword 分类字段）

```http
GET /life_note/_search
```

```json
{
  "query": {
    "term": {
      "type": "健康生活"
    }
  }
}
```

### 7. 只返回指定字段

```http
GET /life_note/_search
```

```json
{
  "_source": ["title", "type", "author"],
  "query": {
    "match_all": {}
  }
}
```

### 8. 分页 + 时间排序

```http
GET /life_note/_search
```

```json
{
  "from": 0,
  "size": 10,
  "sort": [
    { "record_time": "desc" }
  ],
  "query": {
    "match_all": {}
  }
}
```

### 9. 局部更新文档（推荐）

```http
POST /life_note/_update/3001
```

```json
{
  "doc": {
    "title": "健康饮食与居家养生小技巧",
    "type": "居家生活"
  }
}
```

### 10. 全量覆盖更新

```http
PUT /life_note/_doc/3001
```

```json
{
  "title": "日常养生好习惯总结",
  "content": "早睡早起合理运动，少吃油腻辛辣食物，保持良好心态，提升生活幸福感",
  "type": "居家生活",
  "author": "生活达人",
  "record_time": "2026-04-27"
}
```

### 11. 根据 ID 删除文档

```http
DELETE /life_note/_doc/3001
```

### 12. 条件批量删除

```http
POST /life_note/_delete_by_query
```

```json
{
  "query": {
    "match": {
      "author": "日常记录"
    }
  }
}
```

### 13. 统计文档总数

```http
GET /life_note/_count
```

### 14. 清空索引数据（保留表结构）

```http
POST /life_note/_delete_by_query
```

```json
{
  "query": {
    "match_all": {}
  }
}
```

---

## IK 分词测试（生活文案）

### IK 细粒度分词（入库存储使用）

```http
POST /_analyze
```

```json
{
  "analyzer": "ik_max_word",
  "text": "周末短途旅行 居家健康养生 日常美好生活记录"
}
```

### IK 智能分词（搜索查询使用）

```http
POST /_analyze
```

```json
{
  "analyzer": "ik_smart",
  "text": "周末短途旅行 居家健康养生 日常美好生活记录"
}
```
