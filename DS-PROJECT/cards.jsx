/* cards.jsx — three card variations: Atlas, Diário, Coral */

const { useMemo } = React;

// ---------- shared bits ----------
function HealthDot({ kind, label }) {
  const cls = kind || 'na';
  const sym = { boa: '✓', atencao: '!', critica: '×', na: '–' }[cls] || '–';
  return (
    <span className={`health-dot ${cls}`} title={label}>{sym}</span>
  );
}

function PriorityPin({ priority }) {
  return <span className={`priority-pin priority-${priority}`} aria-hidden />;
}

function StaleBadge({ stale, t }) {
  if (!stale || stale === 'em-dia') return null;
  const txt = stale === 'critico' ? t.stale_critical : t.stale_attention;
  return <span className="atlas-stale">{txt}</span>;
}

function Icon({ name, size = 14 }) {
  // Minimal inline icons
  const paths = {
    pin: <><circle cx="12" cy="10" r="3" /><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" fill="none" /></>,
    users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2 20c0-3 3-5 7-5s7 2 7 5M14 19c.5-2 3-4 5.5-4 2 0 4 1.5 4 4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
    book: <><path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2zM20 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2z" /></>,
    waves: <><path d="M2 12c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3 2-3 4-3" /><path d="M2 17c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3 2-3 4-3" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {paths[name]}
    </svg>
  );
}

// ============================================================
// ATLAS CARD
// ============================================================
function CardAtlas({ p, t, onClick }) {
  const progress = SHEMA.getProgress(p);
  const priority = SHEMA.getPriority(p);
  const dl = SHEMA.getDeadlineInfo(p.deadline);
  const stale = SHEMA.getStaleStatus(p);

  const totalCount = `${p.translatedUnits || 0}/${p.totalUnits || 0}`;
  const types = (p.translationType || []).slice(0, 2);

  return (
    <article className={`card-atlas priority-${priority}`} onClick={onClick}>
      <div className={`atlas-stamp priority-${priority}`}>
        <div className="atlas-stamp-code">{p.languageCode || '—'}</div>
        <div className="atlas-stamp-label">ISO</div>
      </div>
      <div className="atlas-lang">
        <div className="atlas-lang-name">{p.languageName}</div>
        <div className="atlas-lang-meta">
          <span><Icon name="users" size={11} /> {p.team || '—'}</span>
          {p.location && <><span className="dot" /><span title={p.location}>{p.location.split('—')[0].trim()}</span></>}
          {p.bridgeLanguage && <><span className="dot" /><span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>{p.bridgeLanguage} → {p.languageName}</span></>}
        </div>
        <div className="atlas-tags">
          {types.map(typ => <span key={typ} className="atlas-tag">{typ}</span>)}
          {(p.objective || []).slice(0, 1).map(o => <span key={o} className="atlas-tag green">{o}</span>)}
          {p.portion && <span className="atlas-tag portion">📖 {p.portion}</span>}
          <StaleBadge stale={stale} t={t} />
        </div>
      </div>
      <div className="atlas-progress">
        <div className="atlas-progress-head">
          <span>{t.d_p_translated}</span>
          <strong>{totalCount} <span style={{ fontWeight: 500, color: 'var(--fg-muted)', fontSize: 11 }}>· {Math.round(progress)}%</span></strong>
        </div>
        <div className="atlas-bar"><div className="atlas-bar-fill" style={{ width: `${progress}%` }} /></div>
        <div className="atlas-bar-marks">
          <span>{p.communityCheckedUnits || 0} {t.d_p_community.toLowerCase()}</span>
          <span>{p.approvedUnits || 0} {t.d_p_approved.toLowerCase()}</span>
        </div>
      </div>
      <div className="atlas-health">
        <HealthDot kind={p.healthEmotional} label={t.d_emotional} />
        <HealthDot kind={p.healthRelational} label={t.d_relational} />
        <HealthDot kind={p.healthSpiritual} label={t.d_spiritual} />
      </div>
      <div className="atlas-deadline">
        <div className="deadline-label">{t.d_deadline}</div>
        {dl.days !== null ? (
          <div className={`deadline-val ${dl.cls}`}>
            {dl.days < 0 ? `${Math.abs(dl.days)}${t.days_overdue}` : `${dl.days}${t.days_remaining}`}
          </div>
        ) : <div className="deadline-val">—</div>}
      </div>
    </article>
  );
}

