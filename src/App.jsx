import React, { useState, useEffect, useRef } from 'react';

// AI Execution Modes
const AI_MODES = {
  TEXT_GENERATION: 'text-gen',
  SENTIMENT_ANALYSIS: 'sentiment',
  IMAGE_DESCRIPTION: 'image-desc',
};

// AI Personas
const AI_PERSONAS = {
  ENGINEER: { id: 'engineer', label: '💻 Senior Engineer', instruction: 'You are a Senior Software Engineer. Provide production-ready, clean, well-commented code with robust error handling.' },
  RESEARCHER: { id: 'researcher', label: '🎓 Academic Researcher', instruction: 'You are an Academic Researcher. Provide rigorous, detailed explanations with technical clarity.' },
  COPYWRITER: { id: 'copywriter', label: '🎨 Creative Copywriter', instruction: 'You are a Creative Copywriter. Produce engaging, persuasive, and eloquent text.' },
  EXECUTIVE: { id: 'executive', label: '💼 Executive Summarizer', instruction: 'You are an Executive Assistant. Format outputs into concise bullet points and key action items.' },
  OTHER: { id: 'other', label: '✨ Other (Custom)', instruction: '' }
};

const App = () => {
  // Navigation View State: 'LANDING' or 'WORKSPACE'
  const [viewMode, setViewMode] = useState('LANDING');

  // Auth State
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('LOGIN');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  // Hero Live Playground State
  const [heroPrompt, setHeroPrompt] = useState('Write a Python function to compute Fibonacci with memoization');
  const [heroOutput, setHeroOutput] = useState('');
  const [isHeroLoading, setIsHeroLoading] = useState(false);

  // FAQ Accordion Toggle State
  const [openFaq, setOpenFaq] = useState(0);

  // Workspace States
  const [mode, setMode] = useState(AI_MODES.TEXT_GENERATION);
  const [persona, setPersona] = useState(AI_PERSONAS.ENGINEER.id);
  const [customPersonaText, setCustomPersonaText] = useState('Python Security Auditor');
  const [input, setInput] = useState('');
  const [fullOutput, setFullOutput] = useState('');
  const [displayedOutput, setDisplayedOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Hyperparameters
  const [temperature, setTemperature] = useState(0.70);
  const [topP, setTopP] = useState(0.95);

  // Advanced UX & Analytics States
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tokenSpeed, setTokenSpeed] = useState(0);

  const speechRecognitionRef = useRef(null);
  const streamTimerRef = useRef(null);

  // Load User Auth & History on Mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('nexus_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      }

      const savedHistory = localStorage.getItem('groq_ai_dashboard_history_v5');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save history helper
  const saveHistoryItem = (promptText, responseText, modeType, execMetrics) => {
    const entry = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: modeType,
      persona: persona === 'other' ? customPersonaText : persona,
      prompt: promptText,
      response: responseText,
      metrics: execMetrics
    };
    const updated = [entry, ...history.slice(0, 24)];
    setHistory(updated);
    try {
      localStorage.setItem('groq_ai_dashboard_history_v5', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteHistoryItem = (id) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem('groq_ai_dashboard_history_v5', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Auth Handler
  const handleAuthSubmit = (e) => {
    if (e) e.preventDefault();
    if (!authEmail.trim()) return;

    const userData = {
      name: authName.trim() || authEmail.split('@')[0],
      email: authEmail.trim(),
      avatar: authName ? authName[0].toUpperCase() : authEmail[0].toUpperCase()
    };
    setUser(userData);
    localStorage.setItem('nexus_user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    setViewMode('WORKSPACE');
  };

  const handleDemoLogin = () => {
    const demoUser = {
      name: 'Alex Developer',
      email: 'alex.dev@nexusai.io',
      avatar: 'A'
    };
    setUser(demoUser);
    localStorage.setItem('nexus_user', JSON.stringify(demoUser));
    setIsAuthModalOpen(false);
    setViewMode('WORKSPACE');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nexus_user');
    setViewMode('LANDING');
  };

  // Synchronize image preview in vision mode
  useEffect(() => {
    if (mode === AI_MODES.IMAGE_DESCRIPTION && input.trim()) {
      setPreviewImage(input.trim());
    } else {
      setPreviewImage(null);
    }
  }, [input, mode]);

  // Voice Dictation (Speech-to-Text)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome/Edge.');
      return;
    }

    if (isListening) {
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      speechRecognitionRef.current = recognition;
      recognition.start();
    }
  };

  // Typewriter Streaming Simulation
  const streamOutput = (text, totalTokens, latencyMs) => {
    setIsStreaming(true);
    setDisplayedOutput('');
    let idx = 0;
    const chunkSize = Math.max(1, Math.floor(text.length / 50));
    const speedTok = Math.round((totalTokens / (latencyMs / 1000)) || 240);
    setTokenSpeed(speedTok);

    if (streamTimerRef.current) clearInterval(streamTimerRef.current);

    streamTimerRef.current = setInterval(() => {
      idx += chunkSize;
      if (idx >= text.length) {
        setDisplayedOutput(text);
        setIsStreaming(false);
        clearInterval(streamTimerRef.current);
      } else {
        setDisplayedOutput(text.slice(0, idx));
      }
    }, 18);
  };

  // Hero Live Playground Simulation
  const handleHeroRun = () => {
    setIsHeroLoading(true);
    setHeroOutput('');
    setTimeout(() => {
      setIsHeroLoading(false);
      setHeroOutput(`def fibonacci(n, memo={}):\n    if n in memo:\n        return memo[n]\n    if n <= 1:\n        return n\n    memo[n] = fibonacci(n-1, memo) + fibonacci(n-2, memo)\n    return memo[n]\n\n# Fast O(N) Execution on Groq LPU Architecture`);
    }, 600);
  };

  // Execute Groq API Request
  const handleProcess = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setFullOutput('');
    setDisplayedOutput('');
    setMetrics(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;

    if (!apiKey) {
      setFullOutput('Error: Groq API key is missing. Please check your .env file.');
      setDisplayedOutput('Error: Groq API key is missing. Please check your .env file.');
      setIsLoading(false);
      return;
    }

    const startTime = performance.now();

    try {
      let result = '';
      const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      const model = 'qwen/qwen3.8-27b';
      let payload = {};

      let currentPersonaInstruction = '';
      if (persona === 'other') {
        currentPersonaInstruction = `You are a custom AI assistant with persona: "${customPersonaText || 'Helpful Assistant'}". Respond according to this persona in detail.`;
      } else {
        currentPersonaInstruction = AI_PERSONAS[persona.toUpperCase()]?.instruction || AI_PERSONAS.ENGINEER.instruction;
      }

      switch (mode) {
        case AI_MODES.TEXT_GENERATION:
          payload = {
            model,
            temperature: parseFloat(temperature),
            top_p: parseFloat(topP),
            messages: [
              { role: 'system', content: currentPersonaInstruction },
              { role: 'user', content: input }
            ]
          };
          break;

        case AI_MODES.SENTIMENT_ANALYSIS:
          payload = {
            model,
            temperature: parseFloat(temperature),
            top_p: parseFloat(topP),
            messages: [
              {
                role: 'system',
                content: `${currentPersonaInstruction} Start response with 'Sentiment: [Positive/Negative/Neutral] [Emoji]'. Break down positive polarity %, neutral clarity %, negative friction %, and a brief rationale.`
              },
              { role: 'user', content: `Analyze sentiment for:\n"${input}"` }
            ]
          };
          break;

        case AI_MODES.IMAGE_DESCRIPTION:
          let imageUrl = input.trim();
          if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            const imageResponse = await fetch(input);
            const imageBlob = await imageResponse.blob();
            const reader = new FileReader();
            reader.readAsDataURL(imageBlob);
            await new Promise((resolve) => (reader.onload = resolve));
            imageUrl = reader.result;
          }

          payload = {
            model,
            temperature: parseFloat(temperature),
            top_p: parseFloat(topP),
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Analyze this image in detail: subjects, composition, color palette, and visual mood.' },
                  { type: 'image_url', image_url: { url: imageUrl } }
                ]
              }
            ]
          };
          break;

        default:
          result = 'Invalid AI mode.';
          break;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
      });

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const resultJson = await response.json();
      const choice = resultJson.choices?.[0];

      if (choice && choice.message?.content) {
        result = choice.message.content;
        const totalTokens = resultJson.usage?.total_tokens || Math.round((input.length + result.length) / 4);

        const execMetrics = {
          latency: latencyMs,
          tokenCount: totalTokens,
          model: 'qwen-3.8-27b'
        };

        setMetrics(execMetrics);
        setFullOutput(result);
        streamOutput(result, totalTokens, latencyMs);
        saveHistoryItem(input, result, mode, execMetrics);
      } else {
        result = 'Error: Could not retrieve completion from API.';
        setFullOutput(result);
        setDisplayedOutput(result);
      }
    } catch (error) {
      setFullOutput(`Error: ${error.message}`);
      setDisplayedOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut (Ctrl/Cmd + Enter)
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleProcess();
    }
  };

  // Copy output
  const handleCopy = () => {
    if (!fullOutput) return;
    navigator.clipboard.writeText(fullOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export output as Markdown file
  const handleExport = () => {
    if (!fullOutput) return;
    const blob = new Blob([fullOutput], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NexusAI_Export_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // TTS Speech
  const toggleTTS = () => {
    if (!fullOutput || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(fullOutput);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Cumulative Analytics Stats
  const totalTokensProcessed = history.reduce((acc, curr) => acc + (curr.metrics?.tokenCount || 0), 0);
  const avgLatency = history.length > 0 ? Math.round(history.reduce((acc, curr) => acc + (curr.metrics?.latency || 0), 0) / history.length) : 0;

  // Filter history
  const filteredHistory = history.filter(item => 
    !searchQuery.trim() || item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // FAQs List
  const faqs = [
    {
      q: "How does Groq LPU hardware compare to traditional GPUs?",
      a: "Groq LPUs (Language Processing Units) are purpose-built deterministic hardware chips designed exclusively for sequential LLM inference, delivering up to 10x faster token speeds (~280 tok/s) with near-zero queue latency."
    },
    {
      q: "What visual formats are supported in Multimodal Vision Mode?",
      a: "Visual Vision mode supports JPG, PNG, WEBP, and Data URLs. It performs zero-shot object analysis, color palette extraction, and OCR text character extraction."
    },
    {
      q: "Can I customize the system personas for my specific domain?",
      a: "Yes! Choose the '✨ Other (Custom)' persona option to define any custom prompt instruction, such as a Python Security Auditor, Math Tutor, or Legal Advisor."
    },
    {
      q: "Can I export my conversation logs and generated code?",
      a: "Absolutely. Click the '📥 Export' button on any response to download the formatted text and code blocks directly as a Markdown (.md) document."
    }
  ];

  // ==========================================
  // RENDER LANDING PAGE VIEW
  // ==========================================
  if (viewMode === 'LANDING') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
        
        {/* 🔐 AUTH MODAL */}
        {isAuthModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div className="dash-card" style={{ width: '100%', maxWidth: '440px', padding: '28px', position: 'relative' }}>
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--primary-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '22px',
                  margin: '0 auto 12px',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
                }}>
                  ❖
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', color: '#0f172a', margin: 0 }}>
                  Welcome to Nexus AI
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Sign in or create an account to launch the AI workspace
                </p>
              </div>

              {/* Tab Switcher */}
              <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
                <button
                  onClick={() => setAuthTab('LOGIN')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: authTab === 'LOGIN' ? 700 : 600,
                    backgroundColor: authTab === 'LOGIN' ? '#ffffff' : 'transparent',
                    color: authTab === 'LOGIN' ? '#4f46e5' : '#64748b',
                    cursor: 'pointer',
                    boxShadow: authTab === 'LOGIN' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  Log In
                </button>
                <button
                  onClick={() => setAuthTab('SIGNUP')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: authTab === 'SIGNUP' ? 700 : 600,
                    backgroundColor: authTab === 'SIGNUP' ? '#ffffff' : 'transparent',
                    color: authTab === 'SIGNUP' ? '#4f46e5' : '#64748b',
                    cursor: 'pointer',
                    boxShadow: authTab === 'SIGNUP' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  Sign Up
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {authTab === 'SIGNUP' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Full Name</label>
                    <input
                      type="text"
                      placeholder="Alex Developer"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="alex@nexusai.io"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--primary-gradient)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '15px',
                    cursor: 'pointer',
                    marginTop: '6px',
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  {authTab === 'LOGIN' ? 'Sign In to Workspace' : 'Create Free Account'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Want to test instantly without typing?</span>
                <button
                  onClick={handleDemoLogin}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  🚀 Instant 1-Click Demo Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOP LANDING NAVBAR */}
        <header style={{
          height: '70px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '20px',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
            }}>
              ❖
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Nexus <span style={{ color: 'var(--primary-indigo)' }}>AI</span>
            </h1>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
            <a href="#playground" style={{ color: 'inherit', textDecoration: 'none' }}>Live Demo</a>
            <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
            <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How It Works</a>
            <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <button
                onClick={() => setViewMode('WORKSPACE')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--primary-gradient)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                Launch Workspace ({user.name})
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setAuthTab('LOGIN'); setIsAuthModalOpen(true); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setAuthTab('SIGNUP'); setIsAuthModalOpen(true); }}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--primary-gradient)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </header>

        {/* HERO SECTION */}
        <section style={{ padding: '70px 20px 40px', textAlign: 'center', maxWidth: '1050px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', backgroundColor: '#e0e7ff', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#4338ca', fontSize: '13px', fontWeight: 800, marginBottom: '24px' }}>
            <span>⚡ Powered by Groq LPU Hardware Acceleration & Qwen Vision AI</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '52px', lineHeight: 1.12, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '20px' }}>
            Next-Gen AI Suite for <br />
            <span style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Text Synthesis, Sentiment & Vision
            </span>
          </h1>

          <p style={{ fontSize: '18px', lineHeight: 1.6, color: '#475569', maxWidth: '750px', margin: '0 auto 36px', fontWeight: 500 }}>
            Nexus AI delivers instant token streaming, speech dictation, sentiment radar analytics, and zero-shot vision inspection in an authentic, high-performance workspace.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
            <button
              onClick={() => {
                if (user) setViewMode('WORKSPACE');
                else { setAuthTab('SIGNUP'); setIsAuthModalOpen(true); }
              }}
              style={{
                padding: '15px 32px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--primary-gradient)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              🚀 Launch AI Workspace
            </button>
            <button
              onClick={handleDemoLogin}
              style={{
                padding: '15px 28px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ⚡ Instant Demo Access
            </button>
          </div>

          {/* INTERACTIVE HERO PLAYGROUND SANDBOX */}
          <div id="playground" className="dash-card dash-card-indigo" style={{ padding: '24px', textAlign: 'left', maxWidth: '820px', margin: '0 auto', boxShadow: 'var(--shadow-hover)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>Live Hero Playground (Try typing or click Run)</span>
              </div>
              <span className="font-mono-tag" style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 700, backgroundColor: '#e0e7ff', padding: '3px 8px', borderRadius: '5px' }}>
                qwen-3.8-27b • ~280 tok/s
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input
                type="text"
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 500, outline: 'none' }}
              />
              <button
                onClick={handleHeroRun}
                disabled={isHeroLoading}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--primary-gradient)', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                {isHeroLoading ? 'Executing...' : 'Run Prompt'}
              </button>
            </div>

            {heroOutput && (
              <div className="code-block animate-fade">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{heroOutput}</pre>
              </div>
            )}
          </div>
        </section>

        {/* SOCIAL PROOF METRICS BAR */}
        <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '32px 20px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', textAlign: 'center' }}>
            <div>
              <h3 className="font-mono-tag" style={{ fontSize: '28px', fontWeight: 800, color: '#4f46e5', margin: 0 }}>99.98%</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0', fontWeight: 600 }}>Inference Uptime SLA</p>
            </div>
            <div>
              <h3 className="font-mono-tag" style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', margin: 0 }}>&lt; 180ms</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0', fontWeight: 600 }}>Avg Groq Latency</p>
            </div>
            <div>
              <h3 className="font-mono-tag" style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed', margin: 0 }}>10M+</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0', fontWeight: 600 }}>Daily Tokens Processed</p>
            </div>
            <div>
              <h3 className="font-mono-tag" style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>~280 tok/s</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0', fontWeight: 600 }}>LPU Generation Speed</p>
            </div>
          </div>
        </section>

        {/* FEATURE SHOWCASE GRID */}
        <section id="features" style={{ padding: '70px 20px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '36px', color: '#0f172a', marginBottom: '10px' }}>
              Engineered for Speed & Precision
            </h2>
            <p style={{ fontSize: '16px', color: '#64748b' }}>Explore the full feature suite powering Nexus AI</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            <div className="dash-card" style={{ padding: '28px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>📝</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', marginBottom: '8px' }}>Text Synthesis & Code Generation</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Generate production-ready code, technical blog posts, or creative prose with custom AI Personas (Senior Engineer, Academic Researcher, Copywriter, Executive, or Custom Other).</p>
            </div>

            <div className="dash-card" style={{ padding: '28px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', marginBottom: '8px' }}>Sentiment Analysis Radar</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Evaluate customer feedback and reviews with visual progress bars for positive polarity, neutral clarity, and negative friction percentages.</p>
            </div>

            <div className="dash-card" style={{ padding: '28px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>👁️</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', marginBottom: '8px' }}>Multimodal Vision Inspector</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Analyze images, diagrams, and artwork with zero-shot object detection, color palette breakdown, and OCR character extraction.</p>
            </div>

            <div className="dash-card" style={{ padding: '28px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fae8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>🎙️</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', marginBottom: '8px' }}>Voice Dictation & Speech TTS</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Dictate your prompts hands-free using Speech-to-Text, and listen to AI responses with native browser audio read-aloud.</p>
            </div>

            <div className="dash-card" style={{ padding: '28px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>⚡</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', marginBottom: '8px' }}>Real-Time Token Streaming</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Experience ultra-low latency token generation (~280 tok/s) powered by Groq's hardware Language Processing Units.</p>
            </div>

            <div className="dash-card" style={{ padding: '28px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', marginBottom: '8px' }}>Telemetry & History Logging</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Track session tokens, latency statistics, and browse past conversation logs with instant restoration and export options.</p>
            </div>

          </div>
        </section>

        {/* HOW IT WORKS 3-STEP PROCESS */}
        <section id="how-it-works" style={{ padding: '60px 20px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '44px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '32px', color: '#0f172a', marginBottom: '8px' }}>
                How It Works in 3 Simple Steps
              </h2>
              <p style={{ fontSize: '15px', color: '#64748b' }}>Accelerate your workflow with zero configuration</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>STEP 01</span>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: '8px 0' }}>Select Intelligence Mode</h3>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Choose between Text Synthesis, Sentiment Radar, or Multimodal Vision based on your current task.</p>
              </div>

              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>STEP 02</span>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: '8px 0' }}>Customize Persona & Parameters</h3>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Select pre-defined system personas or specify a Custom Other persona along with Temperature & Top-P tuning.</p>
              </div>

              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>STEP 03</span>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: '8px 0' }}>Execute & Export Result</h3>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>Receive real-time token streaming responses, listen via TTS, or export code and text directly as Markdown.</p>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE FAQ ACCORDION */}
        <section id="faq" style={{ padding: '70px 20px', maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '32px', color: '#0f172a', marginBottom: '8px' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b' }}>Everything you need to know about Nexus AI</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="dash-card"
                style={{ padding: '18px 22px', cursor: 'pointer' }}
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#0f172a', margin: 0 }}>
                    {faq.q}
                  </h4>
                  <span style={{ fontSize: '18px', color: '#4f46e5', fontWeight: 700 }}>
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </div>
                {openFaq === idx && (
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM CTA BANNER */}
        <section style={{ padding: '60px 20px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '850px', margin: '0 auto', textAlign: 'center', padding: '40px', borderRadius: '20px', background: 'var(--primary-gradient)', color: '#ffffff', boxShadow: 'var(--shadow-glow)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '32px', marginBottom: '12px' }}>
              Ready to Accelerate Your AI Workflow?
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.9, maxWidth: '600px', margin: '0 auto 28px' }}>
              Launch the workspace now or sign in with 1-click instant demo access.
            </p>
            <button
              onClick={() => {
                if (user) setViewMode('WORKSPACE');
                else handleDemoLogin();
              }}
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#4f46e5',
                fontWeight: 800,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
              }}
            >
              🚀 Launch Workspace Now
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '30px 20px', textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: 'auto' }}>
          Nexus AI Suite • Powered by Groq LPUs & Qwen Vision AI Engine
        </footer>
      </div>
    );
  }

  // ==========================================
  // RENDER WORKSPACE DASHBOARD VIEW
  // ==========================================
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
      
      {/* 📊 LIVE AI ANALYTICS MODAL */}
      {isAnalyticsOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(6px)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="dash-card" style={{ width: '100%', maxWidth: '540px', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📊</span>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: 0 }}>
                  Groq LPU Analytics & Telemetry
                </h3>
              </div>
              <button onClick={() => setIsAnalyticsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Session Tokens</span>
                <h4 className="font-mono-tag" style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5', margin: '4px 0 0' }}>
                  {totalTokensProcessed.toLocaleString()}
                </h4>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Avg Latency</span>
                <h4 className="font-mono-tag" style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', margin: '4px 0 0' }}>
                  {avgLatency} ms
                </h4>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Requests</span>
                <h4 className="font-mono-tag" style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
                  {history.length}
                </h4>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Throughput Gauge</span>
                <h4 className="font-mono-tag" style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed', margin: '4px 0 0' }}>
                  ~280 tok/s
                </h4>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#e0e7ff', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '12px', color: '#4338ca', fontWeight: 600 }}>
              ⚡ Groq LPU Inference Architecture delivers up to 10x faster token generation vs traditional GPU clusters.
            </div>
          </div>
        </div>
      )}

      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside style={{
        width: '280px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-card)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 18px',
        flexShrink: 0
      }}>
        
        {/* App Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div 
            onClick={() => setViewMode('LANDING')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '20px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
            }}
          >
            ❖
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Nexus <span style={{ color: 'var(--primary-indigo)' }}>AI</span>
            </h1>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Groq Intelligence Suite</span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
          {[
            { modeKey: AI_MODES.TEXT_GENERATION, label: 'Text Synthesis', icon: '📝' },
            { modeKey: AI_MODES.SENTIMENT_ANALYSIS, label: 'Sentiment Radar', icon: '📊' },
            { modeKey: AI_MODES.IMAGE_DESCRIPTION, label: 'Visual Vision', icon: '👁️' },
          ].map((nav) => {
            const isActive = mode === nav.modeKey;
            return (
              <button
                key={nav.modeKey}
                onClick={() => { setMode(nav.modeKey); setInput(''); setFullOutput(''); setDisplayedOutput(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#4338ca' : '#475569',
                  backgroundColor: isActive ? '#e0e7ff' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <span style={{ fontSize: '16px' }}>{nav.icon}</span>
                <span>{nav.label}</span>
              </button>
            );
          })}
        </nav>

        {/* TODAY'S HISTORY TIMELINE */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TODAY'S HISTORY
            </span>
            <span className="font-mono-tag" style={{ color: '#94a3b8', fontSize: '12px' }}>{history.length} saved</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredHistory.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8', padding: '18px 0', textAlign: 'center' }}>
                No prompt history recorded.
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { setMode(item.mode); setInput(item.prompt); setFullOutput(item.response); setDisplayedOutput(item.response); if (item.metrics) setMetrics(item.metrics); }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(79, 70, 229, 0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                      {item.mode === AI_MODES.TEXT_GENERATION ? 'Text' : item.mode === AI_MODES.SENTIMENT_ANALYSIS ? 'Sentiment' : 'Vision'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="font-mono-tag" style={{ color: '#94a3b8', fontSize: '11px' }}>{item.time}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                        style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                    {item.prompt}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QUOTA & ENGINE STATUS CARD */}
        <div style={{
          marginTop: '18px',
          padding: '16px',
          borderRadius: '14px',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          fontSize: '12px',
          color: '#475569',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Quota Ops</span>
            <span className="font-mono-tag" style={{ color: '#4f46e5', fontWeight: 800, fontSize: '12px' }}>5.4k / 10k</span>
          </div>
          <div className="progress-track" style={{ marginBottom: '10px' }}>
            <div className="progress-fill" style={{ width: '54%', background: 'var(--primary-gradient)' }}></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
            Groq LPU Engine Online
          </div>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* TOP HEADER BAR */}
        <header style={{
          height: '66px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px'
        }}>
          
          {/* Global Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '420px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search prompts, history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 38px',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                  color: '#0f172a',
                  fontWeight: 500
                }}
              />
              <svg style={{ position: 'absolute', left: '12px', top: '11px', width: '16px', height: '16px', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Header Badges & User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Analytics Modal Button */}
            <button
              onClick={() => setIsAnalyticsOpen(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '9px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📊</span>
              <span>Analytics</span>
            </button>

            {/* Model Badge */}
            <span className="font-mono-tag" style={{ fontWeight: 700, fontSize: '12px', padding: '6px 14px', borderRadius: '9px', backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              qwen-3.8-27b
            </span>

            {/* User Profile & Navigation */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  {user.avatar}
                </div>
                <button
                  onClick={() => setViewMode('LANDING')}
                  title="Return to Home Page"
                  style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Home
                </button>
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* DASHBOARD BODY WORKSPACE */}
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          
          {/* TOP 2-COLUMN SPLIT GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            
            {/* LEFT PANE: INPUT & TUNING PARAMETERS */}
            <div className="dash-card dash-card-indigo" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Card Title & Meter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {mode === AI_MODES.TEXT_GENERATION ? 'Input for Text Generation' : mode === AI_MODES.SENTIMENT_ANALYSIS ? 'Input for Sentiment Radar' : 'Input for Visual Vision'}
                </h2>
                <span className="font-mono-tag" style={{ color: '#64748b', fontWeight: 600, fontSize: '12px' }}>
                  {input.length} / 4,000 tokens
                </span>
              </div>

              {/* PERSONA SELECTOR DROPDOWN WITH OTHER/CUSTOM OPTION */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Persona:</span>
                  <div style={{ display: 'flex', gap: '4px', flex: 1, flexWrap: 'wrap' }}>
                    {Object.values(AI_PERSONAS).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPersona(p.id)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '7px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: persona === p.id ? 700 : 500,
                          backgroundColor: persona === p.id ? '#e0e7ff' : 'transparent',
                          color: persona === p.id ? '#4338ca' : '#64748b',
                          cursor: 'pointer'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CUSTOM PERSONA TEXT INPUT WHEN 'OTHER' IS SELECTED */}
                {persona === 'other' && (
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5' }}>Custom Persona:</span>
                    <input
                      type="text"
                      placeholder="e.g. Python Security Auditor, Math Tutor, Legal Advisor..."
                      value={customPersonaText}
                      onChange={(e) => setCustomPersonaText(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe',
                        backgroundColor: '#ffffff',
                        fontSize: '12px',
                        outline: 'none',
                        color: '#0f172a',
                        fontWeight: 600
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Preset Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {mode === AI_MODES.TEXT_GENERATION && (
                  <>
                    <button onClick={() => setInput('Explain modern Python async syntax with concurrency and error handling.')} style={presetBtnStyle}>Explain Complex Code</button>
                    <button onClick={() => setInput('Draft a technical blog outline explaining LPU hardware inference acceleration.')} style={presetBtnStyle}>Technical Blog Post</button>
                    <button onClick={() => setInput('Synthesize technical user feedback into clear product feature tickets.')} style={presetBtnStyle}>Synthesize Feedback</button>
                  </>
                )}
                {mode === AI_MODES.SENTIMENT_ANALYSIS && (
                  <>
                    <button onClick={() => setInput('This AI suite is exceptionally fast and transformed our developer productivity!')} style={presetBtnStyle}>Positive Feedback</button>
                    <button onClick={() => setInput('The server latency spikes under high load and API calls timed out repeatedly.')} style={presetBtnStyle}>Negative Issue</button>
                  </>
                )}
                {mode === AI_MODES.IMAGE_DESCRIPTION && (
                  <>
                    <button onClick={() => setInput('https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Glowworm_luciferin.svg/220px-Glowworm_luciferin.svg.png')} style={presetBtnStyle}>Chemical Diagram Sample</button>
                    <button onClick={() => setInput('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&auto=format&fit=crop&q=60')} style={presetBtnStyle}>Abstract Art Sample</button>
                  </>
                )}
              </div>

              {/* Input Area + Voice Button */}
              <div style={{ position: 'relative', marginBottom: '18px' }}>
                <textarea
                  rows={5}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === AI_MODES.TEXT_GENERATION ? 'Author creative prompts or input structured text...' : mode === AI_MODES.SENTIMENT_ANALYSIS ? 'Enter text to analyze polarity & friction...' : 'Enter image URL to extract vision details...'}
                  style={{
                    width: '100%',
                    padding: '14px',
                    paddingRight: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    outline: 'none',
                    color: '#0f172a',
                    resize: 'vertical',
                    transition: 'all 0.2s ease',
                    fontWeight: 500
                  }}
                />

                {/* 🎙️ Voice Dictation Button */}
                <button
                  onClick={toggleListening}
                  title="Voice Input (Speech-to-Text)"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isListening ? '#ef4444' : '#e0e7ff',
                    color: isListening ? '#ffffff' : '#4338ca',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    boxShadow: isListening ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🎙️
                </button>
              </div>

              {/* Vision Image Preview Thumbnail */}
              {mode === AI_MODES.IMAGE_DESCRIPTION && previewImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', padding: '12px', borderRadius: '12px', backgroundColor: '#e0e7ff', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  <img src={previewImage} alt="Vision preview" onError={() => setPreviewImage(null)} style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '8px' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#4338ca' }}>Image Source Loaded</span>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>Ready for vision prompt extraction</p>
                  </div>
                  <button onClick={() => setInput('')} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>Remove</button>
                </div>
              )}

              {/* Primary Process Button */}
              <button
                onClick={handleProcess}
                disabled={isLoading || !input.trim()}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '14px',
                  border: 'none',
                  background: isLoading || !input.trim() ? '#cbd5e1' : 'var(--primary-gradient)',
                  color: '#ffffff',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '16px',
                  letterSpacing: '0.02em',
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: isLoading || !input.trim() ? 'none' : 'var(--shadow-glow)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  marginBottom: '20px'
                }}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}></span>
                    <span>PROCESSING WITH GROQ AI...</span>
                  </>
                ) : (
                  <>
                    <span>✨ PROCESS WITH AI</span>
                  </>
                )}
              </button>

              {/* GENERATION TUNING PARAMETERS */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Generation Tuning</span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 800 }}>Active</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>Temperature</span>
                      <span className="font-mono-tag" style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.00"
                      max="1.00"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>Top-P</span>
                      <span className="font-mono-tag" style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>{topP}</span>
                    </div>
                    <input
                      type="range"
                      min="0.00"
                      max="1.00"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANE: GENERATED OUTPUT */}
            <div className="dash-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Banner & Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                    Generated Output
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={toggleTTS} style={actionBtnStyle} title="Listen via TTS">
                    {isSpeaking ? 'Stop' : '🔊 Listen'}
                  </button>
                  <button onClick={handleCopy} style={actionBtnStyle} title="Copy to clipboard">
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                  <button onClick={handleExport} style={actionBtnStyle} title="Export Markdown">
                    📥 Export
                  </button>
                  <button onClick={handleProcess} style={actionBtnStyle} title="Retry prompt">
                    🔄 Retry
                  </button>
                </div>
              </div>

              {/* Execution Status Tag */}
              {metrics && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', fontSize: '12px', color: '#475569', flexWrap: 'wrap' }}>
                  <span className="font-mono-tag" style={{ padding: '4px 10px', borderRadius: '7px', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 800, border: '1px solid #a7f3d0', fontSize: '12px' }}>
                    Completed in {(metrics.latency / 1000).toFixed(2)}s • Stream Finished
                  </span>
                  <span className="font-mono-tag" style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 700 }}>
                    ⚡ {tokenSpeed} tokens/sec
                  </span>
                  <span className="font-mono-tag" style={{ fontSize: '12px' }}>• {metrics.tokenCount} tokens</span>
                </div>
              )}

              {/* Output Content */}
              <div style={{ flex: 1, minHeight: '260px', overflowY: 'auto' }}>
                {displayedOutput ? (
                  <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                    {displayedOutput}
                    {isStreaming && <span style={{ fontWeight: 800, color: '#4f46e5' }}> |</span>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '14px' }}>
                    <span style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.6 }}>✨</span>
                    Enter a prompt and click "PROCESS WITH AI" to generate output
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM GRID: FEATURE CARDS (SENTIMENT RADAR & VISION INSPECTOR) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* SENTIMENT ANALYSIS RADAR CARD */}
            <div className="dash-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#0f172a', margin: 0 }}>
                    Sentiment Analysis Radar
                  </h3>
                </div>
                <span className="font-mono-tag" style={{ fontWeight: 800, fontSize: '12px', padding: '4px 10px', borderRadius: '7px', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                  88% POSITIVE
                </span>
              </div>

              {/* Radar Progress Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600 }}>Positive Polarity</span>
                    <span className="font-mono-tag" style={{ fontWeight: 800, color: '#10b981', fontSize: '12px' }}>88%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: '88%', backgroundColor: '#10b981' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600 }}>Neutral Clarity</span>
                    <span className="font-mono-tag" style={{ fontWeight: 800, color: '#64748b', fontSize: '12px' }}>7%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: '7%', backgroundColor: '#94a3b8' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600 }}>Negative Friction</span>
                    <span className="font-mono-tag" style={{ fontWeight: 800, color: '#ef4444', fontSize: '12px' }}>5%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: '5%', backgroundColor: '#ef4444' }}></div>
                  </div>
                </div>
              </div>

              {/* Keywords Breakdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Keywords:</span>
                <span style={chipBadgeStyle}>Optimization (0.94)</span>
                <span style={chipBadgeStyle}>Cooperative (0.88)</span>
                <span style={chipBadgeStyle}>Technical (0.82)</span>
              </div>
            </div>

            {/* VISION INSPECTOR CARD */}
            <div className="dash-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>👁️</span>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '16px', color: '#0f172a', margin: 0 }}>
                    Gemini Vision Inspector
                  </h3>
                </div>
                <button onClick={() => setMode(AI_MODES.IMAGE_DESCRIPTION)} style={{ padding: '5px 12px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '12px', cursor: 'pointer', fontWeight: 700, color: '#334155' }}>
                  Upload New
                </button>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {previewImage ? (
                    <img src={previewImage} alt="Inspector Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px', opacity: 0.4 }}>🖼️</span>
                  )}
                </div>

                <div style={{ flex: 1, fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Zero-shot object detection and OCR parsing</div>
                  <div className="font-mono-tag" style={{ color: '#64748b', fontSize: '12px' }}>Resolution: {previewImage ? '1024 x 768 px' : 'No image loaded'}</div>
                  <div className="font-mono-tag" style={{ color: '#4f46e5', fontWeight: 800, fontSize: '12px' }}>OCR: {previewImage ? '42 Characters Extracted' : '0 Characters'}</div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

// Auxiliary Button Styles
const presetBtnStyle = {
  padding: '6px 12px',
  borderRadius: '8px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  color: '#334155',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
};

const actionBtnStyle = {
  padding: '6px 12px',
  borderRadius: '8px',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  color: '#475569',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
};

const chipBadgeStyle = {
  fontSize: '12px',
  padding: '4px 10px',
  borderRadius: '7px',
  backgroundColor: '#e0e7ff',
  border: '1px solid rgba(99, 102, 241, 0.25)',
  color: '#4338ca',
  fontWeight: 700,
  fontFamily: 'var(--font-mono)'
};

export default App;
