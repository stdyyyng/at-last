import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types & Constants ---
interface Question {
  id: string;
  text: string;
  category?: string;
}
type AppState = 'Setup' | 'Playing' | 'Finished';

const DEFAULT_QUESTIONS: Question[] = [
  { id: 'q1', text: "오늘 가장 기분 좋았던 순간은?", category: "CONVERSATION" },
  { id: 'q2', text: "만약 내일 지구가 멸망한다면 마지막으로 먹고 싶은 음식은?", category: "IMAGINE" },
  { id: 'q3', text: "옆 사람의 첫인상을 한 단어로 표현한다면?", category: "FRIENDS" },
  { id: 'q4', text: "올해 안에 꼭 이루고 싶은 목표 한 가지는?", category: "GOAL" },
  { id: 'q5', text: "나만 알고 있는 의외의 취향이 있다면?", category: "SECRET" }
];

const generateId = () => Math.random().toString(36).substring(2, 9);
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- AI Service ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const generateAILocalQuestions = async (prompt: string): Promise<Question[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 10 fun, creative party quiz questions about: "${prompt}". Return them in Korean.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["text"]
          }
        }
      }
    });
    const data = JSON.parse(response.text || '[]');
    return data.map((q: any) => ({ ...q, id: generateId() }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

// --- Sub-Components ---

const SetupView: React.FC<{ onStart: (qs: Question[]) => void, initialQuestions: Question[] }> = ({ onStart, initialQuestions }) => {
  const defaultText = initialQuestions.length > 0 ? initialQuestions.map(q => q.text).join('\n') : DEFAULT_QUESTIONS.map(q => q.text).join('\n');
  const [text, setText] = useState(defaultText);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'write' | 'ai'>('write');

  const handleWriteSubmit = () => {
    const qs = text.split('\n').filter(l => l.trim()).map(l => ({ id: generateId(), text: l.trim(), category: "USER" }));
    if (qs.length > 0) onStart(qs);
  };

  const handleAiSubmit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const qs = await generateAILocalQuestions(prompt);
    if (qs.length > 0) onStart(qs);
    setLoading(false);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
        <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-6">
          <button onClick={() => setTab('write')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${tab === 'write' ? 'bg-white text-petronas shadow-sm' : 'text-slate-400'}`}>질문 작성</button>
          <button onClick={() => setTab('ai')} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${tab === 'ai' ? 'bg-white text-petronas shadow-sm' : 'text-slate-400'}`}>AI 추천</button>
        </div>
        {tab === 'write' ? (
          <div className="space-y-4">
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-64 bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none resize-none font-medium text-slate-700" placeholder="질문을 한 줄에 하나씩 적어주세요." />
            <button onClick={handleWriteSubmit} className="w-full bg-petronas text-white py-4 rounded-2xl font-bold shadow-lg shadow-petronas/20 active:scale-95 transition-all">시작하기</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="테마 (예: MBTI 토크, 술자리)" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none" />
            <button onClick={handleAiSubmit} disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all">{loading ? '생성 중...' : 'AI 질문 생성'}</button>
          </div>
        )}
      </div>
    </div>
  );
};

const QuizView: React.FC<{ question: Question, onNext: () => void, isLast: boolean }> = ({ question, onNext, isLast }) => {
  const [animate, setAnimate] = useState(false);
  const handleNext = () => {
    setAnimate(true);
    setTimeout(() => { onNext(); setAnimate(false); }, 300);
  };
  return (
    <div className={`w-full flex flex-col items-center transition-all duration-300 ${animate ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
      <div className="w-full min-h-[380px] bg-white rounded-[3.5rem] card-shadow border border-slate-50 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <span className="bg-petronas-light text-petronas text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-petronas/10">{question.category || 'QUESTION'}</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight break-keep">{question.text}</h2>
      </div>
      <button onClick={handleNext} className="mt-12 w-full bg-petronas text-white py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-petronas/20 active:scale-95 transition-all">{isLast ? '결과 보기' : '다음 질문'}</button>
    </div>
  );
};

const ResultsView: React.FC<{ onRestart: () => void, onNew: () => void }> = ({ onRestart, onNew }) => (
  <div className="w-full text-center space-y-6 animate-in zoom-in duration-500">
    <div className="bg-white rounded-[3rem] p-12 card-shadow border border-slate-50">
      <div className="w-20 h-20 bg-petronas/10 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">✨</div>
      <h2 className="text-2xl font-black mb-10 text-slate-800">퀴즈 완료!</h2>
      <div className="space-y-4">
        <button onClick={onRestart} className="w-full bg-petronas text-white py-4 rounded-2xl font-bold shadow-lg shadow-petronas/20 active:scale-95 transition-all">다시 하기 (셔플)</button>
        <button onClick={onNew} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold active:scale-95 transition-all">새 질문 작성</button>
      </div>
    </div>
  </div>
);

// --- Main App ---
export default function App() {
  const [appState, setAppState] = useState<AppState>('Setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('party_questions');
    if (saved) setQuestions(JSON.parse(saved));
  }, []);

  const handleStart = (newQuestions: Question[]) => {
    const shuffled = shuffleArray(newQuestions);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setAppState('Playing');
    localStorage.setItem('party_questions', JSON.stringify(newQuestions));
  };

  const handleNext = () => currentIndex < questions.length - 1 ? setCurrentIndex(prev => prev + 1) : setAppState('Finished');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center">
      {appState === 'Playing' && (
        <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-100 z-50">
          <div className="h-full bg-petronas transition-all duration-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
      )}
      <main className="w-full max-w-md px-6 py-12 flex-1 flex flex-col">
        <header className="text-center mb-12">
          <h1 className="minecraft-font text-petronas text-xl tracking-tighter">QUESTION</h1>
          <p className="text-[10px] font-black text-slate-300 mt-3 uppercase tracking-[0.2em]">
            {appState === 'Playing' ? `CARD ${currentIndex + 1} / ${questions.length}` : 'Party Mode'}
          </p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          {appState === 'Setup' && <SetupView onStart={handleStart} initialQuestions={questions} />}
          {appState === 'Playing' && <QuizView question={questions[currentIndex]} onNext={handleNext} isLast={currentIndex === questions.length - 1} />}
          {appState === 'Finished' && <ResultsView onRestart={() => { setQuestions(shuffleArray(questions)); setCurrentIndex(0); setAppState('Playing'); }} onNew={() => setAppState('Setup')} />}
        </div>
      </main>
      <footer className="py-8 text-slate-300 text-[9px] font-bold uppercase tracking-[0.3em]">© 2024 Party Quiz Studio</footer>
    </div>
  );
}