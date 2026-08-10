import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

let groq = null;
if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function analyzeUserProfile(userName, searchData) {
    if (!groq) {
        console.warn("⚠️ GROQ_API_KEY not found. Returning basic mocked profile.");
        return {
            name: userName,
            summary: "Basic user profile (Mocked data due to missing API key).",
            interests: ["Unknown"],
            occupation: "Unknown",
            social_presence: "Unknown"
        };
    }

    try {
        console.log(`🧠 Analyzing scraped data for ${userName} using Groq...`);

        let contextText = searchData.map(result => `Source: ${result.title}\nDescription: ${result.description}\nContent: ${result.content ? result.content.substring(0, 500) : ''}`).join('\n\n');

        const systemMessage = `
You are an expert AI data analyst. Your task is to analyze the provided internet search data of a user named "${userName}".
Based on their online presence, build a comprehensive profile of this user. Extract their occupation, key interests, and summarize their background.

Respond ONLY with a JSON object in this exact format:
{
  "name": "${userName}",
  "summary": "<a 2-3 sentence summary of who they are>",
  "interests": ["<interest 1>", "<interest 2>"],
  "occupation": "<their current role or profession>",
  "social_presence": "<brief description of where they are active online, e.g. LinkedIn, Twitter, blogs>"
}
`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: `Here is the search data for ${userName}:\n\n${contextText}` }
            ],
            model: "llama3-8b-8192",
            response_format: { type: "json_object" }
        });

        const resultText = completion.choices[0].message.content;
        const resultJson = JSON.parse(resultText);
        console.log(`✅ Profile analysis complete for ${userName}.`);
        return resultJson;

    } catch (error) {
        console.error("❌ Error in Groq analysis:", error.message);
        return {
            name: userName,
            summary: "Error during analysis.",
            interests: [],
            occupation: "Unknown",
            social_presence: "Unknown"
        };
    }
}
