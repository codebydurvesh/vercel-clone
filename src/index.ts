import express from "express";
import cors from "cors";
import { simpleGit } from "simple-git";
import { generateId } from "./generateId.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/deploy", async (req, res) => {
  const repoUrl = req.body.repoUrl;
  const id = generateId();
  //clone repoUrl using simple-git
  await simpleGit().clone(repoUrl, `output/${id}`);

  res.json({ message: "Deployment successful" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