// ============================================================
// DIÁRIO CARD — field journal page
// ============================================================
function CardDiario({ p, t, onClick }) {
  const progress = SHEMA.getProgress(p);
  const priority = SHEMA.getPriority(p);
  const dl = SHEMA.getDeadlineInfo(p.deadline);
  const stale = SHEMA.getStaleStatus(p);

  // pull a quote: prefer prayer, then healthNotes, then needsNotes
  const quote = p.prayerRequests || p.healthNotes || p.needsNotes || p.notes || '';
  const truncatedQuote = quote.length > 140 ? quote.slice(0, 140) + '...' : quote;

  // date stamp — last update date
  const lastDate = SHEMA.getLastProgressUpdate(p);
  const dateLabel = lastDate ? SHEMA.formatDate(lastDate, t.locale).split(' ').slice(0, 2).join(' ') : '—';

  return (
    <article className={`card-diario priority-${priority}`} onClick={onClick}>
      <div className="diario-tape" />
      <PriorityPin priority={priority} />

      <div className="diario-head">
        <div className="diario-langgroup">
          <div className="diario-lang">{p.languageName}</div>
          <div className="diario-code">{p.languageCode || '—'} · {p.bridgeLanguage || ''}</div>
        </div>
        <div className="diario-stamp">
          <div className="diario-stamp-icon">
            <svg viewBox="280 230 620 270" xmlns="http://www.w3.org/2000/svg">
              <path d="M659.67,369.42V248.87H579.45A111.89,111.89,0,0,0,545.83,254c-28.48,8.95-46.6,36.88-46.6,36.88h0s-18.06-27.91-46.6-36.88A112,112,0,0,0,419,248.87H338.78V488.69H419a111.69,111.69,0,0,1,33.63,5.08c28.54,9,46.6,35,46.6,35h0s15.93-22.92,41.38-33.16q-.2-3.45-.2-6.94A119.4,119.4,0,0,1,659.67,369.42Z" />
              <path d="M630.44,488.69h29.23V459.26A29.36,29.36,0,0,0,630.44,488.69Z" />
              <path d="M593.31,488.69h21.35a45.16,45.16,0,0,1,45-45.21V422.33A66.44,66.44,0,0,0,593.31,488.69Z" />
              <path d="M556.19,488.69c0,.8,0,1.59,0,2.39a112.11,112.11,0,0,1,21.31-2.35v0a82.24,82.24,0,0,1,82.14-82.14V385.2A103.6,103.6,0,0,0,556.19,488.69Z" />
            </svg>
          </div>
          <div className="diario-stamp-day">{dateLabel}</div>
        </div>
      </div>

      <div className="diario-line">
        <span className="lbl">{t.d_facilitators}</span>
        <span className="val">{p.team}</span>
      </div>
      <div className="diario-line">
        <span className="lbl">{t.d_mentor}</span>
        <span className="val">{p.mentor || '—'}</span>
      </div>
      <div className="diario-line">
        <span className="lbl">{t.d_location}</span>
        <span className="val">{(p.location || '—').split('—')[0].trim()}</span>
      </div>
      <div className="diario-line">
        <span className="lbl">{t.d_speakers}</span>
        <span className="val">{p.speakerCount ? Number(p.speakerCount).toLocaleString(t.locale) : '—'}</span>
      </div>

      {truncatedQuote && (
        <div className="diario-quote">{truncatedQuote}</div>
      )}

      <div className="diario-foot">
        <div className="diario-progress-mini">
          <div className="row">
            <span>{(p.objective || []).slice(0, 1).join('') || '—'}</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div className="diario-bar"><div className="diario-bar-fill" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="diario-health">
          <HealthDot kind={p.healthEmotional} label={t.d_emotional} />
          <HealthDot kind={p.healthRelational} label={t.d_relational} />
          <HealthDot kind={p.healthSpiritual} label={t.d_spiritual} />
        </div>
      </div>
    </article>
  );
}

