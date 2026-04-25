import { createClient } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws.js";
import dotenv from "dotenv";
import { buildProject } from "./build.js";

dotenv.config();

const subscriber = createClient({
  url: process.env.REDIS_URL!,
});
const publisher = createClient({
  url: process.env.REDIS_URL!,
});

async function main() {
  await subscriber.connect();
  await publisher.connect();

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
