import { useEffect, useState } from 'react'
import { api } from '../api'
import { ChunkList, Err, Head, RawJson, Spinner } from '../components'

const SAMPLE = `Libra Bank issues debit and credit cards to retail customers. A card is blocked automatically after three failed PIN attempts, after the fraud engine flags a suspicious transaction, or at the customer's own request in the mobile application. A blocked card is unblocked in the branch after identity verification, or through the call centre using the phone banking password.

Mortgage loans require a down payment of at least fifteen percent for a first home. Early repayment is free of charge during the variable-rate period; during the fixed-rate period an early repayment fee of one percent applies.

Term deposits can be opened in RON, EUR or USD, with maturities from one month to two years. Breaking a deposit before maturity forfeits the accrued interest.`

export default function Knowledge() {
  const [text, setText] = useState(SAMPLE)
  const [source, setSource] = useState('sample.md')
  const [strategy, setStrategy] = useState('dynamic')
  const [size, setSize] = useState(400)
  const [overlap, setOverlap] = useState(80)
  const [sentences, setSentences] = useState(3)
  const [threshold, setThreshold] = useState(0.75)
  const [fileInfo, setFileInfo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [ingested, setIngested] = useState(null)
  const [collection, setCollection] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const refresh = () => api.collection().then(setCollection).catch(() => setCollection(null))
  useEffect(() => { refresh() }, [])

  const payload = () => ({
    text, strategy, source: source || 'markdown-doc.md',
    chunk_size: Number(size), chunk_overlap: Number(overlap),
    sentences_per_chunk: Number(sentences), semantic_threshold: Number(threshold),
  })

  function handleFileRead(file) {
    if (!file) return
    if (!file.name.match(/\.(md|markdown|txt)$/i)) {
      setError('Te rugăm să încarci un fișier Markdown (.md) sau de tip text (.txt).')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      setText(content)
      setSource(file.name)
      setFileInfo({
        name: file.name,
        sizeKb: (file.size / 1024).toFixed(1),
        chars: content.length,
        lines: content.split('\n').length
      })
    }
    reader.onerror = () => setError('Eroare la citirea fișierului.')
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileRead(file)
  }

  async function run(kind) {
    setBusy(kind); setError(null)
    try {
      if (kind === 'chunk') { setPreview(await api.chunk(payload())); setIngested(null) }
      else { const r = await api.ingest(payload()); setIngested(r); setPreview(null); refresh() }
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  async function reset() {
    setBusy('reset'); setError(null)
    try { await api.resetCollection(); setIngested(null); setPreview(null); refresh() }
    catch (e) { setError(e.message) } finally { setBusy('') }
  }

  return (
    <>
      <Head title="Knowledge">
        Indexează documente și fișiere Markdown (.md) în baza de date vectorială. Conținutul indexat va fi
        folosit automat ca sursă de referință în răspunsurile cu RAG ale agentului.
      </Head>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap', gap: '.5rem' }}>
          <label style={{ margin: 0, fontWeight: 700 }}>Document / Conținut Markdown (.md)</label>
          <label className="btn btn-outline btn-sm shrink" style={{ textTransform: 'none', letterSpacing: 0, margin: 0, cursor: 'pointer' }}>
            📄 Încarcă fișier .MD / .TXT
            <input
              type="file"
              accept=".md,.markdown,.txt"
              onChange={(e) => handleFileRead(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {fileInfo && (
          <div style={{ marginBottom: '.6rem', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              📄 {fileInfo.name} ({fileInfo.sizeKb} KB, {fileInfo.chars} caractere, {fileInfo.lines} linii)
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { setText(SAMPLE); setSource('sample.md'); setFileInfo(null); }}
              style={{ padding: '.15em .5em', fontSize: '.72rem' }}
            >
              Revenire la textul de probă
            </button>
          </div>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: isDragging ? '2px dashed var(--accent)' : '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ minHeight: 180, border: 'none', background: 'transparent' }}
            placeholder="Introduceți sau trageți (drag & drop) un fișier Markdown (.md) aici..."
          />
          {isDragging && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(230,57,70,0.15)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, color: 'var(--accent)', pointerEvents: 'none'
            }}>
              Eliberați fișierul .md pentru a încărca
            </div>
          )}
        </div>

        <div className="row" style={{ marginTop: '.8rem' }}>
          <div>
            <label>Etichetă sursă (Source Label)</label>
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="ex. politica_microcredite.md" />
          </div>
          <div>
            <label>Strategy</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              <option value="static">static — fixed windows</option>
              <option value="sentence">sentence — N per chunk</option>
              <option value="dynamic">dynamic — structure aware (optim .md)</option>
              <option value="semantic">semantic — meaning aware</option>
            </select>
          </div>
          {(strategy === 'static' || strategy === 'dynamic') && (<>
            <div><label>Chunk size</label><input type="number" value={size} onChange={(e) => setSize(e.target.value)} /></div>
            <div><label>Overlap</label><input type="number" value={overlap} onChange={(e) => setOverlap(e.target.value)} /></div>
          </>)}
          {strategy === 'sentence' && (
            <div><label>Sentences / chunk</label><input type="number" value={sentences} onChange={(e) => setSentences(e.target.value)} /></div>
          )}
          {strategy === 'semantic' && (
            <div><label>Similarity threshold</label><input type="number" step="0.05" min="0.05" max="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
          )}
        </div>

        <div className="row" style={{ marginTop: '.9rem' }}>
          <button className="btn btn-outline shrink" onClick={() => run('chunk')} disabled={!!busy}>Preview chunks</button>
          <button className="btn btn-primary shrink" onClick={() => run('ingest')} disabled={!!busy || !text.trim()}>
            ⚡ Indexează fișierul Markdown
          </button>
          <div className="shrink" style={{ alignSelf: 'center' }}>{busy && <Spinner label={busy} />}</div>
        </div>
        <Err error={error} />
      </div>

      {preview && (
        <div className="card">
          <h3>{preview.count} chunks rezultate din “{source}” · strategie “{preview.strategy}” <span className="faint">(neindexat încă)</span></h3>
          <ChunkList chunks={preview.chunks} />
          <RawJson data={preview} />
        </div>
      )}

      {ingested && (
        <div className="card">
          <h3>Indexat cu succes: {ingested.count} segmente (chunks) din fișierul Markdown</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Embedded cu <code>{ingested.embedding_model.model}</code> în{' '}
            <strong>{ingested.vector_dimension}</strong> dimensiuni. Sursă: <code>{source}</code>
          </p>
          <pre className="out">{JSON.stringify(ingested.embedding_preview)}</pre>
          <ChunkList chunks={ingested.chunks} />
          <RawJson data={ingested} />
        </div>
      )}

      <div className="card">
        <h3>Baza de date vectorială (Collection)</h3>
        {collection ? (
          <div className="row">
            <div><label>name</label><div className="mono">{collection.name}</div></div>
            <div><label>points</label><div className="mono">{collection.points_count}</div></div>
            <div><label>dimensions</label><div className="mono">{collection.vector_dimension ?? '—'}</div></div>
            <div><label>distance</label><div className="mono">{collection.distance ?? '—'}</div></div>
            <button className="btn btn-outline shrink" onClick={reset} disabled={!!busy}>Reset collection</button>
          </div>
        ) : <p className="faint">Vector store unreachable — is Qdrant running?</p>}
      </div>
    </>
  )
}
