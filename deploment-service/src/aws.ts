import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
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

export function copyFinalDist(id: string) {
  const folderPath = path.join(__dirname, `output/${id}/dist`);
  const allFiles = getAllFiles(folderPath);
  allFiles.forEach((file) => {
    uploadFile(`dist/${id}/` + file.slice(folderPath.length + 1), file);
  });
}

export const getAllFiles = (folderPath: string) => {
  try {
    let response: string[] = [];

    const allFileAndFolders = fs.readdirSync(folderPath);
    allFileAndFolders.forEach((file) => {
      const fullFilePath = path.join(folderPath, file);
      if (fs.statSync(fullFilePath).isDirectory()) {
        response = response.concat(getAllFiles(fullFilePath));
      } else {
        response.push(fullFilePath);
      }
    });
    return response;
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
};

export const uploadFile = async (fileName: string, localFilePath: string) => {
  const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
  const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

  if (!ACCESS_KEY || !SECRET_KEY || !S3_BUCKET_NAME) {
    throw new Error("Missing AWS environment variables");
  }

  const client = new S3Client({
    region: "ap-south-1", // 🔁 change if your bucket is in another region
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
  });

  try {
    const fileContent = fs.readFileSync(localFilePath);

    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: fileName,
        Body: fileContent,
      }),
    );

    console.log("Uploaded:", fileName);
  } catch (error) {
    console.error("Error uploading file to S3:", error);
  }
};
