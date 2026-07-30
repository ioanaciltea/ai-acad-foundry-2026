import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Err, RunsOnBadge } from '../components'

function cleanDuplicatePhrases(text) {
  if (!text) return ''
  // 1. Remove duplicate consecutive single words (case-insensitive)
  let cleaned = text.replace(/\b(\w+)\s+\1\b/gi, '$1')
  // 2. Remove duplicate consecutive multi-word phrases (2-3 words)
  cleaned = cleaned.replace(/\b(\w+(?:\s+\w+){1,2})\s+\1\b/gi, '$1')
  return cleaned
}

export default function Chat({ agents, hostedOnly = [], foundry }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [agent, setAgent] = useState('default')
  const [useRag, setUseRag] = useState(true)
  const [factCheck, setFactCheck] = useState(false)
  const [mode, setMode] = useState('local')
  const [topK, setTopK] = useState(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Voice interaction state
  const [isListening, setIsListening] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(true)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const baseQuestionRef = useRef('')
  const currentAudioRef = useRef(null)
  const abortControllerRef = useRef(null)
  const audioAbortControllerRef = useRef(null)
  const silenceTimerRef = useRef(null)

  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const stopListening = useCallback(() => {
    clearSilenceTimer()
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop() } catch {}
      mediaRecorderRef.current = null
    }
    setIsListening(false)
    setVoiceStatus('')
  }, [clearSilenceTimer])

  // Reset 5-second silence auto-stop timer
  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      stopListening()
      setVoiceStatus('Pauză de 5 secunde detectată — înregistrare oprită automat.')
    }, 5000)
  }, [clearSilenceTimer, stopListening])

  // Halt all ongoing audio playback and active voice recording session
  const stopAudioAndRecording = useCallback(() => {
    if (audioAbortControllerRef.current) {
      try { audioAbortControllerRef.current.abort() } catch (e) {}
      audioAbortControllerRef.current = null
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
      } catch (e) {}
      currentAudioRef.current = null
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel() } catch (e) {}
    }
    stopListening()
  }, [stopListening])

  // Text-To-Speech playback for bot responses with proper Romanian voice handling
  const playAudioResponse = useCallback(async (textToSpeak) => {
    if (!textToSpeak) return
    const cleanText = textToSpeak.replace(/\[\d+\]/g, '').trim()
    if (!cleanText) return

    stopAudioAndRecording()

    const controller = new AbortController()
    audioAbortControllerRef.current = controller

    try {
      const audioBlob = await api.speak({ text: cleanText }, { signal: controller.signal })
      if (controller.signal.aborted) return

      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      currentAudioRef.current = audio

      audio.onended = () => {
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null
        }
      }

      await audio.play()
      return
    } catch (e) {
      if (controller.signal.aborted) return
      console.warn('Backend TTS service unavailable, using browser SpeechSynthesis fallback:', e)
    }

    if (!controller.signal.aborted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = 'ro-RO'
      utterance.rate = 1.0
      utterance.pitch = 1.0

      window.speechSynthesis.speak(utterance)
    }
  }, [stopAudioAndRecording])

  const startListening = useCallback(() => {
    setError(null)
    // Capture existing prompt text so new speech is appended smoothly without modifying or deleting past text
    baseQuestionRef.current = question

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'ro-RO'

        recognition.onstart = () => {
          setIsListening(true)
          setVoiceStatus('Dictare activă — vorbiți acum (oprire automată la 5s de pauză)...')
          resetSilenceTimer()
        }

        recognition.onresult = (event) => {
          resetSilenceTimer()

          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = 0; i < event.results.length; i++) {
            const transcriptChunk = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcriptChunk
            } else {
              interimTranscript += transcriptChunk
            }
          }

          const base = baseQuestionRef.current.trim()
          const currentDictated = (finalTranscript + interimTranscript).trim()

          const combined = base && currentDictated
            ? `${base} ${currentDictated}`
            : (base || currentDictated)

          setQuestion(cleanDuplicatePhrases(combined))
        }

        recognition.onerror = (e) => {
          console.warn('Speech recognition notice:', e.error)
          clearSilenceTimer()
          setIsListening(false)
          setVoiceStatus('')
        }

        recognition.onend = () => {
          clearSilenceTimer()
          setIsListening(false)
          setVoiceStatus('')
        }

        recognitionRef.current = recognition
        recognition.start()
        return
      } catch (err) {
        console.warn('Web Speech API initialization fallback:', err)
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream)
          mediaRecorderRef.current = mediaRecorder
          audioChunksRef.current = []

          // Setup AudioContext for silence detection
          let audioContext, analyser, checkSilence
          try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const source = audioContext.createMediaStreamSource(stream)
            analyser = audioContext.createAnalyser()
            analyser.fftSize = 512
            source.connect(analyser)

            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            let lastSoundTime = Date.now()

            checkSilence = setInterval(() => {
              analyser.getByteFrequencyData(dataArray)
              let sum = 0
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
              const average = sum / dataArray.length

              if (average > 8) {
                lastSoundTime = Date.now()
              } else if (Date.now() - lastSoundTime > 5000) {
                clearInterval(checkSilence)
                if (audioContext && audioContext.state !== 'closed') audioContext.close()
                stopListening()
                setVoiceStatus('Pauză de 5 secunde detectată — înregistrare oprită automat.')
              }
            }, 300)
          } catch (e) {
            console.warn('AudioContext volume detection fallback:', e)
          }

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data)
          }

          mediaRecorder.onstop = async () => {
            if (checkSilence) clearInterval(checkSilence)
            if (audioContext && audioContext.state !== 'closed') audioContext.close()

            setVoiceStatus('Se procesează transcrierea audio...')
            const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
            const file = new File([blob], 'voice_input.wav', { type: 'audio/wav' })
            try {
              const res = await api.transcribe(file)
              if (res.text) {
                const base = baseQuestionRef.current.trim()
                const transcribed = res.text.trim()
                const combined = base ? `${base} ${transcribed}` : transcribed
                setQuestion(cleanDuplicatePhrases(combined))
              }
            } catch (err) {
              setError(`Transcriere eșuată: ${err.message}`)
            } finally {
              setVoiceStatus('')
              setIsListening(false)
              stream.getTracks().forEach((t) => t.stop())
            }
          }

          mediaRecorder.start()
          setIsListening(true)
          setVoiceStatus('Înregistrare audio activă (oprire automată la 5s de pauză)...')
          resetSilenceTimer()
        })
        .catch((err) => {
          setError(`Microfon inaccesibil: ${err.message}`)
          setIsListening(false)
          setVoiceStatus('')
        })
    } else {
      setError('Interfața vocală nu este suportată de browserul dumneavoastră.')
    }
  }, [question, resetSilenceTimer, stopListening, clearSilenceTimer])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Shortcut Ctrl+M for instant voice chat / dictation
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault()
        toggleListening()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleListening])

  // Clear handler: immediately cancels pending text generation and stops ongoing audio output
  const handleClear = useCallback(() => {
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort() } catch {}
      abortControllerRef.current = null
    }
    stopAudioAndRecording()
    setMessages([])
    setError(null)
    setBusy(false)
  }, [stopAudioAndRecording])

  async function send() {
    const text = question.trim()
    if (!text || busy) return
    if (isListening) stopListening()

    stopAudioAndRecording()

    const controller = new AbortController()
    abortControllerRef.current = controller

    setQuestion(''); setError(null); setBusy(true)
    setMessages((m) => [...m, { role: 'user', text }])
    try {
      const data = await api.ask(
        { question: text, use_rag: useRag, top_k: Number(topK), agent, agent_mode: mode, fact_check: factCheck },
        { signal: controller.signal }
      )
      if (controller.signal.aborted) return

      setMessages((m) => [...m, { role: 'bot', data }])
      if (autoSpeak && data.answer) {
        playAudioResponse(data.answer)
      }
    } catch (e) {
      if (e.name === 'AbortError' || controller.signal.aborted) {
        return
      }
      setMessages((m) => [...m, { role: 'err', text: e.message }])
      setError(e.message)
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false)
      }
    }
  }

  const all = [...agents, ...hostedOnly]
  const current = all.find((a) => a.name === agent)

  const foundryReachable = foundry?.available
  const isHosted = current?.runs_on === 'both' || current?.runs_on === 'foundry'
  const localImpossible = current?.runs_on === 'foundry'
  const foundryBlocked =
    foundryReachable === false ||
    (foundryReachable === true && !isHosted)
  const foundryWhy =
    foundryReachable === false
      ? (foundry?.reason || 'The Agent Service cannot be reached from here.')
      : 'Not deployed to Foundry — deploy it from the Agents view'

  useEffect(() => {
    if (foundryBlocked && mode === 'foundry') setMode('local')
    else if (localImpossible && mode !== 'foundry') setMode('foundry')
  }, [agent, localImpossible, foundryBlocked])

  return (
    <div className="chat-wrap">
      <div className="chat-bar">
        <select value={agent} onChange={(e) => setAgent(e.target.value)} title="Which persona answers">
          {agents.map((a) => <option key={a.name} value={a.name}>{a.display_name}</option>)}
          {hostedOnly.length > 0 && (
            <optgroup label="hosted in Foundry only">
              {hostedOnly.map((a) => <option key={a.name} value={a.name}>{a.display_name}</option>)}
            </optgroup>
          )}
        </select>
        {current && <RunsOnBadge runsOn={current.runs_on} reason={foundry?.reason} />}
        <label className="check" style={{ margin: 0 }} title="Retrieve from your documents and ground the answer">
          <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
          use RAG
        </label>
        <label className="check" style={{ margin: 0 }}
               title="After answering, verify the answer against the open web and attach a verdict">
          <input type="checkbox" checked={factCheck} onChange={(e) => setFactCheck(e.target.checked)} />
          fact-check
        </label>
        <label className="check" style={{ margin: 0 }} title="Redă automat răspunsurile prin sinteză vocală (TTS)">
          <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
          🔊 TTS Auto-read
        </label>
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ minWidth: '9rem' }}
                title="Where the loop executes">
          <option value="local" disabled={localImpossible}
                  title={localImpossible ? 'This agent has no local JSON file' : ''}>
            local agent
          </option>
          <option value="foundry" disabled={foundryBlocked} title={foundryBlocked ? foundryWhy : ''}>
            Foundry agent{foundryReachable === false ? ' — no identity'
                          : foundryBlocked ? ' — not deployed' : ''}
          </option>
        </select>
        <input type="number" min="1" max="10" value={topK} onChange={(e) => setTopK(e.target.value)}
               style={{ width: '4.5rem', flex: '0 0 auto' }} title="Passages to retrieve" />
        {foundryReachable === false && (
          <span className="badge muted" title={foundryWhy}>
            hosted agents off — key auth
          </span>
        )}
        <button className="btn btn-outline btn-sm" onClick={handleClear} title="Clear conversation and stop TTS audio">clear</button>
        {current && <span className="badge muted" title={current.description}>temp {current.temperature ?? '—'}</span>}
      </div>

      <div className="msgs">
        {messages.length === 0 && (
          <div className="card" style={{ alignSelf: 'center', maxWidth: '46rem', textAlign: 'center' }}>
            <h3>Libra Assist</h3>
            <p className="muted" style={{ margin: 0 }}>
              Ask a question about the documents you have ingested. Switch the persona to change how
              it answers, or turn RAG off to see the model answer without grounding.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === 'user') return <div className="msg user" key={i}>{m.text}</div>
          if (m.role === 'err') return <div className="msg err" key={i}><strong>Request failed:</strong> {m.text}</div>
          const d = m.data
          return (
            <div className="msg bot" key={i}>
              {d.answer}
              <div className="msg-meta">
                <span className="badge">{d.agent?.display_name || 'agent'}</span>
                <span className={`badge ${d.augmented ? 'gold' : 'muted'}`}>{d.augmented ? 'grounded' : 'no retrieval'}</span>
                <span className="badge muted">{d.agent?.mode}</span>
                <span className="badge muted">{d.model}</span>
                {d.usage && <span className="badge muted">{d.usage.prompt_tokens}↑ {d.usage.completion_tokens}↓ tokens</span>}
                <button
                  className="badge"
                  style={{ background: 'var(--surface-2)', color: 'var(--accent)', cursor: 'pointer', border: 0 }}
                  onClick={() => playAudioResponse(d.answer)}
                  title="Play Audio"
                >
                  🔊 Play Audio
                </button>
                <button
                  className="badge"
                  style={{ background: 'var(--surface-2)', color: '#ff5264', cursor: 'pointer', border: 0 }}
                  onClick={stopAudioAndRecording}
                  title="Stop Audio and Recording"
                >
                  ⏹ Stop Audio
                </button>
              </div>
              {d.fact_check && (
                <div className="src" style={{ marginTop: '.55rem',
                     borderLeftColor: d.fact_check.verdict === 'supported' ? 'var(--c-teal)'
                       : d.fact_check.verdict === 'contradicted' ? 'var(--c-crimson)' : 'var(--c-gold)' }}>
                  <span className={`badge ${d.fact_check.verdict === 'contradicted' ? 'crimson'
                    : d.fact_check.verdict === 'supported' ? '' : 'gold'}`}>
                    fact-check: {d.fact_check.verdict}
                  </span>{' '}
                  <span className="faint">{d.fact_check.confidence} confidence · {d.fact_check.evidence_from}</span>
                  {d.fact_check.error
                    ? <div className="faint" style={{ marginTop: '.3rem' }}>{d.fact_check.error}</div>
                    : <div style={{ marginTop: '.3rem' }}>{d.fact_check.reasoning}</div>}
                  {d.fact_check.sources?.length > 0 && (
                    <ul className="faint" style={{ margin: '.35rem 0 0', paddingLeft: '1.1rem' }}>
                      {d.fact_check.sources.map((sc) => (
                        <li key={sc.rank}>
                          <a href={sc.url} target="_blank" rel="noreferrer">{sc.title || sc.url}</a>
                          {' '}{sc.used ? `(${sc.chars_read} chars read)` : '(could not be read)'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {d.retrieved?.length > 0 && (
                <details className="sources">
                  <summary>{d.retrieved.length} retrieved passage{d.retrieved.length > 1 ? 's' : ''}</summary>
                  {d.retrieved.map((h, j) => (
                    <div className="src" key={h.id}>
                      <span className="score">[{j + 1}] score {h.score.toFixed(4)}</span>
                      <div>{h.text}</div>
                    </div>
                  ))}
                </details>
              )}
              <details className="sources">
                <summary>the exact prompt that was sent</summary>
                <pre className="out" style={{ marginTop: '.4rem' }}>{`SYSTEM:\n${d.system_prompt}\n\nUSER:\n${d.prompt_sent}`}</pre>
              </details>
            </div>
          )
        })}
        {busy && <div className="msg bot"><span className="spin" /> thinking…</div>}
        <div ref={endRef} />
      </div>

      <Err error={error} />
      {voiceStatus && (
        <div className="voice-status-bar">
          <span className="dot-pulse" />
          <span>{voiceStatus}</span>
        </div>
      )}
      <div className="composer">
        <textarea value={question} placeholder="Ask Libra Assist… (Enter to send, Shift+Enter for new line, Ctrl+M for voice input)"
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button
          type="button"
          className={`btn-mic ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          title="Dictare vocală / Chat vocal (Scurtătură: Ctrl+M)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
          {isListening ? 'Înregistrare...' : 'Dictare (Ctrl+M)'}
        </button>
        <button className="btn btn-primary" onClick={send} disabled={busy || !question.trim()}>Send</button>
      </div>
    </div>
  )
}
