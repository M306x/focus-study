import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, 
  Timer, Target, Tag, Settings, 
  X, Clock, TrendingUp, Volume2, 
  BarChart3, Activity,
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

const STORAGE_KEY = 'study_dashboard_data_v2';

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

  // ---------- LOAD ----------
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const data = JSON.parse(savedData);
      setTopics(data.topics || []);
      setHistory(data.history || []);
      setAlarmDuration(data.alarmDuration || 5);
      setInfiniteAlarm(data.infiniteAlarm || false);
      setDailyGoalHours(data.dailyGoalHours || 7);
      const sound = SOUND_LIBRARY.find(s => s.id === data.selectedSoundId);
      if (sound) setSelectedSound(sound);
    }
  }, []);

  // ---------- SAVE ----------
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        topics,
        history,
        alarmDuration,
        infiniteAlarm,
        dailyGoalHours,
        selectedSoundId: selectedSound.id
      })
    );
  }, [topics, history, alarmDuration, infiniteAlarm, dailyGoalHours, selectedSound]);

  // ---------- TIMER ----------
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        handleComplete();
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isRunning, endTime]);

  const handleComplete = () => {
    setIsRunning(false);

    if (mode === 'focus' && activeTopic) {
      const today = new Date().toISOString().split('T')[0];
      const minutes = customTime;

      setHistory(prev => [
        {
          id: Date.now(),
          topicId: activeTopic.id,
          topicName: activeTopic.name,
          minutes,
          date: today,
          color: activeTopic.color
        },
        ...prev
      ]);
    }

    setMode(mode === 'focus' ? 'break' : 'focus');
    const next = mode === 'focus' ? 5 : 25;
    setCustomTime(next);
    setTimeLeft(next * 60);
  };

  // ---------- STATS ----------
  const statsByPeriod = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sum = from =>
      history.filter(h => new Date(h.date) >= from)
             .reduce((a, b) => a + b.minutes, 0);

    return {
      day: (history.filter(h => h.date === today).reduce((a,b)=>a+b.minutes,0)/60).toFixed(1),
      week: (sum(weekStart)/60).toFixed(1),
      month: (sum(monthStart)/60).toFixed(1)
    };
  }, [history]);

  // ---------- CALENDAR ----------
  const calendarData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const date = d.toISOString().split('T')[0];
      const minutes = history.filter(h => h.date === date)
                             .reduce((a,b)=>a+b.minutes,0);
      days.push({ date, minutes });
    }
    return days;
  }, [history]);

  // ---------- STREAK FIX ----------
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = calendarData.length - 1; i >= 0; i--) {
      if (calendarData[i].minutes >= 60) streak++;
      else break;
    }
    return streak;
  }, [calendarData]);

  // ---------- MONTHLY TOPIC DATA ----------
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const topicMonthlyMinutes = topics.map(t => ({
    ...t,
    minutes: history
      .filter(h => h.topicId === t.id && new Date(h.date) >= startOfMonth)
      .reduce((a,b)=>a+b.minutes,0)
  }));

  const maxTopicMinutes = Math.max(...topicMonthlyMinutes.map(t => t.minutes), 1);
  return (
    <div className={`flex flex-col h-screen ${mode === 'break' ? 'bg-zinc-950' : 'bg-black'} text-zinc-400 overflow-hidden`}>
      
      {/* HEADER */}
      <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-12 bg-black shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black">
            <BookOpen size={18} />
          </div>
          <span className="text-white font-bold uppercase tracking-tight">Study</span>
        </div>

        <nav className="flex gap-4">
          {[
            { id: 'focus', icon: Timer, label: 'Foco' },
            { id: 'labels', icon: Tag, label: 'Tópicos' },
            { id: 'dashboard', icon: BarChart3, label: 'Status' },
            { id: 'goals', icon: Target, label: 'Metas' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`px-4 py-2 rounded-xl text-xs uppercase font-bold ${
                view === item.id ? 'bg-zinc-900 text-white' : 'text-zinc-600'
              }`}
            >
              <item.icon size={14} />
            </button>
          ))}
        </nav>

        <button onClick={() => setView('settings')}>
          <Settings />
        </button>
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-8">

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-12">

            {/* RESUMO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-zinc-900 p-6 rounded-2xl">
                <span className="text-xs uppercase">Este mês</span>
                <div className="text-3xl text-white font-bold">{statsByPeriod.month}h</div>
              </div>

              <div className="bg-zinc-900 p-6 rounded-2xl">
                <span className="text-xs uppercase">Esta semana</span>
                <div className="text-3xl text-white font-bold">{statsByPeriod.week}h</div>
              </div>

              <div className="bg-zinc-900 p-6 rounded-2xl">
                <span className="text-xs uppercase">Hoje</span>
                <div className="text-3xl text-emerald-400 font-bold">{statsByPeriod.day}h</div>
              </div>

              <div className="bg-zinc-900 p-6 rounded-2xl">
                <span className="text-xs uppercase">Streak</span>
                <div className="text-3xl text-white font-bold">{currentStreak} dias</div>
              </div>
            </div>

            {/* HORAS POR TÓPICO */}
            <div className="bg-zinc-900/30 p-8 rounded-3xl">
              <h3 className="text-white font-bold uppercase mb-8">Horas por tópico (mês)</h3>

              <div className="flex items-end gap-6 h-48">
                {topicMonthlyMinutes.map(t => {
                  const height = (t.minutes / maxTopicMinutes) * 100;
                  return (
                    <div key={t.id} className="flex-1 flex flex-col items-center">
                      <div className="relative w-full flex-1 flex items-end">
                        <div
                          className="w-8 rounded-full"
                          style={{
                            height: `${height}%`,
                            backgroundColor: t.color
                          }}
                        />
                      </div>
                      <span className="mt-3 text-xs uppercase">{t.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PROGRESSO MENSAL */}
            <div className="bg-zinc-900/30 p-8 rounded-3xl">
              <h3 className="text-white font-bold uppercase mb-6">Progresso mensal</h3>
              <p className="text-zinc-300">
                Total estudado neste mês: <b className="text-white">{statsByPeriod.month} horas</b>
              </p>
            </div>

          </div>
        )}

        {/* OUTRAS VIEWS (mantidas como estavam) */}
        {view !== 'dashboard' && (
          <div className="text-zinc-600 text-sm">
            As outras telas (Foco, Tópicos, Metas, Configurações) permanecem iguais ao código original.
          </div>
        )}

      </main>
    </div>
  );
}
