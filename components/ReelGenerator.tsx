'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Loader2, Sparkles, Copy, Check, Instagram } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// Baked at build time — use env var set during CI/deploy, fallback to build timestamp
const BUILD_TIMESTAMP = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

const DEFAULT_PERSONA = `Voice: Burned-out Indian corporate employee who has seen everything — IIT grad doing Excel at an MNC, B-school fresher realising "culture fit" means unpaid overtime, IT service engineer on call at 2 AM for a client who doesn't know what UTC is.

Tone: Cynical, viciously accurate, zero-filter. NOT mean — just states the obvious everyone is too scared to say. Punches at systems, not people.

Style rules:
- Hinglish where it hits harder: "bhai", "yaar", "seedha bol", "log kya kahenge", "package", "jugaad", "apna time aayega", "kya scene hai", "CTC vs in-hand", "variable component".
- Specific > Generic: "7 LPA fresher" beats "underpaid employee". "Sector 44 Gurgaon startup" beats "startup".
- Use real Indian pain points: EPFO, TDS, notice period, service bonds, appraisal bell curve, Diwali bonus that isn't a bonus.
- Reference the Indian audience's world: UPSC droppers pivoting to product management, "parents mein engineer chahiye tha", Shark Tank India cringe, LinkedIn India hustle bros, MBA from tier-3 college calling themselves "thought leaders".
- 2026 specifics: AI-washing, vibe-coding, layoffs at profitable companies, "agentic workflows" nobody understands, RTO mandates from CEOs who expense WeWork.
- Punchline MUST land at the very end. Setup → escalation → gut-punch.
- Answer/translation under 250 characters. Every word earns its place.`;

const DEFAULT_CATEGORIES = [
  // Appraisal & Salary
  "Bell curve appraisal — entire team performed well but someone has to get a 2",
  "CTC of 12 LPA with 4 LPA variable that has never once been paid in full",
  "Diwali 'bonus' that is exactly one month's salary rebranded as a gift",
  "0% hike email that opens with 'In these challenging times, we are grateful for your resilience'",
  "Offer letter says 8 LPA, in-hand is 47K — the magic of PF, gratuity, and 'flexi basket'",

  // Toxic work culture
  "Manager pings at 11 PM and adds 'no urgency, reply whenever' — it is urgent",
  "Friday 5:30 PM 'quick sync' that is a 2-hour product roadmap review",
  "Ownership mindset — company slang for doing your manager's job for free",
  "Service bond of 2 years for a 3-day training that was a PowerPoint from 2019",
  "Notice period negotiation: HR says 90 days, you say 30, you leave in 45 and everyone pretends it was planned",

  // Startup & Founder cringe
  "Bootstrapped founder on Shark Tank asking for 1 crore for 0.5% equity — the math is intentional",
  "Series A startup with a Chief Happiness Officer and no health insurance",
  "Founder LinkedIn post: 'Rejected 100 times, today we hit 1000 users' — users are his cousins",
  "Equity ESOP pool that vests in 4 years at a company that pivots every 6 months",
  "Startup calling 60-hour weeks 'founder mentality' in the JD for a 3 LPA internship",

  // Indian office specifics
  "Coffee Badging — swipe in, photograph the office for LinkedIn, WFH by 10 AM",
  "IT service company billing 40 USD per hour to the client, paying the developer 6 LPA",
  "EPFO claim rejected for the 4th time for a document nobody told you was needed",
  "Cab policy changed: now reimbursable only after 9 PM, meeting ends at 8:58 PM",
  "Team outing to celebrate a product launch that was 6 months late and half the features were cut",

  // AI & Tech satire
  "AI-Washing — product manager added 'GenAI-powered' to the Jira ticket description",
  "Vibe-coding — the junior dev used ChatGPT to write the bug and ChatGPT to fix the bug",
  "Company deployed 14 AI tools this quarter, the intern still does the PDF formatting",
  "Agentic workflow demo that is just a Python script with three if-else conditions",
  "RTO mandate email written entirely by AI, sent by a CEO who has not been to office since 2021",

  // LinkedIn & Hustle culture
  "LinkedIn post: '6 months ago I had nothing. Today our ARR is 12 lakhs.' That is a salary.",
  "Thought leader with 200K followers and a Substack who has never shipped a product",
  "Hustle porn bro selling a productivity course while his startup is on life support",
  "IIT IIM tag on LinkedIn bio of someone who left in semester 3 — still counts apparently",
  "Networking event where everyone is selling something to everyone else who is also selling something",

  // Layoffs & job market
  "Company announces record profits and 300 layoffs in the same investor update",
  "PIP letter delivered on a Friday before a long weekend — HR classic",
  "Laid off with 'restructuring due to macroeconomic headwinds' after working unpaid overtime for a year",
  "Job posting: 5 years experience in a tool that is 3 years old, salary 4-6 LPA",
  "Returning from maternity leave to find your project was given to someone else while you were 'away'",

  // WFH vs RTO
  "Return to office for 'collaboration and culture' — open floor plan, no assigned desks, 100 people on calls",
  "Hybrid policy: 3 days in office, all meetings still on Zoom because everyone is in different cities",
  "Productivity monitoring software installed on WFH laptops — tracks keystrokes, not outcomes",
  "Office move to a cheaper suburb framed as 'exciting new campus with modern amenities'",

  // HR & corporate language
  "HR saying 'we are a family' — families do not have NDAs and performance improvement plans",
  "Diversity and inclusion initiative launched the same week as a hiring freeze for junior roles",
  "Annual engagement survey results: 'Employees feel heard.' No changes made. See you next year.",
  "Culture deck with 12 slides on values, zero slides on leave policy or salary bands",
];

