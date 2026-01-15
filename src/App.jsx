import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, 
  Timer, Target, Tag, Settings, 
  X, Clock, TrendingUp, Volume2, 
  BarChart3, Activity, CheckCircle2,
  Calendar, Award, Zap, ChevronRight,
  Palette, BellRing, Trash2, Coffee, Brain,
  BookOpen
} from 'lucide-react';

const SOUND_LIBRARY = [
  { id: 'zen', name: 'Taça Tibetan', type: 'sine', frequency: 440, duration: 2.0, detune: -5 },
  { id: 'harp', name: 'Harpa Suave', type: 'sine', frequency: 880, duration: 1.5, detune: 10 },
  { id: 'nature', name: 'Eco da Natureza', type: 'triangle', frequency: 330, duration: 2.5, detune: 2 },
  { id: 'pulse', name: 'Pulso Relaxante', type: 'sine', frequency: 523.25, duration: 1.2, detune: 0 }
];

const COLOR_OPTIONS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#FFFFFF', '#4ADE80', '#A855F7', '#F97316'];

export default function App() {
  const [view, setView] = useState('focus');
  const [mode, setMode] = useState('focus'); // 'focus' ou 'break'
  const [selectedSound, setSelectedSound] = useState(SOUND_LIBRARY[0]);
  const [alarmDuration, setAlarmDuration] = useState(5);
  
  const [topics, setTopics] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);

  const [customTime, setCustomTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

  const [modalType, setModalType] = useState(null); 
  const [editingTopic, setEditingTopic] = useState(null);
  const [tempInputValue, setTempInputValue] = useState("");

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleComplete();
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, timeLeft]);

  const playSound = (soundConfig, totalSeconds) => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    let startTime = ctx.currentTime;
    const endTime = startTime + totalSeconds;

    const playLoop = (time) => {
      if (time >= endTime) return;
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

  const handleComplete = () => {
    setIsRunning(false);
    playSound(selectedSound, alarmDuration);
    
    if (mode === 'focus' && activeTopic) {
      const today = new Date().toISOString().split('T')[0];
      setTopics(prev => prev.map(t => 
        t.id === activeTopic.id ? { ...t, weeklyMinutes: t.weeklyMinutes + customTime } : t
      ));
      
      setHistory(prev => [{
        id: Date.now(),
        topicId: activeTopic.id,
        topicName: activeTopic.name,
        minutes: customTime,
        date: today,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        color: activeTopic.color
      }, ...prev]);

      // Mudança automática para o modo Break após Focus
      setMode('break');
      setCustomTime(5);
      setTimeLeft(5 * 60);
    } else if (mode === 'break') {
      // Retorna para o modo Focus após Break
      setMode('focus');
      setCustomTime(25);
      setTimeLeft(25 * 60);
    }
  };

  const resetAllData = () => {
    setTopics([]);
    setHistory([]);
    setActiveTopic(null);
    setTimeLeft(25 * 60);
    setIsRunning(false);
    setView('focus');
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hDisplay = h > 0 ? `${h.toString().padStart(2, '0')}:` : "";
    return `${hDisplay}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Cálculos de Status
  const totalMinutes = topics.reduce((acc, t) => acc + t.weeklyMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const avgSession = history.length > 0 ? (totalMinutes / history.length).toFixed(0) : 0;
  const maxMins = Math.max(...topics.map(t => t.weeklyMinutes), 1);

  // Filtros de tempo para Dashboard
  const statsByPeriod = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Início da semana (domingo)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);

    // Início do mês
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

  // Calendário de Consistência (últimos 30 dias)
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

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 max-w-5xl mx-auto pb-24">
          
          {view === 'focus' && (
            <div className="flex flex-col items-center justify-center pt-8">
              {/* Seletor de Tópicos */}
              <div className="flex flex-wrap justify-center gap-2 bg-zinc-900/40 p-1.5 rounded-2xl mb-12 border border-zinc-800/50">
                {topics.length === 0 ? (
                  <span className="px-4 py-2 text-[10px] font-bold uppercase text-zinc-600 tracking-widest">Nenhum tópico criado</span>
                ) : (
                  topics.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => !isRunning && setActiveTopic(t)} 
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTopic?.id === t.id ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      {t.name}
                    </button>
                  ))
                )}
              </div>

              {/* Temporizador */}
              <div className="flex flex-col items-center">
                <span 
                  className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 transition-colors`}
                  style={{ color: mode === 'break' ? '#10B981' : (activeTopic?.color || '#ffffff44') }}
                >
                  {mode === 'break' ? 'Tempo de Descanso' : (activeTopic?.name || 'Selecione um tópico')}
                </span>
                
                <button 
                  onClick={() => { if (!isRunning) { setTempInputValue(customTime.toString()); setModalType('editTime'); } }}
                  className={`text-[10rem] md:text-[12rem] font-light tracking-tighter tabular-nums leading-none cursor-pointer transition-all ${mode === 'break' ? 'text-emerald-400' : 'text-white'} hover:opacity-80`}
                >
                  {formatTime(timeLeft)}
                </button>

                {/* Controles de Tempo */}
                {!isRunning && (
                  <div className="space-y-4 flex flex-col items-center mt-8">
                    <div className="flex gap-3">
                      {[25, 45, 60, 90, 120].map(m => (
                        <button 
                          key={m} 
                          onClick={() => { setCustomTime(m); setTimeLeft(m * 60); }} 
                          className={`text-[9px] font-black uppercase tracking-widest py-2 px-4 rounded-lg border transition-all ${customTime === m ? 'text-white border-zinc-500 bg-zinc-900' : 'text-zinc-700 border-zinc-900 hover:border-zinc-800'}`}
                        >
                          {m >= 60 ? `${m/60}H` : `${m} MIN`}
                        </button>
                      ))}
                    </div>
                    
                    {/* Botões Focus/Break */}
                    <div className="flex gap-4">
                      <button 
                        onClick={() => { setMode('focus'); setCustomTime(25); setTimeLeft(25 * 60); }}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] border transition-all ${mode === 'focus' ? 'bg-white text-black border-white' : 'text-zinc-700 border-zinc-900 hover:border-zinc-700'}`}
                      >
                        <Brain size={14} /> Focus
                      </button>
                      <button 
                        onClick={() => { setMode('break'); setCustomTime(5); setTimeLeft(5 * 60); }}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] border transition-all ${mode === 'break' ? 'bg-emerald-500 text-black border-emerald-500' : 'text-zinc-700 border-zinc-900 hover:border-zinc-700'}`}
                      >
                        <Coffee size={14} /> Break
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Play/Pause */}
              <div className="mt-16 flex items-center gap-10">
                <button 
                  disabled={mode === 'focus' && !activeTopic}
                  onClick={() => { initAudio(); setIsRunning(!isRunning); }} 
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 disabled:grayscale ${isRunning ? 'bg-zinc-900 text-white border border-zinc-800' : (mode === 'break' ? 'bg-emerald-500 text-black' : 'bg-white text-black')}`}
                >
                  {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={() => { setIsRunning(false); setTimeLeft(customTime * 60); }} className="text-zinc-800 hover:text-white p-3 transition-colors">
                  <RotateCcw size={24} />
                </button>
              </div>
            </div>
          )}

          {view === 'labels' && (
             <div className="max-w-xl mx-auto">
               <h2 className="text-2xl font-bold text-white mb-8 uppercase text-xs tracking-widest">Tópicos e Cores</h2>
               <div className="space-y-3 mb-8">
                 {topics.map(t => (
                   <div key={t.id} className="flex items-center justify-between p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl group">
                     <div className="flex items-center gap-4">
                       <button 
                         onClick={() => setEditingTopic(t)}
                         className="w-5 h-5 rounded-full ring-2 ring-zinc-800 ring-offset-2 ring-offset-black transition-transform hover:scale-110" 
                         style={{ backgroundColor: t.color }} 
                       />
                       <span className="text-white text-sm font-bold uppercase tracking-wide">{t.name}</span>
                     </div>
                     <button onClick={() => setTopics(topics.filter(x => x.id !== t.id))} className="text-zinc-800 hover:text-red-500 transition-colors">
                       <X size={18} />
                     </button>
                   </div>
                 ))}
               </div>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   placeholder="NOVO TÓPICO..."
                   className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-zinc-600 text-[10px] font-bold tracking-widest uppercase"
                   onKeyDown={(e) => { 
                     if(e.key === 'Enter' && e.target.value) { 
                       setTopics([...topics, { id: Date.now(), name: e.target.value, color: COLOR_OPTIONS[Math.floor(Math.random()*COLOR_OPTIONS.length)], weeklyMinutes: 0, goalHours: 10, hasGoal: true }]); 
                       e.target.value = ''; 
                     }
                   }}
                 />
               </div>
             </div>
          )}

          {view === 'dashboard' && (
            <div className="space-y-12">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white tracking-tighter">Status</h2>
                <div className="px-4 py-1.5 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-800">
                  Resumo Geral
                </div>
              </div>

              {/* Grid Principal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex flex-col justify-between aspect-square">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                    <Clock size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Total Estudado</span>
                    <h3 className="text-5xl font-bold text-white tabular-nums">{totalHours}h</h3>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex flex-col justify-between aspect-square">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                    <Zap size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Média/Sessão</span>
                    <h3 className="text-5xl font-bold text-white tabular-nums">{avgSession}m</h3>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex flex-col justify-between aspect-square">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Activity size={24} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-1">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Este Mês</span>
                      <span className="text-xs font-bold text-white">{statsByPeriod.month}h</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-1">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Esta Semana</span>
                      <span className="text-xs font-bold text-white">{statsByPeriod.week}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Hoje</span>
                      <span className="text-xs font-bold text-emerald-500">{statsByPeriod.day}h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendário de Consistência (Heatmap) */}
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2.5rem] p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-3">
                    <TrendingUp size={18} className="text-zinc-600" /> Consistência Diária
                  </h3>
                </div>
                <div className="flex gap-2 justify-center">
                  {calendarData.map((day, i) => {
                    const opacity = day.minutes > 0 ? Math.min(0.2 + (day.minutes / 120), 1) : 0.05;
                    return (
                      <div 
                        key={i} 
                        title={`${day.date}: ${day.minutes} min`}
                        className="w-4 h-16 rounded-full transition-all hover:scale-y-110"
                        style={{ backgroundColor: `rgba(255, 255, 255, ${opacity})` }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-4 px-2 text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                  <span>30 dias atrás</span>
                  <span>Hoje</span>
                </div>
              </div>

              {/* Gráfico de Barras */}
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2.5rem] p-10">
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-3">
                    <BarChart3 size={18} className="text-zinc-600" /> Horas por Tópico
                  </h3>
                </div>
                <div className="flex items-end justify-between h-48 gap-4 px-4">
                  {topics.length === 0 ? (
                    <div className="w-full flex items-center justify-center text-zinc-800 uppercase font-black text-[10px] tracking-[0.5em]">Sem dados</div>
                  ) : (
                    topics.map(t => {
                      const height = (t.weeklyMinutes / maxMins) * 100;
                      return (
                        <div key={t.id} className="flex-1 flex flex-col items-center group">
                          <div className="relative w-full flex justify-center flex-1">
                             <div 
                               className="absolute bottom-0 w-8 rounded-full transition-all duration-1000 group-hover:opacity-80"
                               style={{ height: `${height}%`, backgroundColor: t.color, boxShadow: `0 0 40px -10px ${t.color}44` }}
                             />
                          </div>
                          <span className="mt-4 text-[8px] font-bold uppercase tracking-tighter text-zinc-600 group-hover:text-white transition-colors">{t.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'goals' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-white uppercase text-xs tracking-widest mb-8">Objetivos Semanais</h2>
              {topics.length === 0 && <div className="text-center py-20 border border-dashed border-zinc-900 rounded-3xl text-zinc-800 text-[10px] font-black uppercase tracking-widest">Crie tópicos primeiro</div>}
              {topics.map(topic => {
                const hoursDone = topic.weeklyMinutes / 60;
                const progress = topic.hasGoal ? (hoursDone / topic.goalHours) * 100 : 0;
                return (
                  <div key={topic.id} className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-8 relative overflow-hidden group">
                    {!topic.hasGoal && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setTopics(topics.map(t => t.id === topic.id ? {...t, hasGoal: true} : t))}
                        className="bg-white text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest"
                      >
                        Ativar Meta
                      </button>
                    </div>}
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-bold text-lg tracking-tight uppercase">{topic.name}</span>
                        {topic.hasGoal ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={topic.goalHours}
                              onChange={(e) => setTopics(topics.map(t => t.id === topic.id ? {...t, goalHours: parseInt(e.target.value) || 0} : t))}
                              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white w-14 outline-none focus:border-zinc-500"
                            />
                            <span className="text-zinc-600 text-[9px] font-bold uppercase">Meta de Horas</span>
                          </div>
                        ) : (
                          <span className="text-zinc-700 text-[9px] font-bold uppercase">Sem Meta Definida</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-500 text-[10px] font-bold block mb-1 uppercase tracking-tighter">{hoursDone.toFixed(1)}H FEITO</span>
                        {topic.hasGoal && <span className="text-white font-bold text-3xl tracking-tighter tabular-nums">{Math.min(progress, 100).toFixed(0)}%</span>}
                      </div>
                    </div>
                    
                    {topic.hasGoal && (
                      <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-zinc-900">
                        <div 
                          className="h-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: topic.color }} 
                        />
                      </div>
                    )}

                    {topic.hasGoal && (
                      <button 
                        onClick={() => setTopics(topics.map(t => t.id === topic.id ? {...t, hasGoal: false} : t))}
                        className="mt-4 text-[9px] font-bold text-zinc-700 hover:text-red-900 uppercase tracking-widest transition-colors"
                      >
                        Remover Objetivo
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {view === 'settings' && (
            <div className="max-w-md mx-auto space-y-12">
              <section>
                <h2 className="text-white font-bold uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2">
                  <Volume2 size={16} /> Som do Alerta
                </h2>
                <div className="grid gap-2">
                  {SOUND_LIBRARY.map(sound => (
                    <button 
                      key={sound.id}
                      onClick={() => { setSelectedSound(sound); playSound(sound, 2); }}
                      className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${selectedSound.id === sound.id ? 'bg-zinc-900 border-zinc-600 text-white shadow-xl' : 'bg-transparent border-zinc-900 text-zinc-700 hover:border-zinc-800'}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">{sound.name}</span>
                      <Volume2 size={14} className={selectedSound.id === sound.id ? "text-white" : "text-zinc-800"} />
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-white font-bold uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2">
                  <BellRing size={16} /> Duração do Alarme
                </h2>
                <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-900 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-white text-xs font-bold uppercase tracking-widest">Tempo de Toque</span>
                    <span className="text-zinc-600 text-[9px] font-bold uppercase">Segundos após o término</span>
                  </div>
                  <input 
                    type="number" 
                    value={alarmDuration}
                    onChange={(e) => setAlarmDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-black border border-zinc-800 rounded-xl px-4 py-2 w-20 text-center text-white font-bold outline-none"
                  />
                </div>
              </section>

              <section className="pt-12 border-t border-zinc-900">
                <button 
                  onClick={() => { if(confirm("Deseja apagar todos os seus tópicos e histórico?")) resetAllData(); }}
                  className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl border border-red-900/30 text-red-500 hover:bg-red-500/10 transition-colors font-bold text-[10px] uppercase tracking-widest"
                >
                  <Trash2 size={16} /> Apagar Tudo (Reset)
                </button>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* MODAL EDIÇÃO TEMPO */}
      {modalType === 'editTime' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm px-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-xs text-center">
            <h3 className="text-white font-bold mb-6 uppercase text-[10px] tracking-widest opacity-40">Definir Minutos</h3>
            <input 
              autoFocus type="number" value={tempInputValue} onChange={(e) => setTempInputValue(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl p-6 text-white mb-6 text-center outline-none font-bold text-5xl tracking-tighter"
            />
            <div className="flex gap-3">
              <button onClick={() => setModalType(null)} className="flex-1 py-4 text-zinc-600 font-bold text-[10px] uppercase tracking-widest">Sair</button>
              <button 
                onClick={() => {
                  const val = parseInt(tempInputValue);
                  if(!isNaN(val) && val > 0) { setCustomTime(val); setTimeLeft(val * 60); }
                  setModalType(null);
                }}
                className="flex-1 py-4 bg-white text-black rounded-2xl font-bold text-[10px] uppercase tracking-widest"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO COR TÓPICO */}
      {editingTopic && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm px-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-xs">
            <h3 className="text-white font-bold mb-6 uppercase text-[10px] tracking-widest text-center opacity-40">Mudar Cor: {editingTopic.name}</h3>
            <div className="grid grid-cols-4 gap-3 mb-8">
              {COLOR_OPTIONS.map(c => (
                <button 
                  key={c}
                  onClick={() => {
                    setTopics(topics.map(t => t.id === editingTopic.id ? {...t, color: c} : t));
                    setEditingTopic(null);
                  }}
                  className="aspect-square rounded-full border-2 border-zinc-800 transition-transform hover:scale-125"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button onClick={() => setEditingTopic(null)} className="w-full py-4 text-zinc-600 font-bold text-[10px] uppercase tracking-widest">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}