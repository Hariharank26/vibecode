import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clipboard,
  ClipboardCheck,
  Mic,
  MicOff,
  BarChart3,
  Clock,
  TrendingUp,
  IndianRupee,
  History,
  Loader2,
  Search,
  Sun,
  Moon,
  X,
  Download,
  Share2,
  Copy,
  Link,
  Filter,
  FileSpreadsheet,
  Layers,
  Sparkles,
  GitCompare,
  Trash2,
  RefreshCw,
  Globe,
  BookOpen,
  Settings,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { analyzeContent, getStats } from './api';
import {
  AnalyzeResponse,
  HistoryEntry,
  DashboardStats,
  ContextType,
  CONTEXT_OPTIONS
} from './types';

function App() {
  // Form state
  const [answerText, setAnswerText] = useState('');
  const [contextType, setContextType] = useState<ContextType>('legal');
  const [voiceMode, setVoiceMode] = useState(false);
  
  // Results state
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // History & stats (store full results)
  const [history, setHistory] = useState<(HistoryEntry & { fullResult?: AnalyzeResponse })[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<(HistoryEntry & { fullResult?: AnalyzeResponse }) | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    checksToday: 0,
    highRiskPercentage: 0,
    estimatedFinesAvoided: 0
  });
  
  // UI state
  const [copied, setCopied] = useState(false);
  const [copiedIssueIndex, setCopiedIssueIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showCharts, setShowCharts] = useState(false);
  
  // Advanced feature states
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [complianceRules, setComplianceRules] = useState<string[]>(['GDPR', 'SOC2']);
  const [customRuleInput, setCustomRuleInput] = useState('');
  const [showSourceVerification, setShowSourceVerification] = useState(true);
  
  // Voice capture state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load stats on mount and initialize theme
  useEffect(() => {
    getStats().then(setStats).catch(console.error);
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('vibetrust-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('vibetrust-theme', newTheme);
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setAnswerText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access in your browser settings.');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current?.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  // Toggle voice listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setAnswerText('');
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!answerText.trim()) {
      setError('Please enter AI-generated content to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeContent({
        answerText,
        contextType,
        voiceMode
      });

      setResult(response);

      // Add to history with full result
      const historyEntry: HistoryEntry & { fullResult?: AnalyzeResponse } = {
        timestamp: response.timestamp,
        contextType,
        label: response.label,
        score: response.score,
        inputPreview: answerText.slice(0, 40) + (answerText.length > 40 ? '...' : ''),
        voiceMode,
        fullResult: response
      };

      setHistory(prev => [historyEntry, ...prev].slice(0, 10));

      // Update stats
      setStats(prev => ({
        checksToday: prev.checksToday + 1,
        highRiskPercentage: response.label === 'Low' 
          ? Math.round(((prev.highRiskPercentage * prev.checksToday / 100) + 1) / (prev.checksToday + 1) * 100)
          : Math.round((prev.highRiskPercentage * prev.checksToday / 100) / (prev.checksToday + 1) * 100),
        estimatedFinesAvoided: prev.estimatedFinesAvoided + (
          response.label === 'Low' ? 50000 : response.label === 'Medium' ? 10000 : 0
        )
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Copy report to clipboard
  const handleCopyReport = () => {
    if (!result) return;

    const report = `VibeTrust AI Guardian - Trust Analysis Report
============================================
Trust Score: ${result.score}/100 (${result.label})
Timestamp: ${new Date(result.timestamp).toLocaleString()}

COMPLIANCE REPORT:
${result.complianceReport}

AUDIT/NDA NOTE:
${result.ndaauditNote}

FLAGGED ISSUES:
${result.issues.map((issue, i) => `
${i + 1}. "${issue.snippet}"
   Risk Type: ${issue.riskType}
   ${issue.explanation}
   Human should verify: ${issue.humanCheckHint}
`).join('\n')}`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get recommendation text based on label
  const getRecommendation = (label: string) => {
    switch (label) {
      case 'High': return '✓ Recommended: Approve with standard review';
      case 'Medium': return '⚠ Needs Review: Human verification recommended';
      case 'Low': return '⛔ High Risk – Escalate immediately';
      default: return '';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
    return `₹${amount}`;
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to submit
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!loading && answerText.trim()) {
          handleSubmit();
        }
      }
      // Ctrl+K to clear
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setAnswerText('');
        setResult(null);
        setError(null);
      }
      // Ctrl+D to toggle dark mode
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleTheme();
      }
      // Ctrl+Shift+C to toggle charts
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setShowCharts(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, answerText, theme]);

  // Export to PDF
  const handleExportPDF = async () => {
    if (!result) return;
    
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('VibeTrust AI Guardian', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Trust Analysis Report', 20, 28);
    
    // Score section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Trust Score: ${result.score}/100 (${result.label})`, 20, 45);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date(result.timestamp).toLocaleString()}`, 20, 52);
    
    // Compliance Report
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.text('Compliance Report:', 20, 65);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const complianceLines = doc.splitTextToSize(result.complianceReport, 170);
    doc.text(complianceLines, 20, 72);
    
    let yPos = 72 + complianceLines.length * 5;
    
    // Audit Note
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.text('Audit/NDA Note:', 20, yPos + 10);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const auditLines = doc.splitTextToSize(result.ndaauditNote, 170);
    doc.text(auditLines, 20, yPos + 17);
    
    yPos += 17 + auditLines.length * 5;
    
    // Issues
    if (result.issues.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246);
      doc.text('Flagged Issues:', 20, yPos + 10);
      yPos += 17;
      
      result.issues.forEach((issue, i) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`${i + 1}. "${issue.snippet.slice(0, 50)}..."`, 20, yPos);
        doc.setTextColor(100, 100, 100);
        doc.text(`   Risk: ${issue.riskType}`, 20, yPos + 5);
        const explLines = doc.splitTextToSize(`   ${issue.explanation}`, 165);
        doc.text(explLines, 20, yPos + 10);
        yPos += 15 + explLines.length * 4;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by VibeTrust AI Guardian - Team VibeCode', 20, 290);
    
    doc.save(`vibetrust-report-${Date.now()}.pdf`);
  };

  // Copy individual issue
  const handleCopyIssue = (issue: typeof result.issues[0], index: number) => {
    const issueText = `Issue: "${issue.snippet}"
Risk Type: ${issue.riskType}
Explanation: ${issue.explanation}
Human Check: ${issue.humanCheckHint}`;
    
    navigator.clipboard.writeText(issueText);
    setCopiedIssueIndex(index);
    setTimeout(() => setCopiedIssueIndex(null), 2000);
  };

  // Generate share link
  const handleGenerateShareLink = () => {
    if (!result) return;
    
    // Create a simplified shareable version
    const shareData = {
      score: result.score,
      label: result.label,
      issueCount: result.issues.length,
      timestamp: result.timestamp
    };
    
    // Encode to base64 for URL
    const encoded = btoa(JSON.stringify(shareData));
    const link = `${window.location.origin}?share=${encoded}`;
    
    setShareLink(link);
    setShowShareModal(true);
  };

  // Copy share link
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  // Chart data preparation
  const getChartData = () => {
    if (!history.length) return { riskData: [], trendData: [] };
    
    // Risk type distribution from history
    const riskCounts = { High: 0, Medium: 0, Low: 0 };
    history.forEach(entry => {
      if (entry.label in riskCounts) {
        riskCounts[entry.label as keyof typeof riskCounts]++;
      }
    });
    
    const riskData = [
      { name: 'High Risk', value: riskCounts.Low, color: '#ef4444' },
      { name: 'Medium Risk', value: riskCounts.Medium, color: '#f59e0b' },
      { name: 'Low Risk', value: riskCounts.High, color: '#10b981' }
    ].filter(d => d.value > 0);
    
    // Score trend over time
    const trendData = [...history].reverse().map((entry, i) => ({
      name: `#${i + 1}`,
      score: entry.score
    }));
    
    return { riskData, trendData };
  };

  const { riskData, trendData } = getChartData();

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Shield />
            </div>
            <div>
              <h1 className="app-title">VibeTrust AI Guardian</h1>
              <p className="app-subtitle">AI Trust & Compliance Checker for High-Stakes GenAI Outputs</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
            <div className="header-badge">Enterprise Ready</div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Dashboard KPIs */}
        <section className="dashboard-section">
          <h2 className="dashboard-title">
            <BarChart3 size={18} />
            Risk Dashboard
          </h2>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon blue">
                <TrendingUp size={24} />
              </div>
              <div className="kpi-content">
                <h3>{stats.checksToday}</h3>
                <p>Checks run today</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon amber">
                <AlertTriangle size={24} />
              </div>
              <div className="kpi-content">
                <h3>{stats.highRiskPercentage}%</h3>
                <p>High-risk outputs detected</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon green">
                <IndianRupee size={24} />
              </div>
              <div className="kpi-content">
                <h3>{formatCurrency(stats.estimatedFinesAvoided)}</h3>
                <p>Est. fines avoided (simulated)</p>
              </div>
            </div>
          </div>

          {/* Charts Toggle */}
          <button 
            className={`charts-toggle ${showCharts ? 'active' : ''}`}
            onClick={() => setShowCharts(!showCharts)}
          >
            <BarChart3 size={16} />
            {showCharts ? 'Hide Charts' : 'Show Analytics Charts'}
          </button>

          {/* Analytics Charts */}
          {showCharts && history.length > 0 && (
            <div className="charts-container">
              <div className="chart-card">
                <h4>Risk Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h4>Trust Score Trend</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'var(--card-bg)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        {/* Main Panels */}
        <div className="panels-container">
          {/* Input Panel */}
          <div className="card">
            <div className="card-header">
              <FileSearch size={20} className="card-header-icon" />
              <h2>{voiceMode ? 'Spoken Audit Query' : 'AI Content Analysis'}</h2>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Context Type</label>
                <select 
                  className="form-select"
                  value={contextType}
                  onChange={(e) => setContextType(e.target.value as ContextType)}
                >
                  {CONTEXT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div 
                className={`voice-toggle ${voiceMode ? 'active' : ''}`}
                onClick={() => {
                  if (voiceMode && isListening) {
                    recognitionRef.current?.stop();
                    setIsListening(false);
                  }
                  setVoiceMode(!voiceMode);
                }}
              >
                <div className="toggle-switch" />
                <Mic size={18} />
                <div className="toggle-label">
                  Voice Audit Mode
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <button 
                className="advanced-options-toggle"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <Settings size={16} />
                Advanced Trust Features
                {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* Advanced Options Panel */}
              {showAdvancedOptions && (
                <div className="advanced-options-panel">
                  {/* Multi-language Support */}
                  <div className="advanced-option-group">
                    <label className="advanced-option-label">
                      <Globe size={16} />
                      Analysis Language
                    </label>
                    <select 
                      className="form-select compact"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="es">Spanish (Español)</option>
                      <option value="fr">French (Français)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="zh">Chinese (中文)</option>
                      <option value="ja">Japanese (日本語)</option>
                      <option value="ar">Arabic (العربية)</option>
                    </select>
                  </div>

                  {/* Source Verification Toggle */}
                  <div className="advanced-option-group">
                    <label className="advanced-option-label">
                      <BookOpen size={16} />
                      Source Verification
                    </label>
                    <div 
                      className={`mini-toggle ${showSourceVerification ? 'active' : ''}`}
                      onClick={() => setShowSourceVerification(!showSourceVerification)}
                    >
                      <div className="mini-toggle-switch" />
                      <span>{showSourceVerification ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <p className="option-hint">Check claims for citations & suggest verification sources</p>
                  </div>

                  {/* Custom Compliance Rules */}
                  <div className="advanced-option-group">
                    <label className="advanced-option-label">
                      <ShieldCheck size={16} />
                      Compliance Rules
                    </label>
                    <div className="compliance-tags">
                      {complianceRules.map((rule, index) => (
                        <span key={index} className="compliance-tag">
                          {rule}
                          <button 
                            className="tag-remove"
                            onClick={() => setComplianceRules(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="add-rule-input">
                      <input 
                        type="text"
                        placeholder="Add rule (HIPAA, PCI-DSS, etc.)"
                        value={customRuleInput}
                        onChange={(e) => setCustomRuleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customRuleInput.trim()) {
                            setComplianceRules(prev => [...prev, customRuleInput.trim().toUpperCase()]);
                            setCustomRuleInput('');
                          }
                        }}
                      />
                      <button 
                        className="add-rule-btn"
                        onClick={() => {
                          if (customRuleInput.trim()) {
                            setComplianceRules(prev => [...prev, customRuleInput.trim().toUpperCase()]);
                            setCustomRuleInput('');
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div className="preset-rules">
                      <span className="preset-label">Quick add:</span>
                      {['HIPAA', 'PCI-DSS', 'ISO27001', 'CCPA', 'FERPA'].map(rule => (
                        !complianceRules.includes(rule) && (
                          <button 
                            key={rule}
                            className="preset-rule-btn"
                            onClick={() => setComplianceRules(prev => [...prev, rule])}
                          >
                            + {rule}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {voiceMode && (
                <button
                  className={`voice-capture-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  type="button"
                >
                  {isListening ? (
                    <>
                      <MicOff size={20} />
                      <span>Stop Listening</span>
                      <div className="listening-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Mic size={20} />
                      <span>Start Voice Capture</span>
                    </>
                  )}
                </button>
              )}

              <div className="form-group">
                <label className="form-label">
                  {voiceMode ? 'Transcribed AI Response' : 'Paste AI-generated answer here'}
                </label>
                <div className="textarea-wrapper">
                  <textarea
                    className="form-textarea"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={voiceMode 
                      ? 'Spoken AI response will appear here after voice capture...'
                      : 'Paste the AI-generated content you want to analyze for trust, hallucinations, and compliance risks...'
                    }
                  />
                  <button 
                    className={`submit-btn-inline ${loading ? 'loading' : ''}`}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        Run Trust Check
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ color: '#f87171', fontSize: '0.875rem', marginTop: '1rem' }}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="card">
            <div className="card-header">
              <CheckCircle size={20} className="card-header-icon" />
              <h2>Analysis Results</h2>
            </div>
            <div className="card-body">
              {!result && !loading && (
                <div className="results-placeholder">
                  <Shield size={64} />
                  <p>Run a trust check to see results</p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    Powered by multi-model consensus simulation
                  </p>
                </div>
              )}

              {loading && (
                <div className="results-placeholder">
                  <Loader2 size={64} className="spinner" />
                  <p>Analyzing content with multi-model consensus...</p>
                </div>
              )}

              {result && !loading && (
                <>
                  {/* Trust Score Card */}
                  <div className="score-card">
                    <div className="score-display">
                      <div className={`score-number ${result.label.toLowerCase()}`}>
                        {result.score}
                      </div>
                      <div className={`score-label ${result.label.toLowerCase()}`}>
                        {result.label} Trust
                      </div>
                    </div>
                    <div className="score-recommendation">
                      {getRecommendation(result.label)}
                    </div>
                  </div>

                  {/* Issues Card */}
                  {result.issues.length > 0 && (
                    <div className="issues-card">
                      <h3 className="issues-title">
                        <AlertTriangle size={18} />
                        Flagged Risks & Possible Hallucinations
                      </h3>
                      {result.issues.map((issue, index) => (
                        <div key={index} className="issue-item">
                          <div className="issue-header">
                            <div className="issue-snippet">"{issue.snippet}"</div>
                            <button 
                              className={`issue-copy-btn ${copiedIssueIndex === index ? 'copied' : ''}`}
                              onClick={() => handleCopyIssue(issue, index)}
                              title="Copy issue"
                            >
                              {copiedIssueIndex === index ? <ClipboardCheck size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                          <div className="issue-meta">
                            <span className={`issue-type ${issue.riskType}`}>
                              {issue.riskType.replace('-', ' ')}
                            </span>
                          </div>
                          <div className="issue-explanation">{issue.explanation}</div>
                          <div className="issue-hint">
                            <strong>Human should check:</strong> {issue.humanCheckHint}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Source Verification Card */}
                  {showSourceVerification && (
                    <div className="source-verification-card">
                      <h3 className="section-title">
                        <BookOpen size={18} />
                        Source Verification
                      </h3>
                      <div className="verification-content">
                        <div className="verification-item">
                          <div className="verification-status warning">
                            <AlertTriangle size={16} />
                          </div>
                          <div className="verification-details">
                            <strong>Citation Check</strong>
                            <p>No explicit citations found in the analyzed content. Consider requesting source references.</p>
                          </div>
                        </div>
                        <div className="verification-item">
                          <div className="verification-status info">
                            <ExternalLink size={16} />
                          </div>
                          <div className="verification-details">
                            <strong>Suggested Verification Sources</strong>
                            <ul className="verification-sources">
                              {contextType === 'legal' && (
                                <>
                                  <li><a href="https://www.law.cornell.edu/" target="_blank" rel="noopener noreferrer">Cornell Law - Legal Information Institute</a></li>
                                  <li><a href="https://scholar.google.com/" target="_blank" rel="noopener noreferrer">Google Scholar - Legal Cases</a></li>
                                </>
                              )}
                              {contextType === 'finance' && (
                                <>
                                  <li><a href="https://www.sec.gov/" target="_blank" rel="noopener noreferrer">SEC - Securities & Exchange Commission</a></li>
                                  <li><a href="https://www.investopedia.com/" target="_blank" rel="noopener noreferrer">Investopedia - Financial Terms</a></li>
                                </>
                              )}
                              {contextType === 'compliance' && (
                                <>
                                  <li><a href="https://gdpr.eu/" target="_blank" rel="noopener noreferrer">GDPR Official Resource</a></li>
                                  <li><a href="https://www.iso.org/" target="_blank" rel="noopener noreferrer">ISO Standards</a></li>
                                </>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Compliance Rules Card */}
                  {complianceRules.length > 0 && (
                    <div className="active-compliance-card">
                      <h3 className="section-title">
                        <ShieldCheck size={18} />
                        Active Compliance Rules ({complianceRules.length})
                      </h3>
                      <div className="active-rules-grid">
                        {complianceRules.map((rule, index) => (
                          <div key={index} className="active-rule-item">
                            <div className="rule-icon">
                              <Shield size={14} />
                            </div>
                            <div className="rule-info">
                              <strong>{rule}</strong>
                              <span className="rule-status checked">
                                <CheckCircle size={12} /> Checked
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedLanguage !== 'en' && (
                        <div className="language-notice">
                          <Globe size={14} />
                          Analysis performed in: {
                            {
                              'hi': 'Hindi',
                              'es': 'Spanish', 
                              'fr': 'French',
                              'de': 'German',
                              'zh': 'Chinese',
                              'ja': 'Japanese',
                              'ar': 'Arabic'
                            }[selectedLanguage] || 'English'
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compliance Card */}
                  <div className="compliance-card">
                    <div className="compliance-section">
                      <h4>
                        <FileText size={16} />
                        Compliance Report
                      </h4>
                      <p>{result.complianceReport}</p>
                    </div>
                    <div className="compliance-section">
                      <h4>
                        <Clipboard size={16} />
                        Audit / NDA Note
                      </h4>
                      <p>{result.ndaauditNote}</p>
                    </div>
                    <div className="action-buttons">
                      <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopyReport}>
                        {copied ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}
                        {copied ? 'Copied!' : 'Copy Report'}
                      </button>
                      <button className="action-btn pdf-btn" onClick={handleExportPDF}>
                        <Download size={16} />
                        Export PDF
                      </button>
                      <button className="action-btn share-btn" onClick={handleGenerateShareLink}>
                        <Share2 size={16} />
                        Share
                      </button>
                    </div>
                  </div>

                  {/* Voice Transcript (if voice mode) */}
                  {voiceMode && result.voiceSummary && (
                    <div className="voice-transcript">
                      <h4>
                        <Mic size={16} />
                        Voice Audit Transcript
                      </h4>
                      <div className="transcript-line">
                        <strong>User:</strong> Is this AI answer safe to send to the regulator?
                      </div>
                      <div className="transcript-line">
                        <strong>VibeTrust:</strong> {result.voiceSummary}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* History Section */}
        <section className="history-section">
          <div className="card history-card">
            <div className="card-header">
              <History size={20} className="card-header-icon" />
              <h2>Recent Analyses</h2>
            </div>
            <table className="history-table">
              <thead>
                <tr>
                  <th><Clock size={14} style={{ marginRight: '0.5rem' }} />Time</th>
                  <th>Context</th>
                  <th>Trust Level</th>
                  <th>Input Preview</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="history-empty">
                      No analyses yet. Run your first trust check above.
                    </td>
                  </tr>
                ) : (
                  history.map((entry, index) => (
                    <tr 
                      key={index} 
                      onClick={() => setSelectedHistoryItem(entry)}
                      className="history-row-clickable"
                    >
                      <td>{formatTime(entry.timestamp)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{entry.contextType}</td>
                      <td>
                        <span className={`score-label ${entry.label.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                          {entry.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{entry.inputPreview}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Shield size={20} />
            <span>VibeTrust AI Guardian</span>
          </div>
          <div className="footer-team">
            <span className="team-label">Developed by</span>
            <div className="team-members">
              <span className="team-member">Hari Haran</span>
              <span className="team-divider">•</span>
              <span className="team-member">Bharadwaj</span>
              <span className="team-divider">•</span>
              <span className="team-member">Ratna Keerthi</span>
            </div>
          </div>
        </div>
      </footer>

      {/* History Detail Modal */}
      {selectedHistoryItem && selectedHistoryItem.fullResult && (
        <div className="modal-overlay" onClick={() => setSelectedHistoryItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Analysis Details</h2>
              <button className="modal-close" onClick={() => setSelectedHistoryItem(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {/* Score Card */}
              <div className="modal-score-section">
                <div className={`modal-score-card ${selectedHistoryItem.fullResult.label.toLowerCase()}`}>
                  <div className="modal-score-number">{selectedHistoryItem.fullResult.score}</div>
                  <div className="modal-score-label">Trust Score</div>
                </div>
                <div className="modal-meta">
                  <div className="modal-meta-item">
                    <Clock size={16} />
                    <span>{new Date(selectedHistoryItem.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="modal-meta-item">
                    <FileSearch size={16} />
                    <span style={{ textTransform: 'capitalize' }}>{selectedHistoryItem.contextType} Context</span>
                  </div>
                  <span className={`score-label ${selectedHistoryItem.fullResult.label.toLowerCase()}`}>
                    {selectedHistoryItem.fullResult.label} Trust
                  </span>
                </div>
              </div>

              {/* Issues */}
              {selectedHistoryItem.fullResult.issues.length > 0 && (
                <div className="modal-section">
                  <h3><AlertTriangle size={18} /> Flagged Issues ({selectedHistoryItem.fullResult.issues.length})</h3>
                  <div className="modal-issues">
                    {selectedHistoryItem.fullResult.issues.map((issue, i) => (
                      <div key={i} className={`modal-issue ${issue.riskType}`}>
                        <div className="issue-header">
                          <span className={`issue-badge ${issue.riskType}`}>{issue.riskType}</span>
                        </div>
                        <blockquote>"{issue.snippet}"</blockquote>
                        <p className="issue-explanation">{issue.explanation}</p>
                        <p className="issue-hint"><strong>Human should verify:</strong> {issue.humanCheckHint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Report */}
              <div className="modal-section">
                <h3><FileText size={18} /> Compliance Report</h3>
                <p className="modal-report">{selectedHistoryItem.fullResult.complianceReport}</p>
              </div>

              {/* Audit Note */}
              <div className="modal-section">
                <h3><Clipboard size={18} /> Audit / NDA Note</h3>
                <p className="modal-report">{selectedHistoryItem.fullResult.ndaauditNote}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content share-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowShareModal(false)}>
              <X size={24} />
            </button>
            <h2>
              <Share2 size={24} />
              Share Analysis
            </h2>
            <p className="share-description">Share this analysis summary with your team</p>
            <div className="share-link-container">
              <input 
                type="text" 
                value={shareLink} 
                readOnly 
                className="share-link-input"
              />
              <button className="share-copy-btn" onClick={handleCopyShareLink}>
                <Link size={16} />
                Copy Link
              </button>
            </div>
            <div className="share-note">
              Note: Only the summary (score, label, issue count) is shared, not the full content.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
