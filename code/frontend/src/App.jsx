import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import Agents from './views/Agents'
import Chat from './views/Chat'
import Knowledge from './views/Knowledge'
import Search from './views/Search'
import Status from './views/Status'
import Tools from './views/Tools'

const VIEWS = [
  { id: 'chat', label: 'Chat', group: 'Assistant' },
  { id: 'knowledge', label: 'Knowledge', group: 'Pipeline' },
  { id: 'search', label: 'Retrieval', group: 'Pipeline' },
  { id: 'agents', label: 'Agents', group: 'Platform' },
  { id: 'tools', label: 'Tools', group: 'Platform' },
  { id: 'status', label: 'Status', group: 'Platform' },
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

  const groups = [...new Set(VIEWS.map((v) => v.group))]
  const online = health?.status === 'ok'

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
                <span className="dot" />{v.label}
              </button>
            ))}
          </div>
        ))}
        <div className="side-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.4rem' }}>
            <span className="dot" style={{ width: 7, height: 7, borderRadius: '50%',
              background: online ? 'var(--c-cyan)' : 'var(--c-crimson)', display: 'inline-block' }} />
            {online ? `${health.llm.provider} · ${health.llm.model}` : 'backend offline'}
          </div>
          {azure?.configured && (
            <div style={{ marginBottom: '.5rem' }} title={azure.auth === 'identity'
              ? 'Signed in with Microsoft Entra — the Agent Service and control plane are available'
              : 'Key authentication — the Agent Service and control plane cannot be queried'}>
              <span className={`badge ${azure.auth === 'identity' ? '' : 'gold'}`}>
                {azure.auth === 'identity' ? 'Entra identity' : 'key auth'}
              </span>
            </div>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            ◐ {theme === 'dark' ? 'light' : 'dark'}
          </button>
        </div>
      </aside>

      <main className="main">
        {view === 'chat' && <Chat agents={agents} hostedOnly={hostedOnly} foundry={foundry} />}
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
