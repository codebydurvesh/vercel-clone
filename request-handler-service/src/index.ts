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
  region: S3_BUCKET_REGION ?? "",
  credentials: {
    accessKeyId: ACCESS_KEY ?? "",
    secretAccessKey: SECRET_KEY ?? "",
  },
});

const app = express();
app.use(express.json());

app.use(async (req, res) => {
  if (req.path === "/favicon.ico") return res.status(204).end();

  const host = req.hostname;
  console.log("Host:", host);

  const id = host.split(".")[0];
  console.log("Subdomain ID:", id);

  const filePath = req.path;
  console.log("File Path:", filePath);

  const contents = await s3.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME!,
      Key: `dist/${id}${filePath}`,
    }),
  );

  const type = filePath.endsWith("html")
    ? "text/html"
    : filePath.endsWith("css")
      ? "text/css"
      : "application/javascript";

  res.set("Content-Type", type);
  (contents.Body as Readable).pipe(res);
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
