import fs from "fs";
import path from "path";

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
