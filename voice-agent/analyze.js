import Groq from 'groq-sdk';
import { config } from './config.js';
import dotenv from 'dotenv';
dotenv.config();

let groq = null;
if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function analyzeUserDataAndGeneratePrompt(userName, searchData) {
    if (!groq) {
        console.warn("⚠️ GROQ_API_KEY not found. Using default prompt.");
        return {
            tone: 'friendly',
            prompt: `You are Brahmand AI calling ${userName}. Be polite and friendly.`
        };
    }

    try {
        console.log(`🧠 Analyzing scraped data for ${userName} using Groq...`);

        // Summarize the scraped data
        let contextText = searchData.map(result => `Source: ${result.title}\nDescription: ${result.description}\nContent: ${result.content ? result.content.substring(0, 500) : ''}`).join('\n\n');

        const systemMessage = `
You are an expert AI behavioral analyst and scriptwriter for the Brahmand app voice agent.
Your task is to analyze the provided internet search data of a user named "${userName}".
Based on their online presence, occupation, interests, and public persona, determine the best conversational tone (e.g., Professional, Friendly, Urgent, Spiritual, Casual, Enthusiastic) for an outbound voice call.

Then, write a customized, dynamic system prompt for the Brahmand Voice Agent.
The voice agent is representing "Brahmand (Sanatan Lok)", a digital Sanatan ecosystem (Spirituality, Jaap, Astrology, Communities).
The custom prompt should tell the voice agent how to act, what tone to use, and how to uniquely pitch the app to THIS specific user based on their background.

Respond ONLY with a JSON object in this exact format:
{
  "tone": "<selected tone>",
  "prompt": "<the detailed system prompt for the voice agent>"
}
`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: `Here is the search data for ${userName}:\n\n${contextText}` }
            ],
            model: "llama3-8b-8192", // Using a standard available Groq model
            response_format: { type: "json_object" }
        });

        const resultText = completion.choices[0].message.content;
        const resultJson = JSON.parse(resultText);
        console.log(`✅ Analysis complete. Decided tone: ${resultJson.tone}`);
        return resultJson;

    } catch (error) {
        console.error("❌ Error in Groq analysis:", error.message);
        return {
            tone: 'neutral',
            prompt: `You are Brahmand AI calling ${userName}. Be polite and helpful.`
        };
    }
}
