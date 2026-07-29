/* ritmo.jsx — "Ritmo" (cadence) view: the listening cascade + meeting tracker.
   Calendar-aligned periods. Tracks last-held / next-due / status per meeting,
   per region where applicable. Persists to localStorage. */

const { useState: useStateRt } = React;

// ---------- period math (calendar-aligned) ----------
function rtPeriodKey(cadence, date) {
  const d = date ? new Date(date) : new Date();
  const y = d.getFullYear();
  if (cadence === 'monthly') return y + '-' + String(d.getMonth() + 1).padStart(2, '0');
  if (cadence === 'quarterly') return y + '-Q' + (Math.floor(d.getMonth() / 3) + 1);
  return String(y);
}
function rtPrevPeriodKey(cadence, date) {
  const d = date ? new Date(date) : new Date();
  if (cadence === 'monthly') d.setMonth(d.getMonth() - 1);
  else if (cadence === 'quarterly') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return rtPeriodKey(cadence, d);
}
function rtPeriodDeadline(cadence, date) {
  const d = date ? new Date(date) : new Date();
  if (cadence === 'monthly') return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  if (cadence === 'quarterly') {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3 + 3, 0);
  }
  return new Date(d.getFullYear(), 11, 31);
}
function rtPeriodLabel(cadence, date, locale) {
  const d = date ? new Date(date) : new Date();
  if (cadence === 'monthly') {
    const m = d.toLocaleDateString(locale, { month: 'long' });
    return m.charAt(0).toUpperCase() + m.slice(1) + ' · ' + d.getFullYear();
  }
  if (cadence === 'quarterly') return 'T' + (Math.floor(d.getMonth() / 3) + 1) + ' · ' + d.getFullYear();
  return String(d.getFullYear());
}

// ---------- storage ----------
window.SHEMA = window.SHEMA || {};
window.SHEMA.loadRitmoLog = function () {
  try { return JSON.parse(localStorage.getItem('shema-ritmo-log') || '{}'); }
  catch (e) { return {}; }
};
window.SHEMA.saveRitmoLog = function (log) {
  try { localStorage.setItem('shema-ritmo-log', JSON.stringify(log)); } catch (e) {}
};

// ---------- the cascade ----------
const RITMO_MEETINGS = [
  { id: 'monthly_regional',   cadence: 'monthly',   scope: 'region', icon: 'pulse',
    roles: ['obtLab', 'teams'], feeds: 'pulso', readiness: 'pulso' },
  { id: 'monthly_prayer',     cadence: 'monthly',   scope: 'region', icon: 'prayer',
    roles: ['resourceCircle'], feeds: 'prayer' },
  { id: 'obtlab_team',        cadence: 'quarterly', scope: 'region', icon: 'heart',
    roles: ['obtLab', 'teams'], feeds: 'health', readiness: 'health' },
  { id: 'quarterly_regional', cadence: 'quarterly', scope: 'region', icon: 'users',
    roles: ['supervisor', 'obtLab', 'coordinator'], feeds: 'trends' },
  { id: 'annual_celebration', cadence: 'annual', scope: 'global', icon: 'spark',
    roles: ['everyone'], feeds: 'year' },
];

const RtIcon = {
  pulse: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>,
  heart: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 14c1.5-1.5 3-3.2 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" /></svg>,
  users: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-5-6.7" /></svg>,
  compass: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></svg>,
  spark: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>,
  check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5" /></svg>,
  prayer: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 21v-3a4 4 0 0 0-2-3.5L4 11" /><path d="M13 3v3a4 4 0 0 0 2 3.5L20 13" /><path d="M13 21v-3" /><path d="M11 3v3" /></svg>,
  coins: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></svg>,
};

// status for a meeting+scope at "now", given its log entries
function rtStatus(log, id, scopeKey, cadence) {
  const cur = rtPeriodKey(cadence);
  const prev = rtPrevPeriodKey(cadence);
  const curEntry = log[id + '__' + scopeKey + '__' + cur];
  if (curEntry) return { state: 'done', date: curEntry.date };
  const prefix = id + '__' + scopeKey + '__';
  const held = Object.keys(log)
    .filter(k => k.indexOf(prefix) === 0)
    .map(k => log[k].date)
    .filter(Boolean)
    .sort()
    .reverse();
  if (held.length === 0) return { state: 'new', date: null };
  const prevEntry = log[id + '__' + scopeKey + '__' + prev];
  if (prevEntry) return { state: 'pending', date: held[0] };
  return { state: 'overdue', date: held[0] };
}

