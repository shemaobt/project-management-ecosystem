/* notifications.jsx — NotificationsModal + bell button + prefs hook */

const { useState: useStateN, useEffect: useEffectN } = React;

const NOTIF_DEFAULTS = {
  enabled: true,
  channels: { email: true, push: true, whatsapp: false },
  when: 'now',            // now | urgent | daily
  scope: 'all',           // all | mentored | custom
  emailAddr: 'karina@shema.org',
  phoneAddr: '+55 11 9•••• ‑1234',
  log: [],
};

function loadNotifPrefs() {
  try {
    const raw = localStorage.getItem('shema-notif-prefs');
    if (!raw) return NOTIF_DEFAULTS;
    return { ...NOTIF_DEFAULTS, ...JSON.parse(raw) };
  } catch { return NOTIF_DEFAULTS; }
}
function saveNotifPrefs(prefs) {
  try { localStorage.setItem('shema-notif-prefs', JSON.stringify(prefs)); } catch {}
}

function useNotifications() {
  const [prefs, setPrefs] = useStateN(loadNotifPrefs);
  useEffectN(() => { saveNotifPrefs(prefs); }, [prefs]);

  const notify = (event) => {
    // event: { kind: 'health' | 'field' | 'urgent', project, summary }
    if (!prefs.enabled) return;
    const log = [{
      id: Date.now(),
      kind: event.kind,
      projectId: event.project?.id,
      projectName: event.project?.languageName,
      team: event.project?.team || event.project?.ywamBase,
      summary: event.summary || '',
      ts: new Date().toISOString(),
    }, ...prefs.log].slice(0, 30);
    setPrefs(p => ({ ...p, log }));
  };

  return { prefs, setPrefs, notify };
}

