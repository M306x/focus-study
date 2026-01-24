import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, Timer, Target, Tag, Settings, X, Clock, 
  TrendingUp, Volume2, BarChart3, Activity, CheckCircle2, Calendar, 
  Award, Zap, ChevronRight, Palette, BellRing, Trash2, Coffee, Brain,
  BookOpen, Download, Upload, FileJson, Flame, BarChart2, ArrowUp, 
  ArrowDown, Sun, Moon 
} from 'lucide-react';

const SOUND_LIBRARY = [
  { id: 'zen', name: 'Taça Tibetan', type: 'sine', frequency: 440, duration: 2.0, detune: -5 },
  { id: 'harp', name: 'Harpa Suave', type: 'sine', frequency: 880, duration: 1.5, detune: 10 },
  { id: 'nature', name: 'Eco da Natureza', type: 'triangle', frequency: 330, duration: 2.5, detune: 2 },
  { id: 'pulse', name: 'Pulso Relaxante', type: 'sine', frequency: 523.25, duration: 1.2, detune: 0 }
];

const COLOR_OPTIONS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#FFFFFF', '#4ADE80', '#A855F7', '#F97316'];
const STORAGE_KEY = 'study_dashboard_data_v1';

export default function App() {
  const [view, setView] = useState('focus');
  const [mode, setMode] = useState('focus'); 
  const [selectedSound, setSelectedSound] = useState(SOUND_LIBRARY[0]);
  const [alarmDuration, setAlarmDuration] = useState(5);
  const [infiniteAlarm, setInfiniteAlarm] = useState(false);
  const [dailyGoalHours, setDailyGoalHours] = useState(7);
  const [theme, setTheme] = useState('dark');
  const [topics, setTopics] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [customTime, setCustomTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [modalType, setModalType] = useState(null); 
  const [editingTopic, setEditingTopic] = useState(null);
  const [tempInputValue, setTempInputValue] = useState("");

  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const alarmPlayingRef = useRef(false);

  // PERSISTÊNCIA
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.topics) setTopics(data.topics);
      if (data.history) setHistory(data.history);
      if (data.dailyGoalHours) setDailyGoalHours(data.dailyGoalHours);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ topics, history, dailyGoalHours }));
  }, [topics, history, dailyGoalHours]);

  const initAudio = () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          handleComplete();
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, endTime]);

  const handleComplete = () => {
    setIsRunning(false);
    setIsAlarmPlaying(true);
    if (mode === 'focus' && activeTopic) {
      const newHistory = [{ id: Date.now(), topicId: activeTopic.id, topicName: activeTopic.name, minutes: customTime, date: new Date().toISOString().split('T')[0], color: activeTopic.color }, ...history];
      setHistory(newHistory);
      setMode('break');
      setTimeLeft(5 * 60);
    } else {
      setMode('focus');
      setTimeLeft(25 * 60);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col h-screen transition-colors duration-500 ${theme === 'light' ? 'bg-[#f8f9fa] text-zinc-900' : 'bg-black text-white'} font-sans overflow-hidden`} onClick={initAudio}>
      <style>{`
        * { font-size: 15px !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme === 'light' ? '#d1d5db' : '#27272a'}; border-radius: 10px; }
        ${theme === 'light' ? `
          .bg-zinc-900 { background-color: #f1f3f5 !important; }
          .border-zinc-900, .border-zinc-800 { border-color: #e9ecef !important; }
          .text-zinc-400, .text-zinc-600, .text-zinc-700 { color: #495057 !important; }
        ` : ''}
      `}</style>

      <header className={`h-20 border-b ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-zinc-900 bg-black'} flex items-center justify-between px-12 shrink-0 z-10`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${theme === 'light' ? 'bg-black text-white' : 'bg-white text-black'} rounded-lg flex items-center justify-center`}><BookOpen size={18} /></div>
          <span className="font-bold tracking-tighter text-lg uppercase">Study</span>
        </div>
        
        <nav className="flex gap-4">
          {['focus', 'labels', 'dashboard'].map(id => (
            <button key={id} onClick={() => setView(id)} className={`px-4 py-2 rounded-xl transition-all ${view === id ? (theme === 'light' ? 'bg-gray-100 text-black' : 'bg-zinc-900 text-white') : 'text-zinc-500'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest">{id}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <Settings size={20} className="text-zinc-500" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
        {view === 'focus' && (
          <div className="flex flex-col items-center">
             <div className="text-[10rem] font-light tracking-tighter mb-8">{formatTime(timeLeft)}</div>
             <button onClick={() => { setEndTime(Date.now() + timeLeft * 1000); setIsRunning(!isRunning); }} className="px-12 py-4 bg-white text-black rounded-full font-bold uppercase">
               {isRunning ? 'Pausar' : 'Começar'}
             </button>
          </div>
        )}
        
        {view === 'labels' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-6">Tópicos</h2>
            {topics.map(t => (
              <div key={t.id} className="p-4 mb-2 bg-zinc-900/50 rounded-xl flex justify-between">
                <span>{t.name}</span>
                <X size={18} onClick={() => setTopics(topics.filter(x => x.id !== t.id))} className="cursor-pointer" />
              </div>
            ))}
            <input 
              className="w-full p-4 bg-zinc-900 rounded-xl mt-4 outline-none" 
              placeholder="Novo tópico..." 
              onKeyDown={e => {
                if(e.key === 'Enter' && e.target.value) {
                  setTopics([...topics, { id: Date.now(), name: e.target.value, color: '#3B82F6' }]);
                  e.target.value = '';
                }
              }}
            />
          </div>
        )}

        {view === 'dashboard' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="p-8 bg-zinc-900/30 rounded-3xl border border-zinc-900">
              <span className="text-xs text-zinc-500 uppercase">Total Estudado</span>
              <div className="text-4xl font-bold mt-2">{(history.reduce((acc, h) => acc + h.minutes, 0) / 60).toFixed(1)}h</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
