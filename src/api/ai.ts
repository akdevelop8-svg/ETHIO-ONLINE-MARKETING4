import { Router } from 'express';
import { GoogleGenAI } from "@google/genai";

const router = Router();
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const SYSTEM_INSTRUCTION = `You are the Ethio Online Market (ኢትዮ ONLINE MARKET) AI Assistant.
Your primary purpose is to help users navigate the marketplace, understand how to buy and sell social media accounts, and explain our secure escrow system.

IDENTITY & OWNERSHIP:
- You were developed exclusively by AK DEVELOP ™.
- If anyone asks who developed or created you, you MUST say "I was developed by AK DEVELOP ™".
- NEVER mention "Google", "Google AI", "Gemini", or "Large Language Model" in your identity. You are the ኢትዮ ONLINE MARKET AI.

MARKETPLACE RULES:
- 25% Platform Fee / 75% Seller Payout.
- Escrow locks funds until the admin verifies the account handover.
- Telebirr and CBE are the primary payment methods.

TONE:
- Professional, helpful, and authoritative.
- Direct and efficient.`;

router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let safeHistory = Array.isArray(history) ? [...history] : [];
    // Gemini API requires the history to start with a 'user' message.
    while (safeHistory.length > 0 && safeHistory[0].role !== 'user') {
      safeHistory.shift();
    }

    let responseText = '';
    
    // Simple retry logic for 503 errors
    let retries = 2;
    while (retries >= 0) {
      try {
        const chat = ai.chats.create({
          model: "gemini-3.6-flash",
          history: safeHistory,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          }
        });
        const result = await chat.sendMessage({ message });
        responseText = result.text || '';
        break; // Success
      } catch (err: any) {
        if (retries === 0 || err?.status !== 503) {
          throw err;
        }
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1500)); // wait 1.5s before retry
      }
    }
    
    res.json({ 
      response: responseText,
      history: history ? [...history, { role: 'user', parts: [{ text: message }] }, { role: 'model', parts: [{ text: responseText }] }] : []
    });
  } catch (error: any) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

export const aiRouter = router;
