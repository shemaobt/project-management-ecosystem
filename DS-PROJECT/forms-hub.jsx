/* forms-hub.jsx — "Formulários" tab: central place to find, generate and send
   the two field forms (Pulso Mensal · líder de campo, and Avaliação de Saúde ·
   Facilitador), plus a log of received submissions. */

const { useState: useStateFh } = React;

// ---- archive of filled submissions (so the user keeps the original forms) ----
window.SHEMA.loadSubmissions = function () {
  try { return JSON.parse(localStorage.getItem('shema-form-submissions') || '[]'); }
  catch (e) { return []; }
};
window.SHEMA.archiveSubmission = function (sub) {
  const list = window.SHEMA.loadSubmissions();
  list.unshift(Object.assign({ _id: Date.now().toString() }, sub));
  try { localStorage.setItem('shema-form-submissions', JSON.stringify(list.slice(0, 200))); } catch (e) {}
};
window.SHEMA.deleteSubmission = function (id) {
  const list = window.SHEMA.loadSubmissions().filter(s => s._id !== id);
  try { localStorage.setItem('shema-form-submissions', JSON.stringify(list)); } catch (e) {}
};

function FormulariosView(props) {
  const projects = props.projects;
  const t = props.t;
  const lang = props.lang;
  const onOpenHealth = props.onOpenHealth;

  const sorted = [...projects].sort((a, b) => (a.languageName || '').localeCompare(b.languageName || ''));
  const [pid, setPid] = useStateFh(sorted[0] ? sorted[0].id : '');
  const [subs, setSubs] = useStateFh(() => SHEMA.loadSubmissions());
  const project = projects.find(p => p.id === pid) || sorted[0];

  const refreshSubs = () => setSubs(SHEMA.loadSubmissions());
  const downloadSub = (s) => {
    const safe = (s.languageName || 'projeto').replace(/[^a-z0-9]/gi, '_');
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (s.formType || 'pulso') + '_' + safe + '_' + (s.submittedDate || '') + '.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const delSub = (id) => { SHEMA.deleteSubmission(id); refreshSubs(); };
  const fmtSub = (d) => d ? new Date(d).toLocaleDateString(t.locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const genPulso = () => {
    if (!project || typeof window.generateFieldFormHTML !== 'function') return;
    const html = window.generateFieldFormHTML(project, t, lang, 'full');
    const safe = (project.languageName || 'projeto').replace(/[^a-z0-9]/gi, '_');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'PulsoMensal_' + safe + '.html'; a.click();
    URL.revokeObjectURL(url);
  };
  const openHealth = () => { if (onOpenHealth && project) onOpenHealth(project); };

  return (
    <div className="fh-wrap">
      <div className="fh-intro">
        <p className="fh-eyebrow">{t.forms_eyebrow}</p>
        <h1 className="fh-title">{t.forms_title}</h1>
        <p className="fh-lead">{t.forms_lead}</p>
      </div>

      <div className="fh-picker">
        <label className="fh-picker-label">{t.forms_pick_project}</label>
        <select className="fh-select" value={pid} onChange={e => setPid(e.target.value)}>
          {sorted.map(p => <option key={p.id} value={p.id}>{p.languageName}{p.team ? ' · ' + p.team : ''}</option>)}
        </select>
      </div>

      <div className="fh-cards">
        {/* PULSO MENSAL */}
        <div className="fh-card">
          <div className="fh-card-tag fh-tag-telha">Mensal · pelo líder de campo</div>
          <h2 className="fh-card-title">Pulso Mensal</h2>
          <p className="fh-card-desc">Cinco perguntas curtas no celular: coração da equipe, capítulos avançados, necessidades, oração e uma foto. Funciona offline e volta por WhatsApp ou arquivo.</p>
          <ul className="fh-steps">
            <li>Gere o formulário deste projeto</li>
            <li>Envie ao líder (WhatsApp, e-mail)</li>
            <li>O líder preenche e devolve o arquivo <strong>.json</strong></li>
            <li>Você importa em <strong>“Receber Atualização”</strong> no topo</li>
          </ul>
          <div className="fh-card-actions">
            <button className="fh-btn" onClick={genPulso}>{t.forms_generate}</button>
          </div>
        </div>

        {/* AVALIAÇÃO DE SAÚDE */}
        <div className="fh-card fh-card-dark">
          <div className="fh-card-tag fh-tag-areia">Trimestral · pelo Facilitador de Projetos</div>
          <h2 className="fh-card-title" style={{ color: '#fff' }}>Avaliação de Saúde</h2>
          <p className="fh-card-desc" style={{ color: 'rgba(246,245,235,0.82)' }}>Durante a reunião online com a equipe, percorre quatro dimensões — emocional, relacional, espiritual e física — com perguntas-guia e sugestão de cuidado pastoral.</p>
          <ul className="fh-steps fh-steps-dark">
            <li>Abra a avaliação <strong>dentro do app</strong> (não baixa arquivo)</li>
            <li>Conduza a conversa pelas 4 dimensões</li>
            <li>Salve — atualiza a aba <strong>Saúde da Equipe</strong></li>
            <li>A coordenação é <strong>notificada na hora</strong></li>
          </ul>
          <div className="fh-card-actions">
            <button className="fh-btn fh-btn-light" onClick={openHealth}>{t.forms_open_health}</button>
          </div>
        </div>
      </div>

      <p className="fh-foot-note">{t.forms_footnote}</p>

      {/* RECEBIDOS — formulários preenchidos arquivados */}
      <div className="fh-received">
        <div className="fh-received-head">
          <h2 className="fh-received-title">{t.forms_received_title}</h2>
          <div className="fh-received-actions">
            <button className="or-btn-ghost" onClick={refreshSubs}>{t.forms_refresh}</button>
            {props.onImportClick ? <button className="fh-btn" style={{ width: 'auto' }} onClick={props.onImportClick}>{t.forms_import}</button> : null}
          </div>
        </div>
        {subs.length === 0 ? (
          <p className="fh-received-empty">{t.forms_received_empty}</p>
        ) : (
          <div className="fh-sub-list">
            {subs.map(s => (
              <div key={s._id} className="fh-sub-row">
                <span className={`fh-sub-tag ${s.formType === 'health' ? 'q' : 'm'}`}>{s.formType === 'health' ? t.forms_tag_health : t.forms_tag_pulse}</span>
                <div className="fh-sub-main">
                  <div className="fh-sub-lang">{s.languageName || '—'}</div>
                  <div className="fh-sub-meta">{s.submittedBy ? s.submittedBy + ' · ' : ''}{fmtSub(s.submittedDate || s.receivedAt)}</div>
                </div>
                <button className="fh-sub-dl" onClick={() => downloadSub(s)} title={t.forms_download}>↓</button>
                <button className="fh-sub-del" onClick={() => delSub(s._id)} title="×">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { FormulariosView });
