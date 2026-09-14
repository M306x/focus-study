import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, 
  Timer, Tag, Settings, 
  X, TrendingUp, Volume2, 
  BarChart3, Activity, 
  BellRing, Trash2, Coffee, Brain,
  BookOpen, Download, Upload, FileJson,
  Flame, Sun, Moon, StopCircle, Save
} from 'lucide-react';

const SOUND_LIBRARY = [
  { id: 'zen', name: 'Tibetan Bowl', type: 'sine', frequency: 440, duration: 2.0, detune: -5 },
  { id: 'harp', name: 'Gentle Harp', type: 'sine', frequency: 880, duration: 1.5, detune: 10 },
  { id: 'nature', name: 'Nature Echo', type: 'triangle', frequency: 330, duration: 2.5, detune: 2 },
  { id: 'pulse', name: 'Relaxing Pulse', type: 'sine', frequency: 523.25, duration: 1.2, detune: 0 },
  { id: 'alert', name: 'Sharp Beep', type: 'square', frequency: 600, duration: 0.5, detune: 0 }
];

const COLOR_OPTIONS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#71717a', '#4ADE80', '#A855F7', '#F97316'];

const DEFAULT_TOPICS = [
  { id: 1, name: 'Lógica de Hoare', color: '#8B5CF6', totalMinutes: 0 },
  { id: 2, name: 'Álgebra Linear', color: '#3B82F6', totalMinutes: 0 },
  { id: 3, name: 'Estatística', color: '#10B981', totalMinutes: 0 },
  { id: 4, name: 'Projeto cbuild', color: '#F59E0B', totalMinutes: 0 },
  { id: 5, name: 'Treino (Ombros/Bíceps)', color: '#EF4444', totalMinutes: 0 }
];

const STORAGE_KEY = 'study_dashboard_data_v2';
const THEME_KEY = 'study_theme_pref';

export default function App() {
  // --- ESTADOS GERAIS ---
  const [view, setView] = useState('focus');
  const [mode, setMode] = useState('focus');
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  
  // --- CONFIGURAÇÕES ---
  const [selectedSound, setSelectedSound] = useState(SOUND_LIBRARY[0]);
  const [alarmDuration, setAlarmDuration] = useState(5);
  const [infiniteAlarm, setInfiniteAlarm] = useState(false);
  const [dailyGoalHours, setDailyGoalHours] = useState(7);
  const [hoursPeriod, setHoursPeriod] = useState('monthly'); 
  const [desktopNotifications, setDesktopNotifications] = useState(false);

  // --- DADOS ---
  const [topics, setTopics] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);

  // --- TIMER ---
  const [customTime, setCustomTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // --- REFS ---
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const fileInputRef = useRef(null);
  const alarmPlayingRef = useRef(false);

  // --- MODAIS ---
  const [modalType, setModalType] = useState(null); 
  const [editingTopic, setEditingTopic] = useState(null);
  const [tempInputValue, setTempInputValue] = useState("");

  // --- CLASSES DE TEMA ---
  const getThemeClasses = useCallback((type) => {
    const isDark = theme === 'dark';
    switch (type) {
      case 'bg': return isDark ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]';
      case 'text-primary': return isDark ? 'text-zinc-100' : 'text-zinc-900';
      case 'text-secondary': return isDark ? 'text-zinc-400' : 'text-zinc-500';
      case 'card': return isDark ? 'bg-zinc-900/40 backdrop-blur-md border-zinc-800/50' : 'bg-white/70 backdrop-blur-md border-zinc-200 shadow-sm';
      case 'border': return isDark ? 'border-zinc-800/50' : 'border-zinc-200';
      case 'input': return isDark ? 'bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-zinc-500';
      case 'button-secondary': return isDark ? 'bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800' : 'bg-zinc-50 text-zinc-600 hover:text-black hover:bg-zinc-100';
      case 'modal-bg': return isDark ? 'bg-zinc-900/95 backdrop-blur-xl border-zinc-800' : 'bg-white/95 backdrop-blur-xl border-zinc-200 shadow-2xl';
      default: return '';
    }
  }, [theme]);

  // --- CARREGAR DADOS ---
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setTopics(data.topics?.length ? data.topics : DEFAULT_TOPICS);
        if (data.history) setHistory(data.history);
        if (data.alarmDuration) setAlarmDuration(data.alarmDuration);
        if (data.infiniteAlarm) setInfiniteAlarm(data.infiniteAlarm);
        if (data.dailyGoalHours) setDailyGoalHours(data.dailyGoalHours);
        if (data.desktopNotifications) setDesktopNotifications(data.desktopNotifications);
        if (data.selectedSoundId) {
          const sound = SOUND_LIBRARY.find(s => s.id === data.selectedSoundId);
          if (sound) setSelectedSound(sound);
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
        setTopics(DEFAULT_TOPICS);
      }
    } else {
      setTopics(DEFAULT_TOPICS);
    }
  }, []);

  // --- SALVAR DADOS ---
  useEffect(() => {
    if (topics.length > 0) {
      const dataToSave = {
        topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, desktopNotifications,
        selectedSoundId: selectedSound.id
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, desktopNotifications, selectedSound]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // --- SINCRONIZAÇÃO DE TÍTULO DA ABA ---
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hDisplay = h > 0 ? `${h.toString().padStart(2, '0')}:` : "";
    return `${hDisplay}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const timeStr = formatTime(timeLeft);
    const modeIcon = mode === 'break' ? '☕' : (mode === 'stopwatch' ? '⏱️' : '🧠');
    const topicName = activeTopic && mode !== 'break' ? ` - ${activeTopic.name}` : '';
    document.title = isRunning ? `${modeIcon} ${timeStr}${topicName}` : 'Productive Dashboard';
  }, [timeLeft, isRunning, mode, activeTopic]);

  // --- ATALHOS DE TECLADO ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      }
      if (e.code === 'Escape' && isRunning) {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // --- EXPORTAR / IMPORTAR ---
  const handleExport = () => {
    const dataToExport = {
      topics, history, alarmDuration, infiniteAlarm, dailyGoalHours,
      selectedSoundId: selectedSound.id, exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productive_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
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
      } catch (err) { console.error(err); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  // --- NOTIFICAÇÕES & ÁUDIO ---
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setDesktopNotifications(permission === "granted");
  };

  const sendNotification = (title, body) => {
    if (desktopNotifications && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    let intervalId;
    if (isRunning) {
      intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (mode === 'stopwatch') return prev + 1;
          if (prev <= 1) {
            clearInterval(intervalId);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      timerRef.current = intervalId;
    }
    return () => clearInterval(intervalId);
  }, [isRunning, mode]);

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
      if (soundConfig.detune) osc.detune.setValueAtTime(soundConfig.detune, time);
      
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

  const stopAlarm = () => { 
    alarmPlayingRef.current = false; 
    setIsAlarmPlaying(false); 
  };

  const logSessionToHistory = (minutesSpent) => {
    if (minutesSpent <= 0 || !activeTopic || mode === 'break') return;
    
    const today = new Date().toISOString().split('T')[0];
    const newTopics = topics.map(t => 
      t.id === activeTopic.id ? { ...t, totalMinutes: (t.totalMinutes || 0) + minutesSpent } : t
    );
    const newHistoryEntry = {
      id: Date.now(), 
      topicId: activeTopic.id, 
      topicName: activeTopic.name, 
      minutes: minutesSpent,
      date: today, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      color: activeTopic.color
    };

    setTopics(newTopics);
    setHistory(prev => [newHistoryEntry, ...prev]);
  };

  const handleComplete = () => {
    setIsRunning(false);
    initAudio();
    setIsAlarmPlaying(true);
    playSound(selectedSound, infiniteAlarm ? 'infinite' : alarmDuration);
    
    if (mode === 'focus') {
      sendNotification("Sessão Concluída!", `Excelente trabalho em ${activeTopic?.name || 'sua tarefa'}. Hora de uma pausa.`);
      logSessionToHistory(customTime);
      setMode('break');
      setCustomTime(5);
      setTimeLeft(5 * 60);
    } else if (mode === 'stopwatch') {
      const minutesSpent = Math.floor(timeLeft / 60);
      sendNotification("Cronômetro Parado", `Você focou por ${minutesSpent} minutos.`);
      logSessionToHistory(minutesSpent);
      setMode('break');
      setCustomTime(5);
      setTimeLeft(5 * 60);
    } else if (mode === 'break') {
      sendNotification("Pausa Finalizada", "Hora de voltar ao foco!");
      setMode('focus');
      setCustomTime(25);
      setTimeLeft(25 * 60);
    }
  };

  const handleSaveAndStop = () => {
    setIsRunning(false);
    if ((mode === 'focus' || mode === 'stopwatch') && activeTopic) {
      const elapsedSeconds = mode === 'focus' ? (customTime * 60) - timeLeft : timeLeft;
      const spentMin = Math.floor(elapsedSeconds / 60);
      
      if (spentMin > 0) {
        logSessionToHistory(spentMin);
      }
    }
    handleReset();
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === 'stopwatch') {
      setTimeLeft(0);
    } else {
      setTimeLeft(customTime * 60);
    }
  };

  const toggleTimer = () => {
    if (mode === 'focus' && !activeTopic) return;
    initAudio();
    setIsRunning(!isRunning);
  };

  const resetAllData = () => {
    setTopics(DEFAULT_TOPICS); 
    setHistory([]); 
    setActiveTopic(null); 
    setTimeLeft(25 * 60); 
    setIsRunning(false); 
    setView('focus');
    localStorage.removeItem(STORAGE_KEY);
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
    const goalMins = 30; // Minutos mínimos para contar como ofensiva
    for (let i = calendarData.length - 1; i >= 0; i--) {
      if (calendarData[i].minutes >= goalMins) streak++;
      else break;
    }
    return streak;
  }, [calendarData]);

  const topicPeriodData = useMemo(() => {
    const now = new Date();
    let startOfPeriod;
    if (hoursPeriod === 'monthly') {
      startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startOfPeriod = new Date(now);
      startOfPeriod.setDate(now.getDate() - now.getDay());
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    return topics.map(t => {
      const periodMins = history.filter(h => h.topicId === t.id && new Date(h.date) >= startOfPeriod).reduce((sum, h) => sum + h.minutes, 0);
      return { ...t, periodMinutes: periodMins };
    }).filter(t => t.periodMinutes > 0);
  }, [topics, history, hoursPeriod]);

  const maxPeriodMins = Math.max(...topicPeriodData.map(t => t.periodMinutes || 0), 1);

  return (
    <div 
      className={`flex flex-col h-screen transition-colors duration-700 font-sans overflow-hidden ${getThemeClasses('bg')} ${getThemeClasses('text-secondary')}`} 
      onClick={initAudio}
    >
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#27272a' : '#e4e4e7'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme === 'dark' ? '#3f3f46' : '#d4d4d8'}; }
      `}</style>

      {/* CABEÇALHO */}
      <header className={`h-20 border-b flex items-center justify-between px-8 md:px-12 shrink-0 z-10 transition-colors duration-500 ${theme === 'dark' ? 'border-zinc-900 bg-black/50 backdrop-blur-md' : 'border-zinc-200 bg-white/80 backdrop-blur-md'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-500 ${theme === 'dark' ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-white'}`}>
            <BookOpen size={18} strokeWidth={2.5} />
          </div>
          <span className={`font-black tracking-tighter text-lg uppercase ${getThemeClasses('text-primary')}`}>PRODUCTIVE</span>
        </div>
        
        <nav className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar">
          {[
            { id: 'focus', icon: Timer, label: 'FOCUS' },
            { id: 'labels', icon: Tag, label: 'TOPICS' },
            { id: 'dashboard', icon: BarChart3, label: 'DASHBOARD' },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setView(item.id)} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                view === item.id 
                  ? (theme === 'dark' ? 'text-zinc-100 bg-zinc-800/80 shadow-sm' : 'text-zinc-900 bg-zinc-200/80 shadow-sm')
                  : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50')
              }`}
            >
              <item.icon size={16} strokeWidth={2} />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={() => setView('settings')} className={`p-2.5 rounded-xl transition-all duration-300 ${view === 'settings' ? (theme === 'dark' ? 'text-white bg-zinc-800/80' : 'text-zinc-900 bg-zinc-200/80') : (theme === 'dark' ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50')}`}>
          <Settings size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* Efeito de Fundo Glow (Sutil) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03] pointer-events-none blur-3xl transition-colors duration-1000"
             style={{ backgroundColor: activeTopic?.color || (theme === 'dark' ? '#ffffff' : '#000000') }} />

        <div className="p-6 md:p-8 max-w-5xl mx-auto pb-24 relative z-10">
          
          {/* FOCUS VIEW */}
          {view === 'focus' && (
            <div className="flex flex-col items-center justify-center pt-4 md:pt-12 min-h-[70vh]">
              <div className={`flex flex-wrap justify-center gap-2 p-2 rounded-2xl mb-12 border transition-colors ${getThemeClasses('card')}`}>
                {topics.length === 0 ? (
                  <span className="px-4 py-2 text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Nenhum tópico criado</span>
                ) : (
                  topics.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => !isRunning && setActiveTopic(t)} 
                      style={activeTopic?.id === t.id ? { backgroundColor: t.color, color: '#fff', borderColor: t.color } : {}}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border border-transparent ${
                        activeTopic?.id === t.id 
                          ? 'shadow-md scale-105' 
                          : (theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50')
                      }`}
                    >
                      {t.name}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-col items-center">
                <span 
                  className={`text-[11px] font-black uppercase tracking-[0.4em] mb-6 transition-colors duration-500 flex items-center gap-2`}
                  style={{ color: mode === 'break' ? '#10B981' : (activeTopic?.color || (theme === 'dark' ? '#52525b' : '#a1a1aa')) }}
                >
                  {mode === 'break' ? '☕ Pausa' : (activeTopic ? `🧠 ${activeTopic.name}` : 'SELECIONE UM TÓPICO')}
                </span>
                
                <button 
                  onClick={() => { if (!isRunning) { setTempInputValue(customTime.toString()); setModalType('editTime'); } }}
                  className={`text-[8rem] sm:text-[10rem] md:text-[13rem] font-light tracking-tighter tabular-nums leading-none cursor-pointer transition-all duration-500 ${mode === 'break' ? 'text-emerald-500 drop-shadow-sm' : getThemeClasses('text-primary')} hover:opacity-70 hover:scale-[1.02]`}
                  style={activeTopic && mode !== 'break' ? { textShadow: `0 10px 40px ${activeTopic.color}20` } : {}}
                >
                  {formatTime(timeLeft)}
                </button>

                {!isRunning && (
                  <div className="space-y-6 flex flex-col items-center mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                      {[15, 25, 45, 60, 90, 120].map(m => (
                        <button 
                          key={m} 
                          onClick={() => { setCustomTime(m); setTimeLeft(m * 60); }} 
                          className={`text-[10px] font-black uppercase tracking-widest py-2.5 px-4 md:px-5 rounded-xl border transition-all duration-300 ${
                            customTime === m 
                              ? (theme === 'dark' ? 'text-zinc-100 border-zinc-600 bg-zinc-800' : 'text-zinc-900 border-zinc-400 bg-zinc-100')
                              : (theme === 'dark' ? 'text-zinc-500 border-zinc-800/80 hover:bg-zinc-900' : 'text-zinc-400 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50')
                          }`}
                        >
                          {m >= 60 ? `${m/60}H` : `${m} MIN`}
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-3 md:gap-4 p-1.5 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                      <button 
                        onClick={() => { setMode('focus'); setCustomTime(25); setTimeLeft(25 * 60); }}
                        className={`flex items-center gap-2 px-6 md:px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'focus' ? (theme === 'dark' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                      >
                        <Brain size={14} /> Foco
                      </button>

                      <button 
                        onClick={() => { setMode('stopwatch'); setTimeLeft(0); }} 
                        className={`flex items-center gap-2 px-6 md:px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'stopwatch' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                      >
                        <StopCircle size={14} /> Cronômetro
                      </button>

                      <button 
                        onClick={() => { setMode('break'); setCustomTime(5); setTimeLeft(5 * 60); }}
                        className={`flex items-center gap-2 px-6 md:px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${mode === 'break' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                      >
                        <Coffee size={14} /> Pausa
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-16 flex items-center justify-center gap-6 md:gap-10">
                <button 
                  disabled={mode === 'focus' && !activeTopic}
                  onClick={toggleTimer} 
                  className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 disabled:opacity-30 disabled:grayscale border-2 shadow-lg ${
                    isRunning 
                      ? (theme === 'dark' ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400') 
                      : (mode === 'break' 
                          ? 'bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400 hover:shadow-emerald-500/20' 
                          : (theme === 'dark' ? 'bg-zinc-100 text-zinc-900 border-zinc-300 hover:bg-white' : 'bg-zinc-900 text-white border-zinc-700 hover:bg-black'))
                  }`}
                >
                  {isRunning ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-2" />}
                </button>
                
                <div className="flex flex-col gap-3">
                  {(isRunning || (mode === 'stopwatch' && timeLeft > 0)) && (
                    <button 
                      onClick={handleSaveAndStop} 
                      title="Salvar progresso e parar"
                      className={`p-3 md:p-4 rounded-full transition-all duration-300 shadow-sm ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700' : 'bg-white text-zinc-600 hover:text-black border border-zinc-200 hover:bg-zinc-50'}`}
                    >
                      <Save size={22} />
                    </button>
                  )}
                  <button 
                    onClick={handleReset} 
                    title="Resetar tempo"
                    className={`p-3 md:p-4 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-zinc-900/50 text-zinc-500 hover:text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-400 hover:text-black hover:bg-zinc-200'}`}
                  >
                    <RotateCcw size={22} />
                  </button>
                </div>
              </div>

              {isAlarmPlaying && (
                <div className="mt-12 animate-bounce">
                  <button 
                    onClick={stopAlarm}
                    className="px-10 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-red-500/30"
                  >
                    Parar Alarme
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TOPICS VIEW */}
          {view === 'labels' && (
             <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pt-6">
               <div className="flex items-center justify-between mb-8">
                 <h2 className={`text-2xl font-black tracking-tight ${getThemeClasses('text-primary')}`}>Gerenciar Tópicos</h2>
                 <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{topics.length} Criados</span>
               </div>
               <div className="space-y-4 mb-10">
                 {topics.map(t => (
                   <div key={t.id} className={`flex items-center justify-between p-5 md:p-6 rounded-2xl group transition-all duration-300 hover:scale-[1.01] ${getThemeClasses('card')}`}>
                     <div className="flex items-center gap-5">
                       <button 
                         onClick={() => setEditingTopic(t)}
                         title="Mudar cor"
                         className="w-6 h-6 rounded-full ring-2 ring-offset-4 transition-transform hover:scale-125 ring-zinc-200 ring-offset-transparent dark:ring-zinc-800" 
                         style={{ backgroundColor: t.color }} 
                       />
                       <div>
                         <span className={`text-sm md:text-base font-bold uppercase tracking-wide block mb-1 ${getThemeClasses('text-primary')}`}>{t.name}</span>
                         <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{(t.totalMinutes / 60).toFixed(1)}H Acumuladas</span>
                       </div>
                     </div>
                     <button onClick={() => setTopics(topics.filter(x => x.id !== t.id))} className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                       <X size={20} />
                     </button>
                   </div>
                 ))}
               </div>
               
               <div className="relative group">
                 <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                   <Tag size={18} className="text-zinc-400" />
                 </div>
                 <input 
                   type="text" 
                   placeholder="DIGITE UM NOVO TÓPICO E APERTE ENTER..."
                   className={`w-full border rounded-2xl py-6 pl-14 pr-6 outline-none transition-all duration-300 text-[11px] font-bold tracking-[0.1em] uppercase shadow-sm ${getThemeClasses('input')}`}
                   onKeyDown={(e) => { 
                     if(e.key === 'Enter' && e.target.value.trim()) { 
                       const updated = [...topics, { id: Date.now(), name: e.target.value.trim(), color: COLOR_OPTIONS[Math.floor(Math.random()*COLOR_OPTIONS.length)], totalMinutes: 0 }];
                       setTopics(updated); 
                       e.target.value = '';
                     }
                   }}
                 />
               </div>
             </div>
          )}

          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-8 rounded-[2rem] flex flex-col gap-6 ${getThemeClasses('card')}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <Activity size={24} />
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${getThemeClasses('text-primary')}`}>Tempo de Estudo</span>
                  </div>
                  <div className="space-y-3">
                    <div className={`flex justify-between items-center border-b pb-2 ${getThemeClasses('border')}`}>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ESTE MÊS</span>
                      <span className={`text-[13px] font-bold ${getThemeClasses('text-primary')}`}>{statsByPeriod.month}h</span>
                    </div>
                    <div className={`flex justify-between items-center border-b pb-2 ${getThemeClasses('border')}`}>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ESTA SEMANA</span>
                      <span className={`text-[13px] font-bold ${getThemeClasses('text-primary')}`}>{statsByPeriod.week}h</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">HOJE</span>
                      <span className="text-[14px] font-black text-emerald-500">{statsByPeriod.day}h</span>
                    </div>
                  </div>
                </div>

                <div className={`p-8 rounded-[2rem] flex flex-col justify-between ${getThemeClasses('card')}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                      <Flame size={24} />
                    </div>
                    <span className={`text-lg font-bold tracking-tight ${getThemeClasses('text-primary')}`}>Ofensiva (Dias)</span>
                  </div>
                  <div>
                    <h3 className={`text-6xl font-black tabular-nums tracking-tighter ${getThemeClasses('text-primary')}`}>
                      {currentStreak} <span className="text-lg font-bold text-zinc-500 tracking-normal">dias seguidos</span>
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-4">Meta diária: {dailyGoalHours}h</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-[2.5rem] p-8 md:p-10 ${getThemeClasses('card')}`}>
                <div className="flex justify-between items-center mb-10">
                  <h3 className={`font-black text-base uppercase tracking-widest flex items-center gap-3 ${getThemeClasses('text-primary')}`}>
                    <TrendingUp size={20} className="text-zinc-400" /> CONSISTÊNCIA
                  </h3>
                </div>
                <div className="flex gap-2.5 justify-center flex-wrap">
                  {calendarData.map((day, i) => {
                    const minutes = day.minutes;
                    const goalMins = dailyGoalHours * 60;
                    const hasStudy = minutes > 0;
                    const reachedGoal = minutes >= goalMins;
                    const intensity = hasStudy ? Math.min(0.2 + (minutes / goalMins) * 0.8, 1) : 0;

                    return (
                      <div 
                        key={i} 
                        title={`${day.date}: ${(minutes / 60).toFixed(1)}h`}
                        className="w-5 h-20 md:w-6 md:h-24 rounded-full transition-all duration-300 hover:scale-110 cursor-pointer"
                        style={{ 
                          backgroundColor: reachedGoal 
                            ? '#8B5CF6' 
                            : (hasStudy ? `rgba(16, 185, 129, ${intensity})` : (theme === 'dark' ? '#18181b' : '#f4f4f5')),
                          border: !hasStudy ? '1px dashed' : 'none',
                          borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7',
                          boxShadow: reachedGoal ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'none'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className={`rounded-[2.5rem] p-8 md:p-10 ${getThemeClasses('card')}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <h3 className={`font-black text-base uppercase tracking-widest flex items-center gap-3 ${getThemeClasses('text-primary')}`}>
                    <BarChart3 size={20} className="text-zinc-400" /> TEMPO POR TÓPICO
                  </h3>
                  <div className="flex bg-zinc-200/50 dark:bg-zinc-900/80 rounded-2xl p-1.5 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800">
                    <button 
                      onClick={() => setHoursPeriod('weekly')}
                      className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-[1rem] transition-all duration-300 ${
                        hoursPeriod === 'weekly' 
                          ? (theme === 'dark' ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-black shadow-sm') 
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                    >
                      Semana
                    </button>
                    <button 
                      onClick={() => setHoursPeriod('monthly')}
                      className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-[1rem] transition-all duration-300 ${
                        hoursPeriod === 'monthly' 
                          ? (theme === 'dark' ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-black shadow-sm') 
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                    >
                      Mês
                    </button>
                  </div>
                </div>
                
                <div className="flex items-end justify-between h-56 gap-4 md:gap-8 px-2 md:px-6">
                  {topicPeriodData.length === 0 ? (
                    <div className="w-full text-center text-zinc-400 uppercase font-black text-[11px] tracking-[0.5em] pb-10">Sem dados neste período</div>
                  ) : (
                    topicPeriodData.map(t => {
                      const heightPercent = maxPeriodMins > 0 ? ((t.periodMinutes||0)/maxPeriodMins)*100 : 0;
                      return (
                        <div key={t.id} className="flex-1 flex flex-col items-center group h-full justify-end">
                          <div className="relative w-full flex justify-center h-full items-end">
                            <div className={`absolute bottom-0 w-8 md:w-12 h-full rounded-2xl opacity-20 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                            <div 
                              className="relative w-8 md:w-12 rounded-2xl transition-all duration-1000 group-hover:opacity-90 z-10 shadow-lg" 
                              style={{ 
                                height: `${Math.max(heightPercent, t.periodMinutes > 0 ? 5 : 0)}%`,
                                backgroundColor: t.color 
                              }} 
                            >
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all whitespace-nowrap pointer-events-none z-20 shadow-xl">
                                {((t.periodMinutes||0)/60).toFixed(1)}h
                              </div>
                            </div>
                          </div>
                          <span className="mt-5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 truncate w-full text-center">{t.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {view === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
              
              {/* Tema */}
              <section className={`p-8 rounded-[2rem] ${getThemeClasses('card')}`}>
                <h2 className={`font-black uppercase text-[11px] tracking-[0.2em] mb-6 flex items-center gap-3 ${getThemeClasses('text-primary')}`}>
                  <Sun size={18} className="text-zinc-400" /> Aparência
                </h2>
                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => setTheme('light')}
                     className={`flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${theme === 'light' ? 'bg-white text-zinc-900 shadow-md border-zinc-200 ring-2 ring-zinc-900/5' : 'bg-zinc-50 border-transparent text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
                   >
                     <Sun size={16} /> Tema Claro
                   </button>
                   <button 
                     onClick={() => setTheme('dark')}
                     className={`flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${theme === 'dark' ? 'bg-zinc-800 text-white shadow-md border-zinc-700 ring-2 ring-white/5' : 'bg-zinc-900/30 border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                   >
                     <Moon size={16} /> Tema Escuro
                   </button>
                </div>
              </section>

              {/* Preferências Gerais */}
              <section className={`p-8 rounded-[2rem] space-y-2 ${getThemeClasses('card')}`}>
                <h2 className={`font-black uppercase text-[11px] tracking-[0.2em] mb-6 flex items-center gap-3 ${getThemeClasses('text-primary')}`}>
                  <BellRing size={18} className="text-zinc-400" /> Preferências
                </h2>
                
                <div className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-800/50">
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm font-bold tracking-tight ${getThemeClasses('text-primary')}`}>Notificações no Desktop</span>
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Aviso fora do navegador</span>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!desktopNotifications) await requestNotificationPermission();
                      else setDesktopNotifications(false);
                    }}
                    className={`w-14 h-7 rounded-full flex items-center p-1 transition-all duration-300 ${desktopNotifications ? 'bg-emerald-500 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-800/50">
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm font-bold tracking-tight ${getThemeClasses('text-primary')}`}>Meta Diária (Horas)</span>
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Para cálculo de consistência</span>
                  </div>
                  <input type="number" value={dailyGoalHours} onChange={(e) => setDailyGoalHours(Math.max(0, parseInt(e.target.value)||0))} className={`border-2 rounded-xl px-4 py-2 w-24 text-center font-black text-lg outline-none transition-colors ${getThemeClasses('input')}`} />
                </div>

                <div className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-800/50">
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm font-bold tracking-tight ${getThemeClasses('text-primary')}`}>Duração do Alarme (seg)</span>
                  </div>
                  <input type="number" value={alarmDuration} onChange={(e) => setAlarmDuration(Math.max(1, parseInt(e.target.value)||1))} disabled={infiniteAlarm} className={`border-2 rounded-xl px-4 py-2 w-24 text-center font-black text-lg outline-none transition-colors disabled:opacity-30 ${getThemeClasses('input')}`} />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm font-bold tracking-tight ${getThemeClasses('text-primary')}`}>Alarme Infinito</span>
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Toca até parar manualmente</span>
                  </div>
                  <button 
                    onClick={() => setInfiniteAlarm(!infiniteAlarm)}
                    className={`w-14 h-7 rounded-full flex items-center p-1 transition-all duration-300 ${infiniteAlarm ? 'bg-emerald-500 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </section>

              {/* Som do Alarme */}
              <section className={`p-8 rounded-[2rem] ${getThemeClasses('card')}`}>
                <h2 className={`font-black uppercase text-[11px] tracking-[0.2em] mb-6 flex items-center gap-3 ${getThemeClasses('text-primary')}`}>
                  <Volume2 size={18} className="text-zinc-400" /> Som do Alarme
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {SOUND_LIBRARY.map(sound => (
                    <button 
                      key={sound.id} onClick={() => { setSelectedSound(sound); playSound(sound, 1.5); }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${selectedSound.id === sound.id ? (theme === 'dark' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900 border-zinc-900 text-white') : (theme === 'dark' ? 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700' : 'bg-transparent border-zinc-200 text-zinc-500 hover:border-zinc-300')}`}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest">{sound.name}</span>
                      <Volume2 size={16} className={selectedSound.id === sound.id ? "text-white opacity-100" : "opacity-40"} />
                    </button>
                  ))}
                </div>
              </section>

              {/* Dados e Backup */}
              <section className={`p-8 rounded-[2rem] ${getThemeClasses('card')}`}>
                <h2 className={`font-black uppercase text-[11px] tracking-[0.2em] mb-6 flex items-center gap-3 ${getThemeClasses('text-primary')}`}>
                  <FileJson size={18} className="text-zinc-400" /> Backup e Dados
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button onClick={handleExport} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${getThemeClasses('button-secondary')} ${getThemeClasses('border')}`}>
                    <Download size={24} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-widest">Exportar JSON</span>
                  </button>
                  <button onClick={() => fileInputRef.current.click()} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${getThemeClasses('button-secondary')} ${getThemeClasses('border')}`}>
                    <Upload size={24} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-widest">Importar JSON</span>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                  </button>
                </div>

                <div className="pt-8 border-t border-red-500/10">
                  <button 
                    onClick={() => { if(confirm("CUIDADO: Isso apagará TODO o seu histórico e tópicos. Continuar?")) resetAllData(); }}
                    className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 font-bold text-[11px] uppercase tracking-[0.2em]"
                  >
                    <Trash2 size={18} /> Apagar todos os dados
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: EDIT TIME */}
      {modalType === 'editTime' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-6 animate-in fade-in duration-300">
          <div className={`border p-10 rounded-[2.5rem] w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300 ${getThemeClasses('modal-bg')}`}>
            <h3 className={`font-black mb-8 uppercase text-[11px] tracking-[0.2em] text-zinc-500`}>Ajustar Duração (Min)</h3>
            <input 
              autoFocus type="number" value={tempInputValue} onChange={(e) => setTempInputValue(e.target.value)}
              className={`w-full border-2 rounded-3xl py-8 mb-8 text-center outline-none font-black text-6xl tracking-tighter transition-colors ${getThemeClasses('input')}`}
            />
            <div className="flex gap-4">
              <button onClick={() => setModalType(null)} className="flex-1 py-4 text-zinc-500 font-bold text-[11px] uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">Cancelar</button>
              <button onClick={() => { const val = parseInt(tempInputValue); if(!isNaN(val) && val > 0) { setCustomTime(val); setTimeLeft(val * 60); } setModalType(null); }} className={`flex-1 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-lg ${theme === 'dark' ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-zinc-900 text-white hover:bg-black'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TOPIC COLOR */}
      {editingTopic && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-6 animate-in fade-in duration-300">
          <div className={`border p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 ${getThemeClasses('modal-bg')}`}>
            <h3 className={`font-black mb-8 uppercase text-[11px] tracking-[0.2em] text-center text-zinc-500`}>Cor de: <span className={getThemeClasses('text-primary')}>{editingTopic.name}</span></h3>
            <div className="grid grid-cols-4 gap-4 mb-10">
              {COLOR_OPTIONS.map(c => (
                <button 
                  key={c} onClick={() => { setTopics(topics.map(t => t.id === editingTopic.id ? {...t, color: c} : t)); setEditingTopic(null); }}
                  className="aspect-square rounded-full border-4 border-transparent hover:scale-110 transition-transform shadow-md"
                  style={{ backgroundColor: c, borderColor: editingTopic.color === c ? (theme === 'dark' ? 'white' : 'black') : 'transparent' }}
                />
              ))}
            </div>
            <button onClick={() => setEditingTopic(null)} className="w-full py-4 text-zinc-500 font-bold text-[11px] uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