export default function ReelGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<'chatgpt' | 'translator'>('chatgpt');
  const [question, setQuestion] = useState("How do I tell my manager AI can't do everything?");
  const [answer, setAnswer] = useState("Tell him the AI is hallucinating a world where he is competent...");
  const [term, setTerm] = useState("Circle Back");
  const [translation, setTranslation] = useState("I am hoping you forget this conversation ever happened before our next 1:1.");
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoExt, setVideoExt] = useState<string>('mp4');
  
  const [topText, setTopText] = useState("Wait for the end... 🤯");
  const [topTextFont, setTopTextFont] = useState("Arial");
  const [topTextColor, setTopTextColor] = useState("#FFFFFF");
  const [topTextSize, setTopTextSize] = useState(70);

  const [customPrompt, setCustomPrompt] = useState("");
  const [savedPersona, setSavedPersona] = useState<string>(DEFAULT_PERSONA);
  const [savedCategories, setSavedCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [draftPersona, setDraftPersona] = useState<string>(DEFAULT_PERSONA);
  const [draftCategories, setDraftCategories] = useState<string>(DEFAULT_CATEGORIES.join('\n'));
  const [promptLogicOpen, setPromptLogicOpen] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [isGeneratingQA, setIsGeneratingQA] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [caption, setCaption] = useState("");
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'recording' | 'uploading' | 'posting' | 'publishing' | 'done' | 'error'>('idle');
  const [publishingSecsLeft, setPublishingSecsLeft] = useState(0);
  const publishingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [postLogs, setPostLogs] = useState<string[]>([]);
  const [logsCopied, setLogsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const addLog = (msg: string) => {
    const ts = new Date().toISOString().split('T')[1].replace('Z', '');
    setPostLogs(prev => [...prev, `[${ts}] ${msg}`]);
  };

  const resetAll = () => {
    if (publishingTimerRef.current) clearInterval(publishingTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    try { audioSourceRef.current?.stop(); } catch (_) {}
    try { audioContextRef.current?.close(); } catch (_) {}
    audioSourceRef.current = null;
    audioContextRef.current = null;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setVideoUrl(null);
    setPostStatus('idle');
    setPostError(null);
    setPostLogs([]);
    setIsPosting(false);
    setPublishingSecsLeft(0);
    setIsRecording(false);
    setIsDownloading(false);
    setIsScheduled(false);
    setScheduledAt('');
  };

  const [usageCost, setUsageCost] = useState(0);
  const [resetDate, setResetDate] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Load saved prompt logic from localStorage on mount
  useEffect(() => {
    const p = localStorage.getItem('reel_persona');
    const c = localStorage.getItem('reel_categories');
    if (p) { setSavedPersona(p); setDraftPersona(p); }
    if (c) { const arr = JSON.parse(c); setSavedCategories(arr); setDraftCategories(arr.join('\n')); }
  }, []);

  // Pre-load the audio file on mount
  useEffect(() => {
    const loadAudio = async () => {
      try {
        const ctx = new AudioContext();
        const response = await fetch('/clash.mp3');
        const arrayBuffer = await response.arrayBuffer();
        audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
        await ctx.close();
      } catch (e) {
        console.warn('Audio pre-load failed:', e);
      }
    };
    loadAudio();
  }, []);
  const animationFrameRef = useRef<number | null>(null);

  const msPerWord = 150;
  const preSendPause = 500;
  const slideTime = 700;
  const preAnswerPause = 500;

  const calculateCost = (usage: { inputTokens: number, outputTokens: number }) => {
    // gemini-3-flash-preview pricing (approximate)
    // Input: $0.075 / 1M tokens -> ~₹6.23 / 1M tokens
    // Output: $0.30 / 1M tokens -> ~₹24.90 / 1M tokens
    const INR_PER_1M_INPUT = 6.23;
    const INR_PER_1M_OUTPUT = 24.90;

    const cost = (usage.inputTokens / 1000000) * INR_PER_1M_INPUT + 
                 (usage.outputTokens / 1000000) * INR_PER_1M_OUTPUT;
    setUsageCost(cost);
  };

  const updateUsage = (usageMetadata: any) => {
    if (!usageMetadata) return;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const storageKey = `gemini_usage_${currentMonth}`;
    
    let currentUsage = { inputTokens: 0, outputTokens: 0 };
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) currentUsage = JSON.parse(stored);
    } catch (e) {}

    currentUsage.inputTokens += usageMetadata.promptTokenCount || 0;
    currentUsage.outputTokens += usageMetadata.candidatesTokenCount || 0;

    localStorage.setItem(storageKey, JSON.stringify(currentUsage));
    calculateCost(currentUsage);
  };

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const storageKey = `gemini_usage_${currentMonth}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        calculateCost(JSON.parse(stored));
      }
    } catch (e) {}

    // Calculate reset date (1st of next month)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setResetDate(nextMonth.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
  }, []);

  const getFormattedDate = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  const generateFullTemplate = async () => {
    setIsGeneratingQA(true);
    setIsGeneratingAnswer(true);
    setIsGeneratingCaption(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      let prompt = "";
      
      const randomCategory = savedCategories[Math.floor(Math.random() * savedCategories.length)];

      const topicLine = customPrompt
        ? `STEERING PROMPT: "${customPrompt}" — use this to shape the angle, tone, or subject. Be specific and creative with it.`
        : `TOPIC (auto-selected): "${randomCategory}" — make it feel fresh and specific, not generic.`;

      const PERSONA = `You are the engine behind "GPT Unfiltered" (@corporategpt_unfilter) — a viral Indian Instagram account doing brutal, cynical satire on corporate life, tech, AI, and marketing.\n\n${savedPersona}`;

      if (format === 'chatgpt') {
        prompt = `${PERSONA}

${topicLine}

Generate a ChatGPT Q&A format reel for an Indian audience.

WHAT MAKES A GREAT ONE — study these examples carefully and match their quality:

EXAMPLE 1:
{"topText":"Package vs In-Hand 😭","question":"How do I explain to my parents that 12 LPA is ₹68K in-hand?","answer":"You don't. Let them think you're rich. It's the only bonus this company will ever give you.","caption":"Tag someone whose offer letter and salary slip tell two completely different stories. 😭\n\n#indiancorporate #9to5india #officememes #salarytalk #corporatelife"}

EXAMPLE 2:
{"topText":"Bell Curve Math 📉","question":"My whole team hit targets but I got a 2 in appraisal. What happened?","answer":"Statistically, someone had to fail. Congratulations — you are the sacrifice. Bell curve is not about performance. It's about math.","caption":"The appraisal system was never about your performance. It was about filling a quota. 🤡\n\n#indiancorporate #appraisalseason #officememes #9to5india #corporatelife"}

EXAMPLE 3:
{"topText":"Service Bond Reality 📝","question":"Is a 2-year service bond after 3 days of training legally enforceable?","answer":"Technically no. But your F&F takes 6 months and they hold your relieving letter hostage. Same result, different paperwork.","caption":"They don't need the bond to be legal. They just need your next employer to be waiting. 💀\n\n#indiancorporate #servicebond #officememes #9to5india #corporatelife"}

EXAMPLE 4:
{"topText":"Layoff Season Logic 🤡","question":"Company had record profits this quarter. Why are we getting laid off?","answer":"Because record profits require maintaining margins. You are the margin.","caption":"Record profits. Record layoffs. At some point you have to ask who the company is actually for. 📉\n\n#indiancorporate #layoffs #officememes #9to5india #techlayoffs"}

WHAT SEPARATES THESE FROM GENERIC:
- The question sounds like a real human typed it at 11 PM in despair — specific numbers, specific mechanisms
- The answer names the exact trap (F&F, relieving letter, bell curve math) — not just "this is unfair"
- The punchline reframes everything in one sentence that makes you go "wait, that's exactly right"
- Short setup → escalation → gut-punch. Never explain the joke.
- The caption adds a fresh angle or observation that extends the joke — 1-2 punchy sentences, then a blank line, then up to 5 hashtags.

Now generate one for the given topic. Rules:
- topText: Max 6 words. Specific enough to feel like a personal attack on every Indian corporate employee.
- question: Under 12 words. Plain desperate human language, not corporate speak.
- answer: Under 250 characters. Name the specific mechanism. Punchline last.
- caption: 1-2 punchy sentences that extend the joke or call out the audience (e.g. "Tag someone who...", "Save this for appraisal season.", a sharp observation). Then a blank line. Then up to 5 hashtags space-separated. Total caption under 300 characters.

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "topText": "...",
  "question": "...",
  "answer": "...",
  "caption": "..."
}`;
      } else {
        prompt = `${PERSONA}

