/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { BotIcon, MicIcon, SendIcon, XMarkIcon } from './icons';
import { chatWithDirector, DirectorAction } from '../services/geminiService';

interface DirectorAssistantProps {
  onAction?: (action: DirectorAction) => void;
}

const DirectorAssistant: React.FC<DirectorAssistantProps> = ({ onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([
      {role: 'ai', text: "I'm your AI Assistant Director powered by Gemini 3 Pro. I can generate assets, refine your script, or switch views. What's the plan?"}
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = async () => {
      if(!input.trim()) return;
      
      const userMsg = input;
      setMessages(prev => [...prev, {role: 'user', text: userMsg}]);
      setInput('');
      setIsThinking(true);

      try {
          const action = await chatWithDirector(messages, userMsg);
          
          if (action.type === 'CHAT_RESPONSE') {
              setMessages(prev => [...prev, {role: 'ai', text: action.payload.text}]);
          } else {
              // Perform action
              if (onAction) onAction(action);
              
              let reply = "Done.";
              if (action.type === 'GENERATE_ASSET') reply = `Generating ${action.payload.prompt}...`;
              if (action.type === 'UPDATE_PROMPT') reply = "I've updated the main prompt with that scene description.";
              if (action.type === 'SWITCH_VIEW') reply = `Switching to ${action.payload.view} view.`;
              
              setMessages(prev => [...prev, {role: 'ai', text: reply}]);
          }
      } catch (error) {
          setMessages(prev => [...prev, {role: 'ai', text: "Sorry, I lost my train of thought."}]);
      } finally {
          setIsThinking(false);
      }
  };

  if (!isOpen) {
      return (
          <button 
            onClick={() => setIsOpen(true)}
            className="fixed top-20 right-6 w-12 h-12 bg-[#E35336] hover:bg-[#c4442b] rounded-full shadow-lg shadow-[#E35336]/20 flex items-center justify-center z-50 hover:scale-105 transition-transform"
            title="Open Director Assistant"
          >
              <BotIcon className="w-6 h-6 text-white" />
          </button>
      );
  }

  return (
    <div className="fixed top-20 right-6 w-80 bg-[#272757] border border-[#3b3b64] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-[#1a1a3a] p-4 border-b border-[#3b3b64] flex items-center justify-between">
            <div className="flex items-center gap-2">
                <BotIcon className="w-5 h-5 text-[#C2B280]" />
                <span className="font-semibold text-gray-200 text-sm">Director Gemini 3</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>

        {/* Chat Area */}
        <div className="h-64 overflow-y-auto p-4 space-y-3 bg-[#151530]">
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-[#E35336] text-white rounded-br-none' 
                        : 'bg-[#272757] text-gray-200 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isThinking && (
                 <div className="flex justify-start">
                    <div className="bg-[#272757] text-gray-400 rounded-lg rounded-bl-none p-3 text-xs flex gap-1">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                    </div>
                 </div>
            )}
        </div>

        {/* Input */}
        <div className="p-3 bg-[#272757] border-t border-[#3b3b64] flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-[#C2B280] rounded-full hover:bg-white/5">
                <MicIcon className="w-4 h-4" />
            </button>
            <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask to create a scene..."
                className="flex-1 bg-[#151530] border border-[#3b3b64] rounded-full py-2 px-3 text-xs text-white focus:outline-none focus:border-[#E35336]"
            />
            <button 
                onClick={handleSend}
                disabled={isThinking}
                className="p-2 bg-[#E35336] hover:bg-[#c4442b] rounded-full text-white disabled:bg-gray-600"
            >
                <SendIcon className="w-3 h-3" />
            </button>
        </div>
    </div>
  );
};

export default DirectorAssistant;