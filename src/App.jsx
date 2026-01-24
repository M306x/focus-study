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

const COLOR_OPTIONS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#FFFFFF', '#4ADE80', '#A855F7', '#F97316'];

const STORAGE_KEY = 'study_dashboard_data_v1';

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
        if (data.selectedSoundId) {
          const sound = SOUND_LIBRARY.find(s => s.id === data.selectedSoundId);
          if (sound) setSelectedSound(sound);
        }
      } catch (e) {
        console.error("Erro ao carregar dados do LocalStorage:", e);
      }
    }
  }, []);

  useEffect(() => {
    const dataToSave = {
      topics,
      history,
      alarmDuration,
      infiniteAlarm,
      dailyGoalHours,
      selectedSoundId: selectedSound.id
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, selectedSound]);

  // Reset semanal (mantido)
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
      if (now.getDay() === 6 && now.getHours() === 23 && now.getMinutes() === 0) {
        updateWeeklyMinutes();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [history]);

  // Novo: Reset mensal das horas mensais por tópico
  useEffect(() => {
    const updateMonthlyMinutes = () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      setTopics(prevTopics =>
        prevTopics.map(topic => {
          const monthlyMins = history
            .filter(h => h.topicId === topic.id && new Date(h.date) >= startOfMonth)
            .reduce((sum, h) => sum + h.minutes, 0);
          return { ...topic, monthlyMinutes: monthlyMins };
        })
      );
    };

    updateMonthlyMinutes();
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        updateMonthlyMinutes();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [history]);

  // ... (handleExport, handleImport, initAudio, playSound, stopAlarm, handleComplete, handlePause, resetAllData, formatTime - tudo igual)

  // Estatísticas corrigidas
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

  // Streak corrigido: qualquer dia com ≥ 60 minutos conta
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
    const minMinutesForStreak = 60; // 1 hora

    for (let i = calendarData.length - 1; i >= 0; i--) {
      if (calendarData[i].minutes >= minMinutesForStreak) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [calendarData]);

  // Progresso mensal (gráfico de barras)
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

  // Horas por tópico (mensal) - agora com reset mensal
  const topicMonthlyData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return topics.map(t => {
      const monthlyMins = history
        .filter(h => h.topicId === t.id && new Date(h.date) >= startOfMonth)
        .reduce((sum, h) => sum + h.minutes, 0);
      return { ...t, monthlyMinutes: monthlyMins };
    });
  }, [topics, history]);

  const maxTopicMonthlyMins = Math.max(...topicMonthlyData.map(t => t.monthlyMinutes || 0), 1);

  // ... (outras funções como handleComplete, handlePause, etc. permanecem exatamente iguais)

  return (
    <div className={`flex flex-col h-screen transition-colors duration-1000 ${mode === 'break' ? 'bg-zinc-950' : 'bg-black'} text-zinc-400 font-sans overflow-hidden`} onClick={initAudio}>
      {/* ... style e partículas de break mantidos iguais ... */}

      {/* Header mantido exatamente igual */}
      <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-12 bg-black shrink-0 z-10">
        {/* ... exatamente igual ao original ... */}
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 max-w-5xl mx-auto pb-24">

          {/* Foco, Tópicos, Metas, Settings - mantidos exatamente iguais */}

          {view === 'dashboard' && (
            <div className="space-y-12">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white tracking-tighter">Status</h2>
                <div className="px-4 py-1.5 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-800">
                  Resumo Geral
                </div>
              </div>

              {/* Bloco expandido de períodos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex flex-col items-center text-center">
                  <Activity size={32} className="text-emerald-500 mb-4" />
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Este Mês</span>
                  <span className="text-4xl font-bold text-white mt-2">{statsByPeriod.month}<span className="text-2xl">h</span></span>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex flex-col items-center text-center">
                  <TrendingUp size={32} className="text-blue-500 mb-4" />
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Esta Semana</span>
                  <span className="text-4xl font-bold text-white mt-2">{statsByPeriod.week}<span className="text-2xl">h</span></span>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex flex-col items-center text-center">
                  <Flame size={32} className="text-orange-500 mb-4" />
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Hoje</span>
                  <span className="text-4xl font-bold text-emerald-500 mt-2">{statsByPeriod.day}<span className="text-2xl">h</span></span>
                </div>
              </div>

              {/* Streak */}
              <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                    <Flame size={32} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Streak Atual</span>
                    <h3 className="text-5xl font-bold text-white tabular-nums">{currentStreak} <span className="text-2xl">dias</span></h3>
                  </div>
                </div>
              </div>

              {/* Horas por Tópico (agora corrigido + mensal) */}
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2.5rem] p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-3">
                    <BarChart3 size={18} className="text-zinc-600" /> Horas por Tópico (Este Mês)
                  </h3>
                </div>
                <div className="flex items-end justify-between h-64 gap-4 px-4">
                  {topics.length === 0 ? (
                    <div className="w-full flex items-center justify-center text-zinc-800 uppercase font-black text-[10px] tracking-[0.5em]">Sem dados</div>
                  ) : (
                    topicMonthlyData.map(t => {
                      const height = ((t.monthlyMinutes || 0) / maxTopicMonthlyMins) * 100;
                      return (
                        <div key={t.id} className="flex-1 flex flex-col items-center group">
                          <div className="relative w-full flex justify-center flex-1">
                            <div
                              className="absolute bottom-0 w-10 rounded-full transition-all duration-1000 group-hover:opacity-80"
                              style={{
                                height: `${height}%`,
                                backgroundColor: t.color,
                                boxShadow: `0 0 40px -10px ${t.color}44`
                              }}
                            />
                          </div>
                          <span className="mt-4 text-[9px] font-bold uppercase tracking-tighter text-zinc-600 group-hover:text-white transition-colors">{t.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Progresso Mensal (agora abaixo) */}
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2.5rem] p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-3">
                    <BarChart2 size={18} className="text-zinc-600" /> Progresso Mensal
                  </h3>
                </div>
                <div className="flex items-end justify-between h-64 gap-4 px-4">
                  {monthlyData.map((m, i) => {
                    const height = (parseFloat(m.hours) / maxMonthlyHours) * 100;
                    const prevHours = i < monthlyData.length - 1 ? parseFloat(monthlyData[i + 1].hours) : parseFloat(m.hours);
                    const diff = parseFloat(m.hours) - prevHours;
                    const trendColor = diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-zinc-500';
                    const trendIcon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : null;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group">
                        <div className="relative w-full flex justify-center flex-1">
                          <div
                            className="absolute bottom-0 w-10 rounded-full transition-all duration-1000 group-hover:opacity-80"
                            style={{
                              height: `${height}%`,
                              background: 'linear-gradient(to top, #10B981, #3B82F6)',
                              boxShadow: `0 0 40px -10px rgba(16,185,129,0.3)`
                            }}
                          />
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-tighter text-zinc-600 group-hover:text-white transition-colors">{m.month}</span>
                          {trendIcon && <trendIcon size={12} className={trendColor} />}
                        </div>
                        <span className="text-[11px] font-bold text-white mt-1">{m.hours}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ... resto das views (focus, labels, goals, settings) permanecem 100% iguais ao original ... */}
        </div>
      </main>

      {/* ... modais permanecem iguais ... */}
    </div>
  );
}