${topicLine}

Generate a Corporate Translator format reel for an Indian audience.

WHAT MAKES A GREAT ONE — study these examples carefully and match their quality:

EXAMPLE 1:
{"topText":"CTC Translator 💀","term":"Your CTC includes a strong variable component","translation":"40% of your salary is imaginary. We'll explain why you didn't qualify in March, after the appraisal cycle you had zero input on.","caption":"They call it 'variable' because it varies between 'maybe' and 'absolutely not'. Save this for offer letter season. 💀\n\n#indiancorporate #ctcvsinhand #officememes #9to5india #appraisalseason"}

EXAMPLE 2:
{"topText":"Startup Founder Speak 🤡","term":"We're looking for someone with an ownership mindset","translation":"We want you to care about this like it's your company. It is not your company. There is no equity. The founder's car is expensed to the company.","caption":"Tag the founder who said this with a straight face while filing for Series A. 🤡\n\n#indianstartup #startuplife #officememes #9to5india #indiancorporate"}

EXAMPLE 3:
{"topText":"Growth Opportunity Decoded","term":"This is a growth opportunity for you","translation":"We need someone to do this unglamorous work. We cannot pay more. 'Growth opportunity' is the bow we tied around it.","caption":"Every time they can't pay you more, a 'growth opportunity' is born. Tag someone living one right now. 📈\n\n#indiancorporate #officememes #9to5india #corporatelife #hrtranslator"}

EXAMPLE 4:
{"topText":"HR Recognition Layer 🏆","term":"We believe in recognizing talent","translation":"Your hike was 0%. This conversation is the recognition. Frame it if you want.","caption":"The recognition was free. Which is exactly what it was worth. 🏆\n\n#indiancorporate #appraisalseason #officememes #9to5india #corporatelife"}

WHAT SEPARATES THESE FROM GENERIC:
- The term is something every Indian employee has heard and winced at — real, specific, not a made-up buzzword
- The translation names the exact mechanism of the gap (no equity, F&F held hostage, zero-input appraisal) — not just "they're lying"
- The punchline lands like a door closing. One sentence that reframes everything.
- Context → real meaning → gut-punch. Never over-explain.
- The caption adds a fresh angle — 1-2 punchy sentences that call out the audience or extend the joke, then hashtags.

Now generate one for the given topic. Rules:
- topText: Max 6 words. Specific enough to make an Indian office worker stop mid-scroll.
- term: A real phrase Indian employees actually hear. Can be a full sentence.
- translation: Under 250 characters. Name the specific mechanism. Punchline last.
- caption: 1-2 punchy sentences that extend the joke or call out the audience (e.g. "Tag someone who...", a sharp observation, "Save this for..."). Then a blank line. Then up to 5 hashtags space-separated. Total caption under 300 characters.

