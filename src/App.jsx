import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, 
  Timer, Target, Tag, Settings, 
  X, Clock, TrendingUp, Volume2, 
  BarChart3, Activity, CheckCircle2,
  Calendar, Award, Zap, ChevronRight,
  Palette, BellRing, Trash2, Coffee, Brain,
  BookOpen, Download, Upload, FileJson,
  Flame, BarChart2, ArrowUp, ArrowDown
} from 'lucide-react';

const SOUND_LIBRARY = [
  { id: 'zen', name: 'Taça Tibetan', type: 'sine', frequency: 440, duration: 2.0, detune: -5 },
  { id: 'harp', name: 'Harpa Suave', type: 'sine', frequency: 880, duration: 1.5, detune: 10 },
  { id: 'nature', name: 'Eco da Natureza', type: 'triangle', frequency: 330, duration: 2.5, detune: 2 },
  { id: 'pulse', name: 'Pulso Relaxante', type: 'sine', frequency: 523.25, duration: 1.2, detune: 0 }
];

const COLOR_OPTIONS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const INITIAL_TASKS = [
  { id: 1, name: 'Revisão Matemática', topicId: 1, completed: false },
  { id: 2, name: 'Leitura de História', topicId: 2, completed: false }
];

const INITIAL_TOPICS = [
  { id: 1, name: 'Matemática', color: '#10B981', targetMinutes: 120 },
  { id: 2, name: 'História', color: '#3B82F6', targetMinutes: 60 }
];

