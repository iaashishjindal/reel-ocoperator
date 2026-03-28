'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Play, Square, Loader2, Sparkles, Copy, Check, Instagram } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

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
  const [useTrendingIndia, setUseTrendingIndia] = useState(false);
  const [isGeneratingQA, setIsGeneratingQA] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [caption, setCaption] = useState("");
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'uploading' | 'posting' | 'done' | 'error'>('idle');

  const [usageCost, setUsageCost] = useState(0);
  const [resetDate, setResetDate] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
      
      if (format === 'chatgpt') {
        prompt = `Generate content for a corporate humor Instagram Reel. 
        Direction/Topic: ${customPrompt || "General corporate life"}.
        ${useTrendingIndia ? "CRITICAL: Use Indian corporate cultural nuances, slang, and currently trending topics in India." : ""}
        
        Provide:
        1. topText: A short, catchy top margin text (e.g., "Wait for it...", "Manager logic 🤯").
        2. question: A short, relatable question an employee might ask ChatGPT. Keep it under 10 words and use very easy, everyday language.
        3. answer: A brutally honest, sarcastic, or funny "unfiltered" answer. Keep it very short (1-2 sentences) and use simple, easy-to-understand language so viewers relate instantly.
        4. caption: Exactly 5 best hashtags, separated by spaces. No other text.
        
        Format exactly as JSON:
        {
          "topText": "...",
          "question": "...",
          "answer": "...",
          "caption": "..."
        }`;
      } else {
        prompt = `Generate content for a corporate humor Instagram Reel.
        Direction/Topic: ${customPrompt || "General corporate life"}.
        ${useTrendingIndia ? "CRITICAL: Use Indian corporate cultural nuances and slang." : ""}
        Tone: Cynical, anti-corporate, "deeply internal".
        
        Provide:
        1. topText: A short, catchy top margin text.
        2. term: A corporate buzzword or phrase.
        3. translation: Its cynical, anti-corporate "unfiltered" translation. Keep it short and use easy, simple language.
        4. caption: Exactly 5 best hashtags, separated by spaces. No other text.
        
        Format exactly as JSON:
        {
          "topText": "...",
          "term": "...",
          "translation": "...",
          "caption": "..."
        }`;
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: useTrendingIndia ? [{ googleSearch: {} }] : undefined
        }
      });
      
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
    } catch (error) {
      console.error("Error generating template:", error);
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

  const startRecording = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRecording(true);
    setVideoUrl(null);
    chunksRef.current = [];

    // Set up MediaRecorder for MP4 (or fallback to WebM)
    const stream = canvas.captureStream(60); // 60 FPS
    let options = { mimeType: 'video/mp4;codecs=avc1' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/mp4' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp9' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }
    
    setVideoExt(options.mimeType.includes('mp4') ? 'mp4' : 'webm');
    
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: options.mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsRecording(false);
    };

    mediaRecorder.start();

    // Animation variables
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
  };

  const stopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const postToInstagram = async () => {
    if (!videoUrl) return;
    setIsPosting(true);
    setPostStatus('uploading');
    try {
      // Fetch the blob from the object URL
      const videoRes = await fetch(videoUrl);
      const videoBlob = await videoRes.blob();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('video', videoBlob, `reel-${getFormattedDate()}.mp4`);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = await uploadRes.json();

      // Trigger Make.com → Instagram
      setPostStatus('posting');
      const postRes = await fetch('/api/post-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: url, caption }),
      });
      if (!postRes.ok) throw new Error('Post failed');

      setPostStatus('done');
      setTimeout(() => setPostStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setPostStatus('error');
      setTimeout(() => setPostStatus('idle'), 3000);
    } finally {
      setIsPosting(false);
    }
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
        
        {/* Cost Tracker */}
        <div className="flex items-center justify-between bg-neutral-800/50 p-4 rounded-xl border border-white/5">
          <div>
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Current Month Usage</p>
            <p className="text-2xl font-bold text-emerald-400">₹{usageCost.toFixed(4)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Resets On</p>
            <p className="text-sm font-medium text-neutral-200">{resetDate}</p>
          </div>
        </div>

        {/* Format Selector & Global Generate */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-300">Reel Format</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={useTrendingIndia}
                  onChange={(e) => setUseTrendingIndia(e.target.checked)}
                  disabled={isRecording || isGeneratingQA}
                  className="w-3.5 h-3.5 rounded border-white/10 bg-neutral-950/50 text-indigo-500 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                />
                <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 group-hover:text-indigo-400 transition-colors">Trending 🇮🇳</span>
              </label>
              <input 
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isRecording || isGeneratingQA}
                placeholder="Topic (e.g., toxic boss, appraisals)"
                className="bg-neutral-950/50 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-neutral-100 outline-none w-48 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={generateFullTemplate}
                disabled={isRecording || isGeneratingQA}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-4 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {isGeneratingQA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate Template
              </button>
            </div>
          </div>
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

        <div className="pt-4 flex flex-col sm:flex-row gap-4">
          {!isRecording ? (
            <button 
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-6 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/20"
            >
              <Play className="w-5 h-5" />
              Play & Record
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-xl font-medium transition-colors animate-pulse shadow-lg shadow-red-900/20"
            >
              <Square className="w-5 h-5 fill-current" />
              Stop Recording
            </button>
          )}

          {videoUrl && !isRecording && (
            <>
              <a 
                href={videoUrl}
                download={`${format}_${getFormattedDate()}.${videoExt}`}
                className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-neutral-200 text-black py-3 px-6 rounded-xl font-medium transition-colors shadow-lg shadow-white/5"
              >
                <Download className="w-5 h-5" />
                Download Video (.{videoExt})
              </a>
              <button
                onClick={postToInstagram}
                disabled={!videoUrl || isPosting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-medium rounded-lg text-sm transition-all"
              >
                <Instagram className="w-4 h-4" />
                {postStatus === 'uploading' ? 'Uploading...' :
                 postStatus === 'posting' ? 'Posting...' :
                 postStatus === 'done' ? 'Posted! ✓' :
                 postStatus === 'error' ? 'Failed — retry' :
                 'Post to Instagram'}
              </button>
            </>
          )}
        </div>
        
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
