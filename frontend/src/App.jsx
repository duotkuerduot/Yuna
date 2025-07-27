import React, { useState, useEffect, useRef } from 'react';

// --- Helper Components & SVGs ---

const SendIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const LoaderIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);

// --- Main Application Component ---

function App() {
  // State for all chat sessions
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('chatSessions');
    return saved
      ? JSON.parse(saved)
      : [{
          id: `session_${Date.now()}_${Math.random()}`,
          name: 'New Chat',
          messages: [
            {
              text: "Hello! I'm your compassionate AI companion. How can I support you today? Please remember, I'm here to provide information, not to replace a licensed professional.",
              sender: 'bot'
            }
          ]
        }];
  });
  // Index of the currently active chat
  const [activeChatIdx, setActiveChatIdx] = useState(0);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpenIdx, setMenuOpenIdx] = useState(null);

  const messagesEndRef = useRef(null);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(chats));
  }, [chats]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChatIdx]);

  // API call
  const getBotResponse = async (userMessage) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: chats[activeChatIdx].id
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const botMessage = {
        text: data.response,
        sender: 'bot',
        sources: data.context_sources
      };
      setChats(prev => {
        const updated = [...prev];
        updated[activeChatIdx].messages = [...updated[activeChatIdx].messages, botMessage];
        return updated;
      });
    } catch (error) {
      setChats(prev => {
        const updated = [...prev];
        updated[activeChatIdx].messages = [...updated[activeChatIdx].messages, {
          text: "I'm having some trouble connecting right now. Please try again in a moment.",
          sender: 'bot',
          isError: true,
        }];
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const handleSendMessage = () => {
    if (inputMessage.trim() === '' || isLoading || chats.length === 0) return;
    setChats(prev => {
      const updated = [...prev];
      updated[activeChatIdx].messages = [...updated[activeChatIdx].messages, { text: inputMessage, sender: 'user' }];
      return updated;
    });
    getBotResponse(inputMessage);
    setInputMessage('');
  };

  // New chat
  const handleNewChat = () => {
    const newChat = {
      id: `session_${Date.now()}_${Math.random()}`,
      name: `Chat ${chats.length + 1}`,
      messages: [
        {
          text: "Hello! I'm your compassionate AI companion. How can I support you today? Please remember, I'm here to provide information, not to replace a licensed professional.",
          sender: 'bot'
        }
      ]
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatIdx(0);
  };

  // Select chat
  const handleSelectChat = (idx) => {
    setActiveChatIdx(idx);
  };

  // Delete chat
  const handleDeleteChat = (idx) => {
    setChats(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      
      // If we're deleting all chats, automatically create a new one
      if (updated.length === 0) {
        const newChat = {
          id: `session_${Date.now()}_${Math.random()}`,
          name: 'New Chat',
          messages: [
            {
              text: "Hello! I'm your compassionate AI companion. How can I support you today? Please remember, I'm here to provide information, not to replace a licensed professional.",
              sender: 'bot'
            }
          ]
        };
        setActiveChatIdx(0);
        return [newChat];
      }
      
      // Adjust active chat index
      if (activeChatIdx === idx) {
        setActiveChatIdx(0);
      } else if (activeChatIdx > idx) {
        setActiveChatIdx(activeChatIdx - 1);
      }
      
      return updated;
    });
    setMenuOpenIdx(null);
  };

  // Rename chat
  const handleRenameChat = (idx) => {
    const newName = prompt("Enter new chat name:", chats[idx].name);
    if (newName && newName.trim()) {
      setChats(prev => {
        const updated = [...prev];
        updated[idx].name = newName.trim();
        return updated;
      });
    }
    setMenuOpenIdx(null);
  };

  // Enter key handler
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  // Get current chat safely
  const currentChat = chats[activeChatIdx];

  return (
    <div className="flex h-screen w-screen bg-gray-100 font-['Inter'] text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-bold text-lg">Chats</span>
          <button
            onClick={handleNewChat}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            title="Start new chat"
          >+</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No chats yet</p>
              <button
                onClick={handleNewChat}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Start New Chat
              </button>
            </div>
          ) : (
            chats.map((chat, idx) => (
              <div
                key={chat.id}
                className={`flex items-center justify-between p-3 cursor-pointer border-b hover:bg-blue-50 ${idx === activeChatIdx ? 'bg-blue-100 font-semibold' : ''}`}
                onClick={() => handleSelectChat(idx)}
              >
                <span>{chat.name}</span>
                <div className="relative">
                  <button
                    className="ml-2 px-2 py-1 rounded hover:bg-gray-200"
                    onClick={e => {
                      e.stopPropagation();
                      setMenuOpenIdx(menuOpenIdx === idx ? null : idx);
                    }}
                    title="More options"
                  >
                    {/* Vertical three dots */}
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                    </svg>
                  </button>
                  {menuOpenIdx === idx && (
                    <div
                      className="absolute right-0 mt-2 w-28 bg-white border rounded shadow-lg z-10"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                        onClick={() => handleRenameChat(idx)}
                      >
                        Rename
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                        onClick={() => handleDeleteChat(idx)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 flex items-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">MentalAura</h1>
            <p className="text-sm opacity-90">Illuminate your path to wellness</p>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {!currentChat ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 mb-4">No active chat</p>
                <button
                  onClick={handleNewChat}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          ) : (
            <>
              {currentChat.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0"></div>
                  )}
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    } ${msg.isError ? 'bg-red-100 text-red-700' : ''}`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0"></div>
                  <div className="bg-gray-200 text-gray-500 p-3 rounded-2xl rounded-bl-none flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-400"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading || !currentChat}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || inputMessage.trim() === '' || !currentChat}
              className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-300"
            >
              <SendIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            AI can make mistakes. Always consult a licensed professional for personal advice.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;