function NotificationsModal({ prefs, setPrefs, onClose, t }) {
  const togglePref = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  const toggleChannel = (k) => setPrefs(p => ({ ...p, channels: { ...p.channels, [k]: !p.channels[k] } }));
  const channels = prefs.channels;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal nm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hero nm-hero">
          <div className="modal-hero-row">
            <div>
              <div className="modal-hero-eyebrow">Coordenação</div>
              <div className="modal-hero-title">Notificações do campo</div>
              <div className="modal-hero-sub">Avise-me sempre que uma equipe enviar um formulário. Eu escolho como e quando.</div>
            </div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body nm-body">
          {/* Master */}
          <div className="nm-masterbox">
            <div className="nm-masterbox-icon">🔔</div>
            <div style={{ flex: 1 }}>
              <div className="nm-masterbox-title">Notificar a cada envio</div>
              <div className="nm-masterbox-sub">{prefs.enabled ? 'Ativo' : 'Desativado'} · funciona em todos os projetos</div>
            </div>
            <label className="nm-switch nm-switch-lg">
              <input type="checkbox" checked={prefs.enabled} onChange={e => togglePref('enabled', e.target.checked)}/>
              <span/>
            </label>
          </div>

          <div className="nm-section-label"><span className="nm-num">01</span> Onde quero receber</div>
          <div className="nm-list">
            <div className={`nm-row ${channels.email ? 'nm-row-on' : ''}`}>
              <div className="nm-row-icon">✉</div>
              <div className="nm-row-text">
                <div className="nm-row-title">Email</div>
                <input className="nm-row-input" value={prefs.emailAddr} onChange={e => togglePref('emailAddr', e.target.value)}/>
              </div>
              <label className="nm-switch"><input type="checkbox" checked={channels.email} onChange={() => toggleChannel('email')}/><span/></label>
            </div>
            <div className={`nm-row ${channels.push ? 'nm-row-on' : ''}`}>
              <div className="nm-row-icon">📱</div>
              <div className="nm-row-text">
                <div className="nm-row-title">Push neste aparelho</div>
                <div className="nm-row-sub">Avisos diretos no navegador</div>
              </div>
              <label className="nm-switch"><input type="checkbox" checked={channels.push} onChange={() => toggleChannel('push')}/><span/></label>
            </div>
            <div className={`nm-row ${channels.whatsapp ? 'nm-row-on' : ''}`}>
              <div className="nm-row-icon">💬</div>
              <div className="nm-row-text">
                <div className="nm-row-title">WhatsApp</div>
                <input className="nm-row-input" value={prefs.phoneAddr} onChange={e => togglePref('phoneAddr', e.target.value)}/>
              </div>
              <label className="nm-switch"><input type="checkbox" checked={channels.whatsapp} onChange={() => toggleChannel('whatsapp')}/><span/></label>
            </div>
          </div>

          <div className="nm-section-label"><span className="nm-num">02</span> Quando avisar</div>
          <div className="nm-radiogroup">
            {[
              ['now', 'Na hora', 'Cada formulário gera uma notificação imediata.'],
              ['urgent', 'Só os urgentes', 'Saúde crítica, pedido urgente, sem notícias 60+ dias.'],
              ['daily', 'Resumo diário', 'Um digest às 08h com tudo que chegou no dia.'],
            ].map(([v, lbl, sub]) => (
              <label key={v} className={`nm-radio ${prefs.when === v ? 'nm-radio-on' : ''}`} onClick={() => togglePref('when', v)}>
                <span className="nm-radio-dot"/>
                <div>
                  <div className="nm-radio-title">{lbl}</div>
                  <div className="nm-radio-sub">{sub}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="nm-section-label"><span className="nm-num">03</span> Quais projetos</div>
          <div className="nm-scope">
            {[
              ['all', 'Todos os projetos', 'Padrão da coordenação'],
              ['mentored', 'Só projetos que mentoro', 'Filtrado pelo seu nome em "Mentor"'],
              ['custom', 'Lista personalizada', 'Escolher projetos manualmente'],
            ].map(([v, lbl, sub]) => (
              <div key={v} className={`nm-scope-row ${prefs.scope === v ? 'nm-scope-row-on' : ''}`} onClick={() => togglePref('scope', v)}>
                <div className="nm-scope-radio">{prefs.scope === v && '✓'}</div>
                <div>
                  <div className="nm-scope-title">{lbl}</div>
                  <div className="nm-scope-sub">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="nm-section-label"><span className="nm-num">04</span> Pré-visualização</div>
          <div className="nm-preview">
            <div className="nm-preview-app">
              <span className="nm-preview-mark">●</span>
              <span className="nm-preview-app-name">Shema</span>
              <span className="nm-preview-app-time">agora</span>
            </div>
            <div className="nm-preview-title">Fresia enviou o pulso de maio</div>
            <div className="nm-preview-body"><strong>Asháninka · YWAM Aurora</strong> — +4 capítulos traduzidos, equipe cansada mas firme, pedindo treinamento de checagem.</div>
          </div>

          {prefs.log.length > 0 && (
            <>
              <div className="nm-section-label"><span className="nm-num">05</span> Últimas notificações</div>
              <div className="nm-log">
                {prefs.log.slice(0, 8).map(l => {
                  const ago = relativeTime(new Date(l.ts));
                  return (
                    <div key={l.id} className="nm-log-row">
                      <div className={`nm-log-dot ${l.kind === 'urgent' ? 'nm-log-dot-urgent' : 'nm-log-dot-new'}`}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="nm-log-title">{l.projectName || '—'} · {l.team || '—'}</div>
                        <div className="nm-log-sub">{l.summary || ({ field: 'Pulso recebido', health: 'Avaliação de saúde recebida' }[l.kind] || 'Notificação')}</div>
                      </div>
                      <span className="nm-log-time">{ago}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          <div className="nm-foot-note">Suas preferências ficam salvas neste navegador.</div>
          <div className="foot-actions">
            <button className="btn primary" onClick={onClose}>✓ Salvar e fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function relativeTime(d) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `${days} dias`;
  return d.toLocaleDateString('pt-BR');
}

// Bell button for the topbar
function NotifBell({ count, onClick }) {
  return (
    <button className="tb-btn tb-bell" onClick={onClick} title="Notificações">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
      {count > 0 && <span className="tb-bell-count">{count}</span>}
    </button>
  );
}

Object.assign(window, { NotificationsModal, NotifBell, useNotifications });
