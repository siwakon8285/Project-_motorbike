'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatWidget({ isOpen, onClose }: ChatWidgetProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'สวัสดีครับ! ผมเป็นผู้ช่วย AI ยินดีให้บริการ มีอะไรให้ผมช่วยไหมครับ?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call backend API which proxies to n8n
      const response = await axios.post('/api/chat', {
        message: userMessage.content,
        userId: user?.id,
        username: user?.username
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.reply || response.data.text || 'ขออภัยครับ ไม่สามารถเชื่อมต่อกับ AI ได้ในขณะนี้',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งครับ',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300 h-[500px] max-h-[80vh]">
      {/* Header */}
      <div className="bg-primary-600 p-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-primary-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' 
                ? 'bg-primary-100 text-primary-600' 
                : 'bg-white border border-gray-200 text-gray-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={`flex flex-col max-w-[75%] ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}>
              <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-none shadow-md shadow-primary-500/20'
                  : 'bg-white text-gray-700 border border-gray-200 rounded-tl-none shadow-sm'
              }`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-500/30"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
