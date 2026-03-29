/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2, GraduationCap, Info, MessageSquare, Clock, Calendar, PartyPopper, Users, Utensils } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface ProcessingSteps {
  original: string;
  lowercased: string;
  noPunctuation: string;
  tokens: string[];
  normalized: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  processing?: ProcessingSteps;
}

const SYSTEM_INSTRUCTION = `You are the "SIT Nagpur Scholar Bot", an official AI assistant for Symbiosis Institute of Technology (SIT), Nagpur. 
Your goal is to help students, parents, and faculty with information specifically about the SIT Nagpur campus.

Key Information about SIT Nagpur:
- Location: Wathoda, Nagpur.
- Programs: B.Tech (CS, IT, AI&ML, Robotics, etc.).
- Facilities: State-of-the-art labs, modern mess, hostel, sports complex.
- Events: Technical fests, cultural events (Fests), and academic exams (EndSem, MidSem).
- Mess: Provides nutritious meals with specific timings.

Guidelines:
1. Be professional, helpful, and polite.
2. Focus strictly on SIT Nagpur campus details.
3. If you don't know a specific detail, advise checking the official notice board or SIT Nagpur website.
4. Use Markdown for formatting.`;

const COMMON_CORRECTIONS: Record<string, string> = {
  'sme': 'sem',
  'endsem': 'end sem',
  'midsem': 'mid sem',
  'examz': 'exams',
  'timimg': 'timing',
  'faulyt': 'faculty',
  'messs': 'mess',
  'fesst': 'fest',
};

const CATEGORIES = [
  { id: 'mess', label: 'Mess', icon: Utensils, questions: ["What is the mess menu?", "Mess timings?", "Is there a special meal today?"] },
  { id: 'timing', label: 'Timing', icon: Clock, questions: ["What are college timings?", "Library hours?", "Hostel curfew time?"] },
  { id: 'exam', label: 'Exam', icon: Calendar, questions: ["When is EndSem?", "MidSem schedule?", "Exam registration process?"] },
  { id: 'fest', label: 'Fest', icon: PartyPopper, questions: ["When is the next technical fest?", "Cultural event dates?", "How to participate in fests?"] },
  { id: 'faculty', label: 'Faculty', icon: Users, questions: ["Who is the HOD of CS?", "Faculty list for AI department?", "How to contact faculty?"] },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Hello! I'm the SIT Nagpur Scholar Bot. I'm here to help you with campus-specific queries. Use the guide above or ask me anything!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processInput = (raw: string): ProcessingSteps => {
    const lowercased = raw.toLowerCase();
    const noPunctuation = lowercased.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const tokens = noPunctuation.split(/\s+/).filter(t => t.length > 0);
    const normalizedTokens = tokens.map(token => COMMON_CORRECTIONS[token] || token);
    const normalized = normalizedTokens.join(" ");

    return {
      original: raw,
      lowercased,
      noPunctuation,
      tokens,
      normalized
    };
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const steps = processInput(textToSend);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: steps.normalized,
      timestamp: new Date(),
      processing: steps
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setSelectedCategory(null);

    try {
      const chat = genAI.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })).concat([{ role: 'user', parts: [{ text: steps.normalized }] }]),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      let fullResponse = "";
      const modelMessageId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: modelMessageId,
        role: 'model',
        text: "",
        timestamp: new Date(),
      }]);

      for await (const chunk of (await chat)) {
        const chunkText = chunk.text;
        fullResponse += chunkText;
        setMessages(prev => prev.map(m => 
          m.id === modelMessageId ? { ...m, text: fullResponse } : m
        ));
      }
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 p-2 rounded-lg">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">SIT Nagpur Bot</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Engineering Campus Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 uppercase tracking-tighter">
            <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Wathoda, Nagpur</span>
          </div>
        </div>

        {/* Quick Guide Categories */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar max-w-5xl mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                selectedCategory === cat.id 
                  ? 'bg-orange-600 text-white border-orange-600 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Suggested Questions */}
        <AnimatePresence>
          {selectedCategory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden max-w-5xl mx-auto"
            >
              <div className="py-3 flex flex-wrap gap-2">
                {CATEGORIES.find(c => c.id === selectedCategory)?.questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* NLP Processing Steps for User Messages */}
              {message.role === 'user' && message.processing && (
                <div className="mb-2 w-full max-w-[80%] bg-gray-100 rounded-xl p-3 text-[10px] font-mono text-gray-500 border border-gray-200 shadow-inner">
                  <p className="font-bold text-orange-600 mb-1 uppercase tracking-widest">NLP Processing Pipeline:</p>
                  <div className="grid grid-cols-1 gap-1">
                    <p><span className="text-gray-400">Input:</span> "{message.processing.original}"</p>
                    <p><span className="text-gray-400">Lowercasing:</span> "{message.processing.lowercased}"</p>
                    <p><span className="text-gray-400">Punctuation Removal:</span> "{message.processing.noPunctuation}"</p>
                    <p><span className="text-gray-400">Tokenization:</span> [{message.processing.tokens.map(t => `'${t}'`).join(", ")}]</p>
                    <p><span className="text-gray-400">Normalization:</span> "{message.processing.normalized}"</p>
                  </div>
                </div>
              )}

              <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  message.role === 'user' ? 'bg-gray-200' : 'bg-orange-100 shadow-sm'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5 text-gray-600" /> : <Bot className="w-5 h-5 text-orange-600" />}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm border ${
                  message.role === 'user' 
                    ? 'bg-orange-600 text-white border-orange-700 rounded-tr-none' 
                    : 'bg-white border-gray-100 rounded-tl-none'
                }`}>
                  <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : ''}`}>
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  </div>
                  <p className={`text-[10px] mt-2 opacity-60 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
              <span className="text-sm text-gray-500 italic">Analyzing query...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 p-4 md:p-6 sticky bottom-0 z-10">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here (e.g., When is EnDSEM??)"
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-600 text-white p-2.5 rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:hover:bg-orange-600 transition-colors shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="max-w-4xl mx-auto flex justify-between items-center mt-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">
            SIT Nagpur • Engineering Campus Bot
          </p>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] text-gray-400 uppercase font-bold">System Online</span>
          </div>
        </div>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
