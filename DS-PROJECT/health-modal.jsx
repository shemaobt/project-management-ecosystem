/* health-modal.jsx — HealthAssessmentModal
   In-app modal for OBT Lab mentor to fill during an online meeting with the team.
   Saves directly back into the project (healthEmotional/Relational/Spiritual/Physical
   + healthAssessmentDate, healthAssessor, healthNotes, prayerRequests, pastoralIntervention).
*/

const { useState: useStateHealth } = React;

const HEALTH_DIMENSIONS = [
  {
    key: 'healthEmotional',
    cat: 'Emocional',
    catClass: 'emo',
    q: 'Como vocês estão sentindo o coração?',
    prompts: [
      'Como vocês têm dormido este mês?',
      'Algo está tirando o sono ou a paz?',
      'Onde vocês têm achado descanso?',
      'Há alguma situação pessoal pesando agora?',
    ],
  },
  {
    key: 'healthRelational',
    cat: 'Relacional',
    catClass: 'rel',
    q: 'Como estão as relações entre vocês?',
    prompts: [
      'Vocês têm tido conflitos sem resolver?',
      'Como estão se cuidando uns dos outros?',
      'Há alguém isolado da equipe?',
      'Como está a relação com a comunidade local?',
    ],
  },
  {
    key: 'healthSpiritual',
    cat: 'Espiritual',
    catClass: 'esp',
    q: 'Como está o caminhar com Deus?',
    prompts: [
      'Como tem sido a vida de oração da equipe?',
      'Vocês conseguem se reunir para adorar?',
      'O que Deus está falando no projeto agora?',
      'Há alguma área de batalha espiritual?',
    ],
  },
  {
    key: 'healthPhysical',
    cat: 'Física',
    catClass: 'fis',
    q: 'Como está a saúde física?',
    prompts: [
      'Alguém com problemas de saúde agora?',
      'Como está a alimentação? Acesso à água?',
      'Vocês têm conseguido descansar fisicamente?',
      'Algum risco de segurança no território?',
    ],
  },
];

