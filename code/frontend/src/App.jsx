import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import Agents from './views/Agents'
import Chat from './views/Chat'
import Knowledge from './views/Knowledge'
import Search from './views/Search'
import Status from './views/Status'
import Tools from './views/Tools'
import libraLogo from './libra.jpg';

const VIEWS = [
  {
    id: 'chat',
    label: 'Chat',
    group: 'Assistant',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    group: 'Pipeline',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  },
  {
    id: 'search',
    label: 'Retrieval',
    group: 'Pipeline',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    )
  },
  {
    id: 'agents',
    label: 'Agents',
    group: 'Platform',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4" />
        <line x1="8" y1="16" x2="8.01" y2="16" />
        <line x1="16" y1="16" x2="16.01" y2="16" />
      </svg>
    )
  },
  {
    id: 'tools',
    label: 'Tools',
    group: 'Platform',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  },
  {
    id: 'status',
    label: 'Status',
    group: 'Platform',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  },
]

export default function App() {
  const [view, setView] = useState('chat')
  const [agents, setAgents] = useState([])
  const [hostedOnly, setHostedOnly] = useState([])
  const [foundry, setFoundry] = useState(null)
  const [health, setHealth] = useState(null)
  const [azure, setAzure] = useState(null)
  const [theme, setTheme] = useState('dark')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const settingsRef = useRef(null)

  // Chat & RAG System Controls
  const [useRag, setUseRag] = useState(true)
  const [factCheck, setFactCheck] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [topK, setTopK] = useState(3)
  const [clearTrigger, setClearTrigger] = useState(0)
  const [kidsMode, setKidsMode] = useState(false)

  const loadAgents = useCallback(() => {
    api.agents()
      .then((d) => { setAgents(d.personas || []); setHostedOnly(d.hosted_only || []); setFoundry(d.foundry) })
      .catch(() => { setAgents([]); setHostedOnly([]); setFoundry(null) })
  }, [])
  const loadHealth = useCallback(() => {
    api.health().then(setHealth).catch(() => setHealth(null))
  }, [])
  const loadAzure = useCallback(() => {
    api.azure().then(setAzure).catch(() => setAzure(null))
  }, [])

  useEffect(() => { loadAgents(); loadHealth(); loadAzure() }, [loadAgents, loadHealth, loadAzure])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])

  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setIsSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const groups = [...new Set(VIEWS.map((v) => v.group))]
  const online = health?.status === 'ok'
  const currentViewObj = VIEWS.find((v) => v.id === view)

  return (
    <div className={`app ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {isSidebarCollapsed && (
        <button
          className="floating-sidebar-toggle"
          onClick={() => setIsSidebarCollapsed(false)}
          title="Extinde bara laterală (Expand sidebar)"
          aria-label="Expand sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      <aside className="side">
        <div className="side-head">
          <img src={libraLogo} alt="Libra Assist" className="brand-logo" />
          <p className="brand">Libra Assist<small>console</small></p>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Restrânge bara laterală (Collapse sidebar)"
            aria-label="Collapse sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
        {groups.map((g) => (
          <div key={g}>
            <div className="nav-group">{g}</div>
            {VIEWS.filter((v) => v.group === g).map((v) => (
              <button key={v.id} className={`nav-item ${view === v.id ? 'active' : ''}`} onClick={() => setView(v.id)}>
                <span className="nav-icon">{v.icon}</span>
                <span className="nav-label">{v.label}</span>
              </button>
            ))}
          </div>
        ))}
        <div className="side-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.76rem', color: 'var(--text-faint)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? '#ef4444' : 'var(--text-faint)', display: 'inline-block' }} />
            {online ? 'Sistem Activ' : 'Offline'}
          </div>
        </div>
      </aside>

      <main className="main">
        {/* Top Header Bar with Settings Dropdown */}
        <div className="top-bar">
          <div className="top-bar-title">
            <h2>{currentViewObj?.label}</h2>
          </div>

          <div className="settings-dropdown-wrap" ref={settingsRef}>
            <button
              className={`settings-btn ${isSettingsOpen ? 'open' : ''}`}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Deschide meniul de setări"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Setări</span>
            </button>

            {isSettingsOpen && (
              <div className="settings-menu">
                <div className="settings-menu-header">
                  <span>Sistem & Preferințe</span>
                  <span className="badge crimson" style={{ fontSize: '.68rem' }}>Config</span>
                </div>

                <div className="settings-option-group">
                  <div className="settings-option-row">
                    <span className="settings-option-label">Aspect Vizual</span>
                    <div className="theme-toggle-pills">
                      <button
                        className={`theme-pill-btn ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => setTheme('dark')}
                      >
                        Negru
                      </button>
                      <button
                        className={`theme-pill-btn ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => setTheme('light')}
                      >
                        Alb
                      </button>
                    </div>
                  </div>
                </div>

                <div className="settings-option-group">
                  <span className="settings-option-label" style={{ fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                    Asistent & RAG
                  </span>
                  
                  <div className="settings-option-row">
                    <label className="check" style={{ margin: 0, fontSize: '.84rem' }} title="Folosește documentele din corpus pentru răspunsuri">
                      <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
                      use RAG
                    </label>
                  </div>

                  <div className="settings-option-row">
                    <label className="check" style={{ margin: 0, fontSize: '.84rem' }} title="Verifică răspunsul cu surse din web">
                      <input type="checkbox" checked={factCheck} onChange={(e) => setFactCheck(e.target.checked)} />
                      fact-check
                    </label>
                  </div>

                  <div className="settings-option-row">
                    <label className="check" style={{ margin: 0, fontSize: '.84rem' }} title="Redă automat răspunsul prin voce (TTS)">
                      <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
                      auto-read
                    </label>
                  </div>

                  <div className="settings-option-row">
                    <span className="settings-option-label" style={{ fontSize: '.84rem' }}>passages to retrieve</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={topK}
                      onChange={(e) => setTopK(Number(e.target.value))}
                      style={{ width: '4rem', padding: '.3rem .5rem', fontSize: '.84rem' }}
                    />
                  </div>

                  <button
                    className="btn btn-outline btn-sm"
                    style={{ width: '100%', marginTop: '.4rem' }}
                    onClick={() => setClearTrigger(Date.now())}
                  >
                    Clear Conversație
                  </button>

                  <div className="settings-option-row" style={{ marginTop: '.8rem', paddingTop: '.8rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                      <span className="settings-option-label" style={{ fontSize: '.84rem', color: kidsMode ? 'var(--c-teal)' : 'inherit', fontWeight: kidsMode ? 600 : 'normal' }}>
                        Kids Financial Education
                      </span>
                      <span style={{ fontSize: '.68rem', color: 'var(--text-faint)' }}>Single agent mode toggle</span>
                    </div>
                    <label className="check" style={{ margin: 0 }}>
                      <input type="checkbox" checked={kidsMode} onChange={(e) => setKidsMode(e.target.checked)} />
                      {kidsMode ? 'ON' : 'OFF'}
                    </label>
                  </div>
                </div>

                <div className="settings-option-group">
                  <span className="settings-option-label" style={{ fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                    Stare Backend
                  </span>
                  <div className="settings-status-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? '#ef4444' : '#64748b' }} />
                      {online ? `${health.llm.provider} · ${health.llm.model}` : 'Backend Offline'}
                    </div>
                    {azure?.configured && (
                      <div style={{ marginTop: '.2rem' }}>
                        <span className={`badge ${azure.auth === 'identity' ? 'crimson' : 'gold'}`}>
                          {azure.auth === 'identity' ? 'Entra Identity (Azure)' : 'Key Auth'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', marginTop: '.2rem' }}
                  onClick={() => { loadHealth(); loadAgents(); loadAzure() }}
                >
                  Re-verifică Conexiunea
                </button>
              </div>
            )}
          </div>
        </div>

        {view === 'chat' && (
          <Chat
            agents={agents}
            kidsMode={kidsMode}
            hostedOnly={hostedOnly}
            foundry={foundry}
            useRag={useRag}
            setUseRag={setUseRag}
            factCheck={factCheck}
            setFactCheck={setFactCheck}
            autoSpeak={autoSpeak}
            setAutoSpeak={setAutoSpeak}
            topK={topK}
            setTopK={setTopK}
            clearTrigger={clearTrigger}
          />
        )}
        {view === 'knowledge' && <Knowledge />}
        {view === 'search' && <Search />}
        {view === 'agents' && <Agents agents={agents} hostedOnly={hostedOnly} foundry={foundry}
                                      reload={loadAgents} azure={azure} />}
        {view === 'tools' && <Tools />}
        {view === 'status' && <Status health={health} reload={loadHealth}
                                      azure={azure} reloadAzure={loadAzure} />}
      </main>
    </div>
  )
}