function RitmoView(props) {
  const projects = props.projects;
  const t = props.t;
  const currentUser = props.currentUser;
  const locale = t.locale;

  const [log, setLog] = useStateRt(() => SHEMA.loadRitmoLog());
  const [editing, setEditing] = useStateRt(null);
  const [draftDate, setDraftDate] = useStateRt('');
  const [draftNotes, setDraftNotes] = useStateRt('');

  // continents that actually have projects, ordered by count
  const continentCounts = {};
  projects.forEach(p => {
    const c = SHEMA.getContinent(p);
    continentCounts[c] = (continentCounts[c] || 0) + 1;
  });
  const continents = Object.keys(continentCounts)
    .filter(k => continentCounts[k] > 0 && k !== 'other')
    .sort((a, b) => continentCounts[b] - continentCounts[a]);

  const continentLbl = {
    'south-america': t.continent_south_america, 'north-america': t.continent_north_america,
    'africa': t.continent_africa, 'asia': t.continent_asia, 'oceania': t.continent_oceania,
    'europe': t.continent_europe, 'other': t.continent_other,
  };
  const meetingMeta = {
    monthly_regional:   { title: t.ritmo_m1_title, desc: t.ritmo_m1_desc },
    monthly_prayer:     { title: t.ritmo_m6_title, desc: t.ritmo_m6_desc },
    obtlab_team:        { title: t.ritmo_m2_title, desc: t.ritmo_m2_desc },
    quarterly_regional: { title: t.ritmo_m3_title, desc: t.ritmo_m3_desc },
    annual_celebration: { title: t.ritmo_m5_title, desc: t.ritmo_m5_desc },
  };
  const cadenceLbl = { monthly: t.ritmo_monthly, quarterly: t.ritmo_quarterly, annual: t.ritmo_annual };
  const stateLbl = { done: t.ritmo_st_done, pending: t.ritmo_st_pending, overdue: t.ritmo_st_overdue, new: t.ritmo_st_new };
  const roleLabels = {
    supervisor: t.ritmo_role_supervisor, obtLab: t.role_obtlab, coordinator: t.role_coordinator,
    resourceCircle: t.role_resource, leadership: t.ritmo_role_leadership, resourcesTable: t.ritmo_role_resourcecircle,
    teams: t.ritmo_role_teams, everyone: t.ritmo_role_everyone,
  };
  const feedLabels = {
    pulso: t.ritmo_feed_pulso, health: t.ritmo_feed_health, trends: t.ritmo_feed_trends,
    rollup: t.ritmo_feed_rollup, year: t.ritmo_feed_year, prayer: t.ritmo_feed_prayer, resources: t.ritmo_feed_resources,
  };

  const startEdit = (key) => {
    setEditing(key);
    setDraftDate(new Date().toISOString().split('T')[0]);
    setDraftNotes('');
  };
  const saveEntry = (id, scopeKey, cadence) => {
    const period = rtPeriodKey(cadence, draftDate);
    const next = Object.assign({}, log);
    next[id + '__' + scopeKey + '__' + period] = { date: draftDate, notes: draftNotes };
    setLog(next); SHEMA.saveRitmoLog(next);
    setEditing(null);
  };
  const undoEntry = (id, scopeKey, cadence) => {
    const period = rtPeriodKey(cadence);
    const next = Object.assign({}, log);
    delete next[id + '__' + scopeKey + '__' + period];
    setLog(next); SHEMA.saveRitmoLog(next);
  };

  const readinessFor = (kind, continent) => {
    const inRegion = projects.filter(p => SHEMA.getContinent(p) === continent);
    if (inRegion.length === 0) return null;
    const now = new Date();
    let ready = 0;
    inRegion.forEach(p => {
      if (kind === 'pulso' && p.lastUpdated) {
        const d = new Date(p.lastUpdated);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) ready++;
      } else if (kind === 'health' && p.healthAssessmentDate) {
        const d = new Date(p.healthAssessmentDate);
        if (d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3)) ready++;
      }
    });
    return { ready: ready, total: inRegion.length };
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '—';

  const renderRow = (m, scopeKey, scopeLabel, count) => {
    const st = rtStatus(log, m.id, scopeKey, m.cadence);
    const key = m.id + '__' + scopeKey;
    const isEditing = editing === key;
    const deadline = rtPeriodDeadline(m.cadence);
    const readiness = m.readiness ? readinessFor(m.readiness, scopeKey) : null;
    return (
      <div className={'rt-row rt-state-' + st.state} key={key}>
        <div className="rt-row-main">
          <div className="rt-row-scope">
            <span className="rt-row-scope-name">{scopeLabel}</span>
            {count != null ? <span className="rt-row-scope-count">{count}</span> : null}
          </div>
          <div className="rt-row-meta">
            {readiness ? (
              <span className="rt-readiness" title={t.ritmo_readiness}>
                {readiness.ready}/{readiness.total} {t.ritmo_reported}
              </span>
            ) : null}
            <span className="rt-row-last">{t.ritmo_last}: <strong>{fmtDate(st.date)}</strong></span>
            <span className={'rt-pill rt-pill-' + st.state}>
              {st.state === 'done' ? <RtIcon.check width="11" height="11" /> : null}
              {stateLbl[st.state]}
            </span>
          </div>
        </div>
        {!isEditing ? (
          <div className="rt-row-actions">
            {st.state === 'done' ? (
              <React.Fragment>
                <span className="rt-done-note">{t.ritmo_done_this} {rtPeriodLabel(m.cadence, null, locale)}</span>
                <button className="rt-btn-ghost" onClick={() => undoEntry(m.id, scopeKey, m.cadence)}>{t.ritmo_undo}</button>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <span className="rt-next">{t.ritmo_next}: {fmtDate(deadline)}</span>
                <button className="rt-btn" onClick={() => startEdit(key)}>{t.ritmo_register}</button>
              </React.Fragment>
            )}
          </div>
        ) : (
          <div className="rt-edit">
            <div className="rt-edit-field">
              <label>{t.ritmo_date}</label>
              <input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} />
            </div>
            <div className="rt-edit-field rt-edit-notes">
              <label>{t.ritmo_notes}</label>
              <input type="text" value={draftNotes} onChange={e => setDraftNotes(e.target.value)} placeholder={t.ritmo_notes_ph} />
            </div>
            <div className="rt-edit-actions">
              <button className="rt-btn-ghost" onClick={() => setEditing(null)}>{t.btn_cancel}</button>
              <button className="rt-btn" onClick={() => saveEntry(m.id, scopeKey, m.cadence)}>{t.ritmo_save}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rt-wrap">
      <div className="rt-intro">
        <p className="rt-eyebrow">{t.ritmo_eyebrow}</p>
        <h1 className="rt-title">{t.ritmo_title}</h1>
        <p className="rt-lead">{t.ritmo_lead}</p>
      </div>

      <div className="rt-cascade">
        {RITMO_MEETINGS.map((m, i) => (
          <div className="rt-cascade-step" key={m.id}>
            <span className="rt-cascade-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="rt-cascade-label">{meetingMeta[m.id].title}</span>
            <span className="rt-cascade-cad">{cadenceLbl[m.cadence]}</span>
          </div>
        ))}
      </div>

      {RITMO_MEETINGS.map(m => {
        const meta = meetingMeta[m.id];
        const Ic = RtIcon[m.icon];
        const feedLbl = feedLabels[m.feeds];
        return (
          <section className="rt-meeting" key={m.id}>
            <div className="rt-meeting-head">
              <div className="rt-meeting-icon"><Ic width="22" height="22" /></div>
              <div className="rt-meeting-headtext">
                <div className="rt-meeting-titlerow">
                  <h2 className="rt-meeting-title">{meta.title}</h2>
                  <span className="rt-cadence-badge">{cadenceLbl[m.cadence]}</span>
                </div>
                <p className="rt-meeting-desc">{meta.desc}</p>
                <div className="rt-meeting-roles">
                  {m.roles.map(r => (
                    <span className="rt-role-chip" key={r}>
                      <span className="rt-role-chip-label">{roleLabels[r]}</span>
                    </span>
                  ))}
                </div>
                {feedLbl ? (
                  <div className="rt-feed"><span className="rt-feed-label">{t.ritmo_feeds}</span> {feedLbl}</div>
                ) : null}
              </div>
            </div>

            <div className="rt-rows">
              {m.scope === 'global'
                ? renderRow(m, 'global', t.ritmo_all_ecosystem, projects.length)
                : continents.map(c => renderRow(m, c, 'Shema ' + (continentLbl[c] || c), continentCounts[c]))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

Object.assign(window, { RitmoView });
