"""
VeriCore AI - Backend API
AI Trust & Compliance Checker for High-Stakes GenAI Outputs
"""

import os
import json
import re
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

app = FastAPI(
    title="VeriCore AI",
    description="AI Trust & Compliance Checker for High-Stakes GenAI Outputs",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for history
analysis_history: List[dict] = []

# Pydantic models
class AnalyzeRequest(BaseModel):
    answerText: str
    contextType: str  # "legal" | "finance" | "compliance"
    voiceMode: bool = False

class Issue(BaseModel):
    snippet: str
    riskType: str  # "hallucination" | "uncertain" | "compliance-risk"
    explanation: str
    humanCheckHint: str

class AnalyzeResponse(BaseModel):
    score: int
    label: str  # "High" | "Medium" | "Low"
    issues: List[Issue]
    complianceReport: str
    ndaauditNote: str
    voiceSummary: Optional[str] = None
    timestamp: str

# System prompt for VeriCore AI
SYSTEM_PROMPT = """You are 'VeriCore AI', an advanced AI trust and compliance reviewer designed for enterprise use in high-stakes domains like legal, financial, and regulatory compliance.

INTERNAL PROCESS (Multi-Model Consensus Simulation):
You internally simulate 3 independent expert models reviewing the given AI-generated answer:
- Expert A (GPT-like): Focuses on factual accuracy and logical consistency
- Expert B (Claude-like): Focuses on nuance, caveats, and potential misinterpretations  
- Expert C (Llama-like): Focuses on domain-specific compliance risks and red flags

For each important claim in the AI answer, you consider:
1. Do the three experts agree on its accuracy and appropriateness?
2. Is this claim specific and verifiable in principle, or is it vague/unsubstantiated?
3. Does this claim pose risk in a legal/financial/compliance context?
4. Could this claim lead to regulatory issues, liability, or misinformation if acted upon?

IMPORTANT GUIDELINES:
- You DO NOT invent specific laws, article numbers, or regulations unless they are widely known
- You reason about RISK CATEGORIES and WHERE HUMAN REVIEW IS REQUIRED
- You are conservative: when in doubt, flag for human review
- You provide actionable guidance for compliance officers and legal teams

SCORING METHODOLOGY:
- Score 80-100 (High Trust): Experts largely agree, claims are well-reasoned, low compliance risk
- Score 50-79 (Medium Trust): Some disagreement or uncertainty, moderate risk, human review recommended
- Score 0-49 (Low Trust): Significant issues identified, potential hallucinations, high compliance risk

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with NO additional text, markdown, or explanation. The JSON must follow this exact structure:

{
  "score": <number 0-100>,
  "label": "<High|Medium|Low>",
  "issues": [
    {
      "snippet": "<short quote of the risky/problematic part from the input>",
      "riskType": "<hallucination|uncertain|compliance-risk>",
      "explanation": "<clear explanation in plain English of why this is flagged>",
      "humanCheckHint": "<specific guidance on what a human reviewer should verify>"
    }
  ],
  "complianceReport": "<4-8 sentence summary suitable for a lawyer/compliance officer>",
  "ndaauditNote": "<2-4 sentences suitable for an audit log or NDA file>"
}

If the input is generally trustworthy with no major issues, still provide at least one minor observation in issues array and appropriate high-trust scores."""


def get_user_prompt(answer_text: str, context_type: str) -> str:
    """Construct the user prompt for Gemini API"""
    context_descriptions = {
        "legal": "Legal / Contract Review - This content may be used for legal decisions, contract analysis, or legal advice",
        "finance": "Financial / Audit / Risk - This content may be used for financial decisions, audit reports, or risk assessments",
        "compliance": "Policy / Regulatory Compliance - This content may be used for regulatory filings, policy decisions, or compliance documentation"
    }
    
    context_desc = context_descriptions.get(context_type, context_descriptions["legal"])
    
    return f"""CONTEXT TYPE: {context_desc}

AI-GENERATED ANSWER TO ANALYZE:
\"\"\"
{answer_text}
\"\"\"

Please analyze this AI-generated answer for trust, accuracy, and compliance risks. Simulate multi-model consensus and output your analysis as a JSON object following the specified format. Remember to output ONLY valid JSON with no additional text."""


def parse_llm_response(response_text: str) -> dict:
    """Robustly parse JSON from LLM response"""
    # Try direct JSON parsing first
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from markdown code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    
    # Try to find JSON object in the text
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass
    
    # Return a fallback response if parsing fails
    return {
        "score": 50,
        "label": "Medium",
        "issues": [{
            "snippet": "Unable to parse AI response",
            "riskType": "uncertain",
            "explanation": "The trust analysis could not be completed properly. Manual review recommended.",
            "humanCheckHint": "Please review the original content manually and re-run the analysis."
        }],
        "complianceReport": "Analysis parsing encountered an issue. The AI-generated content should be reviewed manually by a qualified professional before any decisions are made based on it.",
        "ndaauditNote": "Automated trust analysis incomplete. Manual compliance review required."
    }


def generate_voice_summary(analysis: dict, context_type: str) -> str:
    """Generate a voice-friendly summary of the analysis"""
    score = analysis.get("score", 50)
    label = analysis.get("label", "Medium")
    num_issues = len(analysis.get("issues", []))
    
    if label == "High":
        status = "appears to be trustworthy"
        recommendation = "can likely proceed with standard review"
    elif label == "Medium":
        status = "has some areas of concern"
        recommendation = "should be reviewed by a qualified professional before proceeding"
    else:
        status = "has significant trust and compliance risks"
        recommendation = "should be escalated for thorough human review before any action"
    
    context_names = {
        "legal": "legal",
        "finance": "financial",
        "compliance": "compliance"
    }
    ctx = context_names.get(context_type, "")
    
    return f"Based on multi-model consensus analysis, this {ctx} content {status} with a trust score of {score} out of 100. I identified {num_issues} potential issue{'s' if num_issues != 1 else ''} that {'require' if num_issues != 1 else 'requires'} attention. My recommendation is that this content {recommendation}."


import random
import hashlib

def generate_demo_analysis(answer_text: str, context_type: str) -> dict:
    """Generate a realistic demo analysis based on the input text"""
    # Use hash of input to generate consistent but varied results
    text_hash = int(hashlib.md5(answer_text.encode()).hexdigest()[:8], 16)
    random.seed(text_hash)
    
    # Analyze text characteristics
    text_length = len(answer_text)
    has_numbers = any(c.isdigit() for c in answer_text)
    has_percentages = '%' in answer_text
    has_quotes = '"' in answer_text or "'" in answer_text
    word_count = len(answer_text.split())
    
    # Generate score based on text characteristics
    base_score = random.randint(45, 85)
    
    # Adjust based on content
    if has_numbers and has_percentages:
        base_score -= random.randint(5, 15)  # Specific claims need verification
    if text_length > 500:
        base_score -= random.randint(0, 10)  # Longer text = more risk
    if word_count < 20:
        base_score += random.randint(5, 10)  # Short text = less risk
    
    score = max(20, min(95, base_score))
    
    # Determine label
    if score >= 75:
        label = "High"
    elif score >= 50:
        label = "Medium"
    else:
        label = "Low"
    
    # Extract snippets from the text for issues
    words = answer_text.split()
    snippets = []
    if len(words) > 10:
        start = random.randint(0, min(5, len(words)-5))
        snippets.append(' '.join(words[start:start+random.randint(4, 8)]))
    if len(words) > 20:
        start = random.randint(10, min(15, len(words)-5))
        snippets.append(' '.join(words[start:start+random.randint(4, 8)]))
    if not snippets:
        snippets = [answer_text[:50] + "..." if len(answer_text) > 50 else answer_text]
    
    # Context-specific issue templates
    issue_templates = {
        "legal": [
            {"riskType": "hallucination", "explanation": "This statement references legal principles that require verification against current case law and jurisdiction-specific regulations.", "humanCheckHint": "Verify the legal citation with a qualified attorney and check if it applies to the relevant jurisdiction."},
            {"riskType": "compliance-risk", "explanation": "The language used may create unintended legal obligations or liabilities if taken as formal legal advice.", "humanCheckHint": "Have legal counsel review before using in any binding documents or client communications."},
            {"riskType": "uncertain", "explanation": "The claim lacks specific citations or references that would allow independent verification.", "humanCheckHint": "Request source documentation or legal precedent supporting this assertion."},
        ],
        "finance": [
            {"riskType": "hallucination", "explanation": "Financial figures or projections mentioned require verification against audited financial statements.", "humanCheckHint": "Cross-reference with official financial reports and have a CPA verify the calculations."},
            {"riskType": "compliance-risk", "explanation": "This statement could be interpreted as financial advice, which may trigger regulatory requirements.", "humanCheckHint": "Ensure appropriate disclaimers are included and review with compliance team."},
            {"riskType": "uncertain", "explanation": "Market predictions or financial forecasts inherently carry uncertainty and should not be relied upon without additional analysis.", "humanCheckHint": "Conduct independent market research and consult with financial advisors."},
        ],
        "compliance": [
            {"riskType": "hallucination", "explanation": "References to specific regulations or compliance requirements need verification against current regulatory frameworks.", "humanCheckHint": "Check the current version of referenced regulations and confirm applicability."},
            {"riskType": "compliance-risk", "explanation": "The statement may not fully address all relevant compliance requirements for your industry or jurisdiction.", "humanCheckHint": "Conduct a comprehensive compliance review with your regulatory affairs team."},
            {"riskType": "uncertain", "explanation": "Regulatory interpretations can vary; this guidance may not reflect the position of all relevant regulatory bodies.", "humanCheckHint": "Consult with regulatory counsel to confirm interpretation aligns with agency guidance."},
        ]
    }
    
    templates = issue_templates.get(context_type, issue_templates["legal"])
    
    # Generate issues
    num_issues = 1 if score >= 75 else (2 if score >= 50 else 3)
    issues = []
    for i in range(min(num_issues, len(snippets), len(templates))):
        template = templates[i % len(templates)]
        issues.append({
            "snippet": snippets[i % len(snippets)][:100],
            "riskType": template["riskType"],
            "explanation": template["explanation"],
            "humanCheckHint": template["humanCheckHint"]
        })
    
    # Generate compliance report
    context_names = {"legal": "legal", "finance": "financial", "compliance": "regulatory compliance"}
    ctx_name = context_names.get(context_type, "general")
    
    if label == "High":
        compliance_report = f"Multi-model consensus analysis indicates this {ctx_name} content demonstrates generally acceptable trust levels with a score of {score}/100. The AI-generated response appears well-structured and avoids major red flags. However, standard verification protocols should still be followed before relying on this content for critical decisions. Minor areas flagged for review do not represent significant compliance risks but warrant acknowledgment in audit documentation."
    elif label == "Medium":
        compliance_report = f"Analysis reveals moderate trust concerns in this {ctx_name} content with a consensus score of {score}/100. Several claims require independent verification before the content can be used in official capacity. The multi-model review identified potential areas where the AI may have made assumptions or generalizations that need human expert validation. Recommend escalation to qualified professionals before proceeding."
    else:
        compliance_report = f"ALERT: This {ctx_name} content has received a low trust score of {score}/100 from multi-model consensus analysis. Significant concerns have been identified including potential hallucinations, unverifiable claims, and compliance risks. This content should NOT be used without thorough review by qualified professionals. Immediate escalation to legal/compliance team is recommended."
    
    # Generate NDA audit note
    nda_audit_note = f"VeriCore AI analysis completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}. Context: {context_type.upper()}. Trust Score: {score}/100 ({label} confidence). {len(issues)} issue(s) flagged for review. {'Demo mode - simulated analysis.' if True else 'Production analysis.'}"
    
    return {
        "score": score,
        "label": label,
        "issues": issues,
        "complianceReport": compliance_report,
        "ndaauditNote": nda_audit_note
    }


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "VeriCore AI",
        "version": "1.0.0",
        "mode": "demo" if not os.getenv("GEMINI_API_KEY") else "production"
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_content(request: AnalyzeRequest):
    """
    Analyze AI-generated content for trust, hallucinations, and compliance risks.
    Uses Google Gemini with multi-model consensus simulation, or Demo Mode if no API key.
    """
    # Validate input
    if not request.answerText or len(request.answerText.strip()) < 10:
        raise HTTPException(status_code=400, detail="Answer text must be at least 10 characters")
    
    if request.contextType not in ["legal", "finance", "compliance"]:
        raise HTTPException(status_code=400, detail="Invalid context type. Must be: legal, finance, or compliance")
    
    # Check for API key - use demo mode if not available
    api_key = os.getenv("GEMINI_API_KEY")
    use_demo_mode = not api_key or os.getenv("DEMO_MODE", "").lower() == "true"
    
    try:
        if use_demo_mode:
            # Demo mode - generate realistic mock analysis
            analysis = generate_demo_analysis(request.answerText, request.contextType)
        else:
            # Real API mode
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            full_prompt = f"""{SYSTEM_PROMPT}

{get_user_prompt(request.answerText, request.contextType)}"""
            
            response = model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=2000
                )
            )
            
            llm_response = response.text
            analysis = parse_llm_response(llm_response)
        
        # Generate voice summary if voice mode is enabled
        voice_summary = None
        if request.voiceMode:
            voice_summary = generate_voice_summary(analysis, request.contextType)
        
        # Create timestamp
        timestamp = datetime.now().isoformat()
        
        # Build response
        result = AnalyzeResponse(
            score=analysis.get("score", 50),
            label=analysis.get("label", "Medium"),
            issues=[Issue(**issue) for issue in analysis.get("issues", [])],
            complianceReport=analysis.get("complianceReport", ""),
            ndaauditNote=analysis.get("ndaauditNote", ""),
            voiceSummary=voice_summary,
            timestamp=timestamp
        )
        
        # Store in history (keep last 50)
        history_entry = {
            "timestamp": timestamp,
            "contextType": request.contextType,
            "label": result.label,
            "score": result.score,
            "inputPreview": request.answerText[:40] + "..." if len(request.answerText) > 40 else request.answerText,
            "voiceMode": request.voiceMode
        }
        analysis_history.insert(0, history_entry)
        if len(analysis_history) > 50:
            analysis_history.pop()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/history")
def get_history():
    """Get recent analysis history"""
    return {"history": analysis_history[:10]}


@app.get("/stats")
def get_stats():
    """Get dashboard statistics"""
    if not analysis_history:
        return {
            "checksToday": 0,
            "highRiskPercentage": 0,
            "estimatedFinesAvoided": 0
        }
    
    # Calculate stats from history
    today = datetime.now().date()
    checks_today = sum(
        1 for h in analysis_history 
        if datetime.fromisoformat(h["timestamp"]).date() == today
    )
    
    # Calculate high risk percentage (Low label = high risk)
    total = len(analysis_history)
    high_risk = sum(1 for h in analysis_history if h["label"] == "Low")
    high_risk_percentage = round((high_risk / total) * 100) if total > 0 else 0
    
    # Simulated fines avoided based on risk detection
    # Assume each caught high-risk item saves ~$50k, medium saves ~$10k
    fines_avoided = 0
    for h in analysis_history:
        if h["label"] == "Low":
            fines_avoided += 50000
        elif h["label"] == "Medium":
            fines_avoided += 10000
    
    return {
        "checksToday": checks_today,
        "highRiskPercentage": high_risk_percentage,
        "estimatedFinesAvoided": fines_avoided
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
