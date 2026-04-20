import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

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