function HealthAssessmentModal({ project, t, lang, onClose, onSave, onNotify }) {
  const [data, setData] = useStateHealth(() => ({
    healthEmotional: project.healthEmotional || '',
    healthRelational: project.healthRelational || '',
    healthSpiritual: project.healthSpiritual || '',
    healthPhysical: project.healthPhysical || '',
    healthEmotionalNotes: '',
    healthRelationalNotes: '',
    healthSpiritualNotes: '',
    healthPhysicalNotes: '',
    healthAssessmentDate: new Date().toISOString().split('T')[0],
    healthAssessor: '',
    needsPastoralIntervention: project.needsPastoralIntervention || 'nao',
    pastoralInterventionWhen: 'now',
    pastoralInterventionName: project.pastoralInterventionName || '',
    healthNotes: project.healthNotes || '',
  }));
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const overall = (() => {
    const vals = [data.healthEmotional, data.healthRelational, data.healthSpiritual, data.healthPhysical].filter(Boolean);
    if (vals.length === 0) return null;
    if (vals.some(v => v === 'critica')) return 'critica';
    if (vals.some(v => v === 'atencao')) return 'atencao';
    return 'boa';
  })();

  const overallLabel = { boa: 'Boa', atencao: 'Atenção', critica: 'Crítica' }[overall];

  // Compile combined health notes from per-dimension notes
  const compileNotes = (d) => {
    const parts = [];
    if (d.healthEmotionalNotes) parts.push(`Emocional: ${d.healthEmotionalNotes}`);
    if (d.healthRelationalNotes) parts.push(`Relacional: ${d.healthRelationalNotes}`);
    if (d.healthSpiritualNotes) parts.push(`Espiritual: ${d.healthSpiritualNotes}`);
    if (d.healthPhysicalNotes) parts.push(`Física: ${d.healthPhysicalNotes}`);
    if (d.healthNotes) parts.push(d.healthNotes);
    return parts.join('\n\n');
  };

  const handleSave = () => {
    const updates = {
      healthEmotional: data.healthEmotional,
      healthRelational: data.healthRelational,
      healthSpiritual: data.healthSpiritual,
      healthPhysical: data.healthPhysical,
      healthAssessmentDate: data.healthAssessmentDate,
      healthAssessor: data.healthAssessor,
      needsPastoralIntervention: data.needsPastoralIntervention,
      pastoralInterventionName: data.pastoralInterventionName,
      healthNotes: compileNotes(data),
    };
    onSave({ ...project, ...updates });
    if (onNotify) onNotify({ kind: 'health', project, summary: `Avaliação de saúde · ${overallLabel || 'salva'}` });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal hm-modal" onClick={e => e.stopPropagation()}>
        <div className="hm-meetbar">
          <span className="hm-livedot"/>
          <span className="hm-meetbar-text">Reunião ao vivo · Zoom</span>
          <div className="hm-participants">
            <span className="hm-avatar" style={{ background: '#9c6b3a' }}>{(project.teamLeader || '?').slice(0,1).toUpperCase()}</span>
            <span className="hm-avatar" style={{ background: 'var(--shema-verde-claro)' }}>{(project.mentor || '?').slice(0,1).toUpperCase()}</span>
            <span className="hm-avatar hm-avatar-more">+{Math.floor(2 + Math.random()*3)}</span>
          </div>
          <button className="modal-close" onClick={onClose} style={{ marginLeft: 'auto', position: 'static' }}>×</button>
        </div>

        <div className="modal-body hm-body">
          <p className="hm-eyebrow">Avaliação de Saúde · Facilitador de Projetos Internacional</p>
          <h1 className="hm-title">Como está a equipe<br/>{project.languageName}?</h1>
          <p className="hm-sub">Conduzida por <strong>{project.obtLabPerson || project.mentor || 'Facilitador de Projetos Internacional'}</strong> · com a equipe de {project.teamLeader || '—'} em {project.team || project.ywamBase || '—'} · {new Date(data.healthAssessmentDate).toLocaleDateString(t.locale)}</p>

          <div className="hm-howto">
            <div className="hm-howto-icon">i</div>
            <div>
              <div className="hm-howto-title">Como usar este roteiro</div>
              <div className="hm-howto-text">Cada dimensão tem perguntas-guia para conversar com a equipe. Avalie ao final de cada bloco e anote o que ouviu. Tudo é compartilhado com a coordenação ao salvar.</div>
            </div>
          </div>

          {HEALTH_DIMENSIONS.map((dim, idx) => (
            <div className="hm-dim" key={dim.key}>
              <div className="hm-dim-head">
                <span className="hm-dim-num">{String(idx+1).padStart(2,'0')} / 04</span>
                <span className={`hm-dim-cat hm-cat-${dim.catClass}`}>{dim.cat}</span>
              </div>
              <h2 className="hm-dim-q">{dim.q}</h2>
              <div className="hm-prompts">
                <div className="hm-prompts-label">O que perguntar</div>
                <ul className="hm-prompts-list">
                  {dim.prompts.map(p => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div className="hm-rating">
                {[
                  ['boa', 'Boa', 'good'],
                  ['atencao', 'Atenção', 'warn'],
                  ['critica', 'Crítica', 'crit'],
                ].map(([val, label, cls]) => (
                  <button key={val} type="button"
                    className={`hm-rate hm-rate-${cls} ${data[dim.key] === val ? 'hm-rate-on' : ''}`}
                    onClick={() => set(dim.key, val)}>
                    <span className="hm-rate-label">{label}</span>
                  </button>
                ))}
              </div>
              <textarea
                className="hm-notes"
                placeholder="O que você ouviu nesta dimensão…"
                value={data[dim.key + 'Notes']}
                onChange={e => set(dim.key + 'Notes', e.target.value)}
              />
            </div>
          ))}

          {/* Summary */}
          <div className="hm-summary">
            <div className="hm-summary-head">
              <span className="hm-summary-label">Resumo da avaliação</span>
              {overall && <span className={`hm-overall hm-overall-${overall}`}>{overallLabel}</span>}
            </div>
            <div className="hm-summary-grid">
              {HEALTH_DIMENSIONS.map(dim => {
                const v = data[dim.key];
                return (
                  <div key={dim.key} className="hm-summary-cell">
                    <span className="hm-summary-cell-label">{dim.cat}</span>
                    {v ? <span className={`hm-summary-dot hm-summary-dot-${v}`}/> : <span className="hm-summary-dot hm-summary-dot-na"/>}
                    <span className="hm-summary-cell-status">{v ? { boa: 'Boa', atencao: 'Atenção', critica: 'Crítica' }[v] : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pastoral */}
          <div className="hm-pastoral">
            <h3 className="hm-pastoral-q">Sugerir intervenção pastoral?</h3>
            <div className="hm-pastoral-opts">
              <button type="button" className={`hm-pastoral-opt ${data.needsPastoralIntervention === 'sim' && data.pastoralInterventionWhen === 'now' ? 'hm-pastoral-opt-on' : ''}`}
                onClick={() => { set('needsPastoralIntervention', 'sim'); set('pastoralInterventionWhen', 'now'); }}>Sim, agora</button>
              <button type="button" className={`hm-pastoral-opt ${data.needsPastoralIntervention === 'sim' && data.pastoralInterventionWhen === '30d' ? 'hm-pastoral-opt-on' : ''}`}
                onClick={() => { set('needsPastoralIntervention', 'sim'); set('pastoralInterventionWhen', '30d'); }}>Sim, em 30 dias</button>
              <button type="button" className={`hm-pastoral-opt ${data.needsPastoralIntervention === 'nao' ? 'hm-pastoral-opt-on' : ''}`}
                onClick={() => { set('needsPastoralIntervention', 'nao'); }}>Não</button>
            </div>
            {data.needsPastoralIntervention === 'sim' && (
              <div style={{ marginTop: 12 }}>
                <div className="hm-pastoral-hint">Quem fará?</div>
                <input className="hm-text-input" placeholder="Ex: Daniel — visita de campo em junho"
                  value={data.pastoralInterventionName}
                  onChange={e => set('pastoralInterventionName', e.target.value)}/>
              </div>
            )}
          </div>

          {/* Assessor */}
          <div className="hm-assessor">
            <div className="hm-assessor-row">
              <div style={{ flex: 1 }}>
                <div className="hm-pastoral-hint">Quem conduziu</div>
                <input className="hm-text-input" placeholder="Seu nome · Facilitador de Projetos Internacional"
                  value={data.healthAssessor}
                  onChange={e => set('healthAssessor', e.target.value)}/>
              </div>
              <div style={{ width: 140 }}>
                <div className="hm-pastoral-hint">Data</div>
                <input className="hm-text-input" type="date"
                  value={data.healthAssessmentDate}
                  onChange={e => set('healthAssessmentDate', e.target.value)}/>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <div className="hm-foot-note">
            <span className="hm-foot-bell">🔔</span>
            <span>A coordenação será notificada ao salvar.</span>
          </div>
          <div className="foot-actions">
            <button className="btn secondary" onClick={onClose}>Cancelar</button>
            <button className="btn primary" onClick={handleSave}>✓ Salvar avaliação</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HealthAssessmentModal });
