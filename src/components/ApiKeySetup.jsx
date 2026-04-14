import { useState } from 'react'
import { useApiStore } from '../store/apiStore'
import { useUiStore } from '../store/uiStore'

const PROVIDERS = [
  {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']
  },
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768']
  },
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct']
  },
  {
    name: 'Custom',
    url: '',
    models: []
  }
]

export default function ApiKeySetup() {
  const { saveConfig } = useApiStore()
  const { toggleApiSetup } = useUiStore()
  const currentConfig = useApiStore(s => s.config)
  const [provider, setProvider] = useState('OpenAI')
  const [url, setUrl] = useState(currentConfig?.url || PROVIDERS[0].url)
  const [key, setKey] = useState(currentConfig?.key || '')
  const [model, setModel] = useState(currentConfig?.model || 'gpt-4o-mini')
  const [customModel, setCustomModel] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const selectedProvider = PROVIDERS.find(p => p.name === provider)

  const handleProviderChange = (name) => {
    const p = PROVIDERS.find(pr => pr.name === name)
    setProvider(name)
    if (p.url) setUrl(p.url)
    if (p.models?.[0]) setModel(p.models[0])
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: customModel || model,
          messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
          max_tokens: 10
        })
      })
      if (res.ok) {
        setTestResult({ success: true, message: 'Connessione riuscita!' })
      } else {
        const err = await res.text()
        setTestResult({ success: false, message: `Errore ${res.status}: ${err.slice(0, 100)}` })
      }
    } catch (e) {
      setTestResult({ success: false, message: `Errore di rete: ${e.message}` })
    }
    setTesting(false)
  }

  const handleSave = () => {
    const finalModel = customModel || model
    if (!url || !key || !finalModel) return
    saveConfig({ url, key, model: finalModel })
    toggleApiSetup(false)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && null}>
      <div className="modal-content api-setup">
        <div className="modal-header">
          <h2>Configurazione API</h2>
          <p className="modal-subtitle">Connetti il tuo provider AI per generare itinerari</p>
        </div>

        <div className="form-group">
          <label>Provider</label>
          <div className="provider-grid">
            {PROVIDERS.map(p => (
              <button
                key={p.name}
                className={`provider-btn ${provider === p.name ? 'active' : ''}`}
                onClick={() => handleProviderChange(p.name)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Endpoint URL</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://api.example.com/v1/chat/completions"
          />
        </div>

        <div className="form-group">
          <label>API Key</label>
          <div className="input-with-action">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-..."
            />
            <button className="input-action-btn" onClick={() => setShowKey(!showKey)}>
              <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Modello</label>
          {selectedProvider?.models?.length ? (
            <div className="model-grid">
              {selectedProvider.models.map(m => (
                <button
                  key={m}
                  className={`model-btn ${model === m ? 'active' : ''}`}
                  onClick={() => { setModel(m); setCustomModel('') }}
                >
                  {m}
                </button>
              ))}
              <button
                className={`model-btn ${customModel ? 'active' : ''}`}
                onClick={() => setCustomModel('custom')}
              >
                Altro...
              </button>
            </div>
          ) : null}
          {(customModel === 'custom' || !selectedProvider?.models?.length) && (
            <input
              type="text"
              value={customModel === 'custom' ? '' : customModel}
              onChange={e => setCustomModel(e.target.value)}
              placeholder="nome-del-modello"
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <i className={`fas ${testResult.success ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {testResult.message}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleTest} disabled={testing || !url || !key}>
            {testing ? <><i className="fas fa-spinner fa-spin"></i> Test...</> : <><i className="fas fa-plug"></i> Test Connessione</>}
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!url || !key || !(customModel || model)}>
            <i className="fas fa-check"></i> Salva
          </button>
        </div>
      </div>
    </div>
  )
}
