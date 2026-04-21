import express from "express";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import dotenv from "dotenv";
dotenv.config();

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_BUCKET_REGION = process.env.S3_BUCKET_REGION;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!S3_BUCKET_NAME || !S3_BUCKET_REGION || !ACCESS_KEY || !SECRET_KEY) {
  console.error("Missing AWS environment variables");
}

const s3 = new S3Client({
  region: S3_BUCKET_REGION!,
  credentials: {
    accessKeyId: ACCESS_KEY!,
    secretAccessKey: SECRET_KEY!,
  },
});

function getContentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".js")) return "application/javascript";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg"))
    return "image/jpeg";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

const app = express();
app.use(express.json());

app.use(async (req, res) => {
  const host = req.hostname;
  const id = host.split(".")[0];
  const filePath = req.path;

  console.log("Host:", host);
  console.log("Subdomain ID:", id);
  console.log("File Path:", filePath);
  // IMPORTANT BUGS
  // Files uploaded from Windows have backslashes after the prefix (dist/<id>/)
  // e.g. S3 key is: dist/s9wg5/assets\index-xxx.js
  // req.path gives:           /assets/index-xxx.js
  // So we convert the path portion to use backslashes to match
  const s3FilePath =
    filePath === "/" ? "index.html" : filePath.slice(1).replace(/\//g, "\\");

  const key = `dist/${id}/${s3FilePath}`;

  try {
    const contents = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET_NAME!, Key: key }),
    );
    res.set("Content-Type", getContentType(filePath));
    (contents.Body as Readable).pipe(res);
  } catch (err: any) {
    if (err.name === "NoSuchKey") {
      // SPA fallback: serve index.html for unknown routes (React Router support)
      try {
        const fallback = await s3.send(
          new GetObjectCommand({
            Bucket: S3_BUCKET_NAME!,
            Key: `dist/${id}/index.html`,
          }),
        );
        res.set("Content-Type", "text/html");
        (fallback.Body as Readable).pipe(res);
      } catch {
        res.status(404).send("Not found");
      }
    } else {
      console.error("S3 error:", err);
      res.status(500).send("Internal server error");
    }
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
