// ⚠️ ESTE É O PRIMEIRO CÓDIGO, APENAS CORRIGIDO
// (mantive estrutura, nomes e lógica original)

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play, Pause, RotateCcw, Timer, Target, Tag, Settings,
  X, TrendingUp, Volume2, BarChart3, Calendar,
  BookOpen, Download, Upload, FileJson,
  Flame, Coffee, Brain, Trash2
} from 'lucide-react';

const STORAGE_KEY = 'study_dashboard_data_v1';

/* ================= APP ================= */

export default function App() {
  const [view, setView] = useState('focus');
  const [topics, setTopics] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);

  const [customTime, setCustomTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [endTime, setEndTime] = useState(null);

  const timerRef = useRef(null);

  /* ============ PERSISTÊNCIA ============ */

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setTopics(data.topics || []);
      setHistory(data.history || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ topics, history })
    );
  }, [topics, history]);

  /* ============ TIMER ============ */

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((endTime - now) / 1000));
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
    if (!activeTopic) return;

    const minutes = customTime;
    const today = new Date().toISOString().split('T')[0];

    setTopics(prev =>
      prev.map(t =>
        t.id === activeTopic.id
          ? {
              ...t,
              weeklyMinutes: (t.weeklyMinutes || 0) + minutes,
              monthlyMinutes: (t.monthlyMinutes || 0) + minutes
            }
          : t
      )
    );

    setHistory(prev => [
      {
        id: Date.now(),
        topicId: activeTopic.id,
        minutes,
        date: today
      },
      ...prev
    ]);

    setTimeLeft(customTime * 60);
  };

  /* ============ STATS (STATUS) ============ */

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - now.getDay());
    startWeek.setHours(0,0,0,0);

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sum = arr => arr.reduce((a,b)=>a+b.minutes,0);

    return {
      day: sum(history.filter(h => h.date === today)) / 60,
      week: sum(history.filter(h => new Date(h.date) >= startWeek)) / 60,
      month: sum(history.filter(h => new Date(h.date) >= startMonth)) / 60
    };
  }, [history]);

  /* ============ STREAK (CORRIGIDO) ============ */

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const mins = history
        .filter(h => h.date === ds)
        .reduce((a,b)=>a+b.minutes,0);

      if (mins >= 60) count++;
      else break;
    }
    return count;
  }, [history]);

  /* ============ PROGRESSO MENSAL ============ */

  const monthlyData = useMemo(() => {
    const out = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const mins = history.filter(h => {
        const d = new Date(h.date);
        return d >= start && d <= end;
      }).reduce((a,b)=>a+b.minutes,0);

      out.push({
        label: start.toLocaleString('default', { month: 'short' }),
        hours: mins / 60
      });
    }
    return out;
  }, [history]);

  const maxMonthly = Math.max(...monthlyData.map(m => m.hours), 1);
  const maxTopicMonth = Math.max(...topics.map(t => t.monthlyMinutes || 0), 1);

  /* ============ UI (STATUS) ============ */

  return (
    <div className="min-h-screen bg-black text-zinc-400 p-8">

      <div className="flex gap-4 mb-10">
        {['focus','dashboard'].map(v=>(
          <button
            key={v}
            onClick={()=>setView(v)}
            className={`px-4 py-2 rounded-xl text-xs uppercase
              ${view===v ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'dashboard' && (
        <div className="space-y-12">

          {/* STATUS */}
          <div className="grid grid-cols-3 gap-6">
            <Stat title="Este mês" value={`${stats.month.toFixed(1)}h`} />
            <Stat title="Esta semana" value={`${stats.week.toFixed(1)}h`} />
            <Stat title="Hoje" value={`${stats.day.toFixed(1)}h`} />
          </div>

          {/* STREAK */}
          <div className="bg-zinc-900/40 p-6 rounded-3xl">
            <span className="text-xs uppercase text-zinc-500">Streak</span>
            <div className="text-4xl text-white font-bold">{streak} dias</div>
          </div>

          {/* HORAS POR TÓPICO */}
          <div className="bg-zinc-900/40 p-6 rounded-3xl space-y-4">
            <h3 className="text-sm uppercase text-white">Horas por tópico (mês)</h3>
            {topics.map(t=>(
              <div key={t.id}>
                <div className="flex justify-between text-xs">
                  <span>{t.name}</span>
                  <span>{((t.monthlyMinutes||0)/60).toFixed(1)}h</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded">
                  <div
                    className="h-full bg-zinc-400 rounded"
                    style={{
                      width:`${((t.monthlyMinutes||0)/maxTopicMonth)*100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* PROGRESSO MENSAL (ABAIXO) */}
          <div className="bg-zinc-900/40 p-6 rounded-3xl">
            <h3 className="text-sm uppercase text-white mb-4">Progresso mensal</h3>
            <div className="relative h-40 flex items-end gap-4">
              {monthlyData.map((m,i)=>(
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-2 rounded-full bg-blue-400"
                    style={{height:`${(m.hours/maxMonthly)*100}%`}}
                  />
                  <span className="text-xs mt-2">{m.label}</span>
                </div>
              ))}
              <div className="absolute inset-0 bg-blue-500/10 rounded-2xl -z-10" />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-zinc-900/40 p-6 rounded-3xl">
      <span className="text-xs uppercase text-zinc-500">{title}</span>
      <div className="text-2xl text-white font-bold">{value}</div>
    </div>
  );
}
