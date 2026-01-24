import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, 
  Timer, Target, Tag, Settings, 
  X, TrendingUp, Volume2, 
  BarChart3, Activity, 
  Award, Zap, ChevronRight,
  BellRing, Trash2, Coffee, Brain,
  BookOpen, Download, Upload, FileJson,
  Flame, BarChart2, ArrowUp, ArrowDown,
  Sun, Moon // Adicionado ícones de tema
} from 'lucide-react';

const SOUND_LIBRARY = [
  { id: 'zen', name: 'Taça Tibetana', type: 'sine', frequency: 440, duration: 2.0, detune: -5 },
  { id: 'harp', name: 'Harpa Suave', type: 'sine', frequency: 880, duration: 1.5, detune: 10 },
  { id: 'nature', name: 'Eco da Natureza', type: 'triangle', frequency: 330, duration: 2.5, detune: 2 },
  { id: 'pulse', name: 'Pulso Relaxante', type: 'sine', frequency: 523.25, duration: 1.2, detune: 0 }
];

const COLOR_OPTIONS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#71717a', '#4ADE80', '#A855F7', '#F97316'];

const STORAGE_KEY = 'study_dashboard_data_v1';
const THEME_KEY = 'study_theme_pref';

export default function App() {
  // --- ESTADOS GERAIS ---
  const [view, setView] = useState('focus');
  const [mode, setMode] = useState('focus');
  // Carrega o tema salvo ou usa dark como padrão
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  
  // --- CONFIGURAÇÕES ---
  const [selectedSound, setSelectedSound] = useState(SOUND_LIBRARY[0]);
  const [alarmDuration, setAlarmDuration] = useState(5);
  const [infiniteAlarm, setInfiniteAlarm] = useState(false);
  const [dailyGoalHours, setDailyGoalHours] = useState(7);

  // --- DADOS ---
  const [topics, setTopics] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);

  // --- TIMER ---
  const [customTime, setCustomTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // --- REFS ---
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const fileInputRef = useRef(null);
  const alarmPlayingRef = useRef(false);

  // --- MODAIS / INPUTS ---
  const [modalType, setModalType] = useState(null); 
  const [editingTopic, setEditingTopic] = useState(null);
  const [tempInputValue, setTempInputValue] = useState("");

  // --- HELPER DE ESTILOS (Grok Theme Logic) ---
  // Função auxiliar para classes dinâmicas baseadas no tema
  const getThemeClasses = (type) => {
    const isDark = theme === 'dark';
    switch (type) {
      case 'bg': return isDark ? 'bg-black' : 'bg-white';
      case 'text-primary': return isDark ? 'text-white' : 'text-zinc-900';
      case 'text-secondary': return isDark ? 'text-zinc-400' : 'text-zinc-500';
      case 'card': return isDark ? 'bg-zinc-900/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200';
      case 'card-hover': return isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-zinc-100';
      case 'border': return isDark ? 'border-zinc-800' : 'border-zinc-200';
      case 'input': return isDark ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900';
      case 'button-secondary': return isDark ? 'bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-black';
      case 'modal-bg': return isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl';
      default: return '';
    }
  };

  // --- PERSISTÊNCIA: CARREGAR DADOS ---
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.topics) setTopics(data.topics);
        if (data.history) setHistory(data.history);
        if (data.alarmDuration) setAlarmDuration(data.alarmDuration);
        if (data.infiniteAlarm) setInfiniteAlarm(data.infiniteAlarm);
        if (data.dailyGoalHours) setDailyGoalHours(data.dailyGoalHours);
        if (data.selectedSoundId) {
          const sound = SOUND_LIBRARY.find(s => s.id === data.selectedSoundId);
          if (sound) setSelectedSound(sound);
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      }
    }
  }, []);

  // --- PERSISTÊNCIA: SALVAR DADOS & TEMA ---
  useEffect(() => {
    const dataToSave = {
      topics, history, alarmDuration, infiniteAlarm, dailyGoalHours,
      selectedSoundId: selectedSound.id
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, selectedSound]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // --- RESET SEMANAL ---
  useEffect(() => {
    const updateWeeklyMinutes = () => {
      const now = new Date();
      const startOfCurrentWeek = new Date(now);
      startOfCurrentWeek.setDate(now.getDate() - (now.getDay() + 1) % 7); 
      startOfCurrentWeek.setHours(23, 0, 0, 0); 

      setTopics(prevTopics =>
        prevTopics.map(topic => {
          const weeklyMins = history
            .filter(h => h.topicId === topic.id && new Date(h.date) >= startOfCurrentWeek)
            .reduce((sum, h) => sum + h.minutes, 0);
          return { ...topic, weeklyMinutes: weeklyMins };
        })
      );
    };
    updateWeeklyMinutes();
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getDay() === 6 && now.getHours() === 23 && now.getMinutes() === 0) updateWeeklyMinutes();
    }, 60000); 
    return () => clearInterval(interval);
  }, [history]);

  // --- EXPORTAR/IMPORTAR ---
  const handleExport = () => {
    const dataToExport = {
      topics, history, alarmDuration, infiniteAlarm, dailyGoalHours,
      selectedSoundId: selectedSound.id, exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.topics) setTopics(data.topics);
        if (data.history) setHistory(data.history);
        if (data.alarmDuration) setAlarmDuration(data.alarmDuration);
        if (data.infiniteAlarm) setInfiniteAlarm(data.infiniteAlarm);
        if (data.dailyGoalHours) setDailyGoalHours(data.dailyGoalHours);
      } catch (err) { console.error(err); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  // --- ÁUDIO E TIMER ---
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((endTime - now) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          handleComplete();
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, endTime]);

  const playSound = (soundConfig, duration) => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;
    alarmPlayingRef.current = true;
    let startTime = ctx.currentTime;
    
    const playLoop = (time) => {
      if (!alarmPlayingRef.current || (duration !== 'infinite' && time >= startTime + duration)) {
        alarmPlayingRef.current = false;
        setIsAlarmPlaying(false);
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = soundConfig.type;
      osc.frequency.setValueAtTime(soundConfig.frequency, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + soundConfig.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + soundConfig.duration);
      setTimeout(() => playLoop(ctx.currentTime), (soundConfig.duration * 0.8) * 1000);
    };
    playLoop(startTime);
  };

  const stopAlarm = () => { alarmPlayingRef.current = false; setIsAlarmPlaying(false); };

  const handleComplete = () => {
    setIsRunning(false);
    initAudio();
    setIsAlarmPlaying(true);
    playSound(selectedSound, infiniteAlarm ? 'infinite' : alarmDuration);
    
    if (mode === 'focus' && activeTopic) {
      const spentMin = customTime;
      const today = new Date().toISOString().split('T')[0];
      
      const newTopics = topics.map(t => 
        t.id === activeTopic.id ? { ...t, weeklyMinutes: (t.weeklyMinutes || 0) + spentMin, totalMinutes: (t.totalMinutes || 0) + spentMin } : t
      );
      const newHistoryEntry = {
        id: Date.now(), topicId: activeTopic.id, topicName: activeTopic.name, minutes: spentMin,
        date: today, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), color: activeTopic.color
      };

      setTopics(newTopics);
      setHistory([newHistoryEntry, ...history]);
      setMode('break');
      setCustomTime(5);
      setTimeLeft(5 * 60);
    } else if (mode === 'break') {
      setMode('focus');
      setCustomTime(25);
      setTimeLeft(25 * 60);
    }
  };

  const handlePause = () => {
    if (mode === 'focus' && activeTopic) {
      const spentMin = customTime - Math.floor(timeLeft / 60);
      if (spentMin > 0) {
        const today = new Date().toISOString().split('T')[0];
        const newTopics = topics.map(t => 
          t.id === activeTopic.id ? { ...t, weeklyMinutes: (t.weeklyMinutes || 0) + spentMin, totalMinutes: (t.totalMinutes || 0) + spentMin } : t
        );
        const newHistoryEntry = {
          id: Date.now(), topicId: activeTopic.id, topicName: activeTopic.name, minutes: spentMin,
          date: today, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), color: activeTopic.color
        };
        setTopics(newTopics);
        setHistory([newHistoryEntry, ...history]);
      }
      setCustomTime(Math.floor(timeLeft / 60));
    }
  };

  const resetAllData = () => {
    setTopics([]); setHistory([]); setActiveTopic(null); setTimeLeft(25 * 60); setIsRunning(false); setView('focus');
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hDisplay = h > 0 ? `${h.toString().padStart(2, '0')}:` : "";
    return `${hDisplay}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- ESTATÍSTICAS ---
  const statsByPeriod = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dayMins = history.filter(h => h.date === todayStr).reduce((acc, curr) => acc + curr.minutes, 0);
    const weekMins = history.filter(h => new Date(h.date) >= startOfWeek).reduce((acc, curr) => acc + curr.minutes, 0);
    const monthMins = history.filter(h => new Date(h.date) >= startOfMonth).reduce((acc, curr) => acc + curr.minutes, 0);

    return { day: (dayMins / 60).toFixed(1), week: (weekMins / 60).toFixed(1), month: (monthMins / 60).toFixed(1) };
  }, [history]);

  const calendarData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const mins = history.filter(h => h.date === dateStr).reduce((acc, curr) => acc + curr.minutes, 0);
      days.push({ date: dateStr, minutes: mins });
    }
    return days;
  }, [history]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const goalMins = 30; // Minimo 30 mins para streak contar
    for (let i = calendarData.length - 1; i >= 0; i--) {
      if (calendarData[i].minutes >= goalMins) streak++;
      else break;
    }
    return streak;
  }, [calendarData]);

  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthStr = monthStart.toLocaleString('default', { month: 'short', year: '2-digit' });
      const mins = history.filter(h => {
        const hDate = new Date(h.date);
        return hDate >= monthStart && hDate <= monthEnd;
      }).reduce((acc, curr) => acc + curr.minutes, 0);
      months.push({ month: monthStr, hours: (mins / 60).toFixed(1) });
    }
    return months;
  }, [history]);
  
  const maxMonthlyHours = Math.max(...monthlyData.map(m => m.hours), 1);
  const topicMonthlyData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return topics.map(t => {
      const monthlyMins = history.filter(h => h.topicId === t.id && new Date(h.date) >= startOfMonth).reduce((sum, h) => sum + h.minutes, 0);
      return { ...t, monthlyMinutes: monthlyMins };
    });
  }, [topics, history]);
  const maxTopicMonthlyMins = Math.max(...topicMonthlyData.map(t => t.monthlyMinutes || 0), 1);

  // --- RENDER ---
  return (
    <div 
      className={`flex flex-col h-screen transition-colors duration-500 font-sans overflow-hidden ${getThemeClasses('bg')} ${getThemeClasses('text-secondary')}`} 
      onClick={initAudio}
    >
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#27272a' : '#d4d4d8'}; border-radius: 10px; }
      `}</style>

      {/* HEADER */}
      <header className={`h-20 border-b flex items-center justify-between px-12 shrink-0 z-10 ${theme === 'dark' ? 'border-zinc-900 bg-black' : 'border-zinc-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}>
            <BookOpen size={18} strokeWidth={2.5} />
          </div>
          <span className={`font-bold tracking-tighter text-lg uppercase ${getThemeClasses('text-primary')}`}>Study</span>
        </div>
        
        <nav className="flex gap-4">
          {[
            { id: 'focus', icon: Timer, label: 'FOCUS' },
            { id: 'labels', icon: Tag, label: 'LABELS' },
            { id: 'dashboard', icon: BarChart3, label: 'DASHBOARD' },
            { id: 'goals', icon: Target, label: 'GOALS' },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setView(item.id)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                view === item.id 
                  ? (theme === 'dark' ? 'text-white bg-zinc-900' : 'text-white bg-black')
                  : (theme === 'dark' ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-500 hover:text-black')
              }`}
            >
              <item.icon size={16} strokeWidth={2} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={() => setView('settings')} className={`p-2 rounded-lg transition-colors ${view === 'settings' ? 'text-white bg-zinc-900' : (theme === 'dark' ? 'text-zinc-700 hover:text-zinc-400' : 'text-zinc-400 hover:text-black')}`}>
          <Settings size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 max-w-5xl mx-auto pb-24">
          
          {/* VIEW: FOCUS */}
          {view === 'focus' && (
            <div className="flex flex-col items-center justify-center pt-8">
              <div className={`flex flex-wrap justify-center gap-2 p-1.5 rounded-2xl mb-12 border transition-colors ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-zinc-100 border-zinc-200'}`}>
                {topics.length === 0 ? (
                  <span className="px-4 py-2 text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Nenhum tópico criado</span>
                ) : (
                  topics.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => !isRunning && setActiveTopic(t)} 
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTopic?.id === t.id ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'text-zinc-500 hover:text-zinc-800'}`}
                    >
                      {t.name}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-col items-center">
                <span 
                  className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 transition-colors`}
                  style={{ color: mode === 'break' ? '#10B981' : (activeTopic?.color || (theme === 'dark' ? '#52525b' : '#a1a1aa')) }}
                >
                  {mode === 'break' ? 'Tempo de Descanso' : (activeTopic?.name || 'Selecione um tópico')}
                </span>
                
                <button 
                  onClick={() => { if (!isRunning) { setTempInputValue(customTime.toString()); setModalType('editTime'); } }}
                  className={`text-[10rem] md:text-[12rem] font-light tracking-tighter tabular-nums leading-none cursor-pointer transition-all ${mode === 'break' ? 'text-emerald-500' : getThemeClasses('text-primary')} hover:opacity-80`}
                >
                  {formatTime(timeLeft)}
                </button>

                {!isRunning && (
                  <div className="space-y-4 flex flex-col items-center mt-8">
                    <div className="flex gap-3">
                      {[25, 45, 60, 90, 120].map(m => (
                        <button 
                          key={m} 
                          onClick={() => { setCustomTime(m); setTimeLeft(m * 60); }} 
                          className={`text-[9px] font-black uppercase tracking-widest py-2 px-4 rounded-lg border transition-all ${
                            customTime === m 
                              ? (theme === 'dark' ? 'text-white border-zinc-500 bg-zinc-900' : 'text-white border-black bg-black')
                              : (theme === 'dark' ? 'text-zinc-700 border-zinc-900' : 'text-zinc-400 border-zinc-200 hover:border-zinc-400')
                          }`}
                        >
                          {m >= 60 ? `${m/60}H` : `${m} MIN`}
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => { setMode('focus'); setCustomTime(25); setTimeLeft(25 * 60); }}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] border transition-all ${mode === 'focus' ? (theme === 'dark' ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : 'text-zinc-500 border-transparent hover:border-zinc-500'}`}
                      >
                        <Brain size={14} /> Focus
                      </button>
                      <button 
                        onClick={() => { setMode('break'); setCustomTime(5); setTimeLeft(5 * 60); }}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] border transition-all ${mode === 'break' ? 'bg-emerald-500 text-white border-emerald-500' : 'text-zinc-500 border-transparent hover:border-zinc-500'}`}
                      >
                        <Coffee size={14} /> Break
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-16 flex items-center gap-10">
                <button 
                  disabled={mode === 'focus' && !activeTopic}
                  onClick={() => { 
                    initAudio();
                    if (isRunning) { handlePause(); } else { setEndTime(Date.now() + timeLeft * 1000); }
                    setIsRunning(!isRunning);
                  }} 
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 disabled:grayscale border ${
                    isRunning 
                      ? (theme === 'dark' ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-white text-black border-zinc-200 shadow-sm') 
                      : (mode === 'break' ? 'bg-emerald-500 text-white border-emerald-500' : (theme === 'dark' ? 'bg-white text-black border-white' : 'bg-black text-white border-black'))
                  }`}
                >
                  {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={() => { setIsRunning(false); setTimeLeft(customTime * 60); setEndTime(null); }} className={`p-3 transition-colors ${theme === 'dark' ? 'text-zinc-800 hover:text-white' : 'text-zinc-300 hover:text-black'}`}>
                  <RotateCcw size={24} />
                </button>
              </div>
              {isAlarmPlaying && (
                <button 
                  onClick={stopAlarm}
                  className="mt-8 px-8 py-3 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                >
                  Parar Alarme
                </button>
              )}
            </div>
          )}

          {/* VIEW: LABELS/TÓPICOS */}
          {view === 'labels' && (
             <div className="max-w-xl mx-auto">
               <div className="space-y-3 mb-8">
                 {topics.map(t => (
                   <div key={t.id} className={`flex items-center justify-between p-4 border rounded-2xl group ${getThemeClasses('card')}`}>
                     <div className="flex items-center gap-4">
                       <button 
                         onClick={() => setEditingTopic(t)}
                         className="w-5 h-5 rounded-full ring-2 ring-offset-2 transition-transform hover:scale-110 ring-zinc-300 ring-offset-white dark:ring-zinc-800 dark:ring-offset-black" 
                         style={{ backgroundColor: t.color }} 
                       />
                       <span className={`text-sm font-bold uppercase tracking-wide ${getThemeClasses('text-primary')}`}>{t.name}</span>
                     </div>
                     <button onClick={() => setTopics(topics.filter(x => x.id !== t.id))} className="text-zinc-400 hover:text-red-500 transition-colors">
                       <X size={18} />
                     </button>
                   </div>
                 ))}
               </div>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   placeholder="NOVO TÓPICO..."
                   className={`flex-1 border rounded-xl p-4 outline-none focus:border-zinc-500 text-[10px] font-bold tracking-widest uppercase ${getThemeClasses('input')}`}
                   onKeyDown={(e) => { 
                     if(e.key === 'Enter' && e.target.value) { 
                       const updated = [...topics, { id: Date.now(), name: e.target.value, color: COLOR_OPTIONS[Math.floor(Math.random()*COLOR_OPTIONS.length)], weeklyMinutes: 0, totalMinutes: 0, goalHours: 10, hasGoal: true }];
                       setTopics(updated); 
                       e.target.value = '';
                     }
                   }}
                 />
               </div>
             </div>
          )}

          {/* VIEW: DASHBOARD */}
          {view === 'dashboard' && (
            <div className="space-y-12">
              <div className="flex justify-between items-center">
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`border p-6 rounded-[2rem] flex items-start gap-4 ${getThemeClasses('card')}`}>
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Activity size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className={`flex justify-between items-center border-b pb-0.5 ${getThemeClasses('border')}`}>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">THIS MONTH</span>
                      <span className={`text-[11px] font-bold ${getThemeClasses('text-primary')}`}>{statsByPeriod.month}h</span>
                    </div>
                    <div className={`flex justify-between items-center border-b pb-0.5 ${getThemeClasses('border')}`}>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">THIS WEEK</span>
                      <span className={`text-[11px] font-bold ${getThemeClasses('text-primary')}`}>{statsByPeriod.week}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">TODAY</span>
                      <span className="text-[11px] font-bold text-emerald-500">{statsByPeriod.day}h</span>
                    </div>
                  </div>
                </div>

                <div className={`border p-6 rounded-[2rem] flex items-start gap-4 ${getThemeClasses('card')}`}>
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                    <Flame size={20} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">STREAK</span>
                    <h3 className={`text-4xl font-bold tabular-nums ${getThemeClasses('text-primary')}`}>{currentStreak} </h3>
                  </div>
                </div>
              </div>

              <div className={`border rounded-[2.5rem] p-10 ${getThemeClasses('card')}`}>
                <div className="flex justify-between items-center mb-8">
                  <h3 className={`font-bold text-sm uppercase tracking-widest flex items-center gap-3 ${getThemeClasses('text-primary')}`}>
                    <TrendingUp size={18} className="text-zinc-500" /> CONSISTENCY
                  </h3>
                </div>
                <div className="flex gap-2 justify-center">
                  {calendarData.map((day, i) => {
                    const hasStudy = day.minutes > 0;
                    return (
                      <div 
                        key={i} 
                        title={`${day.date}: ${(day.minutes / 60).toFixed(1)}h`}
                        className="w-4 h-16 rounded-full transition-all hover:scale-y-110"
                        style={{ 
                          backgroundColor: hasStudy ? (day.minutes > 60 ? '#10B981' : `rgba(16, 185, 129, ${0.2 + (day.minutes/60)*0.8})`) : (theme === 'dark' ? '#27272a' : '#f4f4f5'),
                          border: !hasStudy ? '1px dashed' : 'none',
                          borderColor: theme === 'dark' ? '#3f3f46' : '#e4e4e7'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className={`border rounded-[2.5rem] p-10 ${getThemeClasses('card')}`}>
                 <h3 className={`font-bold text-sm uppercase tracking-widest flex items-center gap-3 mb-12 ${getThemeClasses('text-primary')}`}>
                   <BarChart3 size={18} className="text-zinc-500" /> HOURS BY SUBJECT
                 </h3>
                 <div className="flex items-end justify-between h-48 gap-4 px-4">
                  {topics.length === 0 ? (
                    <div className="w-full text-center text-zinc-400 uppercase font-black text-[10px] tracking-[0.5em]">Sem dados</div>
                  ) : (
                    topicMonthlyData.map(t => (
                      <div key={t.id} className="flex-1 flex flex-col items-center group">
                        <div className="relative w-full flex justify-center flex-1">
                           <div className="absolute bottom-0 w-8 rounded-full transition-all duration-1000 group-hover:opacity-80" style={{ height: `${((t.monthlyMinutes||0)/maxTopicMonthlyMins)*100}%`, backgroundColor: t.color }} />
                        </div>
                        <span className="mt-4 text-[8px] font-bold uppercase tracking-tighter text-zinc-500">{t.name}</span>
                      </div>
                    ))
                  )}
                 </div>
              </div>
            </div>
          )}

          {/* VIEW: GOALS */}
          {view === 'goals' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className={`text-2xl font-bold uppercase text-xs tracking-widest mb-8 ${getThemeClasses('text-primary')}`}>WEEKLY GOALS</h2>
              {topics.map(topic => {
                const hoursDone = (topic.weeklyMinutes || 0) / 60;
                const progress = topic.hasGoal ? (hoursDone / topic.goalHours) * 100 : 0;
                return (
                  <div key={topic.id} className={`border rounded-3xl p-8 relative overflow-hidden group ${getThemeClasses('card')}`}>
                    {!topic.hasGoal && <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm">
                      <button onClick={() => setTopics(topics.map(t => t.id === topic.id ? {...t, hasGoal: true} : t))} className="bg-black text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl">Ativar Meta</button>
                    </div>}
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-1">
                        <span className={`font-bold text-lg tracking-tight uppercase ${getThemeClasses('text-primary')}`}>{topic.name}</span>
                        {topic.hasGoal ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" value={topic.goalHours}
                              onChange={(e) => setTopics(topics.map(t => t.id === topic.id ? {...t, goalHours: parseInt(e.target.value) || 0} : t))}
                              className={`border rounded px-2 py-1 text-[11px] w-14 outline-none focus:border-zinc-500 ${getThemeClasses('input')}`}
                            />
                            <span className="text-zinc-500 text-[9px] font-bold uppercase">Meta de Horas</span>
                          </div>
                        ) : <span className="text-zinc-500 text-[9px] font-bold uppercase">Sem Meta</span>}
                      </div>
                      <div className="text-right flex items-start gap-2">
                        {topic.hasGoal && (
                          <button 
                            onClick={() => setTopics(topics.map(t => t.id === topic.id ? {...t, hasGoal: false} : t))}
                            className="text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                        <div>
                          <span className="text-zinc-500 text-[10px] font-bold block mb-1 uppercase tracking-tighter">{hoursDone.toFixed(1)}H FEITO</span>
                          {topic.hasGoal && <span className={`font-bold text-3xl tracking-tighter tabular-nums ${getThemeClasses('text-primary')}`}>{Math.min(progress, 100).toFixed(0)}%</span>}
                        </div>
                      </div>
                    </div>
                    {topic.hasGoal && (
                      <div className={`w-full h-2 rounded-full overflow-hidden border ${theme === 'dark' ? 'bg-black border-zinc-900' : 'bg-zinc-100 border-zinc-200'}`}>
                        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: topic.color }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {view === 'settings' && (
            <div className="max-w-md mx-auto space-y-12">
              <section>
                <h2 className={`font-bold uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2 ${getThemeClasses('text-primary')}`}>
                  <Sun size={16} /> Aparência
                </h2>
                <div className={`p-2 rounded-2xl border grid grid-cols-2 gap-2 ${getThemeClasses('card')}`}>
                   <button 
                     onClick={() => setTheme('light')}
                     className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-white text-black shadow-md border border-zinc-200' : 'text-zinc-400 hover:text-zinc-600'}`}
                   >
                     <Sun size={14} /> Light
                   </button>
                   <button 
                     onClick={() => setTheme('dark')}
                     className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                   >
                     <Moon size={14} /> Dark
                   </button>
                </div>
              </section>

              <section>
                <h2 className={`font-bold uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2 ${getThemeClasses('text-primary')}`}>
                  <FileJson size={16} /> Backup de Dados
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleExport} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${getThemeClasses('button-secondary')} ${getThemeClasses('border')}`}>
                    <Download size={20} /> <span className="text-[10px] font-bold uppercase tracking-widest">Exportar</span>
                  </button>
                  <button onClick={() => fileInputRef.current.click()} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${getThemeClasses('button-secondary')} ${getThemeClasses('border')}`}>
                    <Upload size={20} /> <span className="text-[10px] font-bold uppercase tracking-widest">Importar</span>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                  </button>
                </div>
              </section>

              <section>
                <h2 className={`font-bold uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2 ${getThemeClasses('text-primary')}`}>
                  <Volume2 size={16} /> Som do Alerta
                </h2>
                <div className="grid gap-2">
                  {SOUND_LIBRARY.map(sound => (
                    <button 
                      key={sound.id} onClick={() => { setSelectedSound(sound); playSound(sound, 2); }}
                      className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${selectedSound.id === sound.id ? (theme === 'dark' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-black border-black text-white') : (theme === 'dark' ? 'bg-transparent border-zinc-900 text-zinc-500' : 'bg-transparent border-zinc-200 text-zinc-500')}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">{sound.name}</span>
                      <Volume2 size={14} className={selectedSound.id === sound.id ? "text-white" : "text-zinc-500"} />
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className={`font-bold uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2 ${getThemeClasses('text-primary')}`}>
                  <BellRing size={16} /> Configurações Gerais
                </h2>
                <div className={`p-6 rounded-2xl border flex items-center justify-between mb-4 ${getThemeClasses('card')}`}>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-widest ${getThemeClasses('text-primary')}`}>Tempo do Alarme</span>
                    <span className="text-zinc-500 text-[9px] font-bold uppercase">Segundos</span>
                  </div>
                  <input type="number" value={alarmDuration} onChange={(e) => setAlarmDuration(Math.max(1, parseInt(e.target.value)||1))} className={`border rounded-xl px-4 py-2 w-20 text-center font-bold outline-none ${getThemeClasses('input')}`} />
                </div>
                <div className={`p-6 rounded-2xl border flex items-center justify-between mb-4 ${getThemeClasses('card')}`}>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-widest ${getThemeClasses('text-primary')}`}>Alarme Infinito</span>
                    <span className="text-zinc-500 text-[9px] font-bold uppercase">Tocar até parar manualmente</span>
                  </div>
                  <button 
                    onClick={() => setInfiniteAlarm(!infiniteAlarm)}
                    className={`w-20 h-8 rounded-full flex items-center p-1 transition-all ${infiniteAlarm ? 'bg-emerald-500 justify-end' : 'bg-zinc-500 justify-start'}`}
                  >
                    <div className="w-6 h-6 bg-white rounded-full shadow-md" />
                  </button>
                </div>
                <div className={`p-6 rounded-2xl border flex items-center justify-between ${getThemeClasses('card')}`}>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-widest ${getThemeClasses('text-primary')}`}>Meta Diária</span>
                    <span className="text-zinc-500 text-[9px] font-bold uppercase">Horas</span>
                  </div>
                  <input type="number" value={dailyGoalHours} onChange={(e) => setDailyGoalHours(Math.max(0, parseInt(e.target.value)||0))} className={`border rounded-xl px-4 py-2 w-20 text-center font-bold outline-none ${getThemeClasses('input')}`} />
                </div>
              </section>

              <section className={`pt-12 border-t ${getThemeClasses('border')}`}>
                <button 
                  onClick={() => { if(confirm("Apagar tudo?")) resetAllData(); }}
                  className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors font-bold text-[10px] uppercase tracking-widest"
                >
                  <Trash2 size={16} /> Resetar App
                </button>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* MODAL TEMPO */}
      {modalType === 'editTime' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className={`border p-8 rounded-[2rem] w-full max-w-xs text-center ${getThemeClasses('modal-bg')}`}>
            <h3 className={`font-bold mb-6 uppercase text-[10px] tracking-widest opacity-40 ${getThemeClasses('text-primary')}`}>Definir Minutos</h3>
            <input 
              autoFocus type="number" value={tempInputValue} onChange={(e) => setTempInputValue(e.target.value)}
              className={`w-full border rounded-2xl p-6 mb-6 text-center outline-none font-bold text-5xl tracking-tighter ${getThemeClasses('input')}`}
            />
            <div className="flex gap-3">
              <button onClick={() => setModalType(null)} className="flex-1 py-4 text-zinc-500 font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Sair</button>
              <button onClick={() => { const val = parseInt(tempInputValue); if(!isNaN(val) && val > 0) { setCustomTime(val); setTimeLeft(val * 60); } setModalType(null); }} className={`flex-1 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COR */}
      {editingTopic && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className={`border p-8 rounded-[2rem] w-full max-w-xs ${getThemeClasses('modal-bg')}`}>
            <h3 className={`font-bold mb-6 uppercase text-[10px] tracking-widest text-center opacity-40 ${getThemeClasses('text-primary')}`}>Cor: {editingTopic.name}</h3>
            <div className="grid grid-cols-4 gap-3 mb-8">
              {COLOR_OPTIONS.map(c => (
                <button 
                  key={c} onClick={() => { setTopics(topics.map(t => t.id === editingTopic.id ? {...t, color: c} : t)); setEditingTopic(null); }}
                  className="aspect-square rounded-full border-2 border-transparent hover:scale-125 transition-transform shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button onClick={() => setEditingTopic(null)} className="w-full py-4 text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
