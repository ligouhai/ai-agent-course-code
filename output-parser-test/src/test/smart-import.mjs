/*
 * @Date: 2026-05-18 16:52:20
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-18 17:29:16
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import mysql from 'mysql2/promise';

// 初始化模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  }
});

const friendsSchema = z.object({
  name: z.string().describe('姓名'),
  gender: z.string().describe('性别 (男/女)'),
  birthDate: z
    .string()
    .describe(
      '出生日期 (格式：YYYY-MM-DD，如果无法确定具体日期，根据年龄估算)'
    ),
  company: z.string().describe('公司名称，如果没有则返回 null'),
  title: z.string().describe('职位/头衔，如果没有则返回 null'),
  phone: z.string().describe('手机号，如果没有则返回 null'),
  wechat: z.string().describe('微信号，如果没有则返回 null')
});

// 定义批量好友信息的 schema(数组)
const friendsArraySchema = z.array(friendsSchema).describe('好友信息数组');

// 使用 withStructuredOutput 包装模型
const structuredModel = model.withStructuredOutput(friendsArraySchema);

// 定义数据库连接信息
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
};

async function extractAndInsert(text) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    await connection.query('USE hello;');

    // 使用 AI 提取结构化信息
    console.log('正在从文本中提取信息...\n');

    const prompt = `
    从以下文本中提取好友信息，文本中可能包含一个或多个人的信息。请将每个人信息分别提取出来，返回一个数组
    ${text}

    要求：
    1.如果文本中包含多个人，请为每个人创建一个对象
    2.每个对象包含以下字段：
      - 姓名：提取文本中的人名
      - 性别：提取性别信息（男/女）
      - 出生日期：如果能找到具体日期最好，否则根据年龄描述估算（格式：YYYY-MM-DD）
      - 公司：提取公司名称
      - 职位：提取职位/头衔信息
      - 手机号：提取手机号码
      - 微信号：提取微信号
    3. 如果某个字段在文本中找不到，请返回 null
    4. 返回格式必须是一个数组，即使只有一个人也要放在数组中
    `;

    const results = await structuredModel.invoke(prompt);

    console.log(`✅ 提取到 ${results.length} 条结构化信息:`);
    console.log(JSON.stringify(results, null, 2));
    console.log('');

    if (results.length === 0) {
      console.log('⚠️  没有提取到任何信息');
      return { count: 0, insertIds: [] };
    } // 批量插入数据库

    const insertSql = `
     INSERT INTO friends (
      name,
      gender,
      birth_date,
      company,
      title,
      phone,
      wechat
     ) VALUES ?;
     `;

    const values = results.map((result) => [
      result.name,
      result.gender,
      result.birth_date || null,
      result.company,
      result.title,
      result.phone,
      result.wechat
    ]);

    const [insertResult] = await connection.query(insertSql, [values]);
    console.log(`✅ 成功插入 ${insertResult.affectedRows} 条数据`);
    console.log(
      `   插入的ID范围：${insertResult.insertId} - ${insertResult.insertId + insertResult.affectedRows - 1}`
    );

    return {
      count: insertResult.affectedRows,
      insertIds: Array.from(
        { length: insertResult.affectedRows },
        (_, i) => insertResult.insertId + i
      )
    };
  } catch (error) {
    console.error('执行出错', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  // 示例文本（包含多个人信息）
  const sampleText = ` 我最近认识了几个新朋友。第一个是张总，女的，看起来 30 出头，在华为做技术总监，手机号 1380013800，微信是 zhangzong2024。第二个是李总，男的，看起来 28 岁，在腾讯做产品经理，手机号 1380013801，微信是 lizong2024。第三个是王总，男的，看起来 32 岁，在阿里巴巴做技术总监，手机号 1380013802，微信是 wangzong2024。`;

  console.log('输入文本：');
  console.log(sampleText);
  console.log('');

  try {
    const result = await extractAndInsert(sampleText);
    console.log(`\n🎉 处理完成！成功插入${result.count}条记录`);
    console.log(`  插入的ID：${result.insertIds.join(', ')}`);
  } catch (error) {
    console.error('处理失败', error.message);
    process.exit(1);
  }
}

main();
