import express from "express";
import cors from "cors";
import { simpleGit } from "simple-git";
import { generateId } from "./generateId.js";
import path from "path";
import { fileURLToPath } from "url";
import { getAllFiles } from "./file.js";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/deploy", async (req, res) => {
  const repoUrl = req.body.repoUrl;
  const id = generateId();
  //clone repoUrl using simple-git
  await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

  const files = getAllFiles(path.join(__dirname, `output/${id}`));
  console.log(files);
  //put this in S3

  res.json({ id: id, message: "Deployment successful" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
