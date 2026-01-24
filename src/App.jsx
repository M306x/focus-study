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
  Sun, Moon, Minus
} from 'lucide-react';

const SOUND_LIBRARY = [
  { id: 'zen', name: 'Taça Tibetan', type: 'sine', frequency: 440, duration: 2.0, detune: -5 },
  { id: 'harp', name: 'Harpa Suave', type: 'sine', frequency: 880, duration: 1.5, detune: 10 },
  { id: 'nature', name: 'Eco da Natureza', type: 'triangle', frequency: 330, duration: 2.5, detune: 2 },
  { id: 'pulse', name: 'Pulso Relaxante', type: 'sine', frequency: 523.25, duration: 1.2, detune: 0 }
];
const COLOR_OPTIONS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#71717a', '#4ADE80', '#A855F7', '#F97316'];

const STORAGE_KEY = 'study_dashboard_data_v1';

export default function App() {
  const [view, setView] = useState('focus');
  const [mode, setMode] = useState('focus');
  const [theme, setTheme] = useState('dark');
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

  // --- PERSISTÊNCIA ---
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
        if (data.theme) setTheme(data.theme);
        if (data.selectedSoundId) {
          const sound = SOUND_LIBRARY.find(s => s.id === data.selectedSoundId);
          if (sound) setSelectedSound(sound);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    const dataToSave = { topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, theme, selectedSoundId: selectedSound.id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, selectedSound, theme]);

  // --- LÓGICA DE TEMPO SEMANAL (RESET SÁBADO 23:59) ---
  const getStartOfStudyWeek = () => {
    const now = new Date();
    const result = new Date(now);
    // Retorna o último sábado às 23:59:59
    const day = now.getDay(); // 0 (Dom) a 6 (Sáb)
    const diff = day === 6 ? 0 : day + 1; 
    result.setDate(now.getDate() - diff);
    result.setHours(23, 59, 59, 999);
    // Se hoje é sábado e ainda não deu 23:59, a semana começou no sábado anterior
    if (day === 6 && now.getHours() < 24) {
        // mantém o cálculo de diff
    }
    return result;
  };

  // Derivação de minutos semanais a partir do histórico (mais preciso que estado fixo)
  const topicsWithStats = useMemo(() => {
    const startOfWeek = getStartOfStudyWeek();
    return topics.map(topic => {
      const weeklyMins = history
        .filter(h => h.topicId === topic.id && new Date(h.date + 'T23:59:59') > startOfWeek)
        .reduce((sum, h) => sum + h.minutes, 0);
      return { ...topic, weeklyMinutes: weeklyMins };
    });
  }, [topics, history]);

  const initAudio = () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
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
    const endT = duration === 'infinite' ? Infinity : startTime + duration;
    const playLoop = (time) => {
      if (!alarmPlayingRef.current || time >= endT) {
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
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(time); osc.stop(time + soundConfig.duration);
      setTimeout(() => playLoop(ctx.currentTime), (soundConfig.duration * 0.8) * 1000);
    };
    playLoop(startTime);
  };

  const handleComplete = () => {
    setIsRunning(false);
    setIsAlarmPlaying(true);
    playSound(selectedSound, infiniteAlarm ? 'infinite' : alarmDuration);
    if (mode === 'focus' && activeTopic) {
      saveSession(customTime);
      setMode('break');
      setCustomTime(5);
      setTimeLeft(5 * 60);
    } else if (mode === 'break') {
      setMode('focus');
      setCustomTime(25);
      setTimeLeft(25 * 60);
    }
  };

  const saveSession = (mins) => {
    if (mins <= 0) return;
    const today = new Date().toISOString().split('T')[0];
    const newEntry = {
      id: Date.now(),
      topicId: activeTopic.id,
      topicName: activeTopic.name,
      minutes: mins,
      date: today,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: activeTopic.color
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  const handlePause = () => {
    if (mode === 'focus' && activeTopic) {
      const spentMin = customTime - Math.floor(timeLeft / 60);
      if (spentMin > 0) saveSession(spentMin);
      setCustomTime(Math.floor(timeLeft / 60));
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- CÁLCULOS DE STATUS (ESTATÍSTICAS) ---
  const statsByPeriod = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const dayMins = history.filter(h => h.date === todayStr).reduce((acc, curr) => acc + curr.minutes, 0);
    return { day: (dayMins / 60).toFixed(1) };
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
    const minMins = 60; // 1 Hora mínima
    const data = [...calendarData].reverse();
    
    for (let i = 0; i < data.length; i++) {
      const isToday = i === 0;
      if (data[i].minutes >= minMins) {
        streak++;
      } else {
        if (isToday) continue; // Se hoje ainda não bateu 1h, não quebra a sequência iniciada ontem
        break;
      }
    }
    return streak;
  }, [calendarData]);

  const topicMonthlyData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return topics.map(t => {
      const monthlyMins = history
        .filter(h => h.topicId === t.id && new Date(h.date + 'T00:00:00') >= startOfMonth)
        .reduce((sum, h) => sum + h.minutes, 0);
      return { ...t, monthlyMinutes: monthlyMins };
    });
  }, [topics, history]);

  const maxTopicMonthlyMins = Math.max(...topicMonthlyData.map(t => t.monthlyMinutes || 0), 1);

  // --- ESTILOS THEME (GROK) ---
  const isDark = theme === 'dark';
  const bgColor = isDark ? (mode === 'break' ? 'bg-zinc-950' : 'bg-black') : 'bg-zinc-50';
  const textColor = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const headerColor = isDark ? 'bg-black border-zinc-900' : 'bg-white border-zinc-200';
  const cardColor = isDark ? 'bg-zinc-900/40 border-zinc-900' : 'bg-white border-zinc-200 shadow-sm';
  const inputColor = isDark ? 'bg-zinc-900/60 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900';
  const navActive = isDark ? 'text-white bg-zinc-900' : 'text-zinc-900 bg-zinc-100';

  return (
    <div className={`flex flex-col h-screen transition-all duration-500 ${bgColor} ${textColor} font-sans overflow-hidden`} onClick={initAudio}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? '#27272a' : '#e4e4e7'}; border-radius: 10px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <header className={`h-20 border-b flex items-center justify-between px-12 shrink-0 z-10 transition-colors ${headerColor}`}>
        <div className="flex items-center gap-4">
          <div className={`w-9 h-9 ${isDark ? 'bg-white text-black' : 'bg-black text-white'} rounded-xl flex items-center justify-center`}>
            <BookOpen size={20} strokeWidth={2.5} />
          </div>
          <span className={`${isDark ? 'text-white' : 'text-black'} font-bold tracking-tighter text-xl uppercase`}>Study</span>
        </div>
        
        <nav className="flex gap-4">
          {[
            { id: 'focus', icon: Timer, label: 'Foco' },
            { id: 'labels', icon: Tag, label: 'Tópicos' },
            { id: 'dashboard', icon: BarChart3, label: 'Status' },
            { id: 'goals', icon: Target, label: 'Metas' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all ${view === item.id ? navActive : 'text-zinc-500 hover:text-zinc-400'}`}>
              <item.icon size={18} />
              <span className="text-[13px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`p-2.5 rounded-lg transition-colors ${isDark ? 'text-zinc-700 hover:text-white' : 'text-zinc-400 hover:text-black'}`}>
            {isDark ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button onClick={() => setView('settings')} className={`p-2.5 rounded-lg transition-colors ${view === 'settings' ? navActive : (isDark ? 'text-zinc-700 hover:text-white' : 'text-zinc-400 hover:text-black')}`}>
            <Settings size={22} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-10 max-w-5xl mx-auto pb-24">
          
          {view === 'focus' && (
            <div className="flex flex-col items-center pt-10">
              <div className={`flex flex-wrap justify-center gap-3 p-2 rounded-2xl mb-14 border ${isDark ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-zinc-100 border-zinc-200'}`}>
                {topicsWithStats.length === 0 ? (
                  <span className="px-5 py-2 text-[12px] font-bold uppercase text-zinc-500 tracking-widest">Nenhum tópico criado</span>
                ) : (
                  topicsWithStats.map(t => (
                    <button key={t.id} onClick={() => !isRunning && setActiveTopic(t)} className={`px-5 py-2 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all ${activeTopic?.id === t.id ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : 'text-zinc-500 hover:text-zinc-400'}`}>
                      {t.name}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-col items-center text-center">
                <span className={`text-[13px] font-black uppercase tracking-[0.4em] mb-6`} style={{ color: mode === 'break' ? '#10B981' : (activeTopic?.color || (isDark ? '#ffffff44' : '#00000022')) }}>
                  {mode === 'break' ? 'Tempo de Descanso' : (activeTopic?.name || 'Selecione um tópico')}
                </span>
                
                <button onClick={() => { if (!isRunning) { setTempInputValue(customTime.toString()); setModalType('editTime'); } }} className={`text-[10rem] md:text-[13rem] font-light tracking-tighter tabular-nums leading-none cursor-pointer transition-all ${mode === 'break' ? 'text-emerald-500' : (isDark ? 'text-white' : 'text-black')} hover:opacity-80`}>
                  {formatTime(timeLeft)}
                </button>

                {!isRunning && (
                  <div className="mt-10 flex flex-col items-center gap-6">
                    <div className="flex gap-4">
                      {[25, 45, 60, 90].map(m => (
                        <button key={m} onClick={() => { setCustomTime(m); setTimeLeft(m * 60); }} className={`text-[11px] font-black uppercase tracking-widest py-2.5 px-5 rounded-xl border transition-all ${customTime === m ? (isDark ? 'text-white border-zinc-500 bg-zinc-900' : 'text-black border-zinc-400 bg-zinc-100') : (isDark ? 'text-zinc-700 border-zinc-900 hover:border-zinc-800' : 'text-zinc-400 border-zinc-200 hover:border-zinc-300')}`}>
                          {m} MIN
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-16 flex items-center gap-12">
                <button disabled={mode === 'focus' && !activeTopic} onClick={() => { initAudio(); if (isRunning) handlePause(); else setEndTime(Date.now() + timeLeft * 1000); setIsRunning(!isRunning); }} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 ${isRunning ? (isDark ? 'bg-zinc-900 text-white border border-zinc-800' : 'bg-zinc-100 text-black border border-zinc-200') : (mode === 'break' ? 'bg-emerald-500 text-black' : (isDark ? 'bg-white text-black' : 'bg-black text-white'))}`}>
                  {isRunning ? <Pause size={38} fill="currentColor" /> : <Play size={38} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={() => { setIsRunning(false); setTimeLeft(customTime * 60); setEndTime(null); }} className={`${isDark ? 'text-zinc-800 hover:text-white' : 'text-zinc-300 hover:text-black'} p-4 transition-colors`}>
                  <RotateCcw size={28} />
                </button>
              </div>
            </div>
          )}

          {view === 'dashboard' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`${cardColor} p-8 rounded-[2.5rem] flex items-center gap-6`}>
                  <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500"><Flame size={28} /></div>
                  <div>
                    <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest block">Streak de Estudo</span>
                    <h3 className={`text-5xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-black'}`}>{currentStreak} dias</h3>
                    <p className="text-[11px] uppercase tracking-wide opacity-50 mt-1">Mínimo 1h por dia</p>
                  </div>
                </div>
                <div className={`${cardColor} p-8 rounded-[2.5rem] flex items-center gap-6`}>
                   <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500"><Activity size={28} /></div>
                   <div>
                    <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest block">Hoje</span>
                    <h3 className={`text-5xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-black'}`}>{statsByPeriod.day}h</h3>
                   </div>
                </div>
              </div>

              <div className={`${cardColor} rounded-[2.5rem] p-10`}>
                 <h3 className={`font-bold text-sm uppercase tracking-widest mb-10 ${isDark ? 'text-white' : 'text-black'}`}>Horas p/ Tópico (Este Mês)</h3>
                 <div className="flex items-end justify-between h-48 gap-4">
                    {topicMonthlyData.length === 0 ? <div className="w-full text-center text-xs uppercase font-bold text-zinc-300">Sem dados este mês</div> : 
                      topicMonthlyData.map(t => (
                        <div key={t.id} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          <div className="w-full rounded-2xl transition-all duration-1000" style={{ height: `${((t.monthlyMinutes || 0) / maxTopicMonthlyMins) * 100}%`, backgroundColor: t.color }}>
                             <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap bg-zinc-800 text-white px-2 py-1 rounded">
                                {((t.monthlyMinutes || 0)/60).toFixed(1)}h
                             </div>
                          </div>
                          <span className="mt-4 text-[11px] font-bold uppercase truncate w-full text-center text-zinc-500">{t.name}</span>
                        </div>
                      ))
                    }
                 </div>
              </div>
            </div>
          )}

          {view === 'goals' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <h2 className={`text-sm font-bold uppercase tracking-[0.2em] mb-8 ${isDark ? 'text-white' : 'text-black'}`}>Objetivos Semanais</h2>
              {topicsWithStats.map(topic => {
                const hoursDone = (topic.weeklyMinutes || 0) / 60;
                const progress = topic.hasGoal ? (hoursDone / topic.goalHours) * 100 : 0;
                return (
                  <div key={topic.id} className={`${cardColor} rounded-[2rem] p-8 relative overflow-hidden group border-2 ${topic.hasGoal ? '' : 'opacity-60'}`}>
                    {/* Botão para Remover Meta (-) */}
                    {topic.hasGoal && (
                      <button 
                        onClick={() => setTopics(topics.map(t => t.id === topic.id ? {...t, hasGoal: false} : t))}
                        className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDark ? 'bg-zinc-800 text-zinc-500 hover:text-red-400' : 'bg-zinc-100 text-zinc-400 hover:text-red-500'}`}
                        title="Remover meta"
                      >
                        <Minus size={18} />
                      </button>
                    )}

                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-2">
                        <span className={`font-bold text-xl tracking-tight uppercase ${isDark ? 'text-white' : 'text-black'}`}>{topic.name}</span>
                        {topic.hasGoal ? (
                          <div className="flex items-center gap-3">
                            <input type="number" value={topic.goalHours} onChange={(e) => setTopics(topics.map(t => t.id === topic.id ? {...t, goalHours: parseInt(e.target.value) || 0} : t))} className={`rounded-lg px-3 py-1.5 text-[13px] w-16 font-bold outline-none transition-colors ${inputColor}`} />
                            <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">Hrs / Semana</span>
                          </div>
                        ) : (
                          <button onClick={() => setTopics(topics.map(t => t.id === topic.id ? {...t, hasGoal: true, goalHours: 10} : t))} className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg border border-dashed ${isDark ? 'border-zinc-700 text-zinc-600' : 'border-zinc-300 text-zinc-400'}`}>Definir Objetivo</button>
                        )}
                      </div>
                      {topic.hasGoal && (
                        <div className="text-right mr-12">
                          <span className="text-zinc-400 text-[11px] font-bold block mb-1 uppercase tracking-widest">{hoursDone.toFixed(1)}H CONCLUÍDO</span>
                          <span className={`font-bold text-4xl tracking-tighter tabular-nums ${isDark ? 'text-white' : 'text-black'}`}>{Math.min(progress, 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                    {topic.hasGoal && (
                      <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-black/40' : 'bg-zinc-100'}`}>
                        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: topic.color }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* O restante das seções (Labels, Settings) segue a mesma lógica de aumento de fonte */}
          {view === 'labels' && (
             <div className="max-w-xl mx-auto">
               <h2 className={`text-sm font-bold mb-8 uppercase tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>Tópicos de Estudo</h2>
               <div className="space-y-4 mb-8">
                 {topics.map(t => (
                   <div key={t.id} className={`flex items-center justify-between p-5 border rounded-2xl group transition-colors ${cardColor}`}>
                     <div className="flex items-center gap-5">
                       <button onClick={() => setEditingTopic(t)} className="w-6 h-6 rounded-full ring-2 ring-zinc-300 ring-offset-2 transition-transform hover:scale-110" style={{ backgroundColor: t.color }} />
                       <span className={`${isDark ? 'text-white' : 'text-black'} text-[14px] font-bold uppercase tracking-wide`}>{t.name}</span>
                     </div>
                     <button onClick={() => setTopics(topics.filter(x => x.id !== t.id))} className="text-zinc-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                   </div>
                 ))}
               </div>
               <input type="text" placeholder="NOVO TÓPICO..." className={`w-full p-5 rounded-2xl outline-none focus:border-zinc-400 text-[13px] font-bold tracking-widest uppercase transition-colors ${inputColor}`} onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value) { setTopics([...topics, { id: Date.now(), name: e.target.value, color: COLOR_OPTIONS[Math.floor(Math.random()*COLOR_OPTIONS.length)], hasGoal: false }]); e.target.value = ''; }}} />
             </div>
          )}

        </div>
      </main>

      {/* MODAL EDIÇÃO TEMPO */}
      {modalType === 'editTime' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className={`${isDark ? 'bg-zinc-900' : 'bg-white'} p-10 rounded-[2.5rem] w-full max-w-sm text-center shadow-2xl border ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h3 className="text-zinc-500 font-bold mb-8 uppercase text-[12px] tracking-widest">Minutos da Sessão</h3>
            <input autoFocus type="number" value={tempInputValue} onChange={(e) => setTempInputValue(e.target.value)} className={`w-full rounded-2xl p-8 mb-8 text-center outline-none font-bold text-6xl tracking-tighter ${isDark ? 'bg-black text-white border-zinc-800' : 'bg-zinc-50 text-black border-zinc-200'}`} />
            <div className="flex gap-4">
              <button onClick={() => setModalType(null)} className="flex-1 py-5 text-zinc-500 font-bold text-[13px] uppercase tracking-widest">Cancelar</button>
              <button onClick={() => { const val = parseInt(tempInputValue); if(!isNaN(val) && val > 0) { setCustomTime(val); setTimeLeft(val * 60); } setModalType(null); }} className={`flex-1 py-5 rounded-2xl font-bold text-[13px] uppercase tracking-widest ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
