import multer from "multer";

const storage = multer.memoryStorage(); // keeps file in memory
export const upload = multer({ storage });