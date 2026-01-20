import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, 
  Timer, Target, Tag, Settings, 
  X, Clock, TrendingUp, Volume2, 
  BarChart3, Activity, CheckCircle2,
  Calendar, Award, Zap, ChevronRight,
  Palette, BellRing, Trash2, Coffee, Brain,
  BookOpen, Download, Upload, FileJson,
  Flame, BarChart2, ArrowUp, ArrowDown,
  ChevronLeft, Plus,
  MoreHorizontal
} from 'lucide-react';

const SOUND_LIBRARY = [
  { id: 'zen', name: 'Taça Tibetan', type: 'sine', frequency: 440, duration: 2.0, detune: -5 },
  { id: 'harp', name: 'Harpa Suave', type: 'sine', frequency: 880, duration: 1.5, detune: 10 },
  { id: 'nature', name: 'Eco da Natureza', type: 'triangle', frequency: 330, duration: 2.5, detune: 2 },
  { id: 'pulse', name: 'Pulso Relaxante', type: 'sine', frequency: 523.25, duration: 1.2, detune: 0 }
];

const COLOR_OPTIONS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#FFFFFF', '#4ADE80', '#A855F7', '#F97316'];

const STORAGE_KEY = 'study_dashboard_data_v1';

const NOTION_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#10b981' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Cyan', hex: '#06b6d4' }
];

export default function App() {
  const [view, setView] = useState('focus');
  const [mode, setMode] = useState('focus'); 
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

  const [calendarEvents, setCalendarEvents] = useState([]); 
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- PERSISTÊNCIA: CARREGAR DADOS DO LOCALSTORAGE ---
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
        if (data.calendarEvents) setCalendarEvents(data.calendarEvents);
        if (data.selectedSoundId) {
          const sound = SOUND_LIBRARY.find(s => s.id === data.selectedSoundId);
          if (sound) setSelectedSound(sound);
        }
      } catch (e) {
        console.error("Erro ao carregar dados do LocalStorage:", e);
      }
    }
  }, []);

  // --- PERSISTÊNCIA: SALVAR DADOS NO LOCALSTORAGE ---
  useEffect(() => {
    const dataToSave = {
      topics,
      history,
      alarmDuration,
      infiniteAlarm,
      dailyGoalHours,
      calendarEvents,
      selectedSoundId: selectedSound.id
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, calendarEvents, selectedSound]);

  // --- RESET SEMANAL AUTOMÁTICO DE weeklyMinutes ---
  useEffect(() => {
    const updateWeeklyMinutes = () => {
      const now = new Date();
      const startOfCurrentWeek = new Date(now);
      startOfCurrentWeek.setDate(now.getDate() - (now.getDay() + 1) % 7); // Semana começa no sábado (0=dom, 6=sáb)
      startOfCurrentWeek.setHours(23, 0, 0, 0); // Reset no sábado às 23h

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
      if (now.getDay() === 6 && now.getHours() === 23 && now.getMinutes() === 0) {
        updateWeeklyMinutes();
      }
    }, 60000); // Checa a cada minuto

    return () => clearInterval(interval);
  }, [history]);

  // --- EXPORTAR DADOS (JSON) ---
  const handleExport = () => {
    const dataToExport = {
      topics,
      history,
      alarmDuration,
      infiniteAlarm,
      dailyGoalHours,
      calendarEvents,
      selectedSoundId: selectedSound.id,
      exportDate: new Date().toISOString()
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- IMPORTAR DADOS (JSON) ---
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
        if (data.calendarEvents) setCalendarEvents(data.calendarEvents);
        if (data.selectedSoundId) {
          const sound = SOUND_LIBRARY.find(s => s.id === data.selectedSoundId);
          if (sound) setSelectedSound(sound);
        }
      } catch (err) {
        console.error("Erro ao importar JSON:", err);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // --- LÓGICA DO TIMER ---
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
    const endTime = duration === 'infinite' ? Infinity : startTime + duration;

    const playLoop = (time) => {
      if (!alarmPlayingRef.current || time >= endTime) {
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

  const stopAlarm = () => {
    alarmPlayingRef.current = false;
    setIsAlarmPlaying(false);
  };

  const handleComplete = () => {
    setIsRunning(false);
    initAudio(); // Garantir que audio esteja inicializado antes do som
    setIsAlarmPlaying(true);
    playSound(selectedSound, infiniteAlarm ? 'infinite' : alarmDuration);

    if (mode === 'focus' && activeTopic) {
      const spentMin = customTime;
      const today = new Date().toISOString().split('T')[0];
      
      const newTopics = topics.map(t => 
        t.id === activeTopic.id 
          ? { 
              ...t, 
              weeklyMinutes: (t.weeklyMinutes || 0) + spentMin,
              totalMinutes: (t.totalMinutes || 0) + spentMin 
            } 
          : t
      );
      
      const newHistoryEntry = {
        id: Date.now(),
        topicId: activeTopic.id,
        topicName: activeTopic.name,
        minutes: spentMin,
        date: today,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        color: activeTopic.color
      };
      
      const newHistory = [newHistoryEntry, ...history];
      
      setTopics(newTopics);
      setHistory(newHistory);

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
          t.id === activeTopic.id 
            ? { 
                ...t, 
                weeklyMinutes: (t.weeklyMinutes || 0) + spentMin,
                totalMinutes: (t.totalMinutes || 0) + spentMin 
              } 
            : t
        );
        
        const newHistoryEntry = {
          id: Date.now(),
          topicId: activeTopic.id,
          topicName: activeTopic.name,
          minutes: spentMin,
          date: today,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: activeTopic.color
        };
        
        const newHistory = [newHistoryEntry, ...history];
        
        setTopics(newTopics);
        setHistory(newHistory);
      }
      setCustomTime(Math.floor(timeLeft / 60));
    }
  };

  const resetAllData = () => {
    setTopics([]);
    setHistory([]);
    setActiveTopic(null);
    setTimeLeft(25 * 60);
    setIsRunning(false);
    setCalendarEvents([]);
    setView('focus');
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hDisplay = h > 0 ? `${h.toString().padStart(2, '0')}:` : "";
    return `${hDisplay}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalMinutes = topics.reduce((acc, t) => acc + (t.totalMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const avgSession = history.length > 0 ? (totalMinutes / history.length).toFixed(0) : 0;
  const maxMins = Math.max(...topics.map(t => t.totalMinutes || 0), 1);

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

    return {
      day: (dayMins / 60).toFixed(1),
      week: (weekMins / 60).toFixed(1),
      month: (monthMins / 60).toFixed(1)
    };
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
    const goalMins = 60;
    for (let i = 0; i < calendarData.length; i++) {
      if (calendarData[i].minutes >= goalMins) {
        streak++;
      } else {
        break;
      }
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

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true });
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayEvents = calendarEvents.filter(e => e.date === dateStr);
      days.push({ 
        day: d, 
        date: dateStr, 
        events: dayEvents
      });
    }
    return days;
  }, [currentDate, calendarEvents]);

  const addEvent = (dateStr) => {
    const name = prompt("Nome do compromisso:");
    if (!name || name.trim() === "") return;
    const newEvent = {
      id: Date.now(),
      name: name,
      date: dateStr,
      color: NOTION_COLORS[Math.floor(Math.random() * NOTION_COLORS.length)].hex
    };
    const updated = [...calendarEvents, newEvent];
    setCalendarEvents(updated);
  };

  const removeEvent = (eventId) => {
    const updated = calendarEvents.filter(e => e.id !== eventId);
    setCalendarEvents(updated);
  };

  const monthName = currentDate.toLocaleString('pt-PT', { month: 'long' });

  return (
    <div className={`flex flex-col h-screen transition-colors duration-1000 ${mode === 'break' ? 'bg-zinc-950' : 'bg-black'} text-zinc-400 font-sans overflow-hidden`} onClick={initAudio}>
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        
        @keyframes float {
          0% { transform: translateY(0px) opacity(0); }
          50% { opacity: 0.5; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
        .particle {
          position: absolute;
          animation: float 3s infinite linear;
          pointer-events: none;
        }
        .gradient-bg {
          background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
        }
        .shadow-glow {
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
      `}</style>

      {/* ANIMAÇÃO DE BREAK */}
      {mode === 'break' && isRunning && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="particle text-emerald-500/20"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: '100%', 
                animationDelay: `${Math.random() * 3}s`,
                fontSize: `${Math.random() * 20 + 10}px`
              }}
            >
              <Coffee />
            </div>
          ))}
        </div>
      )}

      {/* NAVEGAÇÃO SUPERIOR */}
      <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-12 bg-black shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black">
            <BookOpen size={18} strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold tracking-tighter text-lg uppercase">Study</span>
        </div>
        
        <nav className="flex gap-4">
          {[
            { id: 'focus', icon: Timer, label: 'Foco' },
            { id: 'labels', icon: Tag, label: 'Tópicos' },
            { id: 'dashboard', icon: BarChart3, label: 'Status' },
            { id: 'goals', icon: Target, label: 'Metas' },
            { id: 'calendar', icon: Calendar, label: 'Calendário' },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setView(item.id)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${view === item.id ? 'text-white bg-zinc-900' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <item.icon size={16} strokeWidth={2} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={() => setView('settings')} className={`p-2 rounded-lg transition-colors ${view === 'settings' ? 'text-white bg-zinc-900' : 'text-zinc-700 hover:text-zinc-400'}`}>
          <Settings size={20} />
        </button>
      </header>

      <main className
