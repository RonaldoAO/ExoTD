import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyAVYq_Wlg0H12XYEM4V1ECx5AzEcRWuG_E"

const genAI = new GoogleGenerativeAI(API_KEY);

export async function explainExoplanetData(profile: any): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `You are an expert astronomer and science communicator explaining exoplanet discoveries to an enthusiastic audience.

Analyze the following exoplanet data and create a compelling, informative description that:
1. Highlights the most fascinating scientific aspects of this exoplanet
2. Explains what makes it unique or special in our search for habitable worlds
3. Uses engaging, accessible language suitable for text-to-speech narration
4. Includes specific details about its characteristics when available
5. Creates a sense of wonder about space exploration

Exoplanet Data:
Name: ${profile.name}
Age: ${profile.age || "Unknown"} ${profile.age ? "billion years" : ""}
Bio: ${profile.bio || "No description"}
Location: ${profile.location || "Unknown"}
Tags/Features: ${profile.tags?.join(", ") || "None"}

Complete Dataset:
${JSON.stringify(profile, null, 2)}

Create a 4-6 sentence description that:
- Opens with an attention-grabbing fact about this exoplanet
- Describes its physical characteristics and what they mean
- Explains its significance in the context of exoplanet research
- Concludes with what makes it particularly interesting or unique

Write in a conversational, enthusiastic tone as if you're sharing an exciting discovery with a friend.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return `This is ${profile.name}, an exoplanet located ${profile.location || "in a distant star system"}. ${profile.bio || "An interesting celestial body worth exploring."}`;
  }
}
