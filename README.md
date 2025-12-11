# 🛡️ VeriCore AI

**AI Trust & Compliance Checker for High-Stakes GenAI Outputs**

A unique AI trust layer for enterprises that checks GenAI outputs for hallucinations and compliance risk, producing clear risk reports for banks, law firms, and large corporates.

---

## 🎯 The Problem

Generative AI is transforming enterprises, but outputs from ChatGPT, Claude, and other LLMs can:

- **Hallucinate** facts, laws, or regulations that don't exist
- **Misstate** financial figures, contract terms, or compliance requirements
- **Create liability** when acted upon in legal, financial, or regulatory contexts
- **Lack auditability** for compliance and NDA requirements

**The risk is massive:** A single hallucinated legal clause or fabricated regulation could cost millions in fines, lawsuits, or regulatory penalties.

---

## 💡 The Solution: VeriCore AI

VeriCore acts as a **trust layer** between AI outputs and human decision-makers:

1. **Multi-Model Consensus Simulation** - Simulates 3 independent AI expert reviewers to cross-check claims
2. **Risk Scoring** - Provides a 0-100 trust score with High/Medium/Low labels
3. **Hallucination Detection** - Identifies specific statements that may be fabricated or uncertain
4. **Compliance Reports** - Generates audit-ready documentation for legal and compliance teams
5. **Actionable Guidance** - Tells humans exactly what to verify before acting

### Key Features

- ✅ **Domain-Aware Analysis** - Legal, Financial, and Compliance contexts
- ✅ **Trust Score Dashboard** - Visual KPIs for risk management
- ✅ **Highlighted Risk Snippets** - Pinpoints exactly what's problematic
- ✅ **Audit Trail Ready** - Copy-able reports for NDA/audit files
- ✅ **Voice Mode UI** - Simulated voice audit interface (future-ready)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + TypeScript)             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Input Panel │  │ Results View │  │ Dashboard & History    │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/JSON
┌───────────────────────────▼─────────────────────────────────────┐
│                        Backend (Python + FastAPI)                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ POST /analyze                                            │    │
│  │  - Constructs multi-model consensus prompt               │    │
│  │  - Calls OpenAI API                                      │    │
│  │  - Parses structured JSON response                       │    │
│  │  - Returns trust score, issues, compliance report        │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ GET /stats   │  │ GET /history │  (In-memory storage)        │
│  └──────────────┘  └──────────────┘                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                        OpenAI API (GPT-4o)                       │
│         Multi-model consensus simulation via prompting           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** (for backend)
- **Node.js 18+** (for frontend)
- **OpenAI API Key** with GPT-4o access

### 1. Clone and Setup

```bash
# Navigate to project
cd VeriCoreAI

# Backend setup
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Set OpenAI API Key

```powershell
# Windows PowerShell
$env:OPENAI_API_KEY = "sk-your-key-here"

# Windows CMD
set OPENAI_API_KEY=sk-your-key-here

# macOS/Linux
export OPENAI_API_KEY=sk-your-key-here
```

### 3. Start Backend

```bash
cd backend
python main.py
# or
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

### 5. Open the App

Navigate to **http://localhost:5173** in your browser.

---

## 📋 Demo Script (2 Minutes)

Use this script when presenting to hackathon judges:

### Opening (15 sec)
> "Enterprises are adopting GenAI, but AI hallucinations in legal, financial, and compliance contexts can cost millions. VeriCore AI is an enterprise trust layer that validates AI outputs before they reach decision-makers."

### Demo Flow (90 sec)

1. **Show the Dashboard**
   > "Here's our Risk Dashboard showing checks run today, high-risk detection rate, and estimated fines avoided."

2. **Paste Sample Content** (use example below)
   > "Let me paste an AI-generated legal summary. This could be from ChatGPT, Claude, or any LLM."

3. **Select Context Type**
   > "I'll select 'Legal / Contract Review' since this is a contract summary."

