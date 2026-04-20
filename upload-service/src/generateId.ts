// randomly generate a 5 character ID, all lowercase

const MAX_ID_LENGTH = 5;

export function generateId() {
  try {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < MAX_ID_LENGTH; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  } catch (error) {
    console.error("Error generating ID:", error);
    return "";
  }
}