// ============================================================
// CORAL CARD — radial arc / wave-rooted
// ============================================================
function CardCoral({ p, t, onClick }) {
  const progress = SHEMA.getProgress(p);
  const priority = SHEMA.getPriority(p);
  const stale = SHEMA.getStaleStatus(p);
  const dl = SHEMA.getDeadlineInfo(p.deadline);

  // SVG radial: 3 concentric arcs for translated/community/approved
  const r1 = 38, r2 = 30, r3 = 22;
  const c1 = 2 * Math.PI * r1, c2 = 2 * Math.PI * r2, c3 = 2 * Math.PI * r3;
  const pTrans = p.totalUnits > 0 ? p.translatedUnits / p.totalUnits : 0;
  const pComm  = p.totalUnits > 0 ? (p.communityCheckedUnits || 0) / p.totalUnits : 0;
  const pAppr  = p.totalUnits > 0 ? (p.approvedUnits || 0) / p.totalUnits : 0;

  return (
    <article className={`card-coral priority-${priority}`} onClick={onClick}>
      <div className="coral-arc-bg" />
      <PriorityPin priority={priority} />

      <div className="coral-head">
        <div className="coral-langgroup">
          <div className="coral-lang">{p.languageName}</div>
          <div className="coral-langmeta">
            <strong>{p.languageCode || '—'}</strong> · {(p.location || '').split('—')[0].trim() || '—'}<br />
            {p.team}
          </div>
        </div>
        <div className="coral-radial">
          <svg viewBox="0 0 86 86">
            {/* tracks */}
            <circle cx="43" cy="43" r={r1} fill="none" stroke="rgba(63,62,32,0.10)" strokeWidth="4" />
            <circle cx="43" cy="43" r={r2} fill="none" stroke="rgba(63,62,32,0.10)" strokeWidth="4" />
            <circle cx="43" cy="43" r={r3} fill="none" stroke="rgba(63,62,32,0.10)" strokeWidth="4" />
            {/* fills */}
            <circle cx="43" cy="43" r={r1} fill="none" stroke="var(--shema-telha)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${c1 * pTrans} ${c1}`} />
            <circle cx="43" cy="43" r={r2} fill="none" stroke="var(--shema-azul)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${c2 * pComm} ${c2}`} />
            <circle cx="43" cy="43" r={r3} fill="none" stroke="var(--shema-verde-claro)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${c3 * pAppr} ${c3}`} />
          </svg>
          <div className="coral-radial-num">
            {Math.round(progress)}%
            <small>{t.d_p_translated.split(' ')[0]}</small>
          </div>
        </div>
      </div>

      <div className="coral-stats">
        <div className="coral-stat">
          <div className="coral-stat-num">{p.translatedUnits || 0}<small style={{ fontSize: 10, color: 'var(--fg-muted)', fontWeight: 500 }}>/{p.totalUnits || 0}</small></div>
          <div className="coral-stat-lbl" style={{ color: 'var(--shema-telha)' }}>● {t.d_p_translated.split(' ')[0]}</div>
        </div>
        <div className="coral-stat">
          <div className="coral-stat-num">{p.communityCheckedUnits || 0}</div>
          <div className="coral-stat-lbl" style={{ color: '#406560' }}>● {t.d_p_community.split('-')[0].split(' ')[0]}</div>
        </div>
        <div className="coral-stat">
          <div className="coral-stat-num">{p.approvedUnits || 0}</div>
          <div className="coral-stat-lbl" style={{ color: 'var(--shema-verde-claro)' }}>● {t.d_p_approved.split('-')[0].split(' ')[0]}</div>
        </div>
      </div>

      <div className="coral-foot">
        <div className="coral-foot-left">
          <HealthDot kind={p.healthEmotional} label={t.d_emotional} />
          <HealthDot kind={p.healthRelational} label={t.d_relational} />
          <HealthDot kind={p.healthSpiritual} label={t.d_spiritual} />
          {stale && stale !== 'em-dia' && (
            <span className="coral-tag">{stale === 'critico' ? t.stale_critical : t.stale_attention}</span>
          )}
        </div>
        {dl.days !== null && (
          <div className={`deadline-val ${dl.cls}`}>
            {dl.days < 0 ? `${Math.abs(dl.days)}${t.days_overdue}` : `${dl.days}${t.days_remaining}`}
          </div>
        )}
      </div>
    </article>
  );
}

Object.assign(window, { CardAtlas, CardDiario, CardCoral, HealthDot, PriorityPin, Icon });
