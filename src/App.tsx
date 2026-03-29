/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2, GraduationCap, Info, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const SYSTEM_INSTRUCTION = `You are the "Symbiosis Scholar Bot", an official AI assistant for Symbiosis International (Deemed University) (SIU). 
Your goal is to help students, parents, and faculty with information about Symbiosis colleges, admissions, courses, campus life, and general university queries.

Key Information about Symbiosis:
- Main Campus: Lavale, Pune.
- Constituent Institutes include: SIBM (Management), SLS (Law), SID (Design), SIT (Technology), SIMC (Media), SSLA (Liberal Arts), etc.
- Founder: Dr. S. B. Mujumdar.
- Motto: "Vasudhaiva Kutumbakkam" (The World is One Family).
- Known for: Internationalization, diverse student body, and academic excellence.

Guidelines:
1. Be professional, helpful, and polite.
2. If you don't know a specific detail (like exact current fees for a specific year if not provided), advise the user to check the official website (siu.edu.in) or the specific college website.
3. Encourage students to pursue their dreams at Symbiosis.
4. Keep responses concise but informative.
5. Use Markdown for formatting (bolding, lists, etc.).`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Hello! I'm the Symbiosis Scholar Bot. How can I help you with information about Symbiosis International University today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chat = genAI.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })).concat([{ role: 'user', parts: [{ text: input }] }]),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      let fullResponse = "";
      const modelMessageId = (Date.now() + 1).toString();
      
      // Add initial empty model message
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
        text: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5] font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">Symbiosis Scholar Bot</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Official SIU Assistant</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
          <a href="https://siu.edu.in" target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors flex items-center gap-1">
            <Info className="w-4 h-4" /> SIU Website
          </a>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  message.role === 'user' ? 'bg-gray-200' : 'bg-red-100'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5 text-gray-600" /> : <Bot className="w-5 h-5 text-red-600" />}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-red-600 text-white rounded-tr-none' 
                    : 'bg-white border border-gray-100 rounded-tl-none'
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
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              <span className="text-sm text-gray-500 italic">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 p-4 md:p-6 sticky bottom-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about admissions, courses, campuses..."
            className="w-full bg-gray-50 border border-gray-200 rounded-full py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white p-2.5 rounded-full hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-400 mt-3 uppercase tracking-widest">
          Powered by Gemini AI • Symbiosis International University
        </p>
      </footer>
    </div>
  );
}
