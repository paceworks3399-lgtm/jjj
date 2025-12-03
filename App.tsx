import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Heart, Activity, Settings, X, Sparkles, Smile, Coffee, BookOpen, Upload, Image as ImageIcon, BrainCircuit, Music, Flame, MessageSquare, Send, Trash2, Plus, Zap, AlignLeft, AlignJustify } from 'lucide-react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';
import ChatHistory from './components/ChatHistory';
import { ConnectionState, Personality, Voice, ResponseLength } from './types';

const App: React.FC = () => {
  const [name, setName] = useState(() => localStorage.getItem('companion_name') || 'Maya');
  const [personality, setPersonality] = useState<Personality>('Playful');
  const [voice, setVoice] = useState<Voice>('Kore');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [responseLength, setResponseLength] = useState<ResponseLength>('Short');
  
  // Memory State
  const [memories, setMemories] = useState<string[]>(() => {
    const saved = localStorage.getItem('companion_memories');
    return saved ? JSON.parse(saved) : [];
  });
  const [newMemory, setNewMemory] = useState('');
  
  // Pass configuration directly to hook so it updates in real-time
  const { connect, disconnect, sendText, messages, connectionState, volume } = useLiveSession({
      name,
      personality,
      voice,
      customPrompt,
      memories,
      responseLength
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [inputText, setInputText] = useState('');
  const [avatar, setAvatar] = useState<string>('https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop');

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  const isError = connectionState === ConnectionState.ERROR;

  // Update document title and persist name to localStorage
  useEffect(() => {
    document.title = `${name} - AI Girlfriend`;
    localStorage.setItem('companion_name', name);
  }, [name]);

  // Persist memories
  useEffect(() => {
    localStorage.setItem('companion_memories', JSON.stringify(memories));
  }, [memories]);

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputText.trim()) {
          sendText(inputText.trim());
          setInputText('');
      }
  };

  const handleAddMemory = () => {
    if (newMemory.trim()) {
        setMemories(prev => [...prev, newMemory.trim()]);
        setNewMemory('');
    }
  };

  const handleRemoveMemory = (index: number) => {
    setMemories(prev => prev.filter((_, i) => i !== index));
  };

  const personalities: { type: Personality; icon: React.ReactNode; desc: string; color: string }[] = [
    { type: 'Playful', icon: <Sparkles className="w-5 h-5" />, desc: 'Witty & Fun', color: 'from-pink-500 to-rose-500' },
    { type: 'Romantic', icon: <Heart className="w-5 h-5" />, desc: 'Sweet & Loving', color: 'from-red-500 to-pink-600' },
    { type: 'Seductive', icon: <Flame className="w-5 h-5" />, desc: 'Spicy & Alluring', color: 'from-red-600 to-rose-900' },
    { type: 'Supportive', icon: <Smile className="w-5 h-5" />, desc: 'Kind & Listener', color: 'from-green-400 to-emerald-600' },
    { type: 'Serious', icon: <BookOpen className="w-5 h-5" />, desc: 'Smart & Mature', color: 'from-blue-500 to-indigo-600' },
  ];

  const voices: { id: Voice; label: string; gender: string }[] = [
    { id: 'Kore', label: 'Kore', gender: 'Female' },
    { id: 'Zephyr', label: 'Zephyr', gender: 'Female' },
    { id: 'Puck', label: 'Puck', gender: 'Male' },
    { id: 'Charon', label: 'Charon', gender: 'Male' },
    { id: 'Fenrir', label: 'Fenrir', gender: 'Male' },
  ];

  const responseOptions: { id: ResponseLength; icon: React.ReactNode; label: string }[] = [
      { id: 'Short', icon: <AlignLeft className="w-3 h-3" />, label: 'Short' },
      { id: 'Long', icon: <AlignJustify className="w-3 h-3" />, label: 'Long' },
      { id: 'Surprise Me', icon: <Zap className="w-3 h-3" />, label: 'Surprise Me' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans selection:bg-pink-500 selection:text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-500'} animate-pulse`} />
             {isConnected && <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75" />}
          </div>
          <h1 className="text-xl font-semibold tracking-wide bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowChat(!showChat)}
                className={`p-2 rounded-full transition-colors ${showChat ? 'bg-pink-500/20 text-pink-400' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
                title="Toggle Text Chat"
            >
                <MessageSquare className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setShowSettings(true)}
                disabled={isConnected}
                className={`p-2 rounded-full hover:bg-slate-700 transition-colors ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Settings className="w-5 h-5 text-slate-400 hover:text-white" />
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Split View or Full View based on Chat Mode */}
        <div className="flex-1 flex flex-col md:flex-row h-full">
            
            {/* Visualizer Section - Always present but adjusts size */}
            <div className={`relative flex-1 flex flex-col items-center justify-center transition-all duration-300 ${showChat ? 'h-1/2 md:h-full md:w-1/2' : 'h-full'}`}>
                <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2864&auto=format&fit=crop')] bg-cover bg-center blur-3xl scale-110" />
                
                <div className={`relative z-10 transition-all duration-300 ${showChat ? 'scale-75' : 'scale-100'}`}>
                    <div className="w-64 h-64 md:w-80 md:h-80 relative">
                        <Visualizer isActive={isConnected} volume={volume} />
                        
                        {/* Center Image/Icon */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-800 shadow-2xl relative">
                                <img 
                                    src={avatar} 
                                    alt="Avatar"
                                    className={`w-full h-full object-cover transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-60 grayscale'}`}
                                />
                                {!isConnected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <span className="text-xs font-mono uppercase tracking-widest text-white/80">Offline</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Status Text - Hide when chatting on mobile to save space */}
                {!showChat && (
                    <div className="absolute bottom-28 w-full text-center">
                        <p className="text-slate-400 text-sm font-medium animate-pulse">
                            {isConnecting ? `Waking up ${name}...` : isConnected ? `${name} is listening...` : 'Tap power to connect'}
                        </p>
                    </div>
                )}
            </div>

            {/* Chat Interface - Slide in/Fade in */}
            {showChat && (
                <div className="flex-1 flex flex-col h-1/2 md:h-full md:w-1/2 bg-slate-900/50 backdrop-blur-sm border-t md:border-t-0 md:border-l border-slate-700/50 transition-all">
                    <ChatHistory messages={messages} />
                    
                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 space-y-3">
                        {/* Response Length Selectors */}
                        <div className="flex justify-center gap-2">
                             {responseOptions.map((opt) => (
                                 <button
                                    key={opt.id}
                                    onClick={() => setResponseLength(opt.id)}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                        ${responseLength === opt.id 
                                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' 
                                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}
                                    `}
                                 >
                                    {opt.icon}
                                    {opt.label}
                                 </button>
                             ))}
                        </div>

                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={`Message ${name}...`}
                                className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button 
                                type="submit"
                                disabled={!inputText.trim()}
                                className="bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>

        {/* Controls Overlay - Only show if NOT in chat mode or if desired (floating) */}
        {/* We keep it floating but maybe adjust position if chat is open on mobile */}
        <div className={`absolute bottom-6 md:bottom-10 left-0 right-0 flex justify-center items-center z-20 pointer-events-none ${showChat ? 'md:justify-start md:pl-10 bottom-4' : ''}`}>
             {/* Main Action Button */}
             <button
                onClick={handleToggleConnection}
                disabled={isConnecting}
                className={`
                    pointer-events-auto
                    w-16 h-16 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95
                    ${isConnected 
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-900/20' 
                        : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 shadow-purple-900/30'}
                    ${isConnecting ? 'opacity-70 cursor-wait' : ''}
                    ${showChat ? 'scale-75 md:scale-100' : ''}
                `}
            >
                {isConnecting ? (
                    <Activity className="w-8 h-8 text-white animate-spin" />
                ) : isConnected ? (
                    <MicOff className="w-8 h-8 text-white" />
                ) : (
                    <Mic className="w-8 h-8 text-white" />
                )}
            </button>
        </div>
        
        {/* Error Notification */}
        {isError && (
             <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 animate-bounce z-50">
                <span>Could not connect. Check API Key.</span>
                <button onClick={() => window.location.reload()} className="underline font-bold">Retry</button>
             </div>
        )}

      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Customize Companion</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-700 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Her Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder:text-slate-600"
                  placeholder="Enter a name..."
                />
              </div>

              {/* Avatar Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Avatar</label>
                <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-600 flex-shrink-0">
                        <img src={avatar} alt="Current" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors w-full">
                            <Upload className="w-4 h-4" />
                            Upload Photo
                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </label>
                        <p className="text-xs text-slate-500 mt-2 text-center">Supports JPG, PNG, GIF</p>
                    </div>
                </div>
              </div>

              {/* Voice Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Voice Selection
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVoice(v.id)}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all flex justify-between items-center ${
                        voice === v.id 
                          ? 'bg-slate-700 border-pink-500 text-white ring-1 ring-pink-500' 
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span>{v.label}</span>
                      <span className="text-[10px] uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{v.gender}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Personality Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {personalities.map((p) => (
                    <button
                      key={p.type}
                      onClick={() => setPersonality(p.type)}
                      className={`relative p-3 rounded-xl border text-left transition-all duration-200 group overflow-hidden ${
                        personality === p.type 
                          ? 'border-transparent bg-slate-700 ring-2 ring-pink-500' 
                          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                      }`}
                    >
                      {/* Active Gradient Background */}
                      {personality === p.type && (
                         <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${p.color}`} />
                      )}
                      
                      <div className="relative z-10 flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${personality === p.type ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'}`}>
                           {p.icon}
                        </div>
                        <div>
                          <p className={`font-semibold ${personality === p.type ? 'text-white' : 'text-slate-300'}`}>{p.type}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Memory Bank */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-purple-400" />
                    Memory Bank
                </label>
                
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newMemory}
                        onChange={(e) => setNewMemory(e.target.value)}
                        placeholder="Add a fact (e.g., 'My birthday is June 5th')"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                    />
                    <button 
                        onClick={handleAddMemory}
                        disabled={!newMemory.trim()}
                        className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-xl disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {memories.length === 0 && (
                        <p className="text-xs text-slate-600 italic text-center py-2">No memories yet. Add facts about yourself!</p>
                    )}
                    {memories.map((mem, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-700/50 px-3 py-2 rounded-lg border border-slate-600/50">
                            <span className="text-sm text-slate-300 truncate">{mem}</span>
                            <button 
                                onClick={() => handleRemoveMemory(idx)}
                                className="text-slate-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
              </div>

              {/* Custom Training Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-4 h-4 text-pink-500" />
                    Speech Style & Training
                </label>
                <textarea 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder:text-slate-600 h-24 resize-none text-sm"
                  placeholder="E.g., Speak very slowly. Use 90s slang. Be shy. Start every sentence with 'Umm'..."
                />
                <p className="text-xs text-slate-500">Train how she speaks, behaves, or specific mannerisms.</p>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-900/30 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;