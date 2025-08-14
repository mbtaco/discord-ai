import pkg from "@google/genai";
const { GoogleGenerativeAI } = pkg;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Per-user chat sessions
const userChats = new Map();

export function getChat(userId) {
  if (!userChats.has(userId)) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chat = model.startChat({ history: [] });
    userChats.set(userId, chat);
  }
  return userChats.get(userId);
}

export function resetChat(userId) {
  userChats.delete(userId);
}