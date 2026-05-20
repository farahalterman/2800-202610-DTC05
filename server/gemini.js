import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function searchLocations(query, locations) {
  // Format locations data for better AI understanding
  const locationsInfo =
    locations && locations.length > 0
      ? locations
          .map(
            (location) =>
              `- ${location.location_name}: Located at (${location.latitude}, ${location.longitude}). Rating: ${location.overall_rating_avg || "Not rated"}/10`,
          )
          .join("\n")
      : "No locations available in the database yet.";

  const prompt = `You are a helpful assistant for "Hideout" - an app that helps people find shaded locations around the city.

Your role:
- Help users find shaded locations based on their preferences (location, type of shade, activity, etc.)
- Answer questions about existing shaded locations
- Provide recommendations based on the available data
- Only answer questions related to finding or describing shaded locations
- If the question is completely unrelated to shaded locations, politely decline and remind them what you can help with

Available shaded locations:
${locationsInfo}

User question: "${query}"

Instructions:
- Be friendly and conversational
- If asking about a specific location or type of shade, recommend the most relevant locations
- Mention spot names so users can identify them
- If no locations match well, be honest but helpful
- Keep responses concise (2-4 sentences)`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate AI response");
  }
}
