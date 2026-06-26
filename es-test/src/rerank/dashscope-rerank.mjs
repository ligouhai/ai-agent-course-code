/*
 * @Date: 2026-06-26 11:49:51
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-26 16:33:49
 */
import { BaseDocumentCompressor } from "@langchain/core/retrievers/document_compressors";
import "dotenv/config";
export class DashScopeRerank extends BaseDocumentCompressor {
  constructor({ apiKey, model = "qwen3-vl-rerank", topN = 3, baseUrl } = {}) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.topN = topN;
    this.baseUrl = baseUrl ?? process.env.RERANK_URL;
  }

  async compressDocuments(documents, query, _callbacks) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: {
          query: query,
          documents: documents.map((doc) => doc.pageContent),
        },
        parameters: {
          return_documents: false,
          top_n: this.topN,
        },
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(
        `DashScope rerank ${response.status}: ${JSON.stringify(json)}`,
      );
    }
    const results = json?.output?.results;
    if (!Array.isArray(results)) {
      throw new Error(
        `DashScope rerank: Invalid results format: ${JSON.stringify(results)}`,
      );
    }
    return results.map((item) => documents[item.index]);
  }
}
