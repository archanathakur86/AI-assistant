import React, { useState } from 'react';

const AI_MODES = {
  TEXT_GENERATION: 'text-gen',
  SENTIMENT_ANALYSIS: 'sentiment',
  IMAGE_DESCRIPTION: 'image-desc',
};

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 sparkles-icon">
    <path d="M12 2v2" />
    <path d="M12 22v2" />
    <path d="M4.93 4.93l1.41 1.41" />
    <path d="M17.66 17.66l1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M4.93 19.07l1.41-1.41" />
    <path d="M17.66 6.34l1.41-1.41" />
    <path d="M16 12a4 4 0 0 1-8 0" />
  </svg>
);

const TextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2" >
    <path d="M17 6H3" />
    <path d="M21 12H3" />
    <path d="M17 18H3" />
  </svg>
);

const SmileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" x2="9.01" y1="9" y2="9" />
    <line x1="15" x2="15.01" y1="9" y2="9" />
  </svg>
);

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin mr-2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const App = () => {
  const [mode, setMode] = useState(AI_MODES.TEXT_GENERATION);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Function to process AI requests using the Gemini API
  const handleProcess = async () => {
    setIsLoading(true);
    setOutput(''); // Clear previous output

    // API key is hardcoded directly into the file as requested.
    const apiKey = 'AIzaSyBX0Tm3Kg88SVJQ8Se4FIuxMIJSXp_x_7A';

    try {
      let result = '';
      let apiUrl = '';
      let payload = {};
      
      switch (mode) {
        case AI_MODES.TEXT_GENERATION:
          apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
          payload = {
            contents: [{ parts: [{ text: input }] }],
            tools: [{ "google_search": {} }],
            systemInstruction: {
              parts: [{ text: "You are a helpful assistant that generates creative and informative text based on user prompts. Ensure your responses are detailed and engaging." }]
            }
          };
          break;
        case AI_MODES.SENTIMENT_ANALYSIS:
          apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
          payload = {
            contents: [{ parts: [{ text: `Perform a sentiment analysis on the following text and return only the sentiment (Positive, Negative, or Neutral) and a single, relevant emoji. Text: "${input}"` }] }],
            tools: [{ "google_search": {} }],
            systemInstruction: {
              parts: [{ text: "You are a sentiment analysis AI. Your output must be concise, starting with 'Sentiment:' followed by the result (Positive, Negative, Neutral) and an appropriate emoji. For example, 'Sentiment: Positive 😄'." }]
            }
          };
          break;
        case AI_MODES.IMAGE_DESCRIPTION:
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const imageResponse = await fetch(input);
            const imageBlob = await imageResponse.blob();
            const reader = new FileReader();
            reader.readAsDataURL(imageBlob);
            await new Promise((resolve) => reader.onload = resolve);
            const base64ImageData = reader.result.split(',')[1];
            const mimeType = imageBlob.type;
          
            payload = {
              contents: [{
                role: "user",
                parts: [
                  { text: "Describe this image in detail." },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64ImageData
                    }
                  }
                ]
              }],
            };
            break;
        default:
          result = 'Please select an AI mode.';
          break;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned an error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const resultJson = await response.json();
      const candidate = resultJson.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        result = candidate.content.parts[0].text;
      } else {
        result = "Error: Could not get a response from the AI.";
      }

      setOutput(result);
      setInput(''); // Clear the input box after a successful process
    } catch (error) {
      setOutput(`Error: Could not process request. Please try again. ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    // Process when the "Enter" key is pressed, but not when "Shift + Enter" is for new lines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleProcess();
    }
  };

  const renderInputArea = () => {
    switch (mode) {
      case AI_MODES.TEXT_GENERATION:
      case AI_MODES.SENTIMENT_ANALYSIS:
        return (
          <textarea
            className="input-area"
            placeholder={`Enter text for ${mode === AI_MODES.TEXT_GENERATION ? 'generation' : 'sentiment analysis'}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        );
      case AI_MODES.IMAGE_DESCRIPTION:
        return (
          <input
            type="text"
            className="input-area"
            placeholder="Enter image URL..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');

          body {
            background-color: #111827;
            color: #f3f4f6;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }

          .container {
            min-height: 100vh;
            background-color: #111827;
            color: #f3f4f6;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }
          
          .app-card {
            width: 100%;
            max-width: 48rem;
            background-color: #1f2937;
            border-radius: 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            transition: transform 0.5s ease;
          }

          .app-card:hover {
            transform: scale(1.02);
          }

          .header {
            background: linear-gradient(to right, #2563eb, #9333ea);
            padding: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .header-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .sparkles-icon {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }

          .title-text {
            font-size: 1.875rem;
            font-weight: 800;
            color: #ffffff;
          }

          .mode-selector {
            padding: 1.5rem;
            border-bottom: 1px solid #374151;
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: 1rem;
          }

          .mode-button {
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.3s ease;
            background-color: #374151;
            color: #d1d5db;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
          }

          .mode-button:hover {
            background-color: #4b5563;
            color: #e5e7eb;
          }

          .mode-button.active {
            background-color: #3b82f6;
            color: #ffffff;
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.5), 0 4px 6px -2px rgba(59, 130, 246, 0.25);
          }

          .content-area {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .input-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            color: #9ca3af;
          }

          .input-area {
            width: 100%;
            padding: 1rem;
            color: #ffffff;
            background-color: #1f2937;
            border-radius: 0.5rem;
            border: 1px solid #374151;
            box-sizing: border-box;
            resize: vertical;
            min-height: 10rem;
            transition: all 0.2s ease;
          }
          
          .input-area:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          }

          .process-button {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 700;
            color: #ffffff;
            background: linear-gradient(to right, #3b82f6, #8b5cf6);
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .process-button:hover {
            background: linear-gradient(to right, #2563eb, #7c3aed);
          }

          .process-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .loader-icon {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .output-container {
            background-color: #374151;
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.1);
            margin-top: 1.5rem;
            animation: fadeIn 0.5s ease-in-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .output-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #e5e7eb;
            margin-bottom: 0.75rem;
          }

          .output-text {
            color: #d1d5db;
            line-height: 1.6;
            white-space: pre-wrap;
          }

          @media (max-width: 640px) {
            .app-card {
              border-radius: 1rem;
            }
            .header-title {
              font-size: 1.5rem;
            }
            .mode-selector {
              flex-direction: column;
              align-items: stretch;
            }
          }
        `}
      </style>
      <div className="app-card">
        
        {/* Header */}
        <div className="header">
          <div className="header-title">
            <SparklesIcon />
            <h1 className="title-text">AI Assistant</h1>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            onClick={() => { setMode(AI_MODES.TEXT_GENERATION); setInput(''); setOutput(''); }}
            className={`mode-button ${mode === AI_MODES.TEXT_GENERATION ? 'active' : ''}`}
          >
            <TextIcon /> Text Generation
          </button>
          <button
            onClick={() => { setMode(AI_MODES.SENTIMENT_ANALYSIS); setInput(''); setOutput(''); }}
            className={`mode-button ${mode === AI_MODES.SENTIMENT_ANALYSIS ? 'active' : ''}`}
          >
            <SmileIcon /> Sentiment Analysis
          </button>
          <button
            onClick={() => { setMode(AI_MODES.IMAGE_DESCRIPTION); setInput(''); setOutput(''); }}
            className={`mode-button ${mode === AI_MODES.IMAGE_DESCRIPTION ? 'active' : ''}`}
          >
            <ImageIcon /> Image Description
          </button>
        </div>

        {/* Main Content Area */}
        <div className="content-area">
          <div className="space-y-4">
            <label className="input-label">{`Input for ${mode === AI_MODES.TEXT_GENERATION ? 'Text Generation' : mode === AI_MODES.SENTIMENT_ANALYSIS ? 'Sentiment Analysis' : 'Image Description'}`}</label>
            {renderInputArea()}
          </div>
          
          <button
            onClick={handleProcess}
            disabled={isLoading || !input}
            className="process-button"
          >
            {isLoading ? (
              <>
                <LoaderIcon /> Processing...
              </>
            ) : (
              'Process with AI'
            )}
          </button>

          {output && (
            <div className="output-container">
              <h3 className="output-title">AI Response:</h3>
              <p className="output-text">{output}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
