/*
 * @Date: 2026-07-17 14:15:24
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-17 14:26:15
 */
import Redis from "ioredis";

const redis = new Redis({
  host: "localhost",
  port: 6379,
  db: 0,
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis error", err);
});

async function runRedisDemo() {
  try {
    // 1.String 字符串
    await redis.set("name", "张三");
    await redis.set("code", "6666", "EX", 300);

    console.log("String name:", await redis.get("name"));

    // 2.Hash 哈希
    await redis.hset("user:1001", {
      name: "张三",
      age: 18,
      email: "zhangsan@example.com",
    });

    console.log("Hash user:", await redis.hgetall("user:1001"));

    //  3.List 列表
    await redis.lpush("task:list", "任务1", "任务2", "任务3");
    await redis.rpush("task:list", "任务4");

    console.log("List task:", await redis.lrange("task:list", 0, -1));

    //  4.Set 集合
    await redis.sadd("tag:set", "redis", "nest", "node");
    console.log("Set tag:", await redis.smembers("tag:set"));

    //   5. Zset 有序集合
    await redis.zadd("score:rank", 90, "张三", 80, "李四", 70, "王五");

    console.log("Zset score:", await redis.zrange("score:rank", 0, -1));

    //   6.分布式锁（标准写法）
    const lockKey = "lock:resource";
    const lockResult = await redis.set(lockKey, "locked", "NX", "EX", 10);
    console.log("分布式锁：", lockResult ? "加锁成功" : "加锁失败");
  } catch (error) {
    console.error("Redis error:", error);
  }
}

runRedisDemo();
