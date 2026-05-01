import { createClient } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws.js";
import dotenv from "dotenv";
import { buildProject } from "./build.js";
import fs from "fs";

dotenv.config();

const rawRedisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const redisUrl =
  !fs.existsSync("/.dockerenv") && rawRedisUrl.includes("redis://redis")
    ? rawRedisUrl.replace("redis://redis", "redis://localhost")
    : rawRedisUrl;

const subscriber = createClient({
  url: redisUrl,
});
const publisher = createClient({
  url: redisUrl,
});

async function connectClient(client: typeof subscriber, label: string) {
  while (true) {
    try {
      await client.connect();
      console.log(`Connected ${label} to Redis`);
      return;
    } catch (error) {
      console.error(`Error connecting ${label} to Redis:`, error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function main() {
  await Promise.all([
    connectClient(subscriber, "subscriber"),
    connectClient(publisher, "publisher"),
  ]);

  console.log("Connected to Redis...");

  while (true) {
    console.log("Waiting for job...");

    const response = await subscriber.brPop("build-queue", 0);

    console.log("Received:", response);
    await downloadS3Folder(`output/${response?.element}`);
    console.log("downloaded");
    await buildProject(response?.element || "NULL");
    copyFinalDist(response?.element || "NULL");
    publisher.hSet("status", response?.element || "NULL", "deployed");
  }
}

main();
