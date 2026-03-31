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
  Sun, Moon, StopCircle
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
  const [view, setView] = useState('focus');
  const [mode, setMode] = useState('focus'); // 'focus', 'break', 'stopwatch'
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  
  const [selectedSound, setSelectedSound] = useState(SOUND_LIBRARY[0]);
  const [alarmDuration, setAlarmDuration] = useState(5);
  const [infiniteAlarm, setInfiniteAlarm] = useState(false);
  const [dailyGoalHours, setDailyGoalHours] = useState(7);

  const [topics, setTopics] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);

  const [customTime, setCustomTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const fileInputRef = useRef(null);
  const alarmPlayingRef = useRef(false);

  const [modalType, setModalType] = useState(null); 
  const [editingTopic, setEditingTopic] = useState(null);
  const [tempInputValue, setTempInputValue] = useState("");

  const getThemeClasses = (type) => {
    const isDark = theme === 'dark';
    switch (type) {
      case 'bg': return isDark ? 'bg-black' : 'bg-white';
      case 'text-primary': return isDark ? 'text-white' : 'text-zinc-900';
      case 'text-secondary': return isDark ? 'text-zinc-400' : 'text-zinc-500';
      case 'card': return isDark ? 'bg-zinc-900/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200';
      case 'border': return isDark ? 'border-zinc-800' : 'border-zinc-200';
      case 'input': return isDark ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900';
      case 'button-secondary': return isDark ? 'bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-black';
      case 'modal-bg': return isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl';
      default: return '';
    }
  };

  // Persistência
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
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    const dataToSave = { topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, selectedSoundId: selectedSound.id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, selectedSound]);

  useEffect(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);

  // Lógica do Timer / Stopwatch
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (mode === 'stopwatch') {
          setTimeLeft(prev => prev + 1);
        } else {
          const now = Date.now();
          const remaining = Math.max(0, Math.round((endTime - now) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            handleComplete();
          }
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, endTime, mode]);

  const handlePause = () => {
    if ((mode === 'focus' || mode === 'stopwatch') && activeTopic) {
      let spentMin = 0;
      if (mode === 'focus') {
        spentMin = customTime - Math.floor(timeLeft / 60);
      } else {
        spentMin = Math.floor(timeLeft / 60);
        // Não resetamos o timeLeft aqui para permitir continuar o cronômetro se pausar por engano
      }

      if (spentMin > 0) {
        saveProgress(spentMin);
        if (mode === 'focus') setCustomTime(Math.floor(timeLeft / 60));
        if (mode === 'stopwatch') setTimeLeft(timeLeft % 60); // Mantém os segundos "quebrados"
      }
    }
  };

  const saveProgress = (mins) => {
    const today = new Date().toISOString().split('T')[0];
    const newTopics = topics.map(t => t.id === activeTopic.id ? { ...t, weeklyMinutes: (t.weeklyMinutes || 0) + mins, totalMinutes: (t.totalMinutes || 0) + mins } : t);
    const newHistoryEntry = {
      id: Date.now(), topicId: activeTopic.id, topicName: activeTopic.name, minutes: mins,
      date: today, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), color: activeTopic.color
    };
    setTopics(newTopics);
    setHistory([newHistoryEntry, ...history]);
  };

  const handleComplete = () => {
    setIsRunning(false);
    initAudio();
    setIsAlarmPlaying(true);
    playSound(selectedSound, infiniteAlarm ? 'infinite' : alarmDuration);
    
    if (mode === 'focus' && activeTopic) {
      saveProgress(customTime);
      setMode('break');
      setCustomTime(5);
      setTimeLeft(5 * 60);
    } else if (mode === 'break') {
      setMode('focus');
      setCustomTime(25);
      setTimeLeft(25 * 60);
    }
  };

  const initAudio = () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
  };

  const playSound = (soundConfig, duration) => {
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

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Memos do Dashboard
  const statsByPeriod = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
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
      const d = new Date(); d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const mins = history.filter(h => h.date === dateStr).reduce((acc, curr) => acc + curr.minutes, 0);
      days.push({ date: dateStr, minutes: mins });
    }
    return days;
  }, [history]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = calendarData.length - 1; i >= 0; i--) {
      if (calendarData[i].minutes >= 30) streak++; else if(i < calendarData.length -1) break;
    }
    return streak;
  }, [calendarData]);

  return (
    <div className={`flex flex-col h-screen transition-colors duration-500 font-sans overflow-hidden ${getThemeClasses('bg')} ${getThemeClasses('text-secondary')}`} onClick={initAudio}>
      <header className={`h-20 border-b flex items-center justify-between px-12 shrink-0 z-10 ${theme === 'dark' ? 'border-zinc-900 bg-black' : 'border-zinc-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}><BookOpen size={18} strokeWidth={2.5} /></div>
          <span className={`font-bold tracking-tighter text-lg uppercase ${getThemeClasses('text-primary')}`}>Study</span>
        </div>
        <nav className="flex gap-4">
          {[{ id: 'focus', icon: Timer, label: 'FOCUS' }, { id: 'labels', icon: Tag, label: 'LABELS' }, { id: 'dashboard', icon: BarChart3, label: 'DASHBOARD' }, { id: 'goals', icon: Target, label: 'GOALS' }].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${view === item.id ? (theme === 'dark' ? 'text-white bg-zinc-900' : 'text-white bg-black') : (theme === 'dark' ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-500 hover:text-black')}`}>
              <item.icon size={16} strokeWidth={2} /><span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => setView('settings')} className={`p-2 rounded-lg transition-colors ${view === 'settings' ? 'text-white bg-zinc-900' : (theme === 'dark' ? 'text-zinc-700 hover:text-zinc-400' : 'text-zinc-400 hover:text-black')}`}><Settings size={20} /></button>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 max-w-5xl mx-auto pb-24">
          {view === 'focus' && (
            <div className="flex flex-col items-center justify-center pt-8">
              <div className={`flex flex-wrap justify-center gap-2 p-1.5 rounded-2xl mb-12 border transition-colors ${theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-zinc-100 border-zinc-200'}`}>
                {topics.map(t => (
                  <button key={t.id} onClick={() => !isRunning && setActiveTopic(t)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTopic?.id === t.id ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'text-zinc-500 hover:text-zinc-800'}`}>{t.name}</button>
                ))}
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-4" style={{ color: mode === 'break' ? '#10B981' : (mode === 'stopwatch' ? '#3B82F6' : (activeTopic?.color || '#52525b')) }}>
                  {mode === 'break' ? 'Tempo de Descanso' : (mode === 'stopwatch' ? 'Cronômetro' : (activeTopic?.name || 'Selecione um tópico'))}
                </span>
                <div className={`text-[10rem] md:text-[12rem] font-light tracking-tighter tabular-nums leading-none ${mode === 'break' ? 'text-emerald-500' : (mode === 'stopwatch' ? 'text-blue-500' : getThemeClasses('text-primary'))}`}>{formatTime(timeLeft)}</div>

                {!isRunning && (
                  <div className="mt-8 flex flex-col items-center gap-4">
                    {mode === 'focus' && (
                      <div className="flex gap-3">
                        {[25, 45, 60, 90].map(m => (
                          <button key={m} onClick={() => { setCustomTime(m); setTimeLeft(m * 60); }} className={`text-[9px] font-black uppercase py-2 px-4 rounded-lg border ${customTime === m ? (theme === 'dark' ? 'text-white border-zinc-500 bg-zinc-900' : 'text-white border-black bg-black') : (theme === 'dark' ? 'text-zinc-700 border-zinc-900' : 'text-zinc-400 border-zinc-200')}`}>{m} MIN</button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-4">
                      <button onClick={() => { setMode('focus'); setTimeLeft(customTime * 60); }} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${mode === 'focus' ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'text-zinc-500 border-transparent'}`}><Brain size={14} /> Focus</button>
                      <button onClick={() => { setMode('stopwatch'); setTimeLeft(0); }} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${mode === 'stopwatch' ? 'bg-blue-500 text-white border-blue-500' : 'text-zinc-500 border-transparent'}`}><StopCircle size={14} /> Stopwatch</button>
                      <button onClick={() => { setMode('break'); setTimeLeft(5 * 60); }} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${mode === 'break' ? 'bg-emerald-500 text-white border-emerald-500' : 'text-zinc-500 border-transparent'}`}><Coffee size={14} /> Break</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-16 flex items-center gap-10">
                <button 
                  disabled={(mode === 'focus' || mode === 'stopwatch') && !activeTopic}
                  onClick={() => { 
                    initAudio();
                    if (isRunning) { handlePause(); } else { if(mode !== 'stopwatch') setEndTime(Date.now() + timeLeft * 1000); }
                    setIsRunning(!isRunning);
                  }} 
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all border ${isRunning ? (theme === 'dark' ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-white text-black border-zinc-200') : (mode === 'break' ? 'bg-emerald-500 text-white' : (mode === 'stopwatch' ? 'bg-blue-500 text-white' : (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white')))}`}
                >
                  {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={() => { setIsRunning(false); setTimeLeft(mode === 'stopwatch' ? 0 : customTime * 60); }} className={`p-3 ${theme === 'dark' ? 'text-zinc-800 hover:text-white' : 'text-zinc-300 hover:text-black'}`}><RotateCcw size={24} /></button>
              </div>
            </div>
          )}

          {view === 'labels' && (
            <div className="max-w-xl mx-auto space-y-3">
              {topics.map(t => (
                <div key={t.id} className={`flex items-center justify-between p-4 border rounded-2xl ${getThemeClasses('card')}`}>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setEditingTopic(t)} className="w-5 h-5 rounded-full ring-2 ring-offset-2 ring-zinc-300" style={{ backgroundColor: t.color }} />
                    <span className={`text-sm font-bold uppercase ${getThemeClasses('text-primary')}`}>{t.name}</span>
                  </div>
                  <button onClick={() => setTopics(topics.filter(x => x.id !== t.id))} className="text-zinc-400 hover:text-red-500"><X size={18} /></button>
                </div>
              ))}
              <input type="text" placeholder="NOVO TÓPICO..." className={`w-full border rounded-xl p-4 outline-none text-[10px] font-bold tracking-widest uppercase ${getThemeClasses('input')}`} onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value) { setTopics([...topics, { id: Date.now(), name: e.target.value, color: COLOR_OPTIONS[Math.floor(Math.random()*COLOR_OPTIONS.length)], weeklyMinutes: 0, totalMinutes: 0 }]); e.target.value = ''; } }} />
            </div>
          )}

          {view === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`border p-6 rounded-[2rem] flex items-start gap-4 ${getThemeClasses('card')}`}>
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Activity size={20} /></div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-1"><span className="text-[9px] font-bold text-zinc-500 uppercase">ESTE MÊS</span><span className={`text-[11px] font-bold ${getThemeClasses('text-primary')}`}>{statsByPeriod.month}h</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-zinc-500 uppercase">HOJE</span><span className="text-[11px] font-bold text-emerald-500">{statsByPeriod.day}h</span></div>
                  </div>
                </div>
                <div className={`border p-6 rounded-[2rem] flex items-start gap-4 ${getThemeClasses('card')}`}>
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500"><Flame size={20} /></div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase block">STREAK ATUAL</span>
                    <h3 className={`text-4xl font-bold ${getThemeClasses('text-primary')}`}>{currentStreak} DIAS</h3>
                  </div>
                </div>
              </div>
              <div className={`border p-8 rounded-[2.5rem] ${getThemeClasses('card')}`}>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-8 ${getThemeClasses('text-primary')}`}>Histórico Recente</h3>
                <div className="space-y-4">
                  {history.slice(0, 10).map(item => (
                    <div key={item.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-tight ${getThemeClasses('text-primary')}`}>{item.topicName}</p>
                          <p className="text-[9px] font-medium opacity-30">{item.date} • {item.timestamp}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black tabular-nums ${getThemeClasses('text-primary')}`}>{item.minutes}m</span>
                        <button onClick={() => setHistory(history.filter(h => h.id !== item.id))} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'goals' && (
            <div className="grid gap-6">
              {topics.map(t => (
                <div key={t.id} className={`border p-6 rounded-[2rem] ${getThemeClasses('card')}`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${getThemeClasses('text-primary')}`}>{t.name}</span>
                    <span className="text-[10px] font-bold opacity-40">META: {(t.totalMinutes / 60).toFixed(1)}h</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(100, (t.totalMinutes / 600) * 100)}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'settings' && (
            <div className="max-w-xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest">Tema</span>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-3 rounded-xl border ${getThemeClasses('card')}`}>{theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}</button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest">Alarme</span>
                <select className={`p-2 rounded-lg ${getThemeClasses('input')}`} value={selectedSound.id} onChange={(e) => setSelectedSound(SOUND_LIBRARY.find(s => s.id === e.target.value))}>
                  {SOUND_LIBRARY.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={() => { if(confirm("Apagar todos os dados?")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Resetar Aplicativo</button>
            </div>
          )}
        </div>
      </main>

      {/* MODAL EDIÇÃO DE COR */}
      {editingTopic && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`border p-8 rounded-[2rem] w-80 ${getThemeClasses('modal-bg')}`}>
            <h3 className="font-bold mb-6 uppercase text-[10px] text-center opacity-40">Cor: {editingTopic.name}</h3>
            <div className="grid grid-cols-4 gap-3 mb-8">
              {COLOR_OPTIONS.map(c => (
                <button key={c} onClick={() => { setTopics(topics.map(t => t.id === editingTopic.id ? {...t, color: c} : t)); setEditingTopic(null); }} className="aspect-square rounded-full border-2 border-transparent hover:scale-110" style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={() => setEditingTopic(null)} className="w-full py-3 text-[10px] font-bold uppercase opacity-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* AVISO DE ALARME */}
      {isAlarmPlaying && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-white text-black px-8 py-4 rounded-full flex items-center gap-4 shadow-2xl animate-bounce">
          <BellRing className="animate-pulse" />
          <span className="font-black text-[10px] uppercase tracking-tighter">Tempo Esgotado!</span>
          <button onClick={stopAlarm} className="bg-black text-white px-4 py-1 rounded-full text-[9px] font-bold">PARAR</button>
        </div>
      )}
    </div>
  );
}
