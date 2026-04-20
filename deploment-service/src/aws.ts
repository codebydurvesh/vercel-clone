import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function downloadS3Folder(prefix: string) {
  const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
  const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  const BUCKET_NAME = process.env.S3_BUCKET_NAME;
  const S3_BUCKET_REGION = process.env.S3_BUCKET_REGION;

  if (!ACCESS_KEY || !SECRET_KEY || !BUCKET_NAME || !S3_BUCKET_REGION) {
    throw new Error("Missing AWS environment variables");
  }

  const client = new S3Client({
    region: S3_BUCKET_REGION,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
  });

  console.log(prefix);
  const allFiles = await client.send(
    new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix }),
  );

  const allPromises =
    allFiles.Contents?.map(async (file) => {
      const key = file.Key;
      if (!key) {
        return;
      }

      const finalOutputPath = path.join(__dirname, key);
      const outputFile = fs.createWriteStream(finalOutputPath);
      const dirName = path.dirname(finalOutputPath);
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      const object = await client.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
      );

      if (object.Body instanceof Readable) {
        object.Body.pipe(outputFile);
      }
    }) || [];
  console.log("awaiting");
  await Promise.all(allPromises?.filter((x) => x !== undefined));
}