4. **Run Trust Check**
   > "Now I click 'Run Trust Check'. VeriCore simulates three independent AI reviewers checking for consensus."

5. **Show Results**
   > "We get a Trust Score of [X]. Look at the flagged risks - VeriCore identified [specific issue] as potentially hallucinated. The compliance report is ready for legal review."

6. **Copy Report**
   > "One click copies the full audit report for compliance files or NDA documentation."

7. **Toggle Voice Mode**
   > "We also support voice audit mode - ready for hands-free compliance verification."

### Closing (15 sec)
> "VeriCore brings enterprise-grade trust to GenAI. Banks, law firms, and corporates can now validate AI outputs before acting on them. Questions?"

---

## 📝 Sample Test Content

### Legal (Medium-High Risk Expected)

```
The contract is governed by Article 17.3 of the International Commercial Arbitration Act 2019, which mandates 90-day dispute resolution windows. Under Section 234(b) of the Uniform Commercial Code, the seller must provide warranty coverage for 24 months. Force majeure clauses are automatically voided if the disruption lasts less than 14 days per the Geneva Convention on Commercial Contracts.
```

### Financial (High Risk Expected)

```
Based on our analysis, the company's P/E ratio of 45.2 is justified by the Smith-Warren valuation model, which projects 340% revenue growth. The Federal Reserve's Rule 15c3-1 requires minimum capital reserves of $2.5M for firms this size. Historical data shows similar companies achieved ROI of 127% within 18 months.
```

### Compliance (Medium Risk Expected)

```
Your data handling practices comply with GDPR Article 42.7 regarding automated decision-making. The new CCPA amendments effective March 2024 allow 60-day response windows for consumer requests. Your privacy policy meets ISO 27001-2023 requirements for healthcare data under the updated HIPAA guidelines.
```

---

## 🔧 API Reference

### POST /analyze

Analyze AI-generated content for trust and compliance risks.

**Request:**
```json
{
  "answerText": "AI-generated content to analyze...",
  "contextType": "legal|finance|compliance",
  "voiceMode": false
}
```

**Response:**
```json
{
  "score": 65,
  "label": "Medium",
  "issues": [
    {
      "snippet": "Article 17.3 of the International Commercial Arbitration Act 2019",
      "riskType": "hallucination",
      "explanation": "This specific article and act could not be verified and may be fabricated.",
      "humanCheckHint": "Verify the exact legislation name and article number with legal counsel."
    }
  ],
  "complianceReport": "The AI-generated content contains several legal references that require verification...",
  "ndaauditNote": "Content reviewed by VeriCore AI on [date]. Flagged 2 potential issues...",
  "voiceSummary": "This legal content has medium trust with two flagged issues...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /stats

Get dashboard statistics.

### GET /history

Get recent analysis history.

---

## 📁 Project Structure

```
VeriCoreAI/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   ├── api.ts           # API client
│   │   ├── types.ts         # TypeScript types
│   │   ├── index.css        # Styles
│   │   └── main.tsx         # Entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## 🎨 Tech Stack

- **Backend:** Python 3.9+, FastAPI, OpenAI SDK, Pydantic
- **Frontend:** React 18, TypeScript, Vite, Lucide Icons
- **AI:** OpenAI GPT-4o with custom multi-model consensus prompting
- **Storage:** In-memory (prototype scope)

---

## 🔮 Future Roadmap

- [ ] Real multi-model calls (Claude, Llama, Gemini)
- [ ] Persistent database (PostgreSQL)
- [ ] User authentication & teams
- [ ] Webhook integrations (Slack, Teams)
- [ ] Real voice input/output
- [ ] Document upload (PDF, DOCX)
- [ ] Custom compliance rule sets
- [ ] Enterprise SSO

---

## 📄 License

MIT License - Built for hackathon demonstration purposes.

---

## 👥 Team

**VeriCore AI** - Bringing enterprise trust to the AI era.

*Built with ❤️ for the hackathon*
