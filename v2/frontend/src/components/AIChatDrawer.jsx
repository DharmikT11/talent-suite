import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, Bot } from 'lucide-react';

const SUGGESTIONS = [
  "Give me a quick summary of our candidate pipeline.",
  "Who is our most experienced candidate?",
  "Which candidates have Python skills?",
];

// Helper to render bold markdown and clean bullet points
function FormattedMessage({ content }) {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} style={{ height: '4px' }} />;
        }

        // Render bold text safely
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const formattedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} style={{ fontWeight: '700', color: '#0F172A' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        // Check if bullet line
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '6px', paddingLeft: '4px' }}>
              <span style={{ color: '#2563EB', fontWeight: 'bold' }}>•</span>
              <div>{formattedLine}</div>
            </div>
          );
        }

        return <div key={idx}>{formattedLine}</div>;
      })}
    </div>
  );
}

export default function AIChatDrawer({ candidateCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your recruitment analytics assistant. Ask me anything about the candidates in your sheet: who fits a role, how experience is spread across the pipeline, or a quick summary.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I could not analyze the pipeline right now.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error while communicating with AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-drawer">
      {!isOpen && (
        <button 
          className="chat-bubble-btn" 
          onClick={() => setIsOpen(true)}
          title="Ask AI about candidate pipeline"
        >
          <Bot size={26} />
        </button>
      )}

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>RecruitAI Analyst</h4>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Live Pipeline Intelligence</div>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <FormattedMessage content={m.content} />
              </div>
            ))}

            {loading && (
              <div className="chat-msg assistant" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>Analyzing pipeline...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              {SUGGESTIONS.map((s, idx) => (
                <button 
                  key={idx}
                  className="btn btn-secondary" 
                  style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '12px' }}
                  onClick={() => handleSend(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-bar">
            <input 
              type="text" 
              className="search-input"
              placeholder="Ask about candidates, experience, skills..."
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              className="btn btn-primary"
              style={{ padding: '8px 12px' }}
              disabled={loading || !input.trim()}
              onClick={() => handleSend()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
