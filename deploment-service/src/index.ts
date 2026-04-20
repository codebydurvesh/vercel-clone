import { createClient } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws.js";
import dotenv from "dotenv";
import { buildProject } from "./build.js";

dotenv.config();

const subscriber = createClient();

async function main() {
  await subscriber.connect();

  console.log("Connected to Redis...");

  while (true) {
    console.log("Waiting for job...");

    const response = await subscriber.brPop("build-queue", 0);

    console.log("Received:", response);
    await downloadS3Folder(`output/${response?.element}`);
    console.log("downloaded");
    await buildProject(response?.element || "");
    await copyFinalDist(response?.element || "");
  }
}

main();
