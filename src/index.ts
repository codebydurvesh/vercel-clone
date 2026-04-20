import dotenv from "dotenv";
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

import express from "express";
import cors from "cors";
import { simpleGit } from "simple-git";
import { generateId } from "./generateId.js";
import path from "path";
import { fileURLToPath } from "url";
import { getAllFiles } from "./file.js";
import { uploadFile } from "./aws.js";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/deploy", async (req, res) => {
  try {
    const repoUrl = req.body.repoUrl;
    const id = generateId();
    //clone repoUrl using simple-git
    await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

    const basePath = path.join(__dirname, `output/${id}`);

    const files = getAllFiles(basePath).filter(
      (file) => !file.includes(".git"),
    );

    await Promise.all(
      files.map((file) => {
        const relativePath = path.relative(basePath, file);
        const s3Key = `output/${id}/${relativePath}`;

        return uploadFile(s3Key, file);
      }),
    );

    res.json({ id: id, message: "Deployment successful" });
  } catch (error) {
    console.error("Error deploying repository: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
