/* app.jsx — main App, header, sidebar, layout, state */

const { useState, useEffect, useMemo, useRef } = React;

const STORAGE_KEY = 'shema-projects-v9';
const PREFS_KEY = 'shema-prefs-v1';

// Tweakable defaults — picked up by the host editor
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "metaphor": "atlas",
  "lang": "pt",
  "showHero": true,
  "accent": "telha"
}/*EDITMODE-END*/;

// ============================================================
// HEADER (top bar)
// ============================================================
function TopBar({ lang, onLangToggle, onNew, onExport, onImportClick, onFieldImportClick, onBellClick, onIntakeLink, onReloadData, notifCount, t }) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="icon-mark">
          <svg viewBox="280 230 620 270" xmlns="http://www.w3.org/2000/svg">
            <path d="M659.67,369.42V248.87H579.45A111.89,111.89,0,0,0,545.83,254c-28.48,8.95-46.6,36.88-46.6,36.88h0s-18.06-27.91-46.6-36.88A112,112,0,0,0,419,248.87H338.78V488.69H419a111.69,111.69,0,0,1,33.63,5.08c28.54,9,46.6,35,46.6,35h0s15.93-22.92,41.38-33.16q-.2-3.45-.2-6.94A119.4,119.4,0,0,1,659.67,369.42Z" />
            <path d="M630.44,488.69h29.23V459.26A29.36,29.36,0,0,0,630.44,488.69Z" />
            <path d="M593.31,488.69h21.35a45.16,45.16,0,0,1,45-45.21V422.33A66.44,66.44,0,0,0,593.31,488.69Z" />
            <path d="M556.19,488.69c0,.8,0,1.59,0,2.39a112.11,112.11,0,0,1,21.31-2.35v0a82.24,82.24,0,0,1,82.14-82.14V385.2A103.6,103.6,0,0,0,556.19,488.69Z" />
          </svg>
        </span>
        <span>SHEMA</span>
        <span className="brand-divider" />
        <span className="brand-sub">{t.app_sub}</span>
      </div>
      <div className="topbar-actions">
        <button className="tb-btn tb-lang" onClick={onLangToggle} title="Language">
          {lang === 'pt' ? '🇺🇸 EN' : '🇧🇷 PT'}
        </button>
        <NotifBell count={notifCount} onClick={onBellClick} />
        <button className="tb-btn" onClick={onFieldImportClick}>📨 {t.btn_field}</button>
        <button className="tb-btn" onClick={onExport}>↓ {t.btn_export}</button>
        <button className="tb-btn" onClick={onImportClick}>↑ {t.btn_import}</button>
        <button className="tb-btn" onClick={onReloadData} title={t.btn_reload_title}>⟳ {t.btn_reload}</button>
        <button className="tb-btn" onClick={onIntakeLink}>🔗 {t.btn_intake}</button>
        <button className="tb-btn primary" onClick={onNew}>+ {t.btn_new}</button>
      </div>
    </header>
  );
}

// ============================================================
// HERO (headline + stats)
// ============================================================
function Hero({ projects, t }) {
  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(p => {
      const s = SHEMA.getProjectStatus(p);
      return s === 'em-andamento' || s === 'final';
    }).length;
    const completed = projects.filter(p => SHEMA.getProjectStatus(p) === 'concluido').length;
    const urgent = projects.filter(p => SHEMA.getOverallHealth(p) === 'critica' || (p.deadline && new Date(p.deadline) < new Date('2026-05-14'))).length;
    const teams = new Set(projects.map(p => p.team).filter(Boolean)).size;
    const staleCritico = projects.filter(p => SHEMA.getStaleStatus(p) === 'critico').length;
    const staleAtencao = projects.filter(p => SHEMA.getStaleStatus(p) === 'atencao').length;
    const staleTotal = staleCritico + staleAtencao;
    return { total, inProgress, completed, urgent, teams, staleTotal, staleCritico };
  }, [projects]);

  return (
    <section className="hero">
      <div className="hero-shema" aria-hidden>שמע</div>
      <div className="hero-inner">
        <div className="hero-headline">
          <div className="hero-eyebrow">{t.headline_eyebrow}</div>
          <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: t.headline }} />
          <div className="hero-sub">{t.headline_sub}</div>
        </div>
        <div className="stats-row">
          <div className="stat">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">{t.stat_total}</div>
            <div className="stat-tail">{t.stat_total_tail}</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.teams}</div>
            <div className="stat-label">{t.stat_teams}</div>
            <div className="stat-tail">{t.stat_teams_tail}</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.inProgress}</div>
            <div className="stat-label">{t.stat_progress}</div>
            <div className="stat-tail">{t.stat_progress_tail}</div>
          </div>
          <div className="stat">
            <div className="stat-num">{stats.completed}</div>
            <div className="stat-label">{t.stat_completed}</div>
            <div className="stat-tail">{t.stat_completed_tail}</div>
          </div>
          <div className="stat">
            <div className="stat-num accent">{stats.urgent}</div>
            <div className="stat-label">{t.stat_urgent}</div>
            <div className="stat-tail">{t.stat_urgent_tail}</div>
          </div>
          <div className="stat">
            <div className="stat-num accent">{stats.staleTotal}</div>
            <div className="stat-label">{t.stat_stale}</div>
            <div className="stat-tail">{t.stat_stale_tail}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SIDEBAR
// ============================================================

// Small Lucide-style icon helper. 1.75 stroke, round caps.
const SbIcon = {
  search: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  user: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  alert: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 2.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 2.86a2 2 0 0 0-3.41 0Z"/></svg>,
  prayer: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 21v-3a4 4 0 0 0-2-3.5L4 11"/><path d="M13 3v3a4 4 0 0 0 2 3.5L20 13"/><path d="M13 21v-3"/><path d="M11 3v3"/></svg>,
  spark: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>,
  bookmark: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"/></svg>,
  plus: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  minus: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/></svg>,
  x: (p) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  chevron: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  clock: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  globe: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg>,
};

// The 4 combinable presets — order matters in the chip row
const SB_PRESETS = [
  { id: 'attention', icon: 'alert', titleKey: 'preset_urgent', subKey: 'preset_urgent_sub' },
  { id: 'prayer', icon: 'prayer', titleKey: 'preset_prayer', subKey: 'preset_prayer_sub' },
  { id: 'celebrate', icon: 'spark', titleKey: 'preset_celebrate', subKey: 'preset_celebrate_sub' },
  { id: 'recent', icon: 'clock', titleKey: 'preset_recent', subKey: 'preset_recent_sub' },
];

