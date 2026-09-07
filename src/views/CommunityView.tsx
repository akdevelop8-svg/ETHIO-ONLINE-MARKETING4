import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Users, MessageCircle, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/StateViews';

interface CommunityMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

export const CommunityView: React.FC = () => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/community/messages');
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch community messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/community/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.fullName || user.username || 'Anonymous',
          message: input
        }),
      });

      if (res.ok) {
        setInput('');
        fetchMessages();
      }
    } catch (err) {
      console.error('Failed to post message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <LoadingState label="እባክዎ ይጠብቁ..." />;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-180px)] bg-[#070B14] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Community Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-tight">የማህበረሰብ ግሩፕ</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {messages.length} ተጠቃሚዎች እያወሩ ነው
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800">
          <ShieldCheck className="w-3 h-3 text-indigo-400" />
          <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Verified Community</span>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-50">
            <MessageCircle className="w-12 h-12 text-slate-700" />
            <p className="text-xs text-slate-500 font-medium max-w-[200px]">
              እስካሁን ምንም መልእክት የለም። ውይይቱን ይጀምሩ!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = user?.id === msg.user_id;
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <span className="text-[10px] font-black text-indigo-400 ml-1 uppercase tracking-wider">
                      {msg.username}
                    </span>
                  )}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isOwn 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}>
                    {msg.message}
                  </div>
                  <div className="flex items-center gap-1 opacity-40 px-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span className="text-[9px] font-medium">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950/50 border-t border-slate-800">
        {!isAuthenticated ? (
          <div className="text-center space-y-3 py-2">
            <p className="text-[11px] text-slate-400 font-medium">ለማውራት መግባት አለብዎት</p>
            <Button size="sm" variant="primary" onClick={() => openAuthModal('signin')}>
              አሁን ይግቡ
            </Button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="መልእክት ይጻፉ..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-[#070B14] border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {isSending ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
