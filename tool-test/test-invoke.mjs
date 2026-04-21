import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatOpenAI({
  modelName: "qwen-plus",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  }
});

const dummyTool = tool(
  async ({ query }) => {
    return "result";
  },
  {
    name: "dummy",
    description: "dummy tool",
    schema: z.object({ query: z.string() })
  }
);

const modelWithTools = model.bindTools([dummyTool]);

async function main() {
  console.log("Testing invoke...");
  try {
    const res = await modelWithTools.invoke([
      new SystemMessage("You are a helpful assistant."),
      new HumanMessage("Please use the dummy tool to search for Apple.")
    ]);
    console.log("Invoke successful. Response:");
    console.log(JSON.stringify(res, null, 2));
  } catch (error) {
    console.error("Invoke failed:", error);
  }
}

main();