Respond with ONLY valid JSON — no markdown, no explanation:
{
  "topText": "...",
  "term": "...",
  "translation": "...",
  "caption": "..."
}`;
      }

      // Retry up to 2 times on 503/overload
      let response: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" },
          });
          break;
        } catch (e: any) {
          const msg = e?.message || '';
          if (attempt < 2 && (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand'))) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          throw e;
        }
      }

      if (response.usageMetadata) {
        updateUsage(response.usageMetadata);
      }

      if (response.text) {
        const data = JSON.parse(response.text);
        if (data.topText) setTopText(data.topText);
        if (data.caption) setCaption(data.caption);
        if (format === 'chatgpt') {
          if (data.question) setQuestion(data.question);
          if (data.answer) setAnswer(data.answer);
        } else {
          if (data.term) setTerm(data.term);
          if (data.translation) setTranslation(data.translation);
        }
      }
    } catch (error: any) {
      console.error("Error generating template:", error);
      alert(`Generate failed: ${error?.message || error}`);
    } finally {
      setIsGeneratingQA(false);
      setIsGeneratingAnswer(false);
      setIsGeneratingCaption(false);
    }
  };

  const drawChatGPTFrame = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    qWords: string[],
    aWords: string[],
    tText: string,
    tFont: string,
    tColor: string,
    tSize: number
  ) => {
    const margin = 300;
    const safeHeight = 1920 - (margin * 2);

    // Clear entire canvas with black margins
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1080, 1920);

    // --- Draw Top Text ---
    if (tText) {
      ctx.fillStyle = tColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let currentSize = tSize;
      let lines: string[] = [];
      let lineHeight = currentSize * 1.2;
      
      // Auto-adjust text size to fit within the top margin
      while (currentSize > 20) {
        ctx.font = `bold ${currentSize}px ${tFont}`;
        lines = [];
        const words = tText.split(' ');
        let currentLine = words[0] || '';
        
        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const width = ctx.measureText(currentLine + " " + word).width;
          if (width < 980) { // 50px padding on each side
            currentLine += " " + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        
        lineHeight = currentSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        if (totalHeight < margin - 40) { // 20px padding top/bottom
          break;
        }
        currentSize -= 4; // shrink and try again
      }
      
      const totalHeight = lines.length * lineHeight;
      const startY = (margin - totalHeight) + (lineHeight / 2) - 20;
      
      lines.forEach((line, i) => {
        ctx.fillText(line, 540, startY + (i * lineHeight));
      });
    }

    ctx.save();
    ctx.translate(0, margin);

    // Clear safe area - ChatGPT Light Mode Background
    ctx.fillStyle = '#FFFFFF'; 
    ctx.fillRect(0, 0, 1080, safeHeight);
    
    const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    const getLines = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
      if (!text) return [];
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    // --- Timings ---
    const qTypingTime = qWords.length * msPerWord;
    const t1 = qTypingTime;
    const t2 = t1 + preSendPause;
    const t3 = t2 + slideTime;
    const t4 = t3 + preAnswerPause;

    const inputBoxY = safeHeight - 180;
    const maxBottomY = inputBoxY - 80; // Area above the watermark

    // --- Calculate Layout & Scroll ---
    ctx.font = `45px ${fontFamily}`;
    const qText = qWords.join(' ');
    const userLines = getLines(ctx, qText, 760);
    const lineHeight = 65;
    const textHeight = userLines.length * lineHeight;
    
    let maxLineWidth = 0;
    userLines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });
    
    const paddingX = 45;
    const paddingY = 40;
    const bubbleWidth = maxLineWidth + paddingX * 2;
    const bubbleHeight = textHeight + paddingY * 2 - 20;
    const bubbleX = 1080 - 60 - bubbleWidth;
    
    const finalBubbleY = 200;
    let currentBubbleY = finalBubbleY;
    let showUserBubble = false;

    if (elapsed >= t2 && elapsed < t3) {
      showUserBubble = true;
      const progress = (elapsed - t2) / slideTime;
      // easeOutQuart
      const easeOut = 1 - Math.pow(1 - progress, 4);
      currentBubbleY = inputBoxY - (inputBoxY - finalBubbleY) * easeOut;
    } else if (elapsed >= t3) {
      showUserBubble = true;
      currentBubbleY = finalBubbleY;
    }

    let scrollOffset = 0;
    let aRevealedCount = 0;
    let aText = "";
    let showCursor = false;
    let gptLines: string[] = [];
    const gptStartY = finalBubbleY + bubbleHeight + 80;

    if (elapsed >= t4) {
      const aElapsed = elapsed - t4;
      aRevealedCount = Math.floor(aElapsed / msPerWord);
      if (aRevealedCount > aWords.length) aRevealedCount = aWords.length;
      
      aText = aWords.slice(0, aRevealedCount).join(' ');
      showCursor = aRevealedCount < aWords.length && Math.floor(elapsed / 400) % 2 === 0;
      
      ctx.font = `45px ${fontFamily}`;
      gptLines = getLines(ctx, aText + (showCursor ? ' █' : ''), 820);
      
      const currentBottomY = gptStartY + 45 + (gptLines.length * lineHeight);
      if (currentBottomY > maxBottomY) {
        scrollOffset = currentBottomY - maxBottomY;
      }
    }

    // --- Draw Conversation Area (Clipped) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 150, 1080, maxBottomY - 150);
    ctx.clip();

    // User Bubble
    if (showUserBubble) {
      ctx.fillStyle = '#F4F4F4';
      ctx.beginPath();
      ctx.roundRect(bubbleX, currentBubbleY - scrollOffset, bubbleWidth, bubbleHeight, 40);
      ctx.fill();

      ctx.fillStyle = '#0D0D0D';
      ctx.textAlign = 'left';
      userLines.forEach((line, i) => {
        ctx.fillText(line, bubbleX + paddingX, currentBubbleY - scrollOffset + paddingY + 40 + (i * lineHeight));
      });
    }

    // GPT Answer
    if (elapsed >= t4) {
      // GPT Icon
      ctx.fillStyle = '#10A37F';
      ctx.beginPath();
      ctx.arc(60 + 35, gptStartY - scrollOffset + 35, 35, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner star/spark
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(60 + 35, gptStartY - scrollOffset + 35, 15, 0, Math.PI * 2);
      ctx.fill();

      // GPT Text
      ctx.font = `45px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0D0D0D';
      gptLines.forEach((line, i) => {
        ctx.fillText(line, 160, gptStartY - scrollOffset + 45 + (i * lineHeight));
      });
    }

    ctx.restore(); // End conversation clipping

    // --- Top Bar ---
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1080, 150);
    ctx.fillStyle = '#E5E5E5';
    ctx.fillRect(0, 150, 1080, 2);

    // Hamburger
    ctx.strokeStyle = '#0D0D0D';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(60, 65); ctx.lineTo(100, 65);
    ctx.moveTo(60, 80); ctx.lineTo(100, 80);
    ctx.moveTo(60, 95); ctx.lineTo(100, 95);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#0D0D0D';
    ctx.font = `bold 45px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText('ChatGPT', 140, 95);

    // --- Input Box ---
    let inputText = "";
    
    if (elapsed < t1) {
      const wordsToShow = Math.floor(elapsed / msPerWord);
      inputText = qWords.slice(0, wordsToShow).join(" ");
    } else if (elapsed < t2) {
      inputText = qWords.join(" ");
    }

    ctx.fillStyle = '#F4F4F4';
    ctx.beginPath();
    ctx.roundRect(60, inputBoxY, 960, 120, 60);
    ctx.fill();

    // Plus Icon
    ctx.strokeStyle = '#0D0D0D';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(100, inputBoxY + 60); ctx.lineTo(130, inputBoxY + 60);
    ctx.moveTo(115, inputBoxY + 45); ctx.lineTo(115, inputBoxY + 75);
    ctx.stroke();

    // Input Text
    ctx.font = `40px ${fontFamily}`;
    ctx.fillStyle = inputText ? '#0D0D0D' : '#8E8E8E';
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(150, inputBoxY, 690, 120); // Clip area to prevent overlapping mic/send buttons
    ctx.clip();
    
    const maxTextWidth = 680;
    const textWidth = ctx.measureText(inputText || "Ask anything").width;
    let textX = 160;
    
    // Scroll text to the left if it exceeds the input box width
    if (textWidth > maxTextWidth && inputText) {
      textX = 160 - (textWidth - maxTextWidth);
    }
    
    ctx.fillText(inputText || "Ask anything", textX, inputBoxY + 75);
    ctx.restore();

    // Mic Icon
    ctx.strokeStyle = '#0D0D0D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(860, inputBoxY + 45, 18, 26, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(869, inputBoxY + 60, 18, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(869, inputBoxY + 78); ctx.lineTo(869, inputBoxY + 86);
    ctx.stroke();

    // Send Button
    const sendReady = elapsed >= t1 && elapsed < t2;
    ctx.fillStyle = sendReady ? '#0D0D0D' : '#D1D5DB';
    ctx.beginPath();
    ctx.arc(945, inputBoxY + 60, 45, 0, Math.PI * 2);
    ctx.fill();
    
    // Up Arrow
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(945, inputBoxY + 70); ctx.lineTo(945, inputBoxY + 45);
    ctx.moveTo(930, inputBoxY + 60); ctx.lineTo(945, inputBoxY + 45);
    ctx.lineTo(960, inputBoxY + 60);
    ctx.stroke();

    // --- Watermark ---
    ctx.fillStyle = '#A3A3A3';
    ctx.font = `500 32px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('@corporategpt_unfilter', 540, inputBoxY - 40);

    ctx.restore();
  };

  const drawTranslatorFrame = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    termWords: string[],
    translationWords: string[],
    tText: string,
    tFont: string,
    tColor: string,
    tSize: number
  ) => {
    const margin = 300;
    const safeHeight = 1920 - (margin * 2);

    // Clear entire canvas with black margins
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1080, 1920);

    // --- Draw Top Text ---
    if (tText) {
      ctx.fillStyle = tColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let currentSize = tSize;
      let lines: string[] = [];
      let lineHeight = currentSize * 1.2;
      
      // Auto-adjust text size to fit within the top margin
      while (currentSize > 20) {
        ctx.font = `bold ${currentSize}px ${tFont}`;
        lines = [];
        const words = tText.split(' ');
        let currentLine = words[0] || '';
        
        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const width = ctx.measureText(currentLine + " " + word).width;
          if (width < 980) { // 50px padding on each side
            currentLine += " " + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        
        lineHeight = currentSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        if (totalHeight < margin - 40) { // 20px padding top/bottom
          break;
        }
        currentSize -= 4; // shrink and try again
      }
      
      const totalHeight = lines.length * lineHeight;
      const startY = (margin - totalHeight) + (lineHeight / 2) - 20;
      
      lines.forEach((line, i) => {
        ctx.fillText(line, 540, startY + (i * lineHeight));
      });
    }

    ctx.save();
    ctx.translate(0, margin);

    // Clear safe area - Translator Background
    ctx.fillStyle = '#111827'; // Dark gray
    ctx.fillRect(0, 0, 1080, safeHeight);
    
    const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    const getLines = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
      if (!text) return [];
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    // --- Timings ---
    const tTypingTime = termWords.length * msPerWord;
    const t1 = tTypingTime;
    const t2 = t1 + preSendPause;
    const transTypingTime = translationWords.length * msPerWord;

    // --- Draw Content ---
    let currentTerm = "";
    if (elapsed < t1) {
      const wordsToShow = Math.floor(elapsed / msPerWord);
      currentTerm = termWords.slice(0, wordsToShow).join(" ");
    } else {
      currentTerm = termWords.join(" ");
    }

    let currentTranslation = "";
    if (elapsed >= t2) {
      const transElapsed = elapsed - t2;
      const wordsToShow = Math.floor(transElapsed / msPerWord);
      currentTranslation = translationWords.slice(0, wordsToShow).join(" ");
    }

    // Pre-calculate layout with full text to avoid jumping
    const fullTerm = termWords.join(" ");
    const fullTrans = translationWords.join(" ");

    ctx.font = `bold 80px ${fontFamily}`;
    const fullTermLines = getLines(ctx, fullTerm, 880);
    const termHeight = fullTermLines.length * 90;

    ctx.font = `50px ${fontFamily}`;
    const fullTransLines = getLines(ctx, fullTrans, 880);
    const transHeight = fullTransLines.length * 70;

    const labelHeight = 40;
    const gapAfterLabel = 40;
    const gapBetweenSections = 80;

    const totalContentHeight = labelHeight + gapAfterLabel + termHeight + gapBetweenSections + labelHeight + gapAfterLabel + transHeight;

    const maxAllowedHeight = safeHeight - 200; // Leave 100px top and bottom padding
    let scale = 1;
    if (totalContentHeight > maxAllowedHeight) {
      scale = maxAllowedHeight / totalContentHeight;
    }

    // Center vertically
    const scaledHeight = totalContentHeight * scale;
    const startY = (safeHeight - scaledHeight) / 2;

    ctx.save();
    ctx.translate(100, startY);
    ctx.scale(scale, scale);
    ctx.translate(-100, -startY);

    let currentY = startY;

    // Draw Term Label
    ctx.fillStyle = '#60A5FA'; // Blue-400
    ctx.font = `bold 40px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('TERM', 100, currentY);
    currentY += labelHeight + gapAfterLabel;

    // Draw Term
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 80px ${fontFamily}`;
    ctx.textBaseline = 'top';
    const termLines = getLines(ctx, currentTerm, 880);
    termLines.forEach((line) => {
      ctx.fillText(line, 100, currentY);
      currentY += 90;
    });

    // Move to translation section (use full term height so it doesn't jump while typing)
    currentY = startY + labelHeight + gapAfterLabel + termHeight + gapBetweenSections;

    // Draw Translation Label
    if (elapsed >= t2) {
      ctx.fillStyle = '#F472B6'; // Pink-400
      ctx.font = `bold 40px ${fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.fillText('TRANSLATION', 100, currentY);
      currentY += labelHeight + gapAfterLabel;

      ctx.fillStyle = '#E5E7EB'; // Gray-200
      ctx.font = `50px ${fontFamily}`;
      ctx.textBaseline = 'top';
      const transLines = getLines(ctx, currentTranslation, 880);
      transLines.forEach((line) => {
        ctx.fillText(line, 100, currentY);
        currentY += 70;
      });
    }

    ctx.restore(); // Restore scale

    // --- Watermark ---
    ctx.fillStyle = '#4B5563';
    ctx.font = `500 32px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic'; // Reset baseline for watermark
    ctx.fillText('@corporategpt_unfilter', 540, safeHeight - 80);

    ctx.restore();
  };

  const recordVideo = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!canvasRef.current) { reject(new Error('Canvas not available')); return; }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context not available')); return; }

      setIsRecording(true);
      setVideoUrl(null);
      chunksRef.current = [];

      const stream = canvas.captureStream(60);

      if (audioBufferRef.current) {
        try {
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createBufferSource();
          source.buffer = audioBufferRef.current;
          source.loop = true;
          audioSourceRef.current = source;
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
          source.start(0);
        } catch (e) {
          console.warn('Audio mix failed, recording without audio:', e);
        }
      }

      let options = { mimeType: 'video/mp4;codecs=avc1' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/mp4' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm' };

      setVideoExt(options.mimeType.includes('mp4') ? 'mp4' : 'webm');

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        try { audioSourceRef.current?.stop(); } catch (_) {}
        try { audioContextRef.current?.close(); } catch (_) {}
        audioSourceRef.current = null;
        audioContextRef.current = null;

        const blob = new Blob(chunksRef.current, { type: options.mimeType });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        resolve(url);
      };

      mediaRecorder.start();

      const qWords = format === 'chatgpt' ? question.split(/\s+/).filter(w => w.trim() !== '') : term.split(/\s+/).filter(w => w.trim() !== '');
      const aWords = format === 'chatgpt' ? answer.split(/\s+/).filter(w => w.trim() !== '') : translation.split(/\s+/).filter(w => w.trim() !== '');
      const qTypingTime = qWords.length * msPerWord;
      const aTypingTime = aWords.length * msPerWord;
      const totalDuration = format === 'chatgpt'
        ? qTypingTime + preSendPause + slideTime + preAnswerPause + aTypingTime + 2000
        : qTypingTime + preSendPause + aTypingTime + 2000;

      let startTime: number | null = null;
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        if (format === 'chatgpt') {
          drawChatGPTFrame(ctx, elapsed, qWords, aWords, topText, topTextFont, topTextColor, topTextSize);
        } else {
          drawTranslatorFrame(ctx, elapsed, qWords, aWords, topText, topTextFont, topTextColor, topTextSize);
        }
        if (elapsed < totalDuration) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    });
  };

  const postToInstagram = async (urlToPost: string) => {
    setIsPosting(true);
    setPostStatus('uploading');
    setPostError(null);

    try {
      // Step 1: Fetch blob from object URL
      addLog('STEP 1 — Fetching video blob from canvas recording...');
      const videoRes = await fetch(urlToPost);
      const videoBlob = await videoRes.blob();
      const fileSizeMB = (videoBlob.size / 1024 / 1024).toFixed(2);
      addLog(`✓ Blob fetched — size: ${fileSizeMB}MB, type: ${videoBlob.type}`);

      // Step 2: Upload to Cloudinary
      addLog('STEP 2 — Uploading to Cloudinary...');
      const formData = new FormData();
      formData.append('video', videoBlob, `reel-${getFormattedDate()}.mp4`);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json().catch(() => ({}));
      addLog(`  HTTP ${uploadRes.status} — response: ${JSON.stringify(uploadData)}`);

      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(`[Step 2 — Cloudinary Upload] ${uploadData.error || `HTTP ${uploadRes.status}`}`);
      }
      addLog(`✓ Uploaded — url: ${uploadData.url}`);
      addLog(`  Format: ${uploadData.format}, Size on Cloudinary: ${uploadData.cloudinaryBytes ? (uploadData.cloudinaryBytes/1024/1024).toFixed(2)+'MB' : 'unknown'}, Duration: ${uploadData.durationMs}ms`);

      // Step 3: Send to Make.com → Instagram
      setPostStatus('posting');
      addLog('STEP 3 — Sending to Make.com webhook → Instagram...');
      const scheduledAtISO = isScheduled && scheduledAt ? `${scheduledAt}:00+05:30` : null;
      addLog(`  Payload: { videoUrl: "${uploadData.url}", caption: "${caption?.slice(0,60)}${caption?.length > 60 ? '...' : ''}"${scheduledAtISO ? `, scheduled_at: "${scheduledAtISO}"` : ''} }`);

      const postBody: Record<string, string> = { videoUrl: uploadData.url, caption };
      if (scheduledAtISO) postBody.scheduled_at = scheduledAtISO;

      const postRes = await fetch('/api/post-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody),
      });
      const postData = await postRes.json().catch(() => ({}));
      addLog(`  HTTP ${postRes.status} — Make.com status: ${postData.makeStatus}, body: "${postData.makeBody}", duration: ${postData.durationMs}ms`);

      if (!postRes.ok) {
        throw new Error(`[Step 3 — Make.com] ${postData.error || `HTTP ${postRes.status}`} — Make body: "${postData.makeBody}"`);
      }

      addLog('✓ Make.com accepted the request — handing off to Instagram...');
      setPostError(null);

      if (isScheduled && scheduledAt) {
        addLog(`✓ Scheduled for ${scheduledAt.replace('T', ' ')} IST — Make.com will post at that time`);
        setPostStatus('done');
      } else {
        addLog('Publishing to Instagram (this takes 30–90 seconds)...');
        // Start publishing countdown
        const PUBLISH_SECS = 75;
        setPublishingSecsLeft(PUBLISH_SECS);
        setPostStatus('publishing');

        let secsLeft = PUBLISH_SECS;
        publishingTimerRef.current = setInterval(() => {
          secsLeft -= 1;
          setPublishingSecsLeft(secsLeft);
          if (secsLeft <= 0) {
            if (publishingTimerRef.current) clearInterval(publishingTimerRef.current);
            addLog('✓ Publishing window complete — check Instagram now');
            setPostStatus('done');
          }
        }, 1000);
      }
    } catch (e: any) {
      console.error(e);
      if (publishingTimerRef.current) clearInterval(publishingTimerRef.current);
      setPostStatus('error');
      setPostError(e?.message || 'Unknown error — check logs below');
      addLog(`✗ ERROR: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpload = async () => {
    setPostError(null);
    setPostLogs([]);
    let url = videoUrl;
    if (!url) {
      setPostStatus('recording');
      addLog('STEP 0 — Recording animation...');
      try {
        url = await recordVideo();
        addLog('✓ Recording complete');
      } catch (e: any) {
        setPostStatus('error');
        setPostError('Recording failed: ' + (e?.message || 'Unknown error'));
        addLog(`✗ Recording failed: ${e?.message || 'Unknown error'}`);
        return;
      }
    }
    await postToInstagram(url);
  };

  const handleDownload = async () => {
    let url = videoUrl;
    if (!url) {
      setIsDownloading(true);
      try {
        url = await recordVideo();
      } catch (_) {
        setIsDownloading(false);
        return;
      }
      setIsDownloading(false);
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `${format}_${getFormattedDate()}.${videoExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Draw initial state
  useEffect(() => {
    if (canvasRef.current && !isRecording) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const qWords = format === 'chatgpt' ? question.split(/\s+/).filter(w => w.trim() !== '') : term.split(/\s+/).filter(w => w.trim() !== '');
        const aWords = format === 'chatgpt' ? answer.split(/\s+/).filter(w => w.trim() !== '') : translation.split(/\s+/).filter(w => w.trim() !== '');
        // Draw the fully completed frame
        if (format === 'chatgpt') {
          drawChatGPTFrame(ctx, 999999, qWords, aWords, topText, topTextFont, topTextColor, topTextSize);
        } else {
          drawTranslatorFrame(ctx, 999999, qWords, aWords, topText, topTextFont, topTextColor, topTextSize);
        }
      }
    }
  }, [question, answer, term, translation, format, isRecording, topText, topTextFont, topTextColor, topTextSize]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Controls */}
      <div className="space-y-6 bg-neutral-900/50 p-6 rounded-2xl border border-white/10 shadow-xl">
        
        {/* Format Selector & Generate */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-neutral-300">Reel Format</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('chatgpt')}
              disabled={isRecording}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                format === 'chatgpt'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-white/5'
              }`}
            >
              ChatGPT Smart Answer
            </button>
            <button
              onClick={() => setFormat('translator')}
              disabled={isRecording}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                format === 'translator'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-white/5'
              }`}
            >
              Corporate Translator
            </button>
          </div>

          {/* Prompt + Generate */}
          <div className="flex flex-col gap-2">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isRecording || isGeneratingQA}
              placeholder="Steer the AI — e.g. 'Dhurandhar movie angle', 'toxic appraisal season', 'AI startup with no product'. Leave blank for auto-picked satire."
              rows={3}
              className="w-full bg-neutral-950/50 border border-white/10 rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
            />
            <button
              onClick={generateFullTemplate}
              disabled={isRecording || isGeneratingQA}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {isGeneratingQA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGeneratingQA ? 'Generating...' : 'Generate Template'}
            </button>
          </div>

          {/* Prompt Logic — editable & saveable */}
          <div className="border border-white/5 rounded-xl overflow-hidden">
            <button
              onClick={() => {
                setPromptLogicOpen(o => !o);
                setDraftPersona(savedPersona);
                setDraftCategories(savedCategories.join('\n'));
              }}
              className="w-full flex items-center justify-between px-3 py-2 bg-neutral-900/50 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <span>⚙ Prompt logic (tap to edit &amp; save)</span>
              <span>{promptLogicOpen ? '▲' : '▼'}</span>
            </button>
            {promptLogicOpen && (
              <div className="p-3 bg-neutral-950/70 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Persona / Tone Rules</label>
                  <textarea
                    value={draftPersona}
                    onChange={e => setDraftPersona(e.target.value)}
                    rows={6}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 text-[11px] font-mono text-neutral-300 outline-none resize-y focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Category Pool (one per line — picks randomly when no prompt given)</label>
                  <textarea
                    value={draftCategories}
                    onChange={e => setDraftCategories(e.target.value)}
                    rows={8}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 text-[11px] font-mono text-neutral-300 outline-none resize-y focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const cats = draftCategories.split('\n').map(s => s.trim()).filter(Boolean);
                      setSavedPersona(draftPersona);
                      setSavedCategories(cats);
                      localStorage.setItem('reel_persona', draftPersona);
                      localStorage.setItem('reel_categories', JSON.stringify(cats));
                      setPromptSaved(true);
                      setTimeout(() => setPromptSaved(false), 2000);
                    }}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {promptSaved ? '✓ Saved!' : 'Save to browser'}
                  </button>
                  <button
                    onClick={() => {
                      setDraftPersona(DEFAULT_PERSONA);
                      setDraftCategories(DEFAULT_CATEGORIES.join('\n'));
                    }}
                    className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Top Margin Text Controls */}
          <div className="space-y-4 p-4 bg-neutral-800/50 rounded-xl border border-white/5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Top Margin Text</label>
              <textarea 
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                className="w-full h-16 bg-neutral-950/50 border border-white/10 rounded-xl p-3 text-neutral-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all"
                placeholder="E.g., Wait for the end... 🤯"
                disabled={isRecording}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">Font</label>
                <select 
                  value={topTextFont}
                  onChange={(e) => setTopTextFont(e.target.value)}
                  disabled={isRecording}
                  className="w-full bg-neutral-950/50 border border-white/10 rounded-lg p-2 text-sm text-neutral-100 outline-none"
                >
                  <option value="Arial">Arial</option>
                  <option value="Impact">Impact</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier</option>
                  <option value="Comic Sans MS">Comic Sans</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">Color</label>
                <div className="flex items-center gap-2 h-[38px] bg-neutral-950/50 border border-white/10 rounded-lg px-2">
                  <input 
                    type="color" 
                    value={topTextColor}
                    onChange={(e) => setTopTextColor(e.target.value)}
                    disabled={isRecording}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-xs text-neutral-300 uppercase">{topTextColor}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">Size ({topTextSize})</label>
                <div className="h-[38px] flex items-center">
                  <input 
                    type="range" 
                    min="30" max="120" 
                    value={topTextSize}
                    onChange={(e) => setTopTextSize(Number(e.target.value))}
                    disabled={isRecording}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">
                {format === 'chatgpt' ? 'User Question' : 'Corporate Term'}
              </label>
            </div>
            <textarea 
              value={format === 'chatgpt' ? question : term}
              onChange={(e) => format === 'chatgpt' ? setQuestion(e.target.value) : setTerm(e.target.value)}
              className="w-full h-32 bg-neutral-950/50 border border-white/10 rounded-xl p-4 text-neutral-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all"
              placeholder={format === 'chatgpt' ? "Type the user's question here..." : "Type the corporate term here..."}
              disabled={isRecording}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">
                {format === 'chatgpt' ? 'Unfiltered Answer' : 'Unfiltered Translation'}
              </label>
            </div>
            <textarea 
              value={format === 'chatgpt' ? answer : translation}
              onChange={(e) => format === 'chatgpt' ? setAnswer(e.target.value) : setTranslation(e.target.value)}
              className="w-full h-48 bg-neutral-950/50 border border-white/10 rounded-xl p-4 text-neutral-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all"
              placeholder={format === 'chatgpt' ? "Type the unfiltered answer here..." : "Type the unfiltered translation here..."}
              disabled={isRecording}
            />
          </div>
        </div>

        {/* Schedule toggle */}
        <div className="pt-4 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => {
                setIsScheduled(e.target.checked);
                if (e.target.checked && !scheduledAt) {
                  // Default to tomorrow at 10:00 AM IST
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const y = tomorrow.getFullYear();
                  const mo = String(tomorrow.getMonth() + 1).padStart(2, '0');
                  const d = String(tomorrow.getDate()).padStart(2, '0');
                  setScheduledAt(`${y}-${mo}-${d}T10:00`);
                }
              }}
              disabled={isPosting || postStatus === 'publishing'}
              className="w-4 h-4 accent-purple-500 cursor-pointer"
            />
            <span className="text-sm text-neutral-300">Schedule for later</span>
          </label>
          {isScheduled && (
            <div className="flex items-center gap-3">
              <input
                type="datetime-local"
                value={scheduledAt}
                min={(() => {
                  const d = new Date(Date.now() + 10 * 60 * 1000);
                  const y = d.getFullYear();
                  const mo = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const h = String(d.getHours()).padStart(2, '0');
                  const m = String(d.getMinutes()).padStart(2, '0');
                  return `${y}-${mo}-${day}T${h}:${m}`;
                })()}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={isPosting || postStatus === 'publishing'}
                className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <span className="text-xs text-neutral-500">IST (UTC+5:30)</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleDownload}
            disabled={isRecording || isPosting || postStatus === 'publishing'}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-neutral-200 disabled:opacity-50 text-black py-3 px-6 rounded-xl font-medium transition-colors shadow-lg shadow-white/5"
          >
            <Download className="w-5 h-5" />
            {isDownloading ? 'Recording...' : `Download Video (.${videoExt})`}
          </button>

          {postStatus === 'done' ? (
            isScheduled ? (
              <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-700 text-white font-medium rounded-xl text-sm">
                <Instagram className="w-4 h-4" />
                Scheduled ✓ {scheduledAt.replace('T', ' ')} IST
              </div>
            ) : (
              <a
                href="https://www.instagram.com/corporategpt_unfilter/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium rounded-xl text-sm transition-all"
              >
                <Instagram className="w-4 h-4" />
                Check Instagram ↗
              </a>
            )
          ) : (
            <button
              onClick={handleUpload}
              disabled={isRecording || isPosting || postStatus === 'publishing' || (isScheduled && !scheduledAt)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-60 text-white font-medium rounded-xl text-sm transition-all"
            >
              <Instagram className="w-4 h-4" />
              {postStatus === 'recording' ? 'Recording...' :
               postStatus === 'uploading' ? 'Uploading to cloud...' :
               postStatus === 'posting' ? 'Sending to Make.com...' :
               postStatus === 'publishing' ? `Publishing... ${publishingSecsLeft}s` :
               postStatus === 'error' ? 'Failed — retry' :
               isScheduled ? 'Schedule Post' :
               'Upload to Instagram'}
            </button>
          )}

          <button
            onClick={resetAll}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Reset
          </button>
        </div>

        {postError && (
          <div className="mt-3 p-3 bg-red-950 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-xs font-mono font-semibold mb-1">ERROR — screenshot this and share with Aashish</p>
            <p className="text-red-300 text-xs font-mono break-all">{postError}</p>
          </div>
        )}

        {postLogs.length > 0 && (
          <div className="mt-3 bg-neutral-900 border border-white/10 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-xs text-neutral-400 font-mono font-semibold">INSTAGRAM POST LOG</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(postLogs.join('\n'));
                  setLogsCopied(true);
                  setTimeout(() => setLogsCopied(false), 2000);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors font-mono"
              >
                {logsCopied ? '✓ Copied!' : 'Copy all'}
              </button>
            </div>
            <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
              {postLogs.map((log, i) => (
                <p key={i} className={`text-xs font-mono break-all leading-relaxed ${
                  log.includes('✓') ? 'text-emerald-400' :
                  log.includes('✗') || log.includes('ERROR') ? 'text-red-400' :
                  log.startsWith('[') && log.includes('STEP') ? 'text-yellow-400' :
                  'text-neutral-400'
                }`}>{log}</p>
              ))}
            </div>
          </div>
        )}

        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            Recording in progress... Please wait.
          </div>
        )}

        {/* Caption Section */}
        {(caption || isGeneratingCaption) && (
          <div className="mt-6 space-y-2 p-4 bg-neutral-800/50 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">Viral Caption & Hashtags</label>
              {caption && !isGeneratingCaption && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(caption);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            {isGeneratingCaption ? (
              <div className="flex items-center justify-center py-6 text-neutral-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating viral caption...
              </div>
            ) : (
              <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full h-32 bg-neutral-950/50 border border-white/10 rounded-xl p-3 text-sm text-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all"
              />
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="flex flex-col items-center justify-center bg-neutral-900/50 p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="relative w-full max-w-[360px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
          <canvas 
            ref={canvasRef}
            width={1080}
            height={1920}
            className="w-full h-full object-contain"
          />
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full backdrop-blur-md border border-red-500/30">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase">REC</span>
            </div>
          )}
        </div>
        <p className="text-neutral-500 text-sm mt-6 text-center">
          1080x1920 (9:16) Canvas Preview
        </p>
      </div>
    </div>
  );
}