export default function App() {
  const [view, setView] = useState('timer');
  const [seconds, setSeconds] = useState(1500);
  const [isActive, setIsActive] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('study_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [topics, setTopics] = useState(() => {
    const saved = localStorage.getItem('study_topics');
    return saved ? JSON.parse(saved) : INITIAL_TOPICS;
  });
  const [selectedTopic, setSelectedTopic] = useState(topics[0]?.id || 1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState('zen');
  const [editingTopic, setEditingTopic] = useState(null);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  const audioCtx = useRef(null);

  useEffect(() => {
    localStorage.setItem('study_history', JSON.stringify(history));
    localStorage.setItem('study_topics', JSON.stringify(topics));
  }, [history, topics]);

  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (seconds === 0) {
      handleSessionComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const handleSessionComplete = () => {
    setIsActive(false);
    const sessionMins = 25; 
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      minutes: sessionMins,
      topicId: selectedTopic
    };
    setHistory(prev => [...prev, newEntry]);
    playCompletionSound();
    setSeconds(1500);
  };

  const playCompletionSound = () => {
    if (!soundEnabled) return;
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const sound = SOUND_LIBRARY.find(s => s.id === selectedSound);
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = sound.type;
    osc.frequency.setValueAtTime(sound.frequency, audioCtx.current.currentTime);
    osc.detune.setValueAtTime(sound.detune, audioCtx.current.currentTime);
    gain.gain.setValueAtTime(0.5, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + sound.duration);
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + sound.duration);
  };

  // --- LÓGICA DE DADOS (STREAK, TEMPOS E TÓPICOS) ---
  const statsByPeriod = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = now.toISOString().slice(0, 7);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const dayMins = history.filter(h => h.date === todayStr).reduce((acc, curr) => acc + curr.minutes, 0);
    const weekMins = history.filter(h => new Date(h.date) >= startOfWeek).reduce((acc, curr) => acc + curr.minutes, 0);
    const monthMins = history.filter(h => h.date.startsWith(currentMonthStr)).reduce((acc, curr) => acc + curr.minutes, 0);

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
    const daysCheck = [...calendarData].reverse();
    for (let i = 0; i < daysCheck.length; i++) {
      if (daysCheck[i].minutes >= goalMins) {
        streak++;
      } else {
        if (i === 0) continue; 
        break; 
      }
    }
    return streak;
  }, [calendarData]);

  const topicsMonthlyStats = useMemo(() => {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    return topics.map(topic => {
      const mins = history
        .filter(h => h.topicId === topic.id && h.date.startsWith(currentMonthStr))
        .reduce((acc, h) => acc + h.minutes, 0);
      return { ...topic, currentMonthMinutes: mins };
    });
  }, [topics, history]);

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

  const maxMonthlyHours = Math.max(...monthlyData.map(m => parseFloat(m.hours)), 1);
  const maxTopicMonthMins = Math.max(...topicsMonthlyStats.map(t => t.currentMonthMinutes), 1);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black text-zinc-400 font-sans selection:bg-emerald-500/30">
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 p-2 rounded-full flex gap-2 z-50">
        {[
          { id: 'timer', icon: Timer },
          { id: 'dashboard', icon: Activity },
          { id: 'topics', icon: Tag },
          { id: 'settings', icon: Settings }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`p-4 rounded-full transition-all ${view === item.id ? 'bg-white text-black shadow-lg shadow-white/10 scale-110' : 'hover:bg-zinc-800'}`}
          >
            <item.icon size={20} strokeWidth={view === item.id ? 2.5 : 2} />
          </button>
        ))}
      </nav>

      <main className="max-w-xl mx-auto pt-12 pb-32 px-6">
        {view === 'timer' && (
          <div className="flex flex-col items-center gap-12 pt-10">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {topics.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t.id)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${selectedTopic === t.id ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              <div className={`absolute inset-0 blur-[100px] transition-opacity duration-1000 ${isActive ? 'bg-emerald-500/20 opacity-100' : 'bg-zinc-500/10 opacity-0'}`} />
              <div className="relative text-[140px] font-bold text-white tracking-tighter leading-none tabular-nums">
                {formatTime(seconds)}
              </div>
            </div>

            <div className="flex gap-6 items-center">
              <button
                onClick={() => setSeconds(1500)}
                className="p-5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
              >
                <RotateCcw size={24} />
              </button>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-zinc-900 text-white' : 'bg-white text-black hover:scale-105 shadow-2xl shadow-white/10'}`}
              >
                {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
              <div className="w-14" />
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-white tracking-tighter">Status</h2>
              <div className="px-4 py-1.5 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-800">
                Foco Mensal
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex flex-col justify-center">
                <div className="flex justify-between items-end divide-x divide-zinc-800/50">
                  <div className="flex-1 px-4 first:pl-0">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Hoje</span>
                    <span className="text-4xl font-bold text-emerald-500 tabular-nums tracking-tighter">{statsByPeriod.day}h</span>
                  </div>
                  <div className="flex-1 px-4">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Semana</span>
                    <span className="text-3xl font-bold text-white tabular-nums tracking-tighter">{statsByPeriod.week}h</span>
                  </div>
                  <div className="flex-1 px-4">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Mês</span>
                    <span className="text-3xl font-bold text-white tabular-nums tracking-tighter">{statsByPeriod.month}h</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex items-center justify-between relative overflow-hidden">
                <div className="z-10">
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-1">Sequência</span>
                  <h3 className="text-6xl font-bold text-white tabular-nums tracking-tighter">{currentStreak} <span className="text-lg text-zinc-600 font-medium">dias</span></h3>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 text-orange-500 pointer-events-none transform translate-x-4 translate-y-4">
                  <Flame size={180} strokeWidth={1} />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2rem] p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-3">
                  <BarChart3 size={16} className="text-zinc-600" /> Horas por Tópico
                </h3>
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Este Mês</span>
              </div>
              <div className="flex flex-col gap-4">
                {topicsMonthlyStats.map(t => {
                  const percent = maxTopicMonthMins > 0 ? (t.currentMonthMinutes / maxTopicMonthMins) * 100 : 0;
                  return (
                    <div key={t.id} className="group">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-1 text-zinc-500">
                        <span>{t.name}</span>
                        <span>{(t.currentMonthMinutes / 60).toFixed(1)}h</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${percent}%`, backgroundColor: t.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2rem] p-8">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-3">
                  <BarChart2 size={16} className="text-zinc-600" /> Progresso Mensal
                </h3>
              </div>
              <div className="flex items-end justify-between h-32 gap-4">
                {monthlyData.map((m, i) => {
                  const height = (parseFloat(m.hours) / maxMonthlyHours) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group">
                      <div className="relative w-full flex justify-center flex-1">
                        <div 
                          className="absolute bottom-0 w-6 sm:w-8 rounded-t-lg transition-all duration-1000"
                          style={{ height: `${height}%`, background: 'linear-gradient(to top, #27272a, #52525b)' }}
                        />
                      </div>
                      <span className="mt-3 text-[8px] font-bold uppercase tracking-tighter text-zinc-600">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === 'topics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white tracking-tighter">Tópicos</h2>
              <button 
                onClick={() => setShowNewTopicModal(true)}
                className="bg-white text-black p-2 rounded-full hover:scale-110 transition-transform"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="grid gap-4">
              {topics.map(topic => (
                <div key={topic.id} className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[2rem] flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setEditingTopic(topic)}
                      className="w-12 h-12 rounded-2xl transition-transform hover:scale-110"
                      style={{ backgroundColor: topic.color }}
                    />
                    <div>
                      <h4 className="text-white font-bold tracking-tight">{topic.name}</h4>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{topic.targetMinutes / 60}h meta/dia</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTopics(topics.filter(t => t.id !== topic.id))}
                    className="opacity-0 group-hover:opacity-100 p-3 text-zinc-600 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-12">
            <section>
              <h3 className="text-white font-bold text-xs uppercase tracking-[0.2em] mb-8 opacity-50">Áudio e Notificação</h3>
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-white">
                    <div className="p-3 bg-zinc-800 rounded-2xl"><Volume2 size={18} /></div>
                    <span className="text-sm font-medium tracking-tight">Efeitos Sonoros</span>
                  </div>
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${soundEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

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
            <button onClick={() => setEditingTopic(null)} className="w-full py-4 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Plus({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
