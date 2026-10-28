import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Loader2, MinusCircle } from 'lucide-react';
import { apiClient } from '../../api/client';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [{ text: 'ሰላም! እኔ የኢትዮ ONLINE MARKET ረዳት ነኝ። ስለ መግዛት፣ መሸጥ፣ ክፍያ፣ የተጠቃሚ መለያ ወይም የድረገጹ አጠቃቀም ይጠይቁኝ። AK DEVELOP ™ ነው ያዘጋጀኝ።' }]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: message }] };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await apiClient.post<{ response?: string; error?: string }>('/ai/chat', {
        message,
        history: messages.slice(-10)
      });

      if (!data?.response?.trim()) {
        throw new Error(data?.error || 'The AI service returned an empty response.');
      }
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: data.response as string }] }]);
    } catch (error: unknown) {
      console.error('AI Assistant request failed:', error);
      const messageText = error instanceof Error ? error.message : '';
      let userMessageText = 'ይቅርታ፣ ለዚህ ጥያቄ መልስ ማመንጨት አልተሳካም። እባክዎ እንደገና ይሞክሩ።';

      if (/VITE_API_BASE_URL|API route not found|404/i.test(messageText)) {
        userMessageText = 'የAI ሰርቨሩ አልተገናኘም። የድረገጹ አስተዳዳሪ VITE_API_BASE_URL በfrontend hosting ላይ ወደ backend server እንዲያመለክት ማድረግ አለበት።';
      } else if (/GEMINI_API_KEY|AI assistant is not configured/i.test(messageText)) {
        userMessageText = 'የAI አገልግሎቱ ገና አልተዘጋጀም። አስተዳዳሪው GEMINI_API_KEY በbackend server ላይ ማስገባት አለበት።';
      } else if (/temporarily|busy|rate limit/i.test(messageText)) {
        userMessageText = 'የAI አገልግሎቱ ለአጭር ጊዜ ተጨናንቋል። እባክዎ በትንሽ ጊዜ በኋላ እንደገና ይሞክሩ።';
      }

      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: userMessageText }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        aria-label="Open Ethio Online AI assistant"
        className={`fixed bottom-24 md:bottom-6 right-6 z-50 p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/40 border border-white/20 transition-transform ${isOpen ? 'hidden' : 'flex'}`}
      >
        <div className="relative">
          <Bot className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#05070A] animate-pulse" />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? '64px' : '500px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 md:bottom-6 right-6 z-50 w-[350px] sm:w-[400px] bg-[#0E1420] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
          >
            <div className="p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center border border-white/10">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-none">Ethio Online AI</h3>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">mr_ebek & EXO_SMM</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  aria-label={isMinimized ? 'Expand assistant' : 'Minimize assistant'}
                  className="p-1.5 text-slate-500 hover:text-white transition-colors"
                >
                  <MinusCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close assistant"
                  className="p-1.5 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
                  aria-live="polite"
                >
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                          msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800 border border-slate-700'
                        }`}>
                          {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-[13px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}>
                          {msg.parts[0].text}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 items-center text-slate-500 bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-800">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">AK AI is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-950/50 border-t border-slate-800">
                  <div className="relative">
                    <input
                      type="text"
                      aria-label="Ask the AI assistant"
                      placeholder="Ask anything..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
                      className="w-full bg-[#070B14] border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    />
                    <button
                      onClick={() => void handleSend()}
                      disabled={!input.trim() || isLoading}
                      aria-label="Send message"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[9px] text-center text-slate-600 mt-3 font-bold uppercase tracking-[0.2em]">
                    Expert AI Support • mr_ebek & EXO_SMM
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