// Test a project against a preset boolean (used in filter + in count display).
function matchesPreset(p, presetId) {
  if (presetId === 'recent') {
    if (!p.lastUpdated) return false;
    const days = (Date.now() - new Date(p.lastUpdated).getTime()) / 86400000;
    return days <= 30;
  }
  if (presetId === 'attention') {
    const h = SHEMA.getOverallHealth(p);
    const s = SHEMA.getStaleStatus(p);
    const urgentNeed = (p.needsItems || []).some(it => it.urgency === 'high' && it.status !== 'fulfilled');
    return h === 'critica' || s === 'critico' || urgentNeed;
  }
  if (presetId === 'prayer') {
    return (p.needsItems || []).some(it => it.prayerShared);
  }
  if (presetId === 'celebrate') {
    const completed = SHEMA.getProjectStatus(p) === 'concluido';
    const answered = (p.needsItems || []).some(it => it.prayerAnswered);
    return completed || answered;
  }
  return true;
}

// Primary (always-visible) filter sections — these 4 carry the most signal
const PRIMARY_SECTIONS = ['status', 'team', 'health'];

function Sidebar({ projects, filteredCount, filters, setFilters, search, setSearch, t, currentUser, setCurrentUser, savedViews, setSavedViews }) {
  const [expanded, setExpanded] = React.useState(() => new Set(['status', 'team', 'health']));
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const toggleSection = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ----- counts (one pass)
  const counts = useMemo(() => {
    const c = {
      team: {}, obj: {}, status: {}, health: { boa: 0, atencao: 0, critica: 0, na: 0 },
      financial: {}, stale: { 'em-dia': 0, atencao: 0, critico: 0 },
      country: {}, continent: {}, vitality: {}, translationType: {}, needCategory: {},
      preset: { attention: 0, prayer: 0, celebrate: 0, recent: 0 },
    };
    projects.forEach(p => {
      if (p.team) c.team[p.team] = (c.team[p.team] || 0) + 1;
      (p.objective || []).forEach(o => c.obj[o] = (c.obj[o] || 0) + 1);
      c.status[SHEMA.getProjectStatus(p)] = (c.status[SHEMA.getProjectStatus(p)] || 0) + 1;
      c.health[SHEMA.getOverallHealth(p)] = (c.health[SHEMA.getOverallHealth(p)] || 0) + 1;
      (p.financialResources || []).forEach(f => c.financial[f] = (c.financial[f] || 0) + 1);
      const st = SHEMA.getStaleStatus(p);
      if (st) c.stale[st] = (c.stale[st] || 0) + 1;
      const country = (p.location || '').split(',')[0].trim();
      if (country) c.country[country] = (c.country[country] || 0) + 1;
      const cont = SHEMA.getContinent(p);
      if (cont) c.continent[cont] = (c.continent[cont] || 0) + 1;
      if (p.vitalityStatus) c.vitality[p.vitalityStatus] = (c.vitality[p.vitalityStatus] || 0) + 1;
      (p.translationType || []).forEach(tt => c.translationType[tt] = (c.translationType[tt] || 0) + 1);
      (p.needsItems || []).forEach(it => {
        if (it.category) c.needCategory[it.category] = (c.needCategory[it.category] || 0) + 1;
      });
      SB_PRESETS.forEach(pr => {
        if (matchesPreset(p, pr.id)) c.preset[pr.id]++;
      });
    });
    return c;
  }, [projects, currentUser]);

  // ----- labels
  const statusLbl = {
    'nao-iniciado': t.status_not_started, 'em-andamento': t.status_in_progress, 'final': t.status_final,
    'concluido': t.status_completed, 'pausado': t.status_paused, 'cancelado': t.status_canceled,
    'planejado': t.status_planned, 'desconhecido': t.status_unknown,
  };
  const healthLbl = { boa: t.health_good, atencao: t.health_attention, critica: t.health_critical, na: t.health_na };
  const staleLbl = { 'em-dia': t.stale_uptodate, atencao: t.stale_attention, critico: t.stale_critical };
  const needCatLbl = {
    financial: t.need_cat_financial, training: t.need_cat_training, equipment: t.need_cat_equipment,
    volunteers: t.need_cat_volunteers, material: t.need_cat_material,
    security: t.need_cat_security, connectivity: t.need_cat_connectivity,
    logistics: t.need_cat_logistics, documentation: t.need_cat_documentation,
  };
  const continentLbl = {
    'south-america': t.continent_south_america, 'north-america': t.continent_north_america,
    'africa': t.continent_africa, 'asia': t.continent_asia, 'oceania': t.continent_oceania,
    'europe': t.continent_europe, 'other': t.continent_other,
  };
  // Continents that actually have projects, ordered by count desc — for the coordinators panel
  const continentsWithProjects = Object.entries(counts.continent)
    .filter(([k, v]) => v > 0 || k === 'europe')
    .sort((a, b) => b[1] - a[1]);

  const setFilter = (key, val) => setFilters({ ...filters, [key]: val });
  const togglePreset = (id) => setFilters({ ...filters, [id]: !filters[id] });
  const clearAll = () => setFilters({ ...emptyFilters });

  // ----- active filter chips (for the "active filters" row)
  const activeChips = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v === null || v === undefined || v === false) continue;
    let label = '';
    if (k === 'attention' || k === 'prayer' || k === 'celebrate' || k === 'recent') {
      const pr = SB_PRESETS.find(x => x.id === k);
      if (pr) label = t[pr.titleKey];
    } else if (k === 'team' || k === 'objective' || k === 'country' || k === 'vitality' || k === 'translationType' || k === 'financial') {
      label = v;
    } else if (k === 'status') label = statusLbl[v] || v;
    else if (k === 'health') label = healthLbl[v] || v;
    else if (k === 'stale') label = staleLbl[v] || v;
    else if (k === 'continent') label = continentLbl[v] || v;
    else if (k === 'eten') label = `ETEN: ${v === 'yes' ? t.bool_yes : t.bool_no}`;
    else if (k === 'sensitive') label = `${t.sb_sensitive}: ${v === 'yes' ? t.sensitive_yes : t.sensitive_no}`;
    else if (k === 'progressRange') label = `${t.sb_progress_range}: ${v}%`;
    else if (k === 'needCategory') label = needCatLbl[v] || v;
    else if (k === 'hasMedia') label = v === 'yes' ? t.media_has : t.media_none;
    if (label) activeChips.push({ key: k, val: v, label });
  }
  const hasAnyFilter = activeChips.length > 0 || !!search;

  // ----- saved views
  const handleSaveView = () => {
    const name = window.prompt(t.sb_save_view_prompt);
    if (!name) return;
    const view = {
      id: Date.now().toString(),
      name: name.slice(0, 40),
      filters: { ...filters },
      search,
    };
    setSavedViews([view, ...savedViews].slice(0, 12));
  };
  const handleApplyView = (view) => {
    setFilters({ ...emptyFilters, ...view.filters });
    setSearch(view.search || '');
  };
  const handleDeleteView = (id) => {
    setSavedViews(savedViews.filter(v => v.id !== id));
  };

  // ----- reusable section renderer
  const Section = ({ id, title, counts, filterKey, labels, sortBy }) => {
    let entries = Object.entries(counts).filter(([k, v]) => v > 0 && k !== 'na');
    if (sortBy === 'count') entries.sort((a, b) => b[1] - a[1]);
    else entries.sort((a, b) => {
      const la = (labels?.[a[0]] || a[0]).toString();
      const lb = (labels?.[b[0]] || b[0]).toString();
      return la.localeCompare(lb);
    });
    if (entries.length === 0) return null;
    const isOpen = expanded.has(id);
    return (
      <div className="sb-section">
        <button type="button" className={`sb-section-head ${isOpen ? 'open' : ''}`} onClick={() => toggleSection(id)}>
          <span className="sb-section-title">{title}</span>
          <span className="sb-section-chev">{isOpen ? <SbIcon.minus/> : <SbIcon.plus/>}</span>
        </button>
        {isOpen && (
          <div className="sb-section-body">
            <button type="button" className={`sb-chip ${!filters[filterKey] ? 'active' : ''}`} onClick={() => setFilter(filterKey, null)}>
              <span>{t.filter_all}</span>
              <span className="sb-chip-count">{projects.length}</span>
            </button>
            {entries.map(([k, v]) => {
              const isCritical = (filterKey === 'health' && k === 'critica') ||
                (filterKey === 'stale' && k === 'critico') ||
                (filterKey === 'status' && k === 'cancelado');
              return (
                <button key={k} type="button" className={`sb-chip ${filters[filterKey] === k ? 'active' : ''} ${isCritical && filters[filterKey] !== k ? 'critical' : ''}`} onClick={() => setFilter(filterKey, k)}>
                  <span>{labels ? (labels[k] || k) : k}</span>
                  <span className="sb-chip-count">{v}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const BoolSection = ({ id, title, filterKey, options }) => {
    const isOpen = expanded.has(id);
    return (
      <div className="sb-section">
        <button type="button" className={`sb-section-head ${isOpen ? 'open' : ''}`} onClick={() => toggleSection(id)}>
          <span className="sb-section-title">{title}</span>
          <span className="sb-section-chev">{isOpen ? <SbIcon.minus/> : <SbIcon.plus/>}</span>
        </button>
        {isOpen && (
          <div className="sb-section-body">
            <button type="button" className={`sb-chip ${!filters[filterKey] ? 'active' : ''}`} onClick={() => setFilter(filterKey, null)}>
              <span>{t.filter_all}</span>
            </button>
            {options.map(([val, lbl]) => (
              <button key={val} type="button" className={`sb-chip ${filters[filterKey] === val ? 'active' : ''}`} onClick={() => setFilter(filterKey, val)}>
                <span>{lbl}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      {/* STICKY HEADER: search + presets + result count */}
      <div className="sb-sticky">
        <div className="sb-search">
          <span className="sb-search-icon"><SbIcon.search/></span>
          <input
            className="sb-search-input"
            placeholder={t.search_placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="sb-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <SbIcon.x/>
            </button>
          )}
        </div>

        {/* Supervisor identity — role, not ownership */}
        <div className="sb-whoami">
          <SbIcon.globe/>
          <span className="sb-whoami-label">{t.sb_current_user}</span>
          <input
            className="sb-whoami-input"
            value={currentUser}
            onChange={e => setCurrentUser(e.target.value)}
            placeholder="—"
          />
        </div>

        {/* PRESET CHIPS — horizontal, combinable */}
        <div className="sb-presets-row">
          {SB_PRESETS.map(p => {
            const Ic = SbIcon[p.icon];
            const count = counts.preset[p.id] || 0;
            const isActive = !!filters[p.id];
            const disabled = count === 0;
            return (
              <button
                key={p.id}
                type="button"
                className={`sb-preset-chip ${isActive ? 'active' : ''} ${disabled ? 'empty' : ''}`}
                onClick={() => togglePreset(p.id)}
                disabled={disabled}
                title={t[p.subKey]}
              >
                <span className="sb-preset-icon"><Ic/></span>
                <span className="sb-preset-label">{t[p.titleKey]}</span>
                <span className="sb-preset-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* RESULT COUNT + CLEAR */}
        <div className="sb-results-row">
          <span className="sb-results-text">
            {t.sb_results_count} <strong>{filteredCount}</strong> {t.sb_results_of} <strong>{projects.length}</strong>
          </span>
          {hasAnyFilter && (
            <button type="button" className="sb-clear-all" onClick={clearAll}>
              {t.sb_clear_all}
            </button>
          )}
        </div>
      </div>

      {/* SAVED VIEWS */}
      <div className="sb-saved">
        <div className="sb-eyebrow-row">
          <span className="sb-eyebrow"><SbIcon.bookmark/> {t.sb_saved_views}</span>
          {hasAnyFilter && (
            <button type="button" className="sb-save-view-btn" onClick={handleSaveView}>
              <SbIcon.plus/> {t.sb_save_view}
            </button>
          )}
        </div>
        {savedViews.length === 0 ? (
          <p className="sb-no-saved">{t.sb_no_saved_views}</p>
        ) : (
          <div className="sb-saved-list">
            {savedViews.map(v => (
              <div key={v.id} className="sb-saved-row">
                <button type="button" className="sb-saved-name" onClick={() => handleApplyView(v)}>
                  <SbIcon.bookmark/>
                  <span>{v.name}</span>
                </button>
                <button type="button" className="sb-saved-del" onClick={() => handleDeleteView(v.id)} aria-label="Delete">
                  <SbIcon.trash/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TIME REGIONAL — reflects the org: 3 roles per continent, Karina supervises all */}
      <div className="sb-coords">
        <div className="sb-eyebrow-row">
          <span className="sb-eyebrow"><SbIcon.globe/> {t.sb_regional_team}</span>
        </div>
        <div className="sb-coords-list">
          {continentsWithProjects.map(([cont, n]) => {
            const team = SHEMA.getTeamForContinent(cont);
            const active = filters.continent === cont;
            return (
              <div key={cont} className={`sb-region-card ${active ? 'active' : ''}`}>
                <button
                  type="button"
                  className="sb-region-head"
                  onClick={() => setFilter('continent', active ? null : cont)}
                >
                  <span className="sb-region-name">Shema {continentLbl[cont] || cont}</span>
                  <span className="sb-region-count">{n}</span>
                </button>
                <div className="sb-region-roles">
                  <div className="sb-role">
                    <span className="sb-role-label">{t.role_coordinator}</span>
                    <span className="sb-role-name">{team.coordinator || t.sb_no_coordinator}</span>
                  </div>
                  <div className="sb-role">
                    <span className="sb-role-label">{t.role_obtlab}</span>
                    <span className="sb-role-name">{team.obtLab || t.sb_no_coordinator}</span>
                  </div>
                  <div className="sb-role">
                    <span className="sb-role-label">{t.role_resource}</span>
                    <span className="sb-role-name">{team.resourceCircle || t.sb_no_coordinator}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE FILTERS */}
      {activeChips.length > 0 && (
        <div className="sb-active-filters">
          <div className="sb-eyebrow-row">
            <span className="sb-eyebrow">{t.sb_active_filters}</span>
          </div>
          <div className="sb-active-chips">
            {activeChips.map(c => (
              <span key={c.key} className="sb-active-chip" onClick={() => setFilter(c.key, c.key === 'attention' || c.key === 'prayer' || c.key === 'celebrate' || c.key === 'recent' ? false : null)}>
                {c.label}<span className="sb-active-x"><SbIcon.x/></span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PRIMARY FILTERS — always visible */}
      <div className="sb-eyebrow-row sb-filters-label">
        <span className="sb-eyebrow">{t.expand_filters}</span>
      </div>
      <Section id="status" title={t.sb_status} filterKey="status" counts={counts.status} labels={statusLbl} sortBy="count" />
      <Section id="team" title={t.sb_team} filterKey="team" counts={counts.team} sortBy="count" />
      <Section id="health" title={t.sb_health} filterKey="health" counts={counts.health} labels={healthLbl} sortBy="count" />

      {/* MORE FILTERS toggle */}
      <button
        type="button"
        className={`sb-more-toggle ${showAdvanced ? 'open' : ''}`}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <span>{showAdvanced ? t.sb_less_filters : t.sb_more_filters}</span>
        <span className={`sb-more-chev ${showAdvanced ? 'open' : ''}`}><SbIcon.chevron/></span>
      </button>

      {showAdvanced && (
        <div className="sb-advanced">
          <Section id="country" title={t.sb_country} filterKey="country" counts={counts.country} sortBy="count" />
          <Section id="objective" title={t.sb_objective} filterKey="objective" counts={counts.obj} sortBy="count" />
          <Section id="translationType" title={t.sb_translation_type} filterKey="translationType" counts={counts.translationType} sortBy="count" />
          <BoolSection id="eten" title={t.sb_eten} filterKey="eten" options={[['yes', t.bool_yes], ['no', t.bool_no]]} />
          <BoolSection id="sensitive" title={t.sb_sensitive} filterKey="sensitive" options={[['yes', t.sensitive_yes], ['no', t.sensitive_no]]} />
          <Section id="financial" title={t.sb_financial} filterKey="financial" counts={counts.financial} sortBy="count" />
          <BoolSection id="progressRange" title={t.sb_progress_range} filterKey="progressRange" options={[['0-25', t.range_0_25], ['25-50', t.range_25_50], ['50-75', t.range_50_75], ['75-100', t.range_75_100]]} />
          <Section id="vitality" title={t.sb_vitality} filterKey="vitality" counts={counts.vitality} sortBy="count" />
          <Section id="needCategory" title={t.sb_needs_section} filterKey="needCategory" counts={counts.needCategory} labels={needCatLbl} sortBy="count" />
          <BoolSection id="hasMedia" title={t.sb_media} filterKey="hasMedia" options={[['yes', t.media_has], ['no', t.media_none]]} />
          <Section id="stale" title={t.sb_stale} filterKey="stale" counts={counts.stale} labels={staleLbl} sortBy="count" />
        </div>
      )}
    </aside>
  );
}
const emptyFilters = {
  team: null, objective: null, status: null, health: null, financial: null, stale: null,
  country: null, continent: null, vitality: null, translationType: null, eten: null,
  sensitive: null,
  progressRange: null, needCategory: null, hasMedia: null,
  // Combinable boolean presets
  attention: false, prayer: false, celebrate: false, recent: false,
};

// ============================================================
// TOOLBAR (above results)
// ============================================================
function Toolbar({ count, total, metaphor, setMetaphor, sort, setSort, t }) {
  const word = count === 1 ? t.results_one : t.results_many;
  return (
    <div className="main-toolbar">
      <div className="results-count">
        <strong>{count}</strong> {word}
        {count !== total && <span> {t.results_of} {total}</span>}
      </div>
      <div className="toolbar-right">
        <div className="metaphor-pill" role="tablist" aria-label="Visual">
          <button type="button" className={metaphor === 'atlas' ? 'active' : ''} onClick={() => setMetaphor('atlas')}>{t.nav_atlas}</button>
          <button type="button" className={metaphor === 'diario' ? 'active' : ''} onClick={() => setMetaphor('diario')}>{t.nav_diario}</button>
          <button type="button" className={metaphor === 'coral' ? 'active' : ''} onClick={() => setMetaphor('coral')}>{t.nav_coral}</button>
        </div>
        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="deadline">{t.sort_deadline}</option>
          <option value="name">{t.sort_name}</option>
          <option value="progress">{t.sort_progress}</option>
          <option value="team">{t.sort_team}</option>
          <option value="health">{t.sort_health}</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================
// TOAST ZONE
// ============================================================
function ToastZone() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (e) => {
      const id = Date.now() + Math.random();
      const toast = { id, msg: e.detail.msg, type: e.detail.type || '' };
      setToasts(ts => [...ts, toast]);
      setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 3500);
    };
    window.addEventListener('shema-toast', handler);
    return () => window.removeEventListener('shema-toast', handler);
  }, []);
  return (
    <div className="toast-zone">
      {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
    </div>
  );
}

const showToast = (msg, type = '') => window.dispatchEvent(new CustomEvent('shema-toast', { detail: { msg, type } }));

// ============================================================
// MAIN APP
// ============================================================
function App() {
  // ---- persisted projects
  const [projects, setProjects] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // migrate: merge coords from sample data if missing
        const sampleMap = Object.fromEntries(SHEMA.SAMPLE_PROJECTS.map(p => [p.id, p.coords]));
        const withCoords = parsed.map(p => p.coords ? p : { ...p, coords: sampleMap[p.id] });
        // migrate: seed regional coordinator
        return SHEMA.seedSensitive(SHEMA.seedPrayers(SHEMA.seedEten(SHEMA.seedRegionalCoordinator(withCoords))));
      }
    } catch (e) {}
    return SHEMA.seedSensitive(SHEMA.seedPrayers(SHEMA.seedEten(SHEMA.seedRegionalCoordinator(SHEMA.SAMPLE_PROJECTS))));
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch (e) {}
  }, [projects]);

  // ---- prefs (lang, metaphor)
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) return { ...TWEAK_DEFAULTS, ...JSON.parse(stored) };
    } catch (e) {}
    return TWEAK_DEFAULTS;
  });
  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
  }, [prefs]);
  const setPref = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const lang = prefs.lang || 'pt';
  const t = SHEMA.I18N[lang];
  const metaphor = prefs.metaphor || 'atlas';

  // ---- filters / search / sort
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('deadline');
  const [currentUser, setCurrentUserState] = useState(() => SHEMA.getCurrentUser());
  const setCurrentUser = (name) => { setCurrentUserState(name); SHEMA.setCurrentUser(name); };
  const [savedViews, setSavedViewsState] = useState(() => SHEMA.loadSavedViews());
  const setSavedViews = (views) => { setSavedViewsState(views); SHEMA.saveSavedViews(views); };
  const [topView, setTopView] = useState('projetos'); // 'projetos' | 'ritmo'
  const [visibleCount, setVisibleCount] = useState(30);

  // Reset paging when filters/search/sort/metaphor change
  useEffect(() => { setVisibleCount(30); }, [filters, search, sort, metaphor]);

  const filtered = useMemo(() => {
    const flat = (v) => Array.isArray(v) ? v.join(' ') : (v || '');
    return projects.filter(p => {
      if (search) {
        const hay = [p.languageName, p.languageCode, p.team, p.teamLeader, p.partnerOrg,
          p.translators, p.bridgeLanguage, p.ywamBase, p.location, p.mentor,
          p.technicalReviewers, flat(p.objective), p.scopeDetails, p.vitalityStatus,
          flat(p.translationType), flat(p.financialResources)].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      if (filters.attention && !matchesPreset(p, 'attention')) return false;
      if (filters.prayer && !matchesPreset(p, 'prayer')) return false;
      if (filters.celebrate && !matchesPreset(p, 'celebrate')) return false;
      if (filters.recent && !matchesPreset(p, 'recent')) return false;
      if (filters.team && p.team !== filters.team) return false;
      if (filters.objective && !(p.objective || []).includes(filters.objective)) return false;
      if (filters.status && SHEMA.getProjectStatus(p) !== filters.status) return false;
      if (filters.health && SHEMA.getOverallHealth(p) !== filters.health) return false;
      if (filters.financial && !(p.financialResources || []).includes(filters.financial)) return false;
      if (filters.stale && SHEMA.getStaleStatus(p) !== filters.stale) return false;
      if (filters.country) {
        const c = (p.location || '').split(',')[0].trim();
        if (c !== filters.country) return false;
      }
      if (filters.continent) {
        if (SHEMA.getContinent(p) !== filters.continent) return false;
      }
      if (filters.vitality && p.vitalityStatus !== filters.vitality) return false;
      if (filters.translationType && !(p.translationType || []).includes(filters.translationType)) return false;
      if (filters.eten === 'yes' && !p.inETEN) return false;
      if (filters.eten === 'no' && p.inETEN) return false;
      if (filters.sensitive === 'yes' && !p.sensitiveCountry) return false;
      if (filters.sensitive === 'no' && p.sensitiveCountry) return false;
      if (filters.progressRange) {
        const pr = SHEMA.getProgress(p);
        const [lo, hi] = filters.progressRange.split('-').map(Number);
        if (pr < lo || pr > hi) return false;
      }
      if (filters.needCategory) {
        if (!(p.needsItems || []).some(it => it.category === filters.needCategory)) return false;
      }
      if (filters.hasMedia === 'yes') {
        const hasPhotos = (p.mediaPhotoCaptions || []).some(Boolean);
        const hasVideos = (p.mediaVideos || []).length > 0;
        if (!hasPhotos && !hasVideos) return false;
      }
      if (filters.hasMedia === 'no') {
        const hasPhotos = (p.mediaPhotoCaptions || []).some(Boolean);
        const hasVideos = (p.mediaVideos || []).length > 0;
        if (hasPhotos || hasVideos) return false;
      }
      return true;
    });
  }, [projects, filters, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === 'name') arr.sort((a, b) => a.languageName.localeCompare(b.languageName));
    else if (sort === 'team') arr.sort((a, b) => (a.team || '').localeCompare(b.team || ''));
    else if (sort === 'progress') arr.sort((a, b) => SHEMA.getProgress(b) - SHEMA.getProgress(a));
    else if (sort === 'health') arr.sort((a, b) => SHEMA.healthScore(b) - SHEMA.healthScore(a));
    else if (sort === 'deadline') arr.sort((a, b) => {
      if (!a.deadline) return 1; if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
    return arr;
  }, [filtered, sort]);

  // ---- modal state
  const [openDetail, setOpenDetail] = useState(null); // project obj
  const [openEdit, setOpenEdit] = useState(null);     // project obj or null
  const [isNewProject, setIsNewProject] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openHealthAssessment, setOpenHealthAssessment] = useState(null); // project obj or null

  // ---- notifications
  const { prefs: notifPrefs, setPrefs: setNotifPrefs, notify } = useNotifications();
  const [unreadNotif, setUnreadNotif] = useState(0);
  useEffect(() => {
    // Show unread when log grows; clear when user opens modal
    if (openNotifications) setUnreadNotif(0);
  }, [openNotifications]);

  const handleSave = (data) => {
    const idx = projects.findIndex(p => p.id === data.id);
    const old = idx >= 0 ? projects[idx] : null;

    // Roll up bookProgress / storyProgress / otherProgress → legacy totals
    const roll = SHEMA.rollUpProgress(data);
    if (roll) {
      data.translatedUnits = roll.translated;
      data.communityCheckedUnits = roll.community;
      data.approvedUnits = roll.approved;
      if (roll.total > 0) data.totalUnits = roll.total;
    }

    // progress history tracking
    const ph = old?.progressHistory ? [...old.progressHistory] : [];
    if (old) {
      const changed = old.translatedUnits !== data.translatedUnits ||
                      old.approvedUnits !== data.approvedUnits ||
                      old.communityCheckedUnits !== data.communityCheckedUnits ||
                      old.totalUnits !== data.totalUnits;
      if (changed) {
        ph.push({
          date: new Date().toISOString().split('T')[0],
          translatedUnits: data.translatedUnits,
          approvedUnits: data.approvedUnits,
          communityCheckedUnits: data.communityCheckedUnits,
          totalUnits: data.totalUnits,
          previousTranslated: old.translatedUnits || 0,
          previousApproved: old.approvedUnits || 0,
          previousCommunity: old.communityCheckedUnits || 0,
        });
      }
    } else if (data.translatedUnits || data.approvedUnits || data.communityCheckedUnits) {
      ph.push({
        date: new Date().toISOString().split('T')[0],
        translatedUnits: data.translatedUnits,
        approvedUnits: data.approvedUnits,
        communityCheckedUnits: data.communityCheckedUnits,
        totalUnits: data.totalUnits,
        initial: true,
      });
    }
    const finalData = { ...data, progressHistory: ph, lastUpdated: new Date().toISOString() };
    if (idx >= 0) setProjects(ps => ps.map((p, i) => i === idx ? finalData : p));
    else setProjects(ps => [...ps, finalData]);
    setOpenEdit(null);
    setIsNewProject(false);
    showToast(t.toast_saved, 'success');
  };

  const handleDelete = (id) => {
    setProjects(ps => ps.filter(p => p.id !== id));
    setOpenEdit(null);
    setOpenDetail(null);
    setIsNewProject(false);
    showToast(t.toast_deleted, 'error');
  };

  // ---- export / import
  const fileInputRef = useRef();
  const fieldInputRef = useRef();

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `shema-projetos-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast(t.toast_exported, 'success');
  };

  const handleReloadData = () => {
    if (!window.confirm(t.confirm_reload)) return;
    try {
      Object.keys(localStorage).filter(k => k.startsWith('shema-projects')).forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    location.reload();
  };

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!Array.isArray(data)) throw new Error('format');
        if (!confirm(t.confirm_import)) return;
        setProjects(data);
        showToast(`${data.length} ${t.toast_imported}`, 'success');
      } catch (err) {
        showToast(t.toast_field_invalid + ' ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFieldImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const up = JSON.parse(evt.target.result);
        if (up.type === 'new_project' && up.project) {
          const np = makeEmptyProject();
          const incoming = up.project || {};
          const merged = { ...np, ...incoming, id: Date.now().toString(),
            objective: Array.isArray(incoming.objective) ? incoming.objective : [],
            translationType: Array.isArray(incoming.translationType) ? incoming.translationType : [],
            speakerCount: incoming.speakerCount || '',
            createdVia: 'intake', submittedAt: up.submittedAt || new Date().toISOString(),
            lastUpdated: new Date().toISOString() };
          setProjects(ps => [merged, ...ps]);
          if (notifPrefs.enabled) {
            notify({ kind: 'field', project: merged, summary: (lang === 'pt' ? 'Novo cadastro de projeto · por ' : 'New project intake · by ') + (incoming.teamLeader || '—') });
            setUnreadNotif(n => n + 1);
          }
          showToast(lang === 'pt' ? 'Novo projeto cadastrado: ' + (merged.languageName || '—') : 'New project registered: ' + (merged.languageName || '—'), 'success');
          setOpenDetail(merged);
          e.target.value = '';
          return;
        }
        if (up.type !== 'field_update' || !up.projectId) {
          showToast(t.toast_field_invalid, 'error'); return;
        }
        // Archive the filled form so the user keeps the original submission
        try {
          const proj = projects.find(p => p.id === up.projectId);
          SHEMA.archiveSubmission({
            ...up,
            languageName: up.languageName || (proj && proj.languageName) || '—',
            receivedAt: new Date().toISOString(),
          });
        } catch (err) {}
        setProjects(ps => ps.map(p => {
          if (p.id !== up.projectId) return p;
          const d = up.data || {};
          // Merge only the keys that came in the form
          const merged = { ...p };
          const keys = ['bookProgress', 'storyProgress', 'otherProgress',
                        'healthEmotional', 'healthRelational', 'healthSpiritual', 'healthPhysical',
                        'needsPastoralIntervention', 'prayerRequests', 'healthNotes',
                        'needsItems', 'needsNotes', 'mediaVideos', 'mediaPhotoCaptions',
                        'notes',
                        'translatedUnits', 'communityCheckedUnits', 'approvedUnits', 'totalUnits',
                        'startDate', 'deadline',
                        'needFinancial', 'needTraining', 'needEquipment'];
          keys.forEach(k => { if (d[k] !== undefined) merged[k] = d[k]; });
          // prayer sharing authorization — when the leader opts out, clear the shared text
          if (d.prayerShared === false) merged.prayerRequests = '';

          // Roll up bookProgress → legacy totals
          const roll = SHEMA.rollUpProgress(merged);
          if (roll) {
            merged.translatedUnits = roll.translated;
            merged.communityCheckedUnits = roll.community;
            merged.approvedUnits = roll.approved;
            if (roll.total > 0) merged.totalUnits = roll.total;
          }

          // Track progress change in history
          const ph = [...(p.progressHistory || [])];
          const changed = p.translatedUnits !== merged.translatedUnits ||
                          p.approvedUnits !== merged.approvedUnits ||
                          p.communityCheckedUnits !== merged.communityCheckedUnits;
          if (changed) {
            ph.push({
              date: up.submittedDate || new Date().toISOString().split('T')[0],
              translatedUnits: merged.translatedUnits, approvedUnits: merged.approvedUnits,
              communityCheckedUnits: merged.communityCheckedUnits, totalUnits: merged.totalUnits,
              previousTranslated: p.translatedUnits || 0, previousApproved: p.approvedUnits || 0,
              previousCommunity: p.communityCheckedUnits || 0,
              fromField: up.submittedBy || '',
              formType: up.formType || 'full',
            });
          }
          merged.progressHistory = ph;
          merged.lastUpdated = new Date().toISOString();
          // Notification (mock — coordenação foi avisada)
          if (notifPrefs.enabled && (up.notifyCoord !== false)) {
            const moodTxt = ({ boa: 'equipe bem', atencao: 'equipe cansada', critica: 'situação difícil' }[d.healthEmotional] || '');
            const summary = [
              moodTxt,
              d.needs && d.needs.length ? 'necessidades: ' + d.needs.slice(0,3).join(', ') : null,
            ].filter(Boolean).join(' · ');
            notify({ kind: (d.healthEmotional === 'critica' ? 'urgent' : 'field'), project: merged, summary: summary || 'Pulso mensal recebido' });
            setUnreadNotif(n => n + 1);
          }
          return merged;
        }));
        showToast(t.toast_field_received, 'success');
      } catch (err) {
        showToast(t.toast_field_invalid, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleIntakeLink = () => {
    const html = generateIntakeFormHTML(t, lang);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (lang === 'pt' ? 'Cadastro_de_Projeto' : 'Project_Intake') + '.html';
    a.click(); URL.revokeObjectURL(url);
    showToast(lang === 'pt' ? 'Formulário gerado. Envie ao líder; ele devolve o .json para você importar.' : 'Form generated. Send it to the leader; they return the .json for you to import.', 'success');
  };

  const handleGenerateField = (formType = 'full') => {    const p = openDetail;
    if (!p) return;
    const html = generateFieldFormHTML(p, t, lang, formType);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (p.languageName || 'projeto').replace(/[^a-z0-9]/gi, '_');
    a.href = url; a.download = `${formType}_${safe}_${new Date().toISOString().split('T')[0]}.html`;
    a.click(); URL.revokeObjectURL(url);
    showToast(t.toast_field_generated, 'success');
  };

  const handleSaveHealth = (updatedProject) => {
    try {
      SHEMA.archiveSubmission({
        type: 'field_update', formType: 'health',
        projectId: updatedProject.id, languageName: updatedProject.languageName,
        submittedBy: updatedProject.healthAssessor || 'Facilitador',
        submittedDate: updatedProject.healthAssessmentDate || new Date().toISOString().split('T')[0],
        receivedAt: new Date().toISOString(),
        data: {
          healthEmotional: updatedProject.healthEmotional, healthRelational: updatedProject.healthRelational,
          healthSpiritual: updatedProject.healthSpiritual, healthPhysical: updatedProject.healthPhysical,
          healthNotes: updatedProject.healthNotes, prayerRequests: updatedProject.prayerRequests,
          needsPastoralIntervention: updatedProject.needsPastoralIntervention,
          pastoralInterventionName: updatedProject.pastoralInterventionName,
        },
      });
    } catch (err) {}
    setProjects(ps => ps.map(p => p.id === updatedProject.id ? { ...updatedProject, lastUpdated: new Date().toISOString() } : p));
    if (openDetail && openDetail.id === updatedProject.id) setOpenDetail(updatedProject);
    setOpenHealthAssessment(null);
    if (notifPrefs.enabled) {
      const vals = [updatedProject.healthEmotional, updatedProject.healthRelational, updatedProject.healthSpiritual, updatedProject.healthPhysical].filter(Boolean);
      const overall = vals.some(v => v === 'critica') ? 'crítica' : vals.some(v => v === 'atencao') ? 'atenção' : 'boa';
      notify({
        kind: vals.some(v => v === 'critica') ? 'urgent' : 'health',
        project: updatedProject,
        summary: `Avaliação de saúde · ${overall} · por ${updatedProject.healthAssessor || 'OBT Lab'}`,
      });
      setUnreadNotif(n => n + 1);
    }
    showToast(lang === 'pt' ? 'Avaliação salva. Coordenação notificada.' : 'Assessment saved. Coordination notified.', 'success');
  };

  // ---- tweaks panel protocol
  const [tweaksOpen, setTweaksOpen] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setTweak = (k, v) => {
    setPref(k, v);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  const accentMap = {
    telha: '#BE4A01',
    verde: '#777D45',
    azul: '#89AAA3',
  };
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentMap[prefs.accent] || accentMap.telha);
    document.documentElement.style.setProperty('--shema-telha', accentMap[prefs.accent] || accentMap.telha);
  }, [prefs.accent]);

  // re-set on lang change (keep accent persisted)
  const onLangToggle = () => setTweak('lang', lang === 'pt' ? 'en' : 'pt');

  return (
    <div className="app">
      <TopBar
        lang={lang} onLangToggle={onLangToggle}
        onNew={() => { setIsNewProject(true); setOpenEdit(null); setTimeout(() => setOpenEdit(makeEmptyProject()), 0); }}
        onExport={handleExport}
        onImportClick={() => fileInputRef.current?.click()}
        onReloadData={handleReloadData}
        onIntakeLink={handleIntakeLink}
        onFieldImportClick={() => fieldInputRef.current?.click()}
        onBellClick={() => setOpenNotifications(true)}
        notifCount={unreadNotif}
        t={t}
      />
      <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      <input type="file" ref={fieldInputRef} accept=".json" style={{ display: 'none' }} onChange={handleFieldImport} />

      <Hero projects={projects} t={t} />

      <div className="topnav">
        <button type="button" className={`topnav-tab ${topView === 'projetos' ? 'active' : ''}`} onClick={() => setTopView('projetos')}>
          {t.nav_projetos}
        </button>
        <button type="button" className={`topnav-tab ${topView === 'ritmo' ? 'active' : ''}`} onClick={() => setTopView('ritmo')}>
          {t.nav_ritmo}
        </button>
        <button type="button" className={`topnav-tab ${topView === 'oracao' ? 'active' : ''}`} onClick={() => setTopView('oracao')}>
          {t.nav_oracao}
        </button>
        <button type="button" className={`topnav-tab ${topView === 'eten' ? 'active' : ''}`} onClick={() => setTopView('eten')}>
          {t.nav_eten}
        </button>
        <button type="button" className={`topnav-tab ${topView === 'formularios' ? 'active' : ''}`} onClick={() => setTopView('formularios')}>
          {t.nav_formularios}
        </button>
        <button type="button" className={`topnav-tab ${topView === 'equipe' ? 'active' : ''}`} onClick={() => setTopView('equipe')}>
          {t.nav_equipe}
        </button>
      </div>

      {topView === 'ritmo' ? (
        <div className="layout layout-ritmo">
          <RitmoView projects={projects} t={t} lang={lang} currentUser={currentUser} />
        </div>
      ) : topView === 'eten' ? (
        <div className="layout layout-ritmo">
          <EtenView projects={projects} t={t} />
        </div>
      ) : topView === 'oracao' ? (
        <div className="layout layout-ritmo">
          <OracaoView projects={projects} t={t} />
        </div>
      ) : topView === 'formularios' ? (
        <div className="layout layout-ritmo">
          <FormulariosView projects={projects} t={t} lang={lang} onOpenHealth={(proj) => setOpenHealthAssessment(proj)} onImportClick={() => fieldInputRef.current && fieldInputRef.current.click()} />
        </div>
      ) : topView === 'equipe' ? (
        <div className="layout layout-ritmo">
          <EquipeView projects={projects} t={t} currentUser={currentUser} setCurrentUser={setCurrentUser} onSaved={() => setProjects(ps => SHEMA.seedRegionalCoordinator(ps.map(p => ({ ...p, regionalCoordinator: undefined, obtLabPerson: undefined, resourceCirclePerson: undefined }))))} />
        </div>
      ) : topView === 'intercessores' ? (
        <div className="layout layout-ritmo">
          <IntercessoresView projects={projects} t={t} />
        </div>
      ) : (
      <div className="layout">
        <Sidebar
          projects={projects}
          filteredCount={filtered.length}
          filters={filters} setFilters={setFilters}
          search={search} setSearch={setSearch}
          currentUser={currentUser} setCurrentUser={setCurrentUser}
          savedViews={savedViews} setSavedViews={setSavedViews}
          t={t}
        />
        <main className="main">
          <Toolbar
            count={sorted.length} total={projects.length}
            metaphor={metaphor} setMetaphor={(m) => setTweak('metaphor', m)}
            sort={sort} setSort={setSort} t={t}
          />
          {metaphor === 'atlas' && sorted.length > 0 && (
            <Globe projects={sorted} t={t} onSelect={p => setOpenDetail(p)} />
          )}
          <div className={`grid ${metaphor}`}>
            {sorted.length === 0 ? (
              <div className="empty">
                <h3>{t.empty_title}</h3>
                <p>{t.empty_sub}</p>
              </div>
            ) : (
              sorted.slice(0, visibleCount).map(p => {
                const props = { key: p.id, p, t, onClick: () => setOpenDetail(p) };
                if (metaphor === 'atlas') return <CardAtlas {...props} />;
                if (metaphor === 'diario') return <CardDiario {...props} />;
                return <CardCoral {...props} />;
              })
            )}
          </div>
          {sorted.length > visibleCount && (
            <div className="load-more-wrap">
              <button className="load-more" onClick={() => setVisibleCount(c => c + 30)}>
                {t.locale === 'pt-BR' ? 'Mostrar mais' : 'Show more'}
                <span className="lm-remaining">+{Math.min(30, sorted.length - visibleCount)}</span>
                <span className="lm-total">{visibleCount}/{sorted.length}</span>
              </button>
            </div>
          )}
        </main>
      </div>
      )}

      {openDetail && !openEdit && (
        <DetailModal
          project={openDetail} t={t}
          onClose={() => setOpenDetail(null)}
          onEdit={() => setOpenEdit(openDetail)}
          onGenerateField={handleGenerateField}
          onOpenHealthAssessment={(proj) => setOpenHealthAssessment(proj)}
        />
      )}

      {openHealthAssessment && (
        <HealthAssessmentModal
          project={openHealthAssessment}
          t={t}
          lang={lang}
          onClose={() => setOpenHealthAssessment(null)}
          onSave={handleSaveHealth}
        />
      )}

      {openNotifications && (
        <NotificationsModal
          prefs={notifPrefs}
          setPrefs={setNotifPrefs}
          onClose={() => setOpenNotifications(false)}
          t={t}
        />
      )}
      {openEdit && (
        <EditModal
          project={openEdit} isNew={isNewProject} t={t}
          onClose={() => { setOpenEdit(null); setIsNewProject(false); }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {tweaksOpen && (
        <TweaksPanel
          prefs={prefs}
          onChange={(k, v) => setTweak(k, v)}
          onClose={() => {
            setTweaksOpen(false);
            window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
          }}
          t={t}
        />
      )}

      <ToastZone />
    </div>
  );
}

// ============================================================
// TWEAKS PANEL
// ============================================================
function TweaksPanel({ prefs, onChange, onClose, t }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1500,
      width: 280, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)',
      padding: 18, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--shema-verde)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--shema-telha)', fontWeight: 700 }}>Tweaks</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14 }}>{t.tweaks_title}</div>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-muted)' }}>×</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>{t.tweaks_metaphor}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)', marginBottom: 8 }}>{t.tweaks_metaphor_sub}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {[['atlas', t.nav_atlas], ['diario', t.nav_diario], ['coral', t.nav_coral]].map(([k, l]) => (
            <button key={k} onClick={() => onChange('metaphor', k)}
              style={{
                padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                background: prefs.metaphor === k ? 'var(--shema-telha)' : 'var(--bg-muted)',
                color: prefs.metaphor === k ? 'var(--shema-branco)' : 'var(--shema-verde)',
                border: '1px solid ' + (prefs.metaphor === k ? 'var(--shema-telha)' : 'var(--line)'),
              }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{t.tweaks_accent}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['telha', '#BE4A01'], ['verde', '#777D45'], ['azul', '#89AAA3']].map(([k, c]) => (
            <button key={k} onClick={() => onChange('accent', k)}
              style={{
                width: 40, height: 40, borderRadius: '50%', background: c,
                border: prefs.accent === k ? '3px solid var(--shema-verde)' : '3px solid transparent',
                cursor: 'pointer', transition: 'transform .14s', transform: prefs.accent === k ? 'scale(1.08)' : 'none',
              }} title={k} />
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Idioma / Language</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {[['pt', '🇧🇷 PT'], ['en', '🇺🇸 EN']].map(([k, l]) => (
            <button key={k} onClick={() => onChange('lang', k)}
              style={{
                padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: prefs.lang === k ? 'var(--shema-verde)' : 'var(--bg-muted)',
                color: prefs.lang === k ? 'var(--shema-branco)' : 'var(--shema-verde)',
                border: '1px solid var(--line)',
              }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// mount
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
