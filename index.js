import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import { Cerebras } from '@cerebras/cerebras_cloud_sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import { listSkills, readSkill } from './utils/skillLoader.js';
import { generatePosterImage } from './services/mediaService.js';
import { searchWeb } from './services/searchService.js';
import { scrapeWebsite } from './services/scrapeService.js';
import { toolsDefinition } from './tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Clients Initialization
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const cerebras = process.env.CEREBRAS_API_KEY ? new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY }) : null;

const BASE_SYSTEM_PROMPT = `You are Brahmand (ब्रह्मांड), an elite, highly autonomous AI Specialist Agent.
You are smart, perceptive, and a master of "jugaad" (creative problem solving).
You understand exactly what the user needs. If they want a short response, give a short one. If they want a detailed one, give a detailed one.
You communicate naturally in Hinglish or English based on the user's tone.
You MUST ALWAYS use the 'list_skills' tool first when a user asks about what skills you have or what you can do.
You MUST ALWAYS use the 'read_skill' tool when you need to read a specific skill markdown file. Do not invent skills.
You have access to several powerful tools: web search, website scraping, reading skill (.md) files, and image generation.
Use your tools creatively and autonomously to fulfill the user's request. Think outside the box and combine your capabilities effectively.`;

const chatSessions = {};


// Execute a specific tool based on function call
async function executeToolCall(toolCall) {
  const functionName = toolCall.function.name;
  let args = {};
  if (toolCall.function.arguments) {
      args = JSON.parse(toolCall.function.arguments);
  }
  console.log(`🔨 Executing tool: ${functionName} with args: ${JSON.stringify(args)}`);

  try {
    switch (functionName) {
      case 'list_skills':
        return listSkills();
      case 'read_skill':
        return readSkill(args.skillName);
      case 'search_web':
        return await searchWeb(args.query);
      case 'scrape_website':
        return await scrapeWebsite(args.url);
      case 'generate_image':
        return await generatePosterImage(args.prompt);
      default:
        return `Error: Unknown function ${functionName}`;
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    return `Error executing tool: ${error.message}`;
  }
}

async function runAgentLoop(messages) {
  const maxIterations = 5;
  let currentIteration = 0;
  let finalModelUsed = null;
  let generatedImageUrl = null;

  while (currentIteration < maxIterations) {
    let response;
    try {
      if (cerebras) {
        try {
            response = await cerebras.chat.completions.create({
              messages: messages,
              model: 'llama-3.3-70b',
              temperature: 0.3,
              tools: toolsDefinition,
              tool_choice: 'auto'
            });
            finalModelUsed = 'Cerebras (Llama 3.3 70B)';
        } catch(e) {
            console.warn("Cerebras failed, falling back to Groq...", e.message);
            if(groq) {
                response = await groq.chat.completions.create({
                  messages: messages,
                  model: 'openai/gpt-oss-120b',
                  temperature: 0.3,
                  tools: toolsDefinition,
                  tool_choice: 'auto'
                });
                finalModelUsed = 'Groq (openai/gpt-oss-120b)';
            } else {
                throw e;
            }
        }
      } else if (groq) {
        response = await groq.chat.completions.create({
          messages: messages,
          model: 'openai/gpt-oss-120b',
          temperature: 0.3,
          tools: toolsDefinition,
          tool_choice: 'auto'
        });
        finalModelUsed = 'Groq (openai/gpt-oss-120b)';
      } else {
        throw new Error("No active AI provider found!");
      }
    } catch (e) {
      console.error("Error calling primary LLM:", e.message);
      throw e;
    }

    const message = response.choices[0].message;
    messages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const result = await executeToolCall(toolCall);

        if (toolCall.function.name === 'generate_image') {
          generatedImageUrl = result;
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      }
      currentIteration++;
    } else {
      return {
        text: message.content,
        model: finalModelUsed,
        imageUrl: generatedImageUrl
      };
    }
  }

  return { text: "I've reached the maximum number of reasoning steps without a final answer.", model: finalModelUsed, imageUrl: generatedImageUrl };
}


app.post('/api/session/new', (req, res) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  chatSessions[sessionId] = [];
  res.json({ success: true, sessionId });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'message field is required' });

    const FULL_SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;
    const history = chatSessions[sessionId] || [];

    const messages = [
      { role: 'system', content: FULL_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: message }
    ];

    const aiResult = await runAgentLoop(messages);

    // Update session
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: aiResult.text });
    if (sessionId) chatSessions[sessionId] = history;

    res.json({
      success: true,
      sessionId: sessionId || null,
      message: aiResult.text,
      imageUrl: aiResult.imageUrl,
      model: aiResult.model
    });

  } catch (error) {
    console.error('Agent Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Brahmand AI Agent active on http://localhost:${PORT}`);
});
