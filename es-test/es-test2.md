# Elasticsearch 分词测试

## 1. 检查 ES 状态

```http
GET /
```

## 2. 查看已安装插件

```http
GET /_cat/plugins?v
```

## 3. 原生 standard 分词

```http
POST /_analyze
```

```json
{
  "analyzer": "standard",
  "text": "Elasticsearch RAG 混合检索知识库"
}
```

## 4. IK 细粒度分词（索引入库用）

```http
POST /_analyze
```

```json
{
  "analyzer": "ik_max_word",
  "text": "Elasticsearch RAG 混合检索知识库"
}
```

## 5. IK 智能分词（搜索查询用）

```http
POST /_analyze
```

```json
{
  "analyzer": "ik_smart",
  "text": "Elasticsearch RAG 混合检索知识库"
}
```
