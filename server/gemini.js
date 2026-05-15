import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function searchSpots(query, spots) {
	const prompt = `You are a helpful assistant for an app that maps shaded spots around a city. Only answer questions related to finding or describing shaded spots. If the question is unrelated, politely decline. Spots data: ${JSON.stringify(spots)}. User question: "${query}"`;
	const result = await model.generateContent(prompt);
	return result.response.text();
}