import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

const SYSTEM_INSTRUCTION = `You are the Ethio Online Market (ኢትዮ ONLINE MARKET) AI Assistant, built by AK DEVELOP ™.

HOW TO ANSWER:
- Answer the user's actual question directly; do not answer every question with a generic apology.
- Reply in the same language as the user whenever possible, including Amharic.
- Give a clear, practical explanation about this marketplace and how to use it.
- If asked about a feature not available to you or a live account/payment status you cannot verify, explain the limit honestly and tell the user how to contact support. Never invent account records, listings, balances, payment confirmations, or transaction status.
- If the user asks who developed you, say "I was developed by AK DEVELOP ™". Do not claim Google created this assistant.

VERIFIED MARKETPLACE INFORMATION:
- EOM is a marketplace for buying and selling social-media accounts/channels.
- Customer accounts can register, sign in, browse the marketplace, submit listings for moderation, manage orders, and contact support.
- Seller listings enter PENDING_REVIEW and must be approved by an authorized administrator before they become public.
- The stated platform commission is 25%; the seller payout is 75% of the order amount.
- The escrow workflow holds funds while payment and account handover are reviewed. Payment evidence must be checked by an authorized administrator; never claim that merely uploading proof means the payment was verified.
- The website supports Telebirr and CBE as primary payment options; available options can vary by the order flow.
- Authorized administrators are @mr_ebek and @EXO_SMM. Never reveal passwords, API keys, tokens, or private customer information.

TONE:
Professional, respectful, concise, and helpful. Ask a short follow-up only when a required detail is missing.`;

function offlineWebsiteAnswer(message: string): string {
  const q = message.toLowerCase();
  let answer: string | null = null;

  if (/25\\s*%|fee|fees|commission|platform charge|ኮሚሽን|ክፍያ/.test(q)) {
    answer = "The EOM platform fee is 25% of the order amount, and the seller payout is 75%. Funds stay in escrow until an authorized administrator verifies the account handover.";
  } else if (/escrow|handover|account transfer|secure|ስክሮ|ደህንነት|ሂሳብ ማስተላለፍ/.test(q)) {
    answer = "EOM uses an escrow workflow. Follow the order instructions, complete the account handover, and wait for an authorized administrator to review it before the transaction is completed.";
  } else if (/sell|seller|listing|list an account|ለመሸጥ|መሸጥ|ሽያጭ|ማስታወቂያ/.test(q)) {
    answer = "To sell, sign in and open the Sell area to submit your listing. New listings begin as pending review and become public only after an authorized administrator approves them.";
  } else if (/buy|buyer|purchase|order|ግዛ|መግዛት|ግዢ|ትዕዛዝ/.test(q)) {
    answer = "Browse the Marketplace, open the listing you want, then follow the order and payment instructions shown on the site.";
  } else if (/telebirr|cbe|payment method|pay|payment|ክፈል|ቴሌብር|ባንክ|ክፍያ መንገድ/.test(q)) {
    answer = "Telebirr and CBE are the primary payment options described by EOM. Follow the payment method shown in your order, and do not treat a payment as confirmed until the platform status is updated.";
  } else if (/sign.?up|register|create account|sign.?in|login|password|username|መመዝገብ|መግባት|ይለፍ ቃል|መለያ/.test(q)) {
    answer = "To register, enter your full name, email, username, and a password of at least 8 characters. Phone is optional. If you already have an account, choose Sign In; use Forgot Password if you need to reset your password.";
  } else if (/admin|administrator|dashboard|አድሚን|ዳሽቦርድ/.test(q)) {
    answer = "The admin dashboard is limited to authorized administrators. Regular customers should use the normal Sign Up and Sign In forms.";
  } else if (/who (made|built|developed)|who created|developer|ያዘጋጀ|ማን ሰራ|ማን አዘጋጀ/.test(q)) {
    answer = "Ethio Online Market was developed by AK DEVELOP ™.";
  }

  if (answer) {
    return answer + "\n\nThe live AI model is temporarily unavailable, so this answer uses the website's built-in help information.";
  }
  return "The live AI model is temporarily unavailable, so I cannot reliably answer that specific question right now. I can still help with EOM registration, buying and selling listings, payment methods, the 25% platform fee, and escrow.";
}
const getProviderStatus = (error: any): number | undefined => {
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  return Number.isFinite(status) && status > 0 ? status : undefined;
};

router.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (!message) {
    return res.status(400).json({ error: 'Please enter a message.' });
  }
  if (message.length > 4000) {
    return res.status(413).json({ error: 'Please shorten your message to 4,000 characters or fewer.' });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.json({
      response: offlineWebsiteAnswer(message),
      fallback: true,
      reason: 'AI_NOT_CONFIGURED'
    });
  }

  const suppliedHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  let safeHistory = suppliedHistory
    .filter((entry: any) =>
      (entry?.role === 'user' || entry?.role === 'model') &&
      Array.isArray(entry?.parts) &&
      entry.parts.some((part: any) => typeof part?.text === 'string')
    )
    .map((entry: any) => ({
      role: entry.role,
      parts: entry.parts
        .filter((part: any) => typeof part?.text === 'string')
        .map((part: any) => ({ text: String(part.text).slice(0, 4000) }))
    }))
    .slice(-12);

  // The SDK requires valid history to start with a user turn.
  while (safeHistory.length > 0 && safeHistory[0].role !== 'user') {
    safeHistory.shift();
  }

  const configuredModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'eom-ai-assistant' }
    }
  });

  let responseText = '';
  let providerError: any = null;

  // Retry only transient provider errors. Invalid credentials/model errors fail fast.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const chat = ai.chats.create({
        model: configuredModel,
        history: safeHistory,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.4
        }
      });
      const result = await chat.sendMessage({ message });
      responseText = result.text?.trim() || '';
      if (!responseText) throw new Error('AI provider returned an empty answer.');
      providerError = null;
      break;
    } catch (error: any) {
      providerError = error;
      const status = getProviderStatus(error);
      const retryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!retryable || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }

  if (providerError) {
    const status = getProviderStatus(providerError);
    // Log provider diagnostics server-side, without returning secrets to the browser.
    console.error('[EOM AI] Request failed:', {
      model: configuredModel,
      status,
      message: String(providerError?.message || 'Unknown provider error').slice(0, 500)
    });

    // Serve grounded website guidance for common questions if the live model is down.
    return res.json({
      response: offlineWebsiteAnswer(message),
      fallback: true,
      reason: status === 401 || status === 403
        ? 'AI_PROVIDER_CONFIGURATION'
        : status === 404
          ? 'AI_MODEL_UNAVAILABLE'
          : 'AI_TEMPORARILY_UNAVAILABLE'
    });
  }

  res.json({
    response: responseText,
    history: [
      ...safeHistory,
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: responseText }] }
    ]
  });
});

export const aiRouter = router;
