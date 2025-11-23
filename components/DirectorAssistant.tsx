/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { BotIcon, MicIcon, SendIcon, XMarkIcon } from './icons';

const DirectorAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
      {role: 'ai', text: "I'm your AI Assistant Director. I can help create characters, write scripts, or chain scenes together. What are we making today?"}
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
      if(!input.trim()) return;
      setMessages(prev => [...prev, {role: 'user', text: input}]);
      setInput('');
      // Mock Response
      setTimeout(() => {
          setMessages(prev => [...prev, {role: 'ai', text: "I'm processing that request. In a real environment, I would now inject those parameters into your scene builder."}]);
      }, 1000);
  };

  if (!isOpen) {
      return (
          <button 
            onClick={() => setIsOpen(true)}
            className="fixed top-20 right-6 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-500/20 flex items-center justify-center z-50 hover:scale-105 transition-transform"
            title="Open Director Assistant"
          >
              <BotIcon className="w-6 h-6 text-white" />
          </button>
      );
  }

  return (
    <div className="fixed top-20 right-6 w-80 bg-[#1c1c1e] border border-gray-700 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <BotIcon className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-gray-200 text-sm">Director Gemini</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>

        {/* Chat Area */}
        <div className="h-64 overflow-y-auto p-4 space-y-3 bg-[#121212]">
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-gray-800 text-gray-300 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
        </div>

        {/* Input */}
        <div className="p-3 bg-[#1c1c1e] border-t border-gray-700 flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-indigo-400 rounded-full hover:bg-white/5">
                <MicIcon className="w-4 h-4" />
            </button>
            <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask to create a scene..."
                className="flex-1 bg-black/50 border border-gray-700 rounded-full py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button 
                onClick={handleSend}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white"
            >
                <SendIcon className="w-3 h-3" />
            </button>
        </div>
    </div>
  );
};

export default DirectorAssistant;