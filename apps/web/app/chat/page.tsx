'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ChatComposer from '@/components/ChatComposer';
import { Bot, User, Cpu } from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  intent?: {
    action: string;
    team?: string;
    amount?: string;
    outcome?: string;
    confidence: number;
  };
}

const EXAMPLE_PROMPTS = [
  "Bet 0.5 OKB on Brazil to win",
  "What are the odds for France vs Germany?",
  "Show my agent's performance",
  "Place a contrarian bet on the underdog in match 3",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome, Scout Commander. I'm your AI betting assistant. Tell me what you want to do -- place a bet, check odds, or review your agent's performance. I'll parse your intent and confirm before executing.",
      timestamp: Date.now() - 60000,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text: string) {
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Simulate AI processing
    await new Promise((r) => setTimeout(r, 800));

    let responseContent = '';
    let intent = undefined;

    const lower = text.toLowerCase();
    if (lower.includes('bet') || lower.includes('place')) {
      const team = lower.includes('brazil') ? 'Brazil' : lower.includes('france') ? 'France' : lower.includes('argentina') ? 'Argentina' : 'Brazil';
      const amount = text.match(/(\d+\.?\d*)/)?.[1] || '0.5';
      intent = {
        action: 'PLACE_BET',
        team,
        amount: `${amount} OKB`,
        outcome: 'HOME',
        confidence: 0.89,
      };
      responseContent = `Got it. I'll place a bet of ${amount} OKB on ${team} (HOME win). Please confirm the intent card above to execute on-chain.`;
    } else if (lower.includes('odds') || lower.includes('market')) {
      responseContent = `Here are the current odds:\n\nBrazil vs Argentina: HOME 2.15 | DRAW 3.40 | AWAY 2.80\nFrance vs Germany: HOME 1.95 | DRAW 3.60 | AWAY 3.10\n\nWant me to place a bet on any of these?`;
    } else if (lower.includes('performance') || lower.includes('stats')) {
      responseContent = `Your Agent #4521 (ATTACKING) stats:\n\nTotal Bets: 23\nWin Rate: 65.2%\nPnL: +4.73 OKB\nRisk Level: 3/5\n\nYour agent is in the top 15% of all scouts. Keep it up!`;
    } else {
      responseContent = `I understand you want to: "${text}". Let me analyze this.\n\nI can help you with:\n- Placing bets (e.g., "Bet 1 OKB on Brazil")\n- Checking odds and markets\n- Reviewing agent performance\n\nTry being more specific about what you'd like to do.`;
    }

    const assistantMsg: Message = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: Date.now(),
      intent,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    return intent || null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="mx-auto max-w-3xl w-full flex-1 flex flex-col px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-neon-green" />
            Scout <span className="text-neon-green">Chat</span>
          </h1>
          <p className="text-sm text-muted mt-1">Natural language interface for your AI scout agent</p>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center flex-shrink-0 mt-1">
                  <Cpu className="h-4 w-4 text-neon-green" />
                </div>
              )}
              <div
                className={clsx(
                  'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-neon-green/10 border border-neon-green/20 text-white'
                    : 'bg-surface border border-border text-white'
                )}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="text-[10px] text-muted mt-2 mono">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-4 w-4 text-muted" />
                </div>
              )}
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Example prompts */}
        {messages.length <= 1 && (
          <div className="mb-4">
            <p className="text-xs text-muted mb-2">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border text-muted hover:text-white hover:border-neon-green/30 transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        <ChatComposer onSend={handleSend} />
      </div>
    </div>
  );
}
