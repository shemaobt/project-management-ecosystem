/* modals.jsx — Detail modal, Edit modal, Field-form generator */

const { useState, useEffect, useRef } = React;

// ============================================================
// DETAIL MODAL
// ============================================================
function DetailModal({ project, t, onClose, onEdit, onGenerateField, onOpenHealthAssessment }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [formMenuOpen, setFormMenuOpen] = useState(false);
  const p = project;
  if (!p) return null;

  const exportNeeds = () => {
    const items = (p.needsItems || []).map(it => ({
      categoria: it.category, urgencia: it.urgency || 'low', status: it.status || 'open',
      descricao: it.description || '', valor_estimado: it.estimatedValue || '',
      prazo: it.deadline || '', oracao_compartilhada: !!it.prayerShared, oracao_respondida: !!it.prayerAnswered,
      preenchido_por: it.submittedBy || '', preenchido_em: it.submittedAt || '',
    }));
    const payload = {
      tipo: 'necessidades_export', projeto: p.languageName, projetoId: p.id,
      exportadoEm: new Date().toISOString(), totalItens: items.length, itens: items,
    };
    const safe = (p.languageName || 'projeto').replace(/[^a-z0-9]/gi, '_');
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'necessidades_' + safe + '_' + new Date().toISOString().split('T')[0] + '.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const progress = SHEMA.getProgress(p);
  const approvalRate = p.translatedUnits > 0 ? (p.approvedUnits / p.translatedUnits) * 100 : 0;
  const communityRate = p.translatedUnits > 0 ? (p.communityCheckedUnits / p.translatedUnits) * 100 : 0;
  const stale = SHEMA.getStaleStatus(p);
  const days = SHEMA.getDaysSinceUpdate(p);
  const dl = SHEMA.getDeadlineInfo(p.deadline);

  const unitLabel = p.totalUnitsType || 'Livros';

  const scrollTo = (sec) => {
    const el = document.getElementById(`detail-sec-${sec}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-hero">
          <div className="modal-hero-row">
            <div>
              <div className="modal-hero-eyebrow">{t.headline_eyebrow} · {p.languageCode || '—'}</div>
              <h1 className="modal-hero-title">{p.languageName}</h1>
              <div className="modal-hero-sub">{p.bridgeLanguage} → {p.languageName} · {(p.location || '').split('—')[0].trim()}</div>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="modal-nav">
          {[
            { n: 1, lbl: t.sec_id },
            { n: 2, lbl: t.sec_team },
            { n: 3, lbl: t.sec_objective },
            { n: 4, lbl: t.sec_financial },
            { n: 5, lbl: t.sec_progress },
            { n: 6, lbl: t.sec_health },
            { n: 7, lbl: t.sec_needs },
            { n: 8, lbl: t.sec_media },
            { n: 9, lbl: t.sec_notes },
          ].map(s => (
            <button key={s.n} type="button" className="modal-nav-chip" data-sec={s.n} onClick={() => scrollTo(s.n)}>
              <span className="modal-nav-num">{s.n}</span>
              <span>{s.lbl}</span>
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* 1 Identification */}
          <section className="modal-section" data-sec="1" id="detail-sec-1">
            <h2 className="modal-section-title"><span className="num">1</span> {t.sec_id}</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">{t.d_target}</div>
                <div className="detail-value">{p.languageName} {p.languageCode && <em style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>({p.languageCode})</em>}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">{t.d_bridge}</div>
                <div className="detail-value serif">{p.bridgeLanguage || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">{t.d_vitality}</div>
                <div className="detail-value">{p.vitalityStatus || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">{t.d_speakers}</div>
                <div className="detail-value">{p.speakerCount ? Number(p.speakerCount).toLocaleString(t.locale) : '—'}</div>
              </div>
              <div className="detail-item full">
                <div className="detail-label">{t.d_location}</div>
                <div className="detail-value serif">{p.location || '—'}{p.location2 ? ' · ' + p.location2 : ''}{p.sensitiveCountry ? <span style={{ display: 'inline-block', marginLeft: 10, fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', background: 'var(--shema-telha)', padding: '3px 10px', borderRadius: 999 }}>{t.d_sensitive_tag}</span> : null}</div>
              </div>
            </div>
          </section>

          {/* 2 Team */}
          <section className="modal-section" data-sec="2" id="detail-sec-2">
            <h2 className="modal-section-title"><span className="num">2</span> {t.sec_team}</h2>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">{t.d_facilitators}</div><div className="detail-value">{p.team || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.d_facilitator_person}</div><div className="detail-value">{p.facilitator || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.d_leader}</div><div className="detail-value">{p.teamLeader || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.f_leader_contact}</div><div className="detail-value" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{p.teamLeaderContact || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.d_mentor}</div><div className="detail-value">{p.mentor || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.f_mentor_contact}</div><div className="detail-value" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{p.mentorContact || '—'}</div></div>
              <div className="detail-item full"><div className="detail-label">{t.d_regional_coord}</div><div className="detail-value">{p.regionalCoordinator || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.d_obtlab_person}</div><div className="detail-value">{p.obtLabPerson || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.d_resource_person}</div><div className="detail-value">{p.resourceCirclePerson || '—'}</div></div>
              <div className="detail-item full"><div className="detail-label">{t.d_translators}</div><div className="detail-value serif">{p.translators || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.d_reviewers}</div><div className="detail-value">{p.technicalReviewers || '—'}</div></div>
              <div className="detail-item"><div className="detail-label">{t.d_partner}</div><div className="detail-value">{p.partnerOrg || '—'}</div></div>
            </div>
          </section>

          {/* 3 Objective */}
          <section className="modal-section" data-sec="3" id="detail-sec-3">
            <h2 className="modal-section-title"><span className="num">3</span> {t.sec_objective}</h2>
            <div className="detail-grid">
              <div className="detail-item full">
                <div className="detail-label">{t.d_objective}</div>
                <div className="tag-row">
                  {(p.objective || []).length > 0 ? p.objective.map(x => <span key={x} className="tag accent">{x}</span>) : <span className="detail-value">—</span>}
                </div>
              </div>
              <div className="detail-item full">
                <div className="detail-label">{t.d_type}</div>
                <div className="tag-row">
                  {(p.translationType || []).length > 0 ? p.translationType.map(x => <span key={x} className="tag accent">{x}</span>) : <span className="detail-value">—</span>}
                </div>
              </div>
              <div className="detail-item"><div className="detail-label">{t.d_start}</div><div className="detail-value">{SHEMA.formatDate(p.startDate, t.locale)}</div></div>
              <div className="detail-item">
                <div className="detail-label">{t.d_deadline}</div>
                <div className="detail-value">
                  {SHEMA.formatDate(p.deadline, t.locale)}
                  {dl.days !== null && (
                    <span className="atlas-stale" style={{ marginLeft: 8, background: dl.cls === 'overdue' ? 'var(--accent-soft)' : 'rgba(119,125,69,0.18)', color: dl.cls === 'overdue' ? 'var(--shema-telha)' : 'var(--shema-verde-claro)' }}>
                      {dl.days < 0 ? `${Math.abs(dl.days)}${t.days_overdue}` : `${dl.days}${t.days_remaining}`}
                    </span>
                  )}
                </div>
              </div>
              {p.objectiveNotes && (
                <div className="detail-item full">
                  <div className="detail-label">{t.f_notes}</div>
                  <div className="notes-panel">{p.objectiveNotes}</div>
                </div>
              )}
              {(p.phases || []).length > 0 && (
                <div className="detail-item full">
                  <div className="detail-label">{t.d_phases}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                    {p.phases.map((ph, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--shema-telha)', flex: '0 0 auto', fontSize: 13 }}>{ph.label || (t.f_phase_n + ' ' + (i + 1))}</span>
                        <span style={{ flex: 1, fontFamily: 'var(--font-serif)', fontSize: 14 }}>{ph.scope || '—'}</span>
                        <span style={{ flex: '0 0 auto', fontSize: 13, color: 'var(--fg-muted)' }}>{ph.date ? SHEMA.formatDate(ph.date, t.locale) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 4 Financial Resources */}
          <section className="modal-section" data-sec="4" id="detail-sec-4">
            <h2 className="modal-section-title"><span className="num">4</span> {t.sec_financial}</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">{t.f_in_eten}</div>
                <div className="detail-value">{p.inETEN ? <span className="tag accent">✓ {t.sim}</span> : <span style={{ color: 'var(--fg-muted)' }}>{t.nao}</span>}</div>
              </div>
              <div className="detail-item full">
                <div className="detail-label">{t.d_financial}</div>
                <div className="tag-row">
                  {(p.financialResources || []).length > 0 ? p.financialResources.map(x => <span key={x} className="tag green">{x}</span>) : <span className="detail-value">—</span>}
                </div>
              </div>
              {p.financialOtherDetails && (
                <div className="detail-item full">
                  <div className="detail-label">{t.locale === 'pt-BR' ? 'Detalhes (Outros)' : 'Details (Other)'}</div>
                  <div className="detail-value">{p.financialOtherDetails}</div>
                </div>
              )}
              {p.financialNotes && (
                <div className="detail-item full">
                  <div className="detail-label">{t.f_notes}</div>
                  <div className="notes-panel">{p.financialNotes}</div>
                </div>
              )}
            </div>
          </section>

          {/* 5 Progress */}
          <section className="modal-section" data-sec="5" id="detail-sec-5">
            <h2 className="modal-section-title"><span className="num">5</span> {t.sec_progress}</h2>

            <div className="detail-status-banner" data-status={p.status || 'em-andamento'}>
              <span className="dsb-dot" />
              <strong>
                {p.status === 'pausado' ? t.project_status_paused
                  : p.status === 'planejado' ? t.project_status_planned
                  : p.status === 'cancelado' ? t.status_canceled
                  : p.status === 'concluido' ? t.status_completed
                  : p.status === 'desconhecido' ? t.status_unknown
                  : t.project_status_active}
              </strong>
            </div>

            {stale === 'critico' && (
              <div className="stale-banner critico">
                <span className="stale-banner-icon">⚠</span>
                <div><strong>{t.stale_crit_title}</strong>{t.stale_crit_text} <b>{days} {t.days}</b>.</div>
              </div>
            )}
            {stale === 'atencao' && (
              <div className="stale-banner atencao">
                <span className="stale-banner-icon">⚠</span>
                <div><strong>{t.stale_warn_title}</strong>{t.stale_warn_text} <b>{days} {t.days}</b>.</div>
              </div>
            )}

            <div className="det-progress">
              <div className="det-progress-row">
                <div className="head">
                  <span className="lbl">● {t.d_p_translated}</span>
                  <span className="num">{p.translatedUnits || 0} <small>/ {p.totalUnits || 0} {unitLabel.toLowerCase()} · {Math.round(progress)}%</small></span>
                </div>
                <div className="det-bar"><div className="det-bar-fill translated" style={{ width: `${progress}%` }} /></div>
              </div>
              <div className="det-progress-row">
                <div className="head">
                  <span className="lbl">● {t.d_p_community}</span>
                  <span className="num">{p.communityCheckedUnits || 0} <small>/ {p.translatedUnits || 0} · {Math.round(communityRate)}%</small></span>
                </div>
                <div className="det-bar"><div className="det-bar-fill community" style={{ width: `${communityRate}%` }} /></div>
              </div>
              <div className="det-progress-row">
                <div className="head">
                  <span className="lbl">● {t.d_p_approved}</span>
                  <span className="num">{p.approvedUnits || 0} <small>/ {p.translatedUnits || 0} · {Math.round(approvalRate)}%</small></span>
                </div>
                <div className="det-bar"><div className="det-bar-fill approved" style={{ width: `${approvalRate}%` }} /></div>
              </div>
            </div>

            {(p.storiesTranslated || p.readyVesselsAudioHours) && false && (
              <div className="detail-grid" style={{ marginTop: 16 }}>
                {p.storiesTranslated ? (
                  <div className="detail-item">
                    <div className="detail-label">{t.f_stories_translated}</div>
                    <div className="detail-value" style={{ fontWeight: 700 }}>{p.storiesTranslated}</div>
                  </div>
                ) : null}
                {p.readyVesselsAudioHours ? (
                  <div className="detail-item">
                    <div className="detail-label">{t.f_rv_audio_hours}</div>
                    <div className="detail-value" style={{ fontWeight: 700 }}>{p.readyVesselsAudioHours} h</div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Per-book / per-story progress breakdown */}
            {((p.bookProgress || []).length > 0 || (p.storyProgress || []).length > 0 || (p.otherProgress || []).length > 0) && (
              <div style={{ marginTop: 18 }}>
                {[
                  ['📖 ' + (t.locale === 'pt-BR' ? 'Por Livro da Bíblia' : 'By Bible Book'), p.bookProgress || []],
                  ['📚 ' + (t.locale === 'pt-BR' ? 'Por História' : 'By Story'), p.storyProgress || []],
                  ['🎬 ' + (t.locale === 'pt-BR' ? 'Outras Unidades' : 'Other Units'), p.otherProgress || []],
                ].filter(([, list]) => list.length > 0).map(([title, list]) => (
                  <div key={title} className="det-book-progress" style={{ marginBottom: 10 }}>
                    <div className="det-bp-row head">
                      <span className="bp-name">{title}</span>
                      <span className="bp-num">{t.col_translated}</span>
                      <span className="bp-num">{t.col_checked}</span>
                      <span className="bp-num">{t.col_approved}</span>
                    </div>
                    {list.map((it, idx) => {
                      const ch = it.chapters || 1;
                      const tr = it.translated || 0;
                      const co = it.communityChecked || 0;
                      const ap = it.mentorApproved || 0;
                      return (
                        <div className="det-bp-row" key={idx}>
                          <span className="bp-name">{it.name}{ch > 1 ? <em style={{ fontWeight: 400, color: 'var(--fg-muted)', fontStyle: 'normal' }}> · {ch}{t.locale === 'pt-BR' ? ' caps' : ' chs'}</em> : ''}</span>
                          <span className="bp-mini">
                            <span className="bp-bar"><span className="bp-bar-fill translated" style={{ width: `${(tr/ch)*100}%` }} /></span>
                            <span className="bp-num" style={{ minWidth: 30 }}>{tr}</span>
                          </span>
                          <span className="bp-mini">
                            <span className="bp-bar"><span className="bp-bar-fill community" style={{ width: `${(co/ch)*100}%` }} /></span>
                            <span className="bp-num" style={{ minWidth: 30 }}>{co}</span>
                          </span>
                          <span className="bp-mini">
                            <span className="bp-bar"><span className="bp-bar-fill approved" style={{ width: `${(ap/ch)*100}%` }} /></span>
                            <span className="bp-num" style={{ minWidth: 30 }}>{ap}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {p.progressHistory && p.progressHistory.length > 0 && (
              <>
                <button type="button" className="history-toggle" onClick={() => setHistoryOpen(!historyOpen)}>
                  <span>{t.d_history_toggle} ({p.progressHistory.length} {p.progressHistory.length === 1 ? t.d_history_record : t.d_history_records})</span>
                  <span>{historyOpen ? '▼' : '▶'}</span>
                </button>
                {historyOpen && (
                  <div className="history-list">
                    {[...p.progressHistory].reverse().map((h, i) => {
                      const dT = h.previousTranslated !== undefined ? h.translatedUnits - h.previousTranslated : 0;
                      const dC = h.previousCommunity !== undefined ? h.communityCheckedUnits - h.previousCommunity : 0;
                      const dA = h.previousApproved !== undefined ? h.approvedUnits - h.previousApproved : 0;
                      const delta = (v) => v === 0 ? '' : <span className={`history-delta ${v < 0 ? 'neg' : ''}`}> ({v > 0 ? '+' : ''}{v})</span>;
                      return (
                        <div key={i} className="history-item">
                          <div className="history-date">{SHEMA.formatDate(h.date, t.locale)}{h.initial ? ' ' + t.d_history_initial : ''}</div>
                          <div className="history-line">
                            {t.d_history_translated} <strong>{h.translatedUnits}</strong>{delta(dT)}<br />
                            {t.d_history_community} <strong>{h.communityCheckedUnits}</strong>{delta(dC)}<br />
                            {t.d_history_approved} <strong>{h.approvedUnits}</strong>{delta(dA)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          {/* 6 Health */}
          <section className="modal-section" data-sec="6" id="detail-sec-6">
            <h2 className="modal-section-title"><span className="num">6</span> {t.sec_health}</h2>
            <div className="health-row" style={{ marginBottom: 16 }}>
              {['Emotional', 'Relational', 'Spiritual', 'Physical'].map(k => {
                const lower = k.toLowerCase();
                const val = p[`health${k}`] || '';
                const labels = { boa: t.health_good, atencao: t.health_attention, critica: t.health_critical, '': t.health_na };
                const cls = val || 'na';
                return (
                  <div key={k} className={`health-chip ${cls}`}>
                    <div className="h-lbl">{t['d_' + lower]}</div>
                    <div className="h-val">{labels[val]}</div>
                  </div>
                );
              })}
            </div>
            <div className="detail-grid" style={{ marginBottom: 12 }}>
              <div className="detail-item"><div className="detail-label">{t.d_last_assessment}</div><div className="detail-value">{SHEMA.formatDate(p.healthAssessmentDate, t.locale)}</div></div>
              <div className="detail-item"><div className="detail-label">{t.d_assessor}</div><div className="detail-value">{p.healthAssessor || '—'}</div></div>
            </div>
            {p.needsPastoralIntervention === 'sim' && (
              <div className="notes-panel prayer" style={{ marginBottom: 10 }}>
                <div className="notes-panel label">⛪ {t.d_pastoral}</div>
                {p.pastoralInterventionName || t.sim}
              </div>
            )}
            {p.healthNotes && (
              <div className="notes-panel" style={{ marginBottom: 10 }}>
                <div className="notes-panel label">{t.d_notes}</div>
                {p.healthNotes}
              </div>
            )}
            {p.prayerRequests && (
              <div className="notes-panel prayer">
                <div className="notes-panel label">🕊 {t.d_prayer}</div>
                {p.prayerRequests}
              </div>
            )}
          </section>

          {/* 7 Needs */}
          <section className="modal-section" data-sec="7" id="detail-sec-7">
            <h2 className="modal-section-title"><span className="num">7</span> {t.sec_needs}
              {(p.needsItems || []).length > 0 && (
                <button type="button" className="btn secondary" style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 13 }} onClick={exportNeeds}>↓ {t.needs_export}</button>
              )}
            </h2>
            {(p.needsItems || []).length === 0 ? (
              <span className="detail-value serif" style={{ color: 'var(--fg-muted)' }}>{t.d_no_needs}</span>
            ) : (
              <div className="need-items-list det">
                {(p.needsItems || []).map((it, i) => {
                  const cat = NEED_CATEGORIES.find(c => c.id === it.category);
                  const statusLbl = it.status === 'fulfilled' ? t.need_status_fulfilled : it.status === 'in-progress' ? t.need_status_inprogress : t.need_status_open;
                  const urgLbl = it.urgency === 'high' ? t.need_urgency_high : it.urgency === 'medium' ? t.need_urgency_medium : t.need_urgency_low;
                  return (
                    <div key={i} className={`need-item det urgency-${it.urgency || 'low'} status-${it.status || 'open'}`}>
                      <div className="need-item-head">
                        <span className="need-cat-tag">{cat ? t[cat.i18n] : it.category}</span>
                        <span className={`need-urgency-tag urgency-${it.urgency || 'low'}`}>{urgLbl}</span>
                        <span className={`need-status-tag status-${it.status || 'open'}`}>{statusLbl}</span>
                      </div>
                      {it.description && <div className="need-desc-display">{it.description}</div>}
                      <div className="need-item-meta">
                        {it.estimatedValue && <span>💵 {it.estimatedValue}</span>}
                        {it.deadline && <span>📅 {SHEMA.formatDate(it.deadline, t.locale)}</span>}
                        {it.prayerShared && <span>🙏 {t.need_prayer_shared}</span>}
                        {it.prayerAnswered && <span>✨ {t.need_prayer_answered}</span>}
                        {it.submittedBy && <span>✍ {it.submittedBy}</span>}
                        {it.submittedAt && <span>🕓 {SHEMA.formatDate(it.submittedAt, t.locale)}</span>}
                      </div>
                      {it.status === 'fulfilled' && (it.fulfilledBy || it.fulfilledDate) && (
                        <div className="need-fulfilled-display">
                          ✓ {t.need_status_fulfilled}: <strong>{it.fulfilledBy}</strong>
                          {it.fulfilledDate && <em> — {SHEMA.formatDate(it.fulfilledDate, t.locale)}</em>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {p.needsNotes && (
              <div className="notes-panel" style={{ marginTop: 14 }}>{p.needsNotes}</div>
            )}
          </section>

          {/* 8 Photos / Videos */}
          {((p.mediaVideos || []).length > 0 || (p.mediaPhotoCaptions || []).some(Boolean) || true) && (
            <section className="modal-section" data-sec="8" id="detail-sec-8">
              <h2 className="modal-section-title"><span className="num">8</span> {t.sec_media}</h2>
              <div className="media-photo-grid det">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div className="media-photo-tile det" key={i}>
                    <image-slot id={`media-photo-${p.id}-${i}`} shape="rounded" radius="8" placeholder={t.f_media_drop_hint}></image-slot>
                    {(p.mediaPhotoCaptions || [])[i] && (
                      <div className="media-caption-display">{(p.mediaPhotoCaptions || [])[i]}</div>
                    )}
                    <div className="media-caption-display" style={{ fontWeight: 700, color: (p.mediaPhotoAuth || [])[i] === false ? '#b03a1a' : 'var(--shema-verde-claro)' }}>
                      {(p.mediaPhotoAuth || [])[i] === false ? ('⊘ ' + t.media_auth_no) : ('✓ ' + t.media_auth_yes)}
                    </div>
                  </div>
                ))}
              </div>
              {(p.mediaVideos || []).length > 0 && (
                <>
                  <h4 className="media-h4" style={{ marginTop: 20 }}>🎥 {t.f_media_videos_title}</h4>
                  <div className="media-video-grid">
                    {(p.mediaVideos || []).map((v, i) => {
                      const embed = videoEmbedUrl(v.url);
                      return (
                        <div key={i} className="media-video-card">
                          {embed ? (
                            <div className="media-video-frame">
                              <iframe src={embed} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={v.caption || 'video'}></iframe>
                            </div>
                          ) : (
                            <div className="media-video-frame missing">
                              {v.url ? <a href={v.url} target="_blank" rel="noopener">▶ {v.url}</a> : '—'}
                            </div>
                          )}
                          {v.caption && <div className="media-caption-display">{v.caption}</div>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {/* 9 Notes */}
          {p.notes && (
            <section className="modal-section" data-sec="9" id="detail-sec-9">
              <h2 className="modal-section-title"><span className="num">9</span> {t.sec_notes}</h2>
              <div className="notes-panel">{p.notes}</div>
            </section>
          )}

          {(p.materials || []).length > 0 && (
            <section className="modal-section" data-sec="10" id="detail-sec-10">
              <h2 className="modal-section-title"><span className="num">10</span> {t.sec_materials}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.materials.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                    <span className="tag accent" style={{ flex: '0 0 auto' }}>{m.kind === 'audio' ? t.mat_kind_audio : m.kind === 'video' ? t.mat_kind_video : t.mat_kind_text}</span>
                    <span style={{ flex: 1, fontFamily: 'var(--font-serif)', fontSize: 14 }}>{m.scope || '—'}</span>
                    {m.fileName ? <a href={m.dataUrl || '#'} download={m.fileName} style={{ flex: '0 0 auto', fontSize: 13, fontWeight: 700, color: 'var(--shema-telha)', textDecoration: 'none' }}>{t.mat_open}</a> : null}
                    {m.link ? <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ flex: '0 0 auto', fontSize: 13, fontWeight: 700, color: 'var(--shema-telha)', textDecoration: 'none' }}>{t.mat_open_link}</a> : null}
                    <span style={{ flex: '0 0 auto', fontSize: 13, color: (m.fileName || m.link) ? 'var(--shema-verde)' : 'var(--fg-subtle)' }}>{m.fileName ? ('✓ ' + m.fileName) : (m.link ? t.mat_has_link : t.mat_no_file)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* (Financial moved to section 4 above) */}
        </div>

        <div className="modal-foot">
          <div className="field-form-menu-wrap">
            <button className="btn secondary" onClick={() => setFormMenuOpen(v => !v)}>📨 {t.field_form_choose} {formMenuOpen ? '▴' : '▾'}</button>
            {formMenuOpen && (
              <div className="field-form-menu">
                {[
                  ['progress', t.field_form_progress],
                  ['health', t.field_form_health],
                  ['needs', t.field_form_needs],
                  ['media', t.field_form_media],
                  ['full', t.field_form_full],
                ].map(([id, lbl]) => (
                  <button key={id} type="button" className="field-form-menu-item" onClick={() => { setFormMenuOpen(false); onGenerateField(id); }}>{lbl}</button>
                ))}
                <div className="field-form-menu-sep">{t.locale === 'pt-BR' ? 'No app · Facilitador de Projetos Internacional' : 'In-app · International Project Facilitator'}</div>
                <button type="button" className="field-form-menu-item field-form-menu-item-special" onClick={() => { setFormMenuOpen(false); onOpenHealthAssessment && onOpenHealthAssessment(project); }}>
                  💚 {t.locale === 'pt-BR' ? 'Avaliação de Saúde (durante reunião)' : 'Health Assessment (during call)'}
                </button>
              </div>
            )}
          </div>
          <div className="foot-actions">
            <button className="btn secondary" onClick={onClose}>{t.btn_cancel}</button>
            <button className="btn primary" onClick={onEdit}>✎ {t.btn_edit}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDIT MODAL
// ============================================================
const TRANSLATION_TYPES = ['OBT', 'OMT', 'OBT/OMT', 'Tradução escrita', 'IA Assistida', 'Filme Jesus', 'Língua de Sinais', 'Ready Vessels', 'Taste&See'];
const FINANCIAL_RESOURCES = ['Seed Company', 'Global Partnerships', 'OBT TABLE - ETEN', 'Innovation Lab', 'Outros'];
const OBJECTIVES = ['NT', 'AT', 'Bíblia Completa', 'Livros Específicos', 'Capítulos', 'Histórias', 'Outro'];
const NEED_CATEGORIES = [
  { id: 'financial', i18n: 'need_cat_financial' },
  { id: 'training', i18n: 'need_cat_training' },
  { id: 'equipment', i18n: 'need_cat_equipment' },
  { id: 'volunteers', i18n: 'need_cat_volunteers' },
  { id: 'material', i18n: 'need_cat_material' },
  { id: 'security', i18n: 'need_cat_security' },
  { id: 'connectivity', i18n: 'need_cat_connectivity' },
  { id: 'logistics', i18n: 'need_cat_logistics' },
  { id: 'documentation', i18n: 'need_cat_documentation' },
];

function NeedItemRow({ item, onChange, onRemove, t }) {
  const set = (k, v) => onChange({ ...item, [k]: v });
  const cat = NEED_CATEGORIES.find(c => c.id === item.category);
  return (
    <div className={`need-item urgency-${item.urgency || 'low'} status-${item.status || 'open'}`}>
      <div className="need-item-head">
        <select className="form-select need-cat-select" value={item.category || 'financial'} onChange={e => set('category', e.target.value)}>
          {NEED_CATEGORIES.map(c => <option key={c.id} value={c.id}>{t[c.i18n]}</option>)}
        </select>
        <select className="form-select need-urgency-select" value={item.urgency || 'low'} onChange={e => set('urgency', e.target.value)}>
          <option value="low">● {t.need_urgency_low}</option>
          <option value="medium">● {t.need_urgency_medium}</option>
          <option value="high">● {t.need_urgency_high}</option>
        </select>
        <select className="form-select need-status-select" value={item.status || 'open'} onChange={e => set('status', e.target.value)}>
          <option value="open">○ {t.need_status_open}</option>
          <option value="in-progress">◐ {t.need_status_inprogress}</option>
          <option value="fulfilled">● {t.need_status_fulfilled}</option>
        </select>
        <button type="button" className="pt-remove" onClick={onRemove}>×</button>
      </div>
      <textarea className="form-textarea need-desc" value={item.description || ''} onChange={e => set('description', e.target.value)} placeholder={t.need_description} rows="2" />
      <div className="need-item-grid">
        <div className="form-field">
          <label className="form-label">{t.need_estimated_value}</label>
          <input className="form-input" type="text" value={item.estimatedValue || ''} onChange={e => set('estimatedValue', e.target.value)} placeholder="R$" />
        </div>
        <div className="form-field">
          <label className="form-label">{t.need_deadline}</label>
          <input className="form-input" type="date" value={item.deadline || ''} onChange={e => set('deadline', e.target.value)} />
        </div>
      </div>
      <div className="need-item-prayer">
        <label><input type="checkbox" checked={!!item.prayerShared} onChange={e => set('prayerShared', e.target.checked)} /><span>🙏 {t.need_prayer_shared}</span></label>
        <label><input type="checkbox" checked={!!item.prayerAnswered} onChange={e => set('prayerAnswered', e.target.checked)} /><span>✨ {t.need_prayer_answered}</span></label>
      </div>
      {item.status === 'fulfilled' && (
        <div className="need-item-fulfilled">
          <div className="form-field">
            <label className="form-label">{t.need_fulfilled_by}</label>
            <input className="form-input" type="text" value={item.fulfilledBy || ''} onChange={e => set('fulfilledBy', e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label">{t.need_fulfilled_date}</label>
            <input className="form-input" type="date" value={item.fulfilledDate || ''} onChange={e => set('fulfilledDate', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

function makeEmptyProject() {
  return {
    id: Date.now().toString(),
    languageName: '', languageCode: '', bridgeLanguage: '',
    vitalityStatus: '', location: '', location2: '', speakerCount: '',
    sensitiveCountry: false,
    inETEN: false,
    translationType: [], financialResources: [],
    team: '', ywamBase: '', teamLeader: '', teamLeaderContact: '',
    mentor: '', mentorContact: '',
    regionalCoordinator: '', obtLabPerson: '', resourceCirclePerson: '',
    translators: '', technicalReviewers: '', partnerOrg: '', teamContact: '',
    objective: [], scopeDetails: '', totalUnits: 0, totalUnitsType: 'Livros',
    phases: [], materials: [],
    translatedUnits: 0, communityCheckedUnits: 0, approvedUnits: 0,
    startDate: '', deadline: '',
    status: 'em-andamento',
    bookProgress: [], storyProgress: [], otherProgress: [],
    storiesTranslated: '', readyVesselsAudioHours: '', mediaPhotoAuth: [],
    healthEmotional: '', healthRelational: '', healthSpiritual: '',
    healthAssessmentDate: '', healthAssessor: '',
    healthNotes: '', prayerRequests: '',
    needsPastoralIntervention: 'nao', pastoralInterventionName: '',
    needFinancial: false, needTraining: false, needEquipment: false,
    needsNotes: '', notes: '',
    progressHistory: [],
  };
}

// ---------- Progress sub-tables ----------
function ProgressBookTable({ items = [], onChange, t }) {
  const used = new Set((items || []).map(b => b.id));
  const add = (bookId) => {
    const b = SHEMA.BIBLE_BOOKS.find(x => x.id === bookId);
    if (!b) return;
    onChange([...items, { id: b.id, name: b.name, chapters: b.chapters, translated: 0, communityChecked: 0, mentorApproved: 0 }]);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, key, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

  return (
    <div className="progress-table">
      <div className="progress-table-head">
        <span className="pt-col-name">{t.col_book}</span>
        <span className="pt-col-num">{t.col_chapters}</span>
        <span className="pt-col-num">{t.col_translated}</span>
        <span className="pt-col-num">{t.col_checked}</span>
        <span className="pt-col-num">{t.col_approved}</span>
        <span className="pt-col-action" />
      </div>
      {items.map((it, i) => (
        <div className="progress-table-row" key={i}>
          <span className="pt-col-name" title={it.name}>{it.name}</span>
          <span className="pt-col-num pt-static">{it.chapters}</span>
          <input className="pt-col-num pt-input" type="number" min="0" max={it.chapters}
                 value={it.translated || 0} onChange={e => update(i, 'translated', Math.min(it.chapters, +e.target.value || 0))} />
          <input className="pt-col-num pt-input" type="number" min="0" max={it.chapters}
                 value={it.communityChecked || 0} onChange={e => update(i, 'communityChecked', Math.min(it.chapters, +e.target.value || 0))} />
          <input className="pt-col-num pt-input" type="number" min="0" max={it.chapters}
                 value={it.mentorApproved || 0} onChange={e => update(i, 'mentorApproved', Math.min(it.chapters, +e.target.value || 0))} />
          <button type="button" className="pt-remove" onClick={() => remove(i)} title="Remover">×</button>
        </div>
      ))}
      <div className="progress-table-add">
        <select className="form-select" value="" onChange={e => { if (e.target.value) { add(e.target.value); e.target.value = ''; } }}>
          <option value="">{t.btn_add_book}</option>
          <optgroup label={t.locale === 'pt-BR' ? 'Antigo Testamento' : 'Old Testament'}>
            {SHEMA.BIBLE_BOOKS.filter(b => b.ot && !used.has(b.id)).map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.chapters})</option>
            ))}
          </optgroup>
          <optgroup label={t.locale === 'pt-BR' ? 'Novo Testamento' : 'New Testament'}>
            {SHEMA.BIBLE_BOOKS.filter(b => !b.ot && !used.has(b.id)).map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.chapters})</option>
            ))}
          </optgroup>
        </select>
      </div>
    </div>
  );
}

function ProgressFreeTable({ items = [], onChange, t, kind }) {
  const colName = kind === 'story' ? t.col_story : t.col_unit;
  const addBtn = kind === 'story' ? t.btn_add_story : t.btn_add_unit;
  const add = () => onChange([...items, kind === 'story' ? { name: '', audioHours: '', recordLocation: '', recordStatus: 'planned', aiAssisted: false } : { name: '', chapters: 1, translated: 0, communityChecked: 0, mentorApproved: 0 }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, key, val) => onChange(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  return (
    <div className="progress-table">
      <div className="progress-table-head">
        <span className="pt-col-name">{colName}</span>
        {kind === 'story' ? (
          <span className="pt-col-num" style={{ flex: '0 0 130px' }}>{t.story_audio_hours}</span>
        ) : (
          <>
            <span className="pt-col-num">{t.col_chapters}</span>
            <span className="pt-col-num">{t.col_translated}</span>
            <span className="pt-col-num">{t.col_checked}</span>
            <span className="pt-col-num">{t.col_approved}</span>
          </>
        )}
        <span className="pt-col-action" />
      </div>
      {items.map((it, i) => (
        <React.Fragment key={i}>
        <div className="progress-table-row">
          <input className="pt-col-name pt-input" type="text" placeholder={colName}
                 value={it.name} onChange={e => update(i, 'name', e.target.value)} />
          {kind === 'story' ? (
            <input className="pt-col-num pt-input" type="number" min="0" step="0.5" style={{ flex: '0 0 130px' }}
                   value={it.audioHours ?? ''} onChange={e => update(i, 'audioHours', e.target.value === '' ? '' : Math.max(0, +e.target.value))} placeholder="0" />
          ) : (
            <>
              <input className="pt-col-num pt-input" type="number" min="1"
                     value={it.chapters || 1} onChange={e => update(i, 'chapters', +e.target.value || 1)} />
              <input className="pt-col-num pt-input" type="number" min="0"
                     value={it.translated || 0} onChange={e => update(i, 'translated', +e.target.value || 0)} />
              <input className="pt-col-num pt-input" type="number" min="0"
                     value={it.communityChecked || 0} onChange={e => update(i, 'communityChecked', +e.target.value || 0)} />
              <input className="pt-col-num pt-input" type="number" min="0"
                     value={it.mentorApproved || 0} onChange={e => update(i, 'mentorApproved', +e.target.value || 0)} />
            </>
          )}
          <button type="button" className="pt-remove" onClick={() => remove(i)} title="Remover">×</button>
        </div>
        {kind === 'story' && (
          <div className="story-detail-row" style={{ display: 'flex', gap: 8, padding: '0 0 10px 0', flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="pt-input" style={{ flex: '1 1 220px' }} type="text" placeholder={t.story_location_ph}
                   value={it.recordLocation || ''} onChange={e => update(i, 'recordLocation', e.target.value)} />
            <select className="pt-input" style={{ flex: '0 0 180px' }} value={it.recordStatus || 'planned'} onChange={e => update(i, 'recordStatus', e.target.value)}>
              <option value="planned">{t.story_st_planned}</option>
              <option value="recording">{t.story_st_recording}</option>
              <option value="recorded">{t.story_st_recorded}</option>
            </select>
            <label style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--shema-verde)', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!it.aiAssisted} onChange={e => update(i, 'aiAssisted', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--shema-telha)' }} />
              {t.story_ai}
            </label>
          </div>
        )}
        </React.Fragment>
      ))}
      <div className="progress-table-add">
        <button type="button" className="btn secondary" onClick={add} style={{ width: '100%', justifyContent: 'center' }}>{addBtn}</button>
      </div>
    </div>
  );
}

function EditModal({ project, isNew, t, onClose, onSave, onDelete }) {
  const [data, setData] = useState(() => project ? JSON.parse(JSON.stringify(project)) : makeEmptyProject());
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const toggleArr = (k, v) => setData(d => {
    const arr = Array.isArray(d[k]) ? d[k] : [];
    return { ...d, [k]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] };
  });

  const scrollTo = (sec) => {
    const el = document.getElementById(`edit-sec-${sec}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!data.languageName || !data.bridgeLanguage || !data.team) {
      window.dispatchEvent(new CustomEvent('shema-toast', { detail: { msg: 'Preencha língua, ponte e equipe.', type: 'error' } }));
      return;
    }
    if (!data.objective || data.objective.length === 0) {
      window.dispatchEvent(new CustomEvent('shema-toast', { detail: { msg: t.toast_obj_required, type: 'error' } }));
      return;
    }
    onSave(data);
  };

  const handleDelete = () => {
    if (confirm(t.confirm_delete)) onDelete(data.id);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={handleSave}>
        <div className="modal-hero">
          <div className="modal-hero-row">
            <div>
              <div className="modal-hero-eyebrow">{isNew ? '+ ' + t.modal_new : t.modal_edit}</div>
              <h1 className="modal-hero-title">{data.languageName || (isNew ? t.modal_new : '—')}</h1>
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="modal-nav">
          {[
            { n: 1, lbl: t.sec_id }, { n: 2, lbl: t.sec_team }, { n: 3, lbl: t.sec_objective }, { n: 4, lbl: t.sec_financial },
            { n: 5, lbl: t.sec_progress }, { n: 6, lbl: t.sec_health }, { n: 7, lbl: t.sec_needs }, { n: 8, lbl: t.sec_media },
            { n: 9, lbl: t.sec_notes }, { n: 10, lbl: t.sec_materials },
          ].map(s => (
            <button key={s.n} type="button" className="modal-nav-chip" data-sec={s.n} onClick={() => scrollTo(s.n)}>
              <span className="modal-nav-num">{s.n}</span><span>{s.lbl}</span>
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* SECTION 1 — IDENTIFICATION */}
          <div className="form-section" data-sec="1" id="edit-sec-1">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: 'var(--shema-verde)' }}>1</span> {t.sec_id}</h3>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">{t.f_lang_name} *</label><input className="form-input" value={data.languageName} onChange={e => set('languageName', e.target.value)} placeholder={t.placeholder_lang} required /></div>
              <div className="form-field"><label className="form-label">{t.f_lang_code}</label><input className="form-input" value={data.languageCode} onChange={e => set('languageCode', e.target.value)} placeholder={t.placeholder_iso} maxLength={10} /></div>
              <div className="form-field"><label className="form-label">{t.f_bridge} *</label><input className="form-input" value={data.bridgeLanguage} onChange={e => set('bridgeLanguage', e.target.value)} placeholder={t.placeholder_bridge} required /></div>
              <div className="form-field">
                <label className="form-label">{t.f_vitality}</label>
                <select className="form-select" value={data.vitalityStatus} onChange={e => set('vitalityStatus', e.target.value)}>
                  <option value="">{t.vit_na}</option>
                  <option value="Vital">{t.vit_vital}</option>
                  <option value="Vulnerável">{t.vit_vulnerable}</option>
                  <option value="Ameaçada">{t.vit_threatened}</option>
                  <option value="Seriamente ameaçada">{t.vit_severely}</option>
                  <option value="Em situação crítica">{t.vit_critical}</option>
                  <option value="Extinta">{t.vit_extinct}</option>
                </select>
              </div>
              <div className="form-field full"><label className="form-label">{t.f_location}</label><input className="form-input" value={data.location} onChange={e => set('location', e.target.value)} placeholder={t.placeholder_location} /></div>
              <div className="form-field full"><label className="form-label">{t.f_location2}</label><input className="form-input" value={data.location2 || ''} onChange={e => set('location2', e.target.value)} placeholder={t.placeholder_location2} /></div>
              <div className="form-field"><label className="form-label">{t.f_speakers}</label><input type="number" className="form-input" value={data.speakerCount} onChange={e => set('speakerCount', e.target.value)} placeholder="Ex: 35000" min="0" /></div>
              <div className="form-field full">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!data.sensitiveCountry} onChange={e => set('sensitiveCountry', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--shema-telha)' }} />
                  {t.f_sensitive}
                </label>
                <span className="field-hint" style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--fg-subtle)' }}>{t.f_sensitive_hint}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2 — TEAM */}
          <div className="form-section" data-sec="2" id="edit-sec-2">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: 'var(--shema-verde-claro)' }}>2</span> {t.sec_team}</h3>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">{t.f_facilitators} *</label><input className="form-input" value={data.team} onChange={e => set('team', e.target.value)} placeholder={t.placeholder_facilitators} required /></div>
              <div className="form-field"><label className="form-label">{t.f_ywam}</label><input className="form-input" value={data.ywamBase} onChange={e => set('ywamBase', e.target.value)} placeholder="Ex: JOCUM Belém" /></div>
              <div className="form-field"><label className="form-label">{t.f_leader}</label><input className="form-input" value={data.teamLeader} onChange={e => set('teamLeader', e.target.value)} placeholder={t.placeholder_leader} /></div>
              <div className="form-field"><label className="form-label">{t.f_leader_contact}</label><input className="form-input" value={data.teamLeaderContact || ''} onChange={e => set('teamLeaderContact', e.target.value)} placeholder="email / WhatsApp" /></div>
              <div className="form-field"><label className="form-label">{t.f_mentor}</label><input className="form-input" value={data.mentor} onChange={e => set('mentor', e.target.value)} placeholder="Nome do mentor" /></div>
              <div className="form-field"><label className="form-label">{t.f_mentor_contact}</label><input className="form-input" value={data.mentorContact || ''} onChange={e => set('mentorContact', e.target.value)} placeholder="email / WhatsApp" /></div>
              <div className="form-field full"><label className="form-label">{t.f_regional_coord}</label><input className="form-input" value={data.regionalCoordinator || ''} onChange={e => set('regionalCoordinator', e.target.value)} placeholder={t.placeholder_regional_coord} /></div>
              <div className="form-field"><label className="form-label">{t.f_obtlab_person}</label><input className="form-input" value={data.obtLabPerson || ''} onChange={e => set('obtLabPerson', e.target.value)} placeholder={t.placeholder_obtlab} /></div>
              <div className="form-field"><label className="form-label">{t.f_resource_person}</label><input className="form-input" value={data.resourceCirclePerson || ''} onChange={e => set('resourceCirclePerson', e.target.value)} placeholder={t.placeholder_resource} /></div>
              <div className="form-field full"><label className="form-label">{t.f_translators}</label><input className="form-input" value={data.translators} onChange={e => set('translators', e.target.value)} placeholder={t.placeholder_translators} /></div>
              <div className="form-field"><label className="form-label">{t.f_reviewers}</label><input className="form-input" value={data.technicalReviewers} onChange={e => set('technicalReviewers', e.target.value)} /></div>
              <div className="form-field"><label className="form-label">{t.f_partner}</label><input className="form-input" value={data.partnerOrg} onChange={e => set('partnerOrg', e.target.value)} /></div>
            </div>
          </div>

          {/* SECTION 3 — OBJECTIVE */}
          <div className="form-section" data-sec="3" id="edit-sec-3">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: 'var(--shema-azul)' }}>3</span> {t.sec_objective}</h3>
            <div className="form-grid">
              <div className="form-field full">
                <label className="form-label">{t.f_obj} *</label>
                <div className="checkbox-group">
                  {OBJECTIVES.map(o => (
                    <label key={o}><input type="checkbox" checked={(data.objective || []).includes(o)} onChange={() => toggleArr('objective', o)} /><span>{o}</span></label>
                  ))}
                </div>
              </div>
              <div className="form-field full">
                <label className="form-label">{t.f_translation_type}</label>
                <div className="checkbox-group">
                  {TRANSLATION_TYPES.map(typ => (
                    <label key={typ}><input type="checkbox" checked={(data.translationType || []).includes(typ)} onChange={() => toggleArr('translationType', typ)} /><span>{typ}</span></label>
                  ))}
                </div>
              </div>
              <div className="form-field"><label className="form-label">{t.f_start}</label><input type="date" className="form-input" value={data.startDate} onChange={e => set('startDate', e.target.value)} /></div>
              <div className="form-field"><label className="form-label">{t.f_deadline}</label><input type="date" className="form-input" value={data.deadline} onChange={e => set('deadline', e.target.value)} /></div>
              <div className="form-field full">
                <label className="form-label">{t.f_phases}</label>
                <span className="field-hint" style={{ display: 'block', marginBottom: 8, fontSize: 12, color: 'var(--fg-subtle)' }}>{t.f_phases_hint}</span>
                {(data.phases || []).map((ph, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: '0 0 56px' }} value={ph.label || ''} onChange={e => { const ps = [...(data.phases || [])]; ps[i] = { ...ps[i], label: e.target.value }; set('phases', ps); }} placeholder={t.f_phase_n} />
                    <input className="form-input" style={{ flex: 1 }} value={ph.scope || ''} onChange={e => { const ps = [...(data.phases || [])]; ps[i] = { ...ps[i], scope: e.target.value }; set('phases', ps); }} placeholder={t.f_phase_scope} />
                    <input type="date" className="form-input" style={{ flex: '0 0 150px' }} value={ph.date || ''} onChange={e => { const ps = [...(data.phases || [])]; ps[i] = { ...ps[i], date: e.target.value }; set('phases', ps); }} />
                    <button type="button" className="btn-icon" style={{ flex: '0 0 auto', width: 36, height: 36, borderRadius: 999, border: 'none', background: 'var(--bg-muted)', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 18 }} onClick={() => { const ps = (data.phases || []).filter((_, j) => j !== i); set('phases', ps); }}>×</button>
                  </div>
                ))}
                <button type="button" className="btn secondary" style={{ marginTop: 4 }} onClick={() => set('phases', [...(data.phases || []), { label: 'Etapa ' + ((data.phases || []).length + 1), scope: '', date: '' }])}>+ {t.f_phase_add}</button>
              </div>
              <div className="form-field full"><label className="form-label">{t.f_notes}</label><textarea className="form-textarea" value={data.objectiveNotes || ''} onChange={e => set('objectiveNotes', e.target.value)} placeholder={t.locale === 'pt-BR' ? 'Anota\u00e7\u00f5es sobre o objetivo deste projeto...' : 'Notes about this project objective...'} /></div>
            </div>
          </div>

          {/* SECTION 4 — FINANCIAL RESOURCES */}
          <div className="form-section" data-sec="4" id="edit-sec-4">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: 'var(--shema-telha)' }}>4</span> {t.sec_financial}</h3>
            <div className="form-grid">
              <div className="form-field full">
                <label className="form-label">{t.f_in_eten}</label>
                <div className="checkbox-group" style={{ display: 'flex', gap: 18 }}>
                  <label><input type="radio" name="etenRadio" checked={!!data.inETEN} onChange={() => set('inETEN', true)} /><span>{t.sim}</span></label>
                  <label><input type="radio" name="etenRadio" checked={!data.inETEN} onChange={() => set('inETEN', false)} /><span>{t.nao}</span></label>
                </div>
              </div>
              <div className="form-field full">
                <label className="form-label">{t.f_financial}</label>
                <div className="checkbox-group">
                  {FINANCIAL_RESOURCES.map(f => (
                    <label key={f}><input type="checkbox" checked={(data.financialResources || []).includes(f)} onChange={() => toggleArr('financialResources', f)} /><span>{f}</span></label>
                  ))}
                </div>
              </div>
              {(data.financialResources || []).includes('Outros') && (
                <div className="form-field full">
                  <label className="form-label">{t.locale === 'pt-BR' ? 'Detalhes de "Outros"' : 'Details for "Other"'}</label>
                  <input className="form-input" value={data.financialOtherDetails || ''} onChange={e => set('financialOtherDetails', e.target.value)} placeholder={t.locale === 'pt-BR' ? 'Descreva a fonte de recurso' : 'Describe the funding source'} />
                </div>
              )}
              <div className="form-field full">
                <label className="form-label">{t.f_notes}</label>
                <textarea className="form-textarea" value={data.financialNotes || ''} onChange={e => set('financialNotes', e.target.value)} placeholder={t.locale === 'pt-BR' ? 'Notas sobre a situação financeira do projeto...' : 'Notes about the project\'s financial situation...'} />
              </div>
            </div>
          </div>

          {/* SECTION 5 — PROGRESS */}
          <div className="form-section" data-sec="5" id="edit-sec-5">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: '#c98b2d' }}>5</span> {t.sec_progress}</h3>
            <div className="form-grid">
              <div className="form-field full">
                <label className="form-label">{t.f_project_status}</label>
                <div className="status-radio-group">
                  {[
                    ['em-andamento', t.project_status_active, 'var(--shema-verde-claro)'],
                    ['pausado', t.project_status_paused, '#c98b2d'],
                    ['planejado', t.project_status_planned, 'var(--shema-azul)'],
                  ].map(([val, lbl, color]) => (
                    <label key={val} className={`status-radio ${data.status === val ? 'active' : ''}`} style={{ '--c': color }}>
                      <input type="radio" name="projectStatus" value={val} checked={data.status === val} onChange={() => set('status', val)} />
                      <span className="sr-dot" />
                      <span className="sr-label">{lbl}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ marginTop: 14, display: 'none' }}>
              <div className="form-field">
                <label className="form-label">{t.f_stories_translated}</label>
                <input type="number" min="0" className="form-input" value={data.storiesTranslated ?? ''} onChange={e => set('storiesTranslated', e.target.value === '' ? '' : Math.max(0, +e.target.value))} placeholder="0" />
                <span className="field-hint">{t.f_stories_translated_hint}</span>
              </div>
              <div className="form-field">
                <label className="form-label">{t.f_rv_audio_hours}</label>
                <input type="number" min="0" step="0.5" className="form-input" value={data.readyVesselsAudioHours ?? ''} onChange={e => set('readyVesselsAudioHours', e.target.value === '' ? '' : Math.max(0, +e.target.value))} placeholder="0" />
                <span className="field-hint">{t.f_rv_audio_hours_hint}</span>
              </div>
            </div>

            {((data.objective || []).some(o => ['NT','AT','Bíblia Completa','Livros Específicos','Capítulos'].includes(o))) && (
              <div style={{ marginTop: 20 }}>
                <div className="progress-section-header">
                  <strong>📖 {t.progress_books_title}</strong>
                  <em>{t.progress_books_hint}</em>
                </div>
                <ProgressBookTable items={data.bookProgress || []} onChange={v => set('bookProgress', v)} t={t} />
              </div>
            )}

            {((data.objective || []).includes('Histórias')) && (
              <div style={{ marginTop: 20 }}>
                <div className="progress-section-header">
                  <strong>📚 {t.progress_stories_title}</strong>
                  <em>{t.progress_stories_hint}</em>
                </div>
                <ProgressFreeTable items={data.storyProgress || []} onChange={v => set('storyProgress', v)} t={t} kind="story" />
              </div>
            )}

            {((data.objective || []).includes('Outro') || (data.translationType || []).some(tt => ['Filme Jesus','Tradução escrita'].includes(tt))) && (
              <div style={{ marginTop: 20 }}>
                <div className="progress-section-header">
                  <strong>🎬 {t.progress_other_title}</strong>
                </div>
                <ProgressFreeTable items={data.otherProgress || []} onChange={v => set('otherProgress', v)} t={t} kind="other" />
              </div>
            )}
          </div>

          {/* SECTION 6 — HEALTH */}
          <div className="form-section" data-sec="6" id="edit-sec-6">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: '#a85972' }}>6</span> {t.sec_health}</h3>
            <div className="form-grid form-grid three">
              {['Emotional', 'Relational', 'Spiritual', 'Physical'].map(k => (
                <div key={k} className="form-field">
                  <label className="form-label">{t['f_' + k.toLowerCase()]}</label>
                  <select className="form-select" value={data[`health${k}`] || ''} onChange={e => set(`health${k}`, e.target.value)}>
                    <option value="">{t.vit_na}</option>
                    <option value="boa">{t.health_good}</option>
                    <option value="atencao">{t.health_attention}</option>
                    <option value="critica">{t.health_critical}</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <div className="form-field"><label className="form-label">{t.f_assessment_date}</label><input type="date" className="form-input" value={data.healthAssessmentDate} onChange={e => set('healthAssessmentDate', e.target.value)} /></div>
              <div className="form-field"><label className="form-label">{t.f_assessor}</label><input className="form-input" value={data.healthAssessor} onChange={e => set('healthAssessor', e.target.value)} /></div>
              <div className="form-field full"><label className="form-label">{t.f_health_notes}</label><textarea className="form-textarea" value={data.healthNotes} onChange={e => set('healthNotes', e.target.value)} /></div>
              <div className="form-field full"><label className="form-label">🕊 {t.f_prayer}</label><textarea className="form-textarea" value={data.prayerRequests} onChange={e => set('prayerRequests', e.target.value)} /></div>
              <div className="form-field">
                <label className="form-label">⛪ {t.f_pastoral}</label>
                <select className="form-select" value={data.needsPastoralIntervention} onChange={e => set('needsPastoralIntervention', e.target.value)}>
                  <option value="nao">{t.nao}</option>
                  <option value="sim">{t.sim}</option>
                </select>
              </div>
              {data.needsPastoralIntervention === 'sim' && (
                <div className="form-field"><label className="form-label">{t.f_pastoral_who}</label><input className="form-input" value={data.pastoralInterventionName} onChange={e => set('pastoralInterventionName', e.target.value)} /></div>
              )}
            </div>
          </div>

          {/* SECTION 7 — NEEDS */}
          <div className="form-section" data-sec="7" id="edit-sec-7">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: 'var(--shema-areia)', color: 'var(--shema-verde)' }}>7</span> {t.sec_needs}</h3>
            <div className="need-items-list">
              {(data.needsItems || []).map((it, i) => (
                <NeedItemRow
                  key={i}
                  item={it}
                  t={t}
                  onChange={v => set('needsItems', (data.needsItems || []).map((x, idx) => idx === i ? v : x))}
                  onRemove={() => set('needsItems', (data.needsItems || []).filter((_, idx) => idx !== i))}
                />
              ))}
              <button type="button" className="btn secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => set('needsItems', [...(data.needsItems || []), { category: 'financial', urgency: 'low', status: 'open', description: '', estimatedValue: '', deadline: '', prayerShared: false, prayerAnswered: false }])}>{t.need_add_item}</button>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="form-field full"><label className="form-label">{t.f_needs_notes}</label><textarea className="form-textarea" value={data.needsNotes} onChange={e => set('needsNotes', e.target.value)} /></div>
            </div>
          </div>

          {/* SECTION 8 — PHOTOS / VIDEOS */}
          <div className="form-section" data-sec="8" id="edit-sec-8">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: 'var(--shema-verde-claro)' }}>8</span> {t.sec_media}</h3>
            <div className="tip" style={{ background: 'rgba(119,125,69,0.10)', borderLeftColor: 'var(--shema-verde-claro)', color: 'var(--shema-verde)' }}>{t.f_media_intro}</div>
            <div className="tip" style={{ background: 'var(--accent-soft)', borderLeftColor: 'var(--shema-telha)', color: 'var(--shema-verde)', marginTop: 8 }}>{t.media_auth_intro}</div>

            <h4 className="media-h4">📸 {t.f_media_photos_title}</h4>
            <div className="media-photo-grid">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div className="media-photo-tile" key={i}>
                  <image-slot id={`media-photo-${data.id}-${i}`} shape="rounded" radius="8" placeholder={t.f_media_drop_hint}></image-slot>
                  <input
                    className="form-input media-caption"
                    type="text"
                    value={(data.mediaPhotoCaptions || [])[i] || ''}
                    onChange={e => {
                      const arr = [...(data.mediaPhotoCaptions || [])];
                      while (arr.length <= i) arr.push('');
                      arr[i] = e.target.value;
                      set('mediaPhotoCaptions', arr);
                    }}
                    placeholder={t.f_media_caption}
                  />
                  <label className="media-auth-toggle" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--shema-verde)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={(data.mediaPhotoAuth || [])[i] !== false} onChange={e => { const arr = [...(data.mediaPhotoAuth || [])]; while (arr.length <= i) arr.push(true); arr[i] = e.target.checked; set('mediaPhotoAuth', arr); }} style={{ width: 15, height: 15, accentColor: 'var(--shema-telha)' }} />
                    {t.media_auth_label}
                  </label>
                </div>
              ))}
            </div>

            <h4 className="media-h4">🎥 {t.f_media_videos_title}</h4>
            <div className="media-video-list">
              {(data.mediaVideos || []).map((v, i) => (
                <div className="media-video-row" key={i}>
                  <input
                    className="form-input"
                    type="text"
                    value={v.url || ''}
                    onChange={e => {
                      const arr = [...(data.mediaVideos || [])];
                      arr[i] = { ...arr[i], url: e.target.value };
                      set('mediaVideos', arr);
                    }}
                    placeholder={t.f_media_video_label}
                  />
                  <input
                    className="form-input"
                    type="text"
                    value={v.caption || ''}
                    onChange={e => {
                      const arr = [...(data.mediaVideos || [])];
                      arr[i] = { ...arr[i], caption: e.target.value };
                      set('mediaVideos', arr);
                    }}
                    placeholder={t.f_media_caption}
                  />
                  <button type="button" className="pt-remove" onClick={() => {
                    set('mediaVideos', (data.mediaVideos || []).filter((_, idx) => idx !== i));
                  }}>×</button>
                </div>
              ))}
              <button type="button" className="btn secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => {
                set('mediaVideos', [...(data.mediaVideos || []), { url: '', caption: '' }]);
              }}>{t.f_media_add_video}</button>
            </div>
          </div>

          {/* SECTION 9 — NOTES */}
          <div className="form-section" data-sec="9" id="edit-sec-9">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 14 }}><span className="num" style={{ background: 'var(--shema-preto)' }}>9</span> {t.sec_notes}</h3>
            <div className="form-grid">
              <div className="form-field full"><label className="form-label">{t.f_notes}</label><textarea className="form-textarea" value={data.notes} onChange={e => set('notes', e.target.value)} rows="5" /></div>
            </div>
          </div>

          {/* SECTION 10 — TRANSLATED MATERIALS */}
          <div className="form-section" data-sec="10" id="edit-sec-10">
            <h3 className="modal-section-title" style={{ borderBottom: 'none', marginBottom: 6 }}><span className="num" style={{ background: 'var(--shema-verde-claro)' }}>10</span> {t.sec_materials}</h3>
            <span className="field-hint" style={{ display: 'block', marginBottom: 14, fontSize: 12, color: 'var(--fg-subtle)' }}>{t.f_materials_hint}</span>
            <div className="media-material-list">
              {(data.materials || []).map((m, i) => (
                <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10, background: 'var(--bg-elevated)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <select className="form-input" style={{ flex: '0 0 168px' }} value={m.kind || 'text'} onChange={e => { const arr = [...(data.materials || [])]; arr[i] = { ...arr[i], kind: e.target.value }; set('materials', arr); }}>
                      <option value="text">{t.mat_kind_text}</option>
                      <option value="audio">{t.mat_kind_audio}</option>
                      <option value="video">{t.mat_kind_video}</option>
                    </select>
                    <input className="form-input" style={{ flex: 1 }} value={m.scope || ''} onChange={e => { const arr = [...(data.materials || [])]; arr[i] = { ...arr[i], scope: e.target.value }; set('materials', arr); }} placeholder={t.mat_scope} />
                    <button type="button" style={{ flex: '0 0 auto', width: 36, height: 36, borderRadius: 999, border: 'none', background: 'var(--bg-muted)', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 18 }} onClick={() => { const arr = (data.materials || []).filter((_, j) => j !== i); set('materials', arr); }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label className="btn secondary" style={{ flex: '0 0 auto', cursor: 'pointer', margin: 0 }}>
                      {m.fileName ? t.mat_replace : t.mat_import}
                      <input type="file" accept={m.kind === 'audio' ? 'audio/*' : m.kind === 'video' ? 'video/*' : '.txt,.doc,.docx,.pdf,.usfm,text/*'} style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (!f) return; const reader = new FileReader(); reader.onload = ev => { const arr = [...(data.materials || [])]; arr[i] = { ...arr[i], fileName: f.name, fileSize: f.size, dataUrl: ev.target.result }; set('materials', arr); }; reader.readAsDataURL(f); }} />
                    </label>
                    {m.fileName ? <a href={m.dataUrl || '#'} download={m.fileName} style={{ flex: '0 0 auto', fontSize: 13, fontWeight: 700, color: 'var(--shema-telha)', textDecoration: 'none' }}>{t.mat_open}</a> : null}
                    <span style={{ flex: 1, fontSize: 13, color: m.fileName ? 'var(--shema-verde)' : 'var(--fg-subtle)', fontFamily: 'var(--font-serif)' }}>{m.fileName ? ('✓ ' + m.fileName) : t.mat_no_file}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <span style={{ flex: '0 0 auto', fontSize: 12, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{t.mat_or_link}</span>
                    <input className="form-input" style={{ flex: 1 }} type="url" value={m.link || ''} onChange={e => { const arr = [...(data.materials || [])]; arr[i] = { ...arr[i], link: e.target.value }; set('materials', arr); }} placeholder={t.mat_link_ph} />
                    {m.link ? <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ flex: '0 0 auto', fontSize: 13, fontWeight: 700, color: 'var(--shema-telha)', textDecoration: 'none' }}>{t.mat_open}</a> : null}
                  </div>
                </div>
              ))}
              <button type="button" className="btn secondary" onClick={() => set('materials', [...(data.materials || []), { kind: 'text', scope: '', fileName: '' }])}>+ {t.mat_add}</button>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          {!isNew && <button type="button" className="btn danger" onClick={handleDelete}>🗑 {t.btn_delete}</button>}
          <div className="foot-actions" style={{ marginLeft: 'auto' }}>
            <button type="button" className="btn secondary" onClick={onClose}>{t.btn_cancel}</button>
            <button type="submit" className="btn primary">✓ {t.btn_save}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function videoEmbedUrl(url) {
  if (!url) return null;
  url = url.trim();
  let m = url.match(/youtu\.be\/([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/[?&]v=([\w-]+)/);
  if (m && url.includes('youtube')) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  if (url.includes('/embed/') || url.includes('player.vimeo.com')) return url;
  return null;
}

function generateFieldFormHTML(p, t, lang, formType = 'full') {
  const isPT = lang === 'pt';
  const monthName = new Date().toLocaleDateString(t.locale, { month: 'long', year: 'numeric' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const leader = p.teamLeader ? p.teamLeader.split(/[\/,]/)[0].trim() : (isPT ? 'líder' : 'leader');
  const teamName = p.team || p.ywamBase || (isPT ? 'sua base' : 'your base');
  const prev = (SHEMA.rollUpProgress && SHEMA.rollUpProgress(p)) || { translated: 0, community: 0, approved: 0, total: 0 };
  const esc = (s) => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const needChips = [
    { id: 'financial', label: isPT ? 'Recursos' : 'Funding' },
    { id: 'equipment', label: isPT ? 'Equipamento' : 'Equipment' },
    { id: 'training', label: isPT ? 'Treinamento' : 'Training' },
    { id: 'volunteers', label: isPT ? 'Voluntários' : 'Volunteers' },
    { id: 'material', label: isPT ? 'Material' : 'Material' },
    { id: 'connectivity', label: isPT ? 'Conectividade' : 'Connectivity' },
    { id: 'allgood', label: isPT ? 'Tudo certo' : 'All good' },
  ];

  const L = isPT ? {
    eyebrow: monthCap + ' · ' + (p.languageName || '—') + ' · ' + teamName,
    title: 'Conta o mês,<br>' + leader + '.',
    sub: 'Em três formas: sua voz, uma foto, alguns números. A coordenação cuida do resto.',
    s1: '01 · Sua voz', s1q: 'Como foi este mês?', s1p: 'Fale do que importa — não precisa ser perfeito. A gente escuta inteiro.',
    rec: 'Tocar para gravar', recmeta: 'até 5 minutos', recsub: 'Toque para gravar ou anexar um áudio',
    s1or: 'ou prefere escrever?', s1ph: 'Escreva como foi o mês…',
    s2: '02 · Uma foto', s2q: 'Mostre o trabalho.', s2p: 'Equipe, anciãos, evento, material impresso.',
    addphoto: 'Adicionar foto',
    s3: '03 · Os números', s3q: 'Capítulos fechados.', s3p: 'Da última vez vocês estavam em ' + (prev.translated || 0) + ' traduzidos.',
    n_tr: 'Traduzidos', n_co: 'Comunidade', n_ap: 'Aprovados',
    s4: '04 · Faltas', s4q: 'Atrapalha algo?', s4p: 'Toque o que falta este mês.',
    s5: '05 · Pedido de oração', s5q: 'O que levamos em oração?', s5p: 'Conte o que vocês querem que a rede leve a Deus. Escreva, ou grave em áudio.',
    s5ph: 'Escreva o pedido de oração…', recpray: 'Gravar pedido em áudio', recpraymeta: 'até 2 min',
    s5share: 'Autorizo compartilhar com a rede de intercessores',
    notify: 'Avisaremos a coordenação', notifysub: 'Mentor: ' + (p.mentor || '—') + ' · email + push',
    byph: 'Seu nome (quem está reportando)',
    send: 'Enviar atualização', whats: 'Compartilhar no WhatsApp',
    autosave: 'Tudo é salvo automaticamente. Pode fechar e voltar depois.',
    ok: '✓ Atualização gerada. Envie o arquivo .json à coordenação.',
    wsum: 'Conta o mês · ' + (p.languageName || '—'),
  } : {
    eyebrow: monthCap + ' · ' + (p.languageName || '—') + ' · ' + teamName,
    title: 'Tell the month,<br>' + leader + '.',
    sub: 'In three forms: your voice, a photo, a few numbers. Coordination handles the rest.',
    s1: '01 · Your voice', s1q: 'How was this month?', s1p: 'Speak what matters — it does not need to be perfect.',
    rec: 'Tap to record', recmeta: 'up to 5 minutes', recsub: 'Tap to record or attach audio',
    s1or: 'or prefer to write?', s1ph: 'Write how the month went…',
    s2: '02 · A photo', s2q: 'Show the work.', s2p: 'Team, elders, event, printed material.',
    addphoto: 'Add photo',
    s3: '03 · The numbers', s3q: 'Chapters closed.', s3p: 'Last time you were at ' + (prev.translated || 0) + ' translated.',
    n_tr: 'Translated', n_co: 'Community', n_ap: 'Approved',
    s4: '04 · Needs', s4q: 'Anything in the way?', s4p: 'Tap what is missing this month.',
    s5: '05 · Prayer request', s5q: 'What do we lift in prayer?', s5p: 'Tell us what you want the network to bring to God. Write, or record audio.',
    s5ph: 'Write the prayer request…', recpray: 'Record prayer as audio', recpraymeta: 'up to 2 min',
    s5share: 'I authorize sharing with the intercessor network',
    notify: 'We will notify coordination', notifysub: 'Mentor: ' + (p.mentor || '—') + ' · email + push',
    byph: 'Your name (who is reporting)',
    send: 'Send update', whats: 'Share on WhatsApp',
    autosave: 'Everything saves automatically. Close and come back later.',
    ok: '✓ Update generated. Send the .json file to coordination.',
    wsum: 'Monthly update · ' + (p.languageName || '—'),
  };

  return '<!DOCTYPE html>\n<html lang="' + (isPT ? 'pt-BR' : 'en') + '">\n<head>\n' +
'<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>' + esc(L.wsum) + '</title>\n<style>\n' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{font-family:"Montserrat",system-ui,-apple-system,sans-serif;background:#3F3E20;color:#F6F5EB;min-height:100vh;line-height:1.5}' +
'.wrap{max-width:560px;margin:0 auto;min-height:100vh;padding-bottom:40px}' +
'.top{display:flex;align-items:center;justify-content:space-between;padding:18px 24px 0}' +
'.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;letter-spacing:.02em;color:#F6F5EB}' +
'.brand .mk{width:26px;height:26px;background:#BE4A01;border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff}' +
'.dots{display:flex;gap:5px}.dots span{width:22px;height:3px;border-radius:99px;background:rgba(246,245,235,.25)}.dots span.on{background:#BE4A01}.dots span.done{background:#F6F5EB}' +
'.head{padding:30px 24px 16px}' +
'.eyebrow{font-weight:700;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#BE4A01;margin-bottom:10px}' +
'h1{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:400;font-size:40px;line-height:1.05;color:#F6F5EB;letter-spacing:-.01em}' +
'.lead{font-size:15px;line-height:1.5;color:rgba(246,245,235,.7);margin-top:14px}' +
'.lead b{color:#F6F5EB}' +
'.card{margin:0 16px 16px;padding:22px 20px;border-radius:22px;background:rgba(246,245,235,.06);border:1px solid rgba(246,245,235,.12)}' +
'.step{font-weight:700;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#BE4A01;margin-bottom:10px}' +
'.ct{font-weight:800;font-size:22px;color:#F6F5EB;margin-bottom:6px}' +
'.cp{font-size:14px;line-height:1.45;color:rgba(246,245,235,.7);margin-bottom:18px}' +
'.bigbtn{width:100%;padding:26px 18px;border-radius:18px;background:#BE4A01;color:#fff;border:0;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;font-family:inherit}' +
'.bigbtn svg{width:34px;height:34px}.bigbtn .lab{font-weight:700;font-size:14px;letter-spacing:.04em}.bigbtn .meta{font-weight:500;font-size:12px;color:rgba(255,255,255,.8)}' +
'.recbar{display:flex;align-items:center;gap:10px;margin-top:12px;padding:11px 14px;background:rgba(246,245,235,.08);border-radius:14px}' +
'.recbar svg{color:#BE4A01;flex:0 0 auto}.recbar .txt{font-weight:600;font-size:13px;color:#F6F5EB}.recbar .tm{margin-left:auto;font-weight:600;font-size:12px;color:rgba(246,245,235,.6)}' +
'.attach{margin-left:auto;font-weight:600;font-size:12px;color:rgba(246,245,235,.85)}' +
'.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
'.ptile{aspect-ratio:1;border-radius:12px;background-size:cover;background-position:center;position:relative;overflow:hidden}' +
'.ptile.add{background:rgba(246,245,235,.08);border:1px dashed rgba(246,245,235,.25);display:flex;align-items:center;justify-content:center;color:rgba(246,245,235,.55);font-size:13px;font-weight:600;cursor:pointer;flex-direction:column;gap:4px}' +
'.ptile.add span{font-size:26px;font-weight:300;line-height:1}' +
'.ptile input{position:absolute;inset:0;opacity:0;cursor:pointer}' +
'.ngrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}' +
'.ncell{padding:14px 8px;background:rgba(246,245,235,.06);border:1px solid rgba(246,245,235,.14);border-radius:14px;text-align:center}' +
'.nlabel{font-weight:700;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(246,245,235,.65);margin-bottom:8px}' +
'.nctl{display:flex;align-items:center;justify-content:center;gap:8px}' +
'.nbtn{width:30px;height:30px;border-radius:999px;background:rgba(246,245,235,.12);border:0;color:#F6F5EB;font-size:18px;font-weight:600;cursor:pointer}' +
'.nval{font-weight:800;font-size:24px;color:#F6F5EB;min-width:30px}' +
'.ndelta{font-weight:600;font-size:11px;color:#b4d18f;margin-top:6px;min-height:14px}' +
'.chips{display:flex;flex-wrap:wrap;gap:8px}' +
'.chip{padding:9px 15px;border:1px solid rgba(246,245,235,.22);border-radius:999px;background:transparent;font-weight:500;font-size:13px;color:rgba(246,245,235,.85);cursor:pointer}' +
'.chip.on{background:#BE4A01;color:#fff;border-color:#BE4A01}' +
'.chip.on.good{background:#7a8a4a;border-color:#7a8a4a}' +
'textarea{width:100%;padding:14px;border-radius:14px;background:rgba(246,245,235,.08);border:1px solid rgba(246,245,235,.18);color:#F6F5EB;font-family:inherit;font-size:15px;resize:vertical;min-height:84px;outline:none}' +
'textarea::placeholder{color:rgba(246,245,235,.45)}' +
'input.name{width:100%;padding:14px;border-radius:14px;background:rgba(246,245,235,.08);border:1px solid rgba(246,245,235,.18);color:#F6F5EB;font-family:inherit;font-size:15px;outline:none}' +
'input.name::placeholder{color:rgba(246,245,235,.45)}' +
'.notify{display:flex;align-items:center;gap:10px;margin:4px 16px 0;padding:13px 16px;background:rgba(246,245,235,.06);border:1px solid rgba(246,245,235,.12);border-radius:14px}' +
'.notify svg{color:#BE4A01;flex:0 0 auto}.notify .txt{flex:1}.notify .t1{font-weight:600;font-size:13px;color:#F6F5EB}.notify .t2{font-size:11px;color:rgba(246,245,235,.65);margin-top:2px}' +
'.switch{position:relative;width:40px;height:23px;flex:0 0 40px;cursor:pointer}.switch input{opacity:0;width:0;height:0;position:absolute}.switch span{position:absolute;inset:0;background:rgba(246,245,235,.2);border-radius:99px;transition:.18s}.switch span::before{content:"";position:absolute;left:2px;top:2px;width:19px;height:19px;background:#fff;border-radius:99px;transition:.18s}.switch input:checked+span{background:#BE4A01}.switch input:checked+span::before{transform:translateX(17px)}' +
'.foot{padding:16px 16px 0;display:flex;flex-direction:column;gap:10px}' +
'.cta{width:100%;padding:16px;border-radius:999px;background:#BE4A01;color:#fff;border:0;font-weight:700;font-size:15px;letter-spacing:.02em;cursor:pointer;font-family:inherit}' +
'.cta.ghost{background:transparent;border:1.5px solid rgba(246,245,235,.4);color:#F6F5EB}' +
'.fnote{font-size:12px;line-height:1.4;color:rgba(246,245,235,.5);text-align:center;margin-top:6px}' +
'.ok{display:none;margin:10px 16px 0;padding:14px;border-radius:14px;background:#7a8a4a;color:#fff;font-weight:600;font-size:13px;text-align:center}.ok.show{display:block}' +
'</style>\n</head>\n<body>\n<div class="wrap">' +
'<div class="top"><div class="brand"><span class="mk">ש</span> shemá · campo</div>' +
'<div class="dots" id="dots"><span class="on"></span><span></span><span></span><span></span><span></span></div></div>' +
'<div class="head"><p class="eyebrow">' + esc(L.eyebrow) + '</p><h1>' + L.title + '</h1><p class="lead">' + esc(L.sub) + '</p></div>' +

// 01 VOICE
'<div class="card"><div class="step">' + L.s1 + '</div><div class="ct">' + esc(L.s1q) + '</div><p class="cp">' + esc(L.s1p) + '</p>' +
'<button type="button" class="bigbtn" id="micBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>' +
'<span class="lab">' + esc(L.rec.toUpperCase()) + '</span><span class="meta">' + esc(L.recmeta) + '</span></button>' +
'<div class="recbar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0" stroke-linecap="round"/></svg><span class="txt" id="voiceSub">' + esc(L.recsub) + '</span><span class="attach" id="voiceAttach"></span></div>' +
'<input type="file" id="voiceFile" accept="audio/*" capture style="display:none">' +
'<div style="display:flex;align-items:center;gap:10px;margin:16px 0 12px"><span style="flex:1;height:1px;background:rgba(246,245,235,.14)"></span><span style="font-size:12px;color:rgba(246,245,235,.55)">' + esc(L.s1or) + '</span><span style="flex:1;height:1px;background:rgba(246,245,235,.14)"></span></div>' +
'<textarea id="voiceText" placeholder="' + esc(L.s1ph) + '"></textarea></div>' +

// 02 PHOTO
'<div class="card"><div class="step">' + L.s2 + '</div><div class="ct">' + esc(L.s2q) + '</div><p class="cp">' + esc(L.s2p) + '</p>' +
'<div class="pgrid" id="pgrid"><label class="ptile add" id="photoDrop"><span>+</span>' + esc(L.addphoto) + '<input type="file" id="photoFile" accept="image/*" capture></label></div></div>' +

// 03 NUMBERS
'<div class="card"><div class="step">' + L.s3 + '</div><div class="ct">' + esc(L.s3q) + '</div><p class="cp">' + esc(L.s3p) + '</p>' +
'<div class="ngrid">' +
'<div class="ncell"><div class="nlabel">' + esc(L.n_tr) + '</div><div class="nctl"><button type="button" class="nbtn" data-act="dec" data-k="translated">−</button><span class="nval" id="v_translated">' + (prev.translated||0) + '</span><button type="button" class="nbtn" data-act="inc" data-k="translated">+</button></div><div class="ndelta" id="d_translated"></div></div>' +
'<div class="ncell"><div class="nlabel">' + esc(L.n_co) + '</div><div class="nctl"><button type="button" class="nbtn" data-act="dec" data-k="community">−</button><span class="nval" id="v_community">' + (prev.community||0) + '</span><button type="button" class="nbtn" data-act="inc" data-k="community">+</button></div><div class="ndelta" id="d_community"></div></div>' +
'<div class="ncell"><div class="nlabel">' + esc(L.n_ap) + '</div><div class="nctl"><button type="button" class="nbtn" data-act="dec" data-k="approved">−</button><span class="nval" id="v_approved">' + (prev.approved||0) + '</span><button type="button" class="nbtn" data-act="inc" data-k="approved">+</button></div><div class="ndelta" id="d_approved"></div></div>' +
'</div></div>' +

// 04 NEEDS
'<div class="card"><div class="step">' + L.s4 + '</div><div class="ct">' + esc(L.s4q) + '</div><p class="cp">' + esc(L.s4p) + '</p>' +
'<div class="chips" id="chips">' + needChips.map(c => '<button type="button" class="chip' + (c.id==='allgood'?' good':'') + '" data-need="' + c.id + '">' + esc(c.label) + '</button>').join('') + '</div></div>' +

// 05 PRAYER
'<div class="card"><div class="step">' + L.s5 + '</div><div class="ct">' + esc(L.s5q) + '</div><p class="cp">' + esc(L.s5p) + '</p>' +
'<textarea id="prayer" placeholder="' + esc(L.s5ph) + '">' + esc(p.prayerRequests || '') + '</textarea>' +
'<div class="recbar" style="margin-top:12px" id="prayMic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg><span class="txt">' + esc(L.recpray) + '</span><span class="tm" id="prayAttach">' + esc(L.recpraymeta) + '</span></div>' +
'<input type="file" id="prayFile" accept="audio/*" capture style="display:none">' +
'<label style="display:flex;align-items:center;gap:11px;margin-top:14px;padding:13px 16px;background:rgba(246,245,235,.06);border:1px solid rgba(246,245,235,.14);border-radius:14px;cursor:pointer">' +
'<span class="switch"><input type="checkbox" id="prayShare" checked><span></span></span>' +
'<span style="font-size:13px;font-weight:600;color:#F6F5EB;line-height:1.35">' + esc(L.s5share) + '</span></label></div>' +

// REPORTER + NOTIFY
'<div class="card"><input class="name" id="by" placeholder="' + esc(L.byph) + '"></div>' +
'<div class="notify"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>' +
'<div class="txt"><div class="t1">' + esc(L.notify) + '</div><div class="t2">' + esc(L.notifysub) + '</div></div>' +
'<label class="switch"><input type="checkbox" id="notifyOpt" checked><span></span></label></div>' +

// CTAs
'<div class="foot"><button class="cta" id="sendBtn">' + esc(L.send) + '</button>' +
'<button class="cta ghost" id="whatsBtn">' + esc(L.whats) + '</button>' +
'<p class="fnote">' + esc(L.autosave) + '</p></div>' +
'<div class="ok" id="ok">' + esc(L.ok) + '</div>' +
'</div>\n' +

'<script>\n' +
'var PID=' + JSON.stringify(p.id || 'x') + ';var KEY="shema-conta-"+PID;\n' +
'var prev={translated:' + (prev.translated||0) + ',community:' + (prev.community||0) + ',approved:' + (prev.approved||0) + '};\n' +
'var state={voiceName:"",voiceText:"",prayVoiceName:"",photos:[],nums:{translated:prev.translated,community:prev.community,approved:prev.approved},needs:[],prayer:' + JSON.stringify(p.prayerRequests||'') + ',prayShare:true,reporter:"",notify:true};\n' +
'try{var sv=JSON.parse(localStorage.getItem(KEY)||"null");if(sv)Object.assign(state,sv);}catch(e){}\n' +
'function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}updateDots();}\n' +
'function updateDots(){var d=document.querySelectorAll("#dots span");var on=[!!state.voiceName,state.photos.length>0,(state.nums.translated!==prev.translated||state.nums.community!==prev.community||state.nums.approved!==prev.approved),state.needs.length>0,(!!state.prayer||!!state.prayVoiceName)];for(var i=0;i<d.length;i++)d[i].className=on[i]?"on":"";}\n' +
// numbers
'function renderNums(){["translated","community","approved"].forEach(function(k){document.getElementById("v_"+k).textContent=state.nums[k];var dl=state.nums[k]-prev[k];document.getElementById("d_"+k).textContent=dl>0?("+"+dl):(dl<0?String(dl):"");});}\n' +
'document.querySelectorAll(".nbtn").forEach(function(b){b.addEventListener("click",function(){var k=b.getAttribute("data-k");var v=state.nums[k]||0;v=b.getAttribute("data-act")==="inc"?v+1:Math.max(0,v-1);state.nums[k]=v;renderNums();persist();});});\n' +
// needs
'var chips=document.getElementById("chips");state.needs.forEach(function(n){var el=chips.querySelector("[data-need=\\""+n+"\\"]");if(el)el.classList.add("on");});\n' +
'chips.querySelectorAll(".chip").forEach(function(b){b.addEventListener("click",function(){var id=b.getAttribute("data-need");if(id==="allgood"){state.needs=state.needs.indexOf("allgood")>=0?[]:["allgood"];}else{state.needs=state.needs.filter(function(x){return x!=="allgood";});var i=state.needs.indexOf(id);if(i>=0)state.needs.splice(i,1);else state.needs.push(id);}chips.querySelectorAll(".chip").forEach(function(x){x.classList.toggle("on",state.needs.indexOf(x.getAttribute("data-need"))>=0);});persist();});});\n' +
// voice
'var vf=document.getElementById("voiceFile");document.getElementById("micBtn").addEventListener("click",function(){vf.click();});\n' +
'vf.addEventListener("change",function(){if(vf.files[0]){state.voiceName=vf.files[0].name;document.getElementById("voiceAttach").textContent="✓ "+state.voiceName;document.getElementById("voiceSub").textContent=state.voiceName;persist();}});\n' +
'if(state.voiceName){document.getElementById("voiceAttach").textContent="✓ "+state.voiceName;}\n' +
// prayer voice
'var pf=document.getElementById("prayFile");document.getElementById("prayMic").addEventListener("click",function(){pf.click();});\n' +
'pf.addEventListener("change",function(){if(pf.files[0]){state.prayVoiceName=pf.files[0].name;document.getElementById("prayAttach").textContent="✓ "+state.prayVoiceName;persist();}});\n' +
'if(state.prayVoiceName){document.getElementById("prayAttach").textContent="✓ "+state.prayVoiceName;}\n' +
// photos
'var pgrid=document.getElementById("pgrid");var photoFile=document.getElementById("photoFile");\n' +
'photoFile.addEventListener("change",function(){var f=photoFile.files[0];if(!f)return;state.photos.push(f.name);var r=new FileReader();r.onload=function(e){var t=document.createElement("div");t.className="ptile";t.style.backgroundImage="url("+e.target.result+")";pgrid.insertBefore(t,document.getElementById("photoDrop"));};r.readAsDataURL(f);persist();});\n' +
// prayer text
'var pr=document.getElementById("prayer");pr.value=state.prayer||pr.value;pr.addEventListener("input",function(){state.prayer=pr.value;persist();});\n' +
'var vt=document.getElementById("voiceText");vt.value=state.voiceText||"";vt.addEventListener("input",function(){state.voiceText=vt.value;persist();});\n' +
'var ps=document.getElementById("prayShare");ps.checked=state.prayShare!==false;ps.addEventListener("change",function(){state.prayShare=ps.checked;persist();});\n' +
// reporter / notify
'var by=document.getElementById("by");by.value=state.reporter||"";by.addEventListener("input",function(){state.reporter=by.value;persist();});\n' +
'var no=document.getElementById("notifyOpt");no.checked=state.notify!==false;no.addEventListener("change",function(){state.notify=no.checked;persist();});\n' +
// submit
'document.getElementById("sendBtn").addEventListener("click",function(){var payload={type:"field_update",formType:"full",projectId:PID,languageName:' + JSON.stringify(p.languageName||'') + ',submittedDate:new Date().toISOString().split("T")[0],submittedBy:state.reporter||"",notifyCoord:state.notify!==false,lang:' + JSON.stringify(lang) + ',data:{prayerRequests:state.prayer,prayerShared:state.prayShare!==false,voiceNote:state.voiceText,bookProgress:[{name:"Total",translated:state.nums.translated,communityChecked:state.nums.community,mentorApproved:state.nums.approved}],needs:state.needs,mediaAttached:{audio:state.voiceName,prayerAudio:state.prayVoiceName,photos:state.photos}}};\n' +
'var safe=(' + JSON.stringify(p.languageName||'projeto') + ').replace(/[^a-z0-9]/gi,"_");var fn="contaMes_"+safe+"_"+new Date().toISOString().split("T")[0]+".json";\n' +
'var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=fn;a.click();URL.revokeObjectURL(url);document.getElementById("ok").classList.add("show");});\n' +
// whatsapp
'document.getElementById("whatsBtn").addEventListener("click",function(){var lines=["*"+' + JSON.stringify(L.wsum) + '+"*",(state.reporter||' + JSON.stringify(leader) + '),"","Capítulos: "+state.nums.translated+" trad · "+state.nums.community+" com · "+state.nums.approved+" aprov","Faltas: "+(state.needs.length?state.needs.join(", "):"—")];if(state.prayer)lines.push("","🕊 "+state.prayer.substring(0,200));window.open("https://wa.me/?text="+encodeURIComponent(lines.join("\\n")),"_blank");});\n' +
'renderNums();updateDots();\n' +
'</' + 'script>\n</body>\n</html>';
}

function generateIntakeFormHTML(t, lang) {
  const isPT = lang === 'pt';
  const esc = (s) => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const L = isPT ? {
    title: 'Abertura de Projeto', sub: 'Preencha os dados do seu projeto de tradução. Ao final, baixe o arquivo e envie à coordenação.',
    s1: 'Identificação', s2: 'Equipe', s3: 'Objetivo', s4: 'Contato',
    lang: 'Nome da língua', langph: 'Ex: Asháninka', code: 'Código ISO (opcional)',
    bridge: 'Língua-ponte', bridgeph: 'Ex: Português, Espanhol',
    loc: 'País / Localização', locph: 'Ex: Peru · Amazônia central', speakers: 'Nº de falantes (estimado)',
    sensitive: 'País sensível para divulgação da Bíblia',
    base: 'Equipe / Base (YWAM/JOCUM)', baseph: 'Ex: JOCUM Aurora',
    vitality: 'Vitalidade da língua', vit_na: 'Selecione…',
    ttype: 'Tipo de tradução', scope: 'Detalhes do escopo', scopeph: 'Ex: começar pelos Evangelhos…',
    partner: 'Organização parceira (opcional)',
    leader: 'Líder do projeto (seu nome)', leaderc: 'Seu contato (WhatsApp / e-mail)',
    transl: 'Tradutores', tech: 'Revisores técnicos',
    objq: 'O que será traduzido?', start: 'Data de início', deadline: 'Prazo previsto',
    obs: 'Observações', obsph: 'Algo mais que a coordenação deva saber…',
    send: 'Baixar cadastro', autosave: 'Salvo automaticamente. Pode fechar e voltar depois.',
    ok: '✓ Cadastro gerado. Envie o arquivo .json à coordenação.', req: 'Preencha pelo menos a língua e seu nome.',
  } : {
    title: 'Project Intake', sub: 'Fill in your translation project. At the end, download the file and send it to coordination.',
    s1: 'Identification', s2: 'Team', s3: 'Objective', s4: 'Contact',
    lang: 'Language name', langph: 'e.g. Asháninka', code: 'ISO code (optional)',
    bridge: 'Bridge language', bridgeph: 'e.g. Portuguese, Spanish',
    loc: 'Country / Location', locph: 'e.g. Peru · central Amazon', speakers: 'Speakers (estimated)',
    sensitive: 'Sensitive country for Bible distribution',
    base: 'Team / Base (YWAM)', baseph: 'e.g. YWAM Aurora',
    vitality: 'Language vitality', vit_na: 'Select…',
    ttype: 'Translation type', scope: 'Scope details', scopeph: 'e.g. start with the Gospels…',
    partner: 'Partner organization (optional)',
    leader: 'Project leader (your name)', leaderc: 'Your contact (WhatsApp / email)',
    transl: 'Translators', tech: 'Technical reviewers',
    objq: 'What will be translated?', start: 'Start date', deadline: 'Target deadline',
    obs: 'Notes', obsph: 'Anything else coordination should know…',
    send: 'Download intake', autosave: 'Auto-saved. You can close and come back later.',
    ok: '✓ Intake generated. Send the .json file to coordination.', req: 'Fill in at least the language and your name.',
  };
  const objOptions = isPT
    ? ['Novo Testamento', 'Antigo Testamento', 'Bíblia Completa', 'Histórias', 'Filme Jesus', 'Ready Vessels']
    : ['New Testament', 'Old Testament', 'Whole Bible', 'Stories', 'Jesus Film', 'Ready Vessels'];
  const vitOptions = isPT
    ? ['Vital', 'Vulnerável', 'Ameaçada', 'Seriamente ameaçada', 'Em situação crítica', 'Extinta']
    : ['Vital', 'Vulnerable', 'Threatened', 'Severely threatened', 'Critical', 'Extinct'];
  const ttypeOptions = ['OBT', 'OMT', 'OBT/OMT', isPT ? 'Tradução escrita' : 'Written translation', 'IA Assistida', 'Filme Jesus', isPT ? 'Língua de Sinais' : 'Sign Language', 'Ready Vessels', 'Taste&See'];

  return '<!DOCTYPE html>\n<html lang="' + (isPT ? 'pt-BR' : 'en') + '">\n<head>\n' +
'<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>' + esc(L.title) + '</title>\n<style>\n' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{font-family:"Montserrat",system-ui,-apple-system,sans-serif;background:#F6F5EB;color:#0A0703;line-height:1.5;min-height:100vh}' +
'.wrap{max-width:620px;margin:0 auto;padding:0 0 60px}' +
'.top{background:#3F3E20;color:#F6F5EB;padding:30px 32px}' +
'.brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:14px;letter-spacing:.02em}' +
'.mk{width:26px;height:26px;background:#BE4A01;border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff}' +
'h1{font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:36px;margin-top:18px;letter-spacing:-.01em}' +
'.sub{font-size:14px;color:rgba(246,245,235,.72);margin-top:10px;max-width:46ch}' +
'.sec{margin:26px 24px 0;background:#fff;border:1px solid rgba(63,62,32,.16);border-radius:18px;padding:22px}' +
'.sec-t{font-weight:700;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#BE4A01;margin-bottom:16px}' +
'label{display:block;font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#5A5A3E;margin:14px 0 6px}' +
'label:first-of-type{margin-top:0}' +
'input[type=text],input[type=date],input[type=number],textarea,select{width:100%;padding:12px 14px;border:1px solid rgba(63,62,32,.16);border-radius:11px;background:#fff;font-family:inherit;font-size:15px;color:#0A0703;outline:none}' +
'input:focus,textarea:focus,select:focus{border-color:#BE4A01;box-shadow:0 0 0 3px #F2D8C2}' +
'textarea{min-height:78px;resize:vertical}' +
'.row{display:flex;gap:12px}.row>div{flex:1}' +
'.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}' +
'.chip{padding:9px 15px;border:1.5px solid rgba(63,62,32,.16);border-radius:999px;background:#fff;font-size:13px;font-weight:600;color:#3F3E20;cursor:pointer}' +
'.chip.on{background:#3F3E20;color:#fff;border-color:#3F3E20}' +
'.check{display:flex;align-items:center;gap:10px;margin-top:14px;font-weight:600;font-size:14px;color:#3F3E20;cursor:pointer}' +
'.check input{width:18px;height:18px;accent-color:#BE4A01}' +
'.foot{margin:26px 24px 0}' +
'.cta{width:100%;padding:16px;border-radius:999px;background:#BE4A01;color:#fff;border:0;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}' +
'.cta:active{background:#A23E00}' +
'.note{font-size:12px;color:#8A8970;text-align:center;margin-top:12px}' +
'.ok{display:none;margin-top:14px;padding:14px;border-radius:12px;background:#e5e8d6;color:#4d5024;font-weight:600;font-size:13px;text-align:center}.ok.show{display:block}' +
'</style>\n</head>\n<body>\n<div class="wrap">' +
'<div class="top"><div class="brand"><span class="mk">ש</span> shemá · ' + (isPT ? 'cadastro' : 'intake') + '</div><h1>' + esc(L.title) + '</h1><p class="sub">' + esc(L.sub) + '</p></div>' +
'<div class="sec"><div class="sec-t">' + esc(L.s1) + '</div>' +
'<label>' + esc(L.lang) + ' *</label><input type="text" id="languageName" placeholder="' + esc(L.langph) + '">' +
'<div class="row"><div><label>' + esc(L.code) + '</label><input type="text" id="languageCode"></div>' +
'<div><label>' + esc(L.bridge) + '</label><input type="text" id="bridgeLanguage" placeholder="' + esc(L.bridgeph) + '"></div></div>' +
'<label>' + esc(L.loc) + '</label><input type="text" id="location" placeholder="' + esc(L.locph) + '">' +
'<div class="row"><div><label>' + esc(L.speakers) + '</label><input type="number" id="speakerCount" min="0"></div>' +
'<div><label>' + esc(L.vitality) + '</label><select id="vitalityStatus"><option value="">' + esc(L.vit_na) + '</option>' +
vitOptions.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('') + '</select></div></div>' +
'<label class="check"><input type="checkbox" id="sensitiveCountry"> ' + esc(L.sensitive) + '</label></div>' +
'<div class="sec"><div class="sec-t">' + esc(L.s2) + '</div>' +
'<label>' + esc(L.base) + ' *</label><input type="text" id="team" placeholder="' + esc(L.baseph) + '">' +
'<label>' + esc(L.transl) + '</label><input type="text" id="translators">' +
'<label>' + esc(L.tech) + '</label><input type="text" id="technicalReviewers">' +
'<label>' + esc(L.partner) + '</label><input type="text" id="partnerOrg"></div>' +
'<div class="sec"><div class="sec-t">' + esc(L.s3) + '</div>' +
'<label>' + esc(L.objq) + '</label><div class="chips" id="objChips">' +
objOptions.map(o => '<button type="button" class="chip" data-obj="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>' +
'<label style="margin-top:16px">' + esc(L.ttype) + '</label><div class="chips" id="ttypeChips">' +
ttypeOptions.map(o => '<button type="button" class="chip" data-ttype="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>' +
'<label style="margin-top:16px">' + esc(L.scope) + '</label><textarea id="scopeDetails" placeholder="' + esc(L.scopeph) + '"></textarea>' +
'<div class="row" style="margin-top:14px"><div><label>' + esc(L.start) + '</label><input type="date" id="startDate"></div>' +
'<div><label>' + esc(L.deadline) + '</label><input type="date" id="deadline"></div></div></div>' +
'<div class="sec"><div class="sec-t">' + esc(L.s4) + '</div>' +
'<label>' + esc(L.leader) + ' *</label><input type="text" id="teamLeader">' +
'<label>' + esc(L.leaderc) + '</label><input type="text" id="teamLeaderContact">' +
'<label>' + esc(L.obs) + '</label><textarea id="notes" placeholder="' + esc(L.obsph) + '"></textarea></div>' +
'<div class="foot"><button class="cta" id="sendBtn">' + esc(L.send) + '</button>' +
'<p class="note">' + esc(L.autosave) + '</p><div class="ok" id="ok">' + esc(L.ok) + '</div></div>' +
'</div>\n<script>\n' +
'var KEY="shema-intake";var obj=[];var ttype=[];\n' +
'var fields=["languageName","languageCode","bridgeLanguage","location","speakerCount","vitalityStatus","team","translators","technicalReviewers","partnerOrg","scopeDetails","startDate","deadline","teamLeader","teamLeaderContact","notes"];\n' +
'function persist(){var d={obj:obj,ttype:ttype,sensitiveCountry:document.getElementById("sensitiveCountry").checked};fields.forEach(function(f){var el=document.getElementById(f);if(el)d[f]=el.value;});try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}\n' +
'try{var sv=JSON.parse(localStorage.getItem(KEY)||"null");if(sv){fields.forEach(function(f){var el=document.getElementById(f);if(el&&sv[f]!=null)el.value=sv[f];});document.getElementById("sensitiveCountry").checked=!!sv.sensitiveCountry;obj=sv.obj||[];ttype=sv.ttype||[];}}catch(e){}\n' +
'document.querySelectorAll("[data-obj]").forEach(function(b){if(obj.indexOf(b.getAttribute("data-obj"))>=0)b.classList.add("on");b.addEventListener("click",function(){var o=b.getAttribute("data-obj");var i=obj.indexOf(o);if(i>=0)obj.splice(i,1);else obj.push(o);b.classList.toggle("on");persist();});});\n' +
'document.querySelectorAll("[data-ttype]").forEach(function(b){if(ttype.indexOf(b.getAttribute("data-ttype"))>=0)b.classList.add("on");b.addEventListener("click",function(){var o=b.getAttribute("data-ttype");var i=ttype.indexOf(o);if(i>=0)ttype.splice(i,1);else ttype.push(o);b.classList.toggle("on");persist();});});\n' +
'fields.forEach(function(f){var el=document.getElementById(f);if(el)el.addEventListener("input",persist);});document.getElementById("sensitiveCountry").addEventListener("change",persist);\n' +
'document.getElementById("sendBtn").addEventListener("click",function(){var ln=document.getElementById("languageName").value.trim();var ld=document.getElementById("teamLeader").value.trim();if(!ln||!ld){alert(' + JSON.stringify(L.req) + ');return;}' +
'var d={type:"new_project",submittedAt:new Date().toISOString(),lang:' + JSON.stringify(lang) + ',project:{objective:obj,translationType:ttype,sensitiveCountry:document.getElementById("sensitiveCountry").checked}};' +
'fields.forEach(function(f){var el=document.getElementById(f);if(el)d.project[f]=el.value;});' +
'var safe=(ln||"projeto").replace(/[^a-z0-9]/gi,"_");var blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="cadastro_"+safe+"_"+new Date().toISOString().split("T")[0]+".json";a.click();URL.revokeObjectURL(url);document.getElementById("ok").classList.add("show");});\n' +
'</' + 'script>\n</body>\n</html>';
}

Object.assign(window, { DetailModal, EditModal, generateFieldFormHTML, generateIntakeFormHTML });
