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
  Sun, Moon // ← adicionados
} from 'lucide-react';

// ... (SOUND_LIBRARY, COLOR_OPTIONS, STORAGE_KEY permanecem iguais)

export default function App() {
  // Novo estado para o tema
  const [theme, setTheme] = useState(() => {
    // Tenta carregar preferência salva ou usa 'dark' como padrão
    return localStorage.getItem('study-theme') || 'dark';
  });

  // Salva preferência de tema
  useEffect(() => {
    localStorage.setItem('study-theme', theme);
  }, [theme]);

  // ... todos os outros states permanecem exatamente iguais
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
  // ... (demais estados e refs sem alteração)

  // ... (todos os useEffect, funções handleExport, handleImport, initAudio, playSound, etc. permanecem idênticos)

  // Cores baseadas no tema
  const isDark = theme === 'dark';
  
  const bgMain       = isDark ? 'bg-black' : 'bg-gray-50';
  const bgHeader     = isDark ? 'bg-black' : 'bg-white';
  const borderHeader = isDark ? 'border-zinc-900' : 'border-gray-200';
  const textPrimary  = isDark ? 'text-zinc-400' : 'text-gray-700';
  const textTitle    = isDark ? 'text-white' : 'text-gray-900';
  const bgCard       = isDark ? 'bg-zinc-900/30' : 'bg-white';
  const borderCard   = isDark ? 'border-zinc-900' : 'border-gray-200';
  const bgButtonActive = isDark ? 'bg-zinc-900' : 'bg-gray-100';
  const textMuted    = isDark ? 'text-zinc-600' : 'text-gray-500';
  const bgInput      = isDark ? 'bg-zinc-900/50' : 'bg-gray-100';
  const borderInput  = isDark ? 'border-zinc-800' : 'border-gray-300';

  return (
    <div 
      className={`flex flex-col h-screen transition-colors duration-700 ${bgMain} ${textPrimary} font-sans overflow-hidden`}
      onClick={initAudio}
    >
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? '#27272a' : '#d1d5db'}; border-radius: 10px; }
        
        @keyframes float { ... } /* sem alteração */
        .particle { ... } /* sem alteração */
        .gradient-bg { ... } /* sem alteração */
        .shadow-glow { ... } /* sem alteração */
      `}</style>

      {/* ANIMAÇÃO DE BREAK (mantida igual) */}
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
      <header className={`h-20 border-b ${borderHeader} flex items-center justify-between px-12 ${bgHeader} shrink-0 z-10`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <BookOpen size={18} strokeWidth={2.5} />
          </div>
          <span className={`${textTitle} font-bold tracking-tighter text-lg uppercase`}>Study</span>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${view === item.id ? `${bgButtonActive} ${textTitle}` : `${textMuted} hover:${textPrimary}`}`}
            >
              <item.icon size={16} strokeWidth={2} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            title={isDark ? "Modo claro" : "Modo escuro"}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button 
            onClick={() => setView('settings')} 
            className={`p-2 rounded-lg transition-colors ${view === 'settings' ? `${bgButtonActive} ${textTitle}` : `${textMuted} hover:${textPrimary}`}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 max-w-5xl mx-auto pb-24">
          {/* 
            A partir daqui quase tudo permanece igual, apenas substituindo classes de cor fixas por variáveis:
            - bg-black → ${bgMain}
            - bg-zinc-900 → ${bgCard}
            - border-zinc-900 → ${borderCard}
            - text-white → ${textTitle}
            - text-zinc-400 → ${textPrimary}
            - text-zinc-600 → ${textMuted}
            - bg-zinc-900/50 → ${bgInput}
            - border-zinc-800 → ${borderInput}
            etc.
          */}

          {view === 'focus' && (
            <div className="flex flex-col items-center justify-center pt-8">
              <div className={`flex flex-wrap justify-center gap-2 ${bgCard} p-1.5 rounded-2xl mb-12 border ${borderCard}`}>
                {/* ... resto igual ... */}
              </div>

              <div className="flex flex-col items-center">
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 transition-colors`}
                  style={{ color: mode === 'break' ? '#10B981' : (activeTopic?.color || (isDark ? '#ffffff44' : '#00000044')) }}
                >
                  {mode === 'break' ? 'Tempo de Descanso' : (activeTopic?.name || 'Selecione um tópico')}
                </span>

                <button
                  onClick={() => { if (!isRunning) { setTempInputValue(customTime.toString()); setModalType('editTime'); } }}
                  className={`text-[10rem] md:text-[12rem] font-light tracking-tighter tabular-nums leading-none cursor-pointer transition-all ${mode === 'break' ? 'text-emerald-600' : textTitle} hover:opacity-80`}
                >
                  {formatTime(timeLeft)}
                </button>

                {/* ... resto do bloco focus igual, só ajustando classes de cor conforme as variáveis acima ... */}
              </div>

              {/* ... botões play/pause, reset, etc. com classes ajustadas ... */}
            </div>
          )}

          {/* 
            Nos outros views (labels, dashboard, goals, settings) 
            aplique as mesmas substituições de classes de cor usando as variáveis definidas
          */}

          {/* Exemplo rápido no dashboard: */}
          {view === 'dashboard' && (
            <div className="space-y-12">
              <div className="flex justify-between items-center">
                <h2 className={`text-3xl font-bold ${textTitle} tracking-tighter`}>Status</h2>
                {/* ... */}
              </div>
              {/* cards, gráficos, etc. usando bgCard, borderCard, textMuted, textTitle */}
            </div>
          )}

          {/* ... demais views seguem o mesmo padrão ... */}

        </div>
      </main>

      {/* Modais também recebem as classes de tema */}
      {modalType === 'editTime' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6">
          <div className={`${bgCard} border ${borderCard} p-8 rounded-[2rem] w-full max-w-xs text-center`}>
            {/* ... conteúdo igual ... */}
          </div>
        </div>
      )}

      {/* ... modal de edição de cor igual ... */}

    </div>
  );
}
