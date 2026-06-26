/*
 * @Date: 2026-06-26 11:43:33
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-26 11:43:36
 */
curl --location 'https://ws-3nl6nbkbytdhadi3.cn-beijing.maas.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank' \
--header "Authorization: Bearer sk-0736fc6bc834428392600ac600839bc7" \
--header 'Content-Type: application/json' \
--data '{
    "model": "qwen3-vl-rerank",
    "input":{
         "query": "什么是文本排序模型",
         "documents": [
         "文本排序模型广泛用于搜索引擎和推荐系统中，它们根据文本相关性对候选文本进行排序",
         "量子计算是计算科学的一个前沿领域",
         "预训练语言模型的发展给文本排序模型带来了新的进展"
         ]
    },
    "parameters": {
        "return_documents": true,
        "top_n": 5
    }
}'