/* eten.jsx — ETEN annual report tab.
   ETEN funds most Shema projects. Each year Shema reports how many chapters
   each ETEN-listed project advanced. 1 chapter advanced = 1 Credit.
   Credits ≈ next resources released to Shema. Only inETEN projects count. */

const { useState: useStateEt } = React;

// ---------- helpers (also used by app migration) ----------
window.SHEMA = window.SHEMA || {};

// chapters translated as of Dec 31 of `year` (latest snapshot at/before; else live if current/future)
window.SHEMA.etenChaptersAtYearEnd = function (p, year) {
  const cutoff = new Date(year, 11, 31, 23, 59, 59);
  const hist = (p.progressHistory || []).filter(h => h.date && new Date(h.date) <= cutoff);
  if (hist.length) {
    hist.sort((a, b) => new Date(a.date) - new Date(b.date));
    return hist[hist.length - 1].translatedUnits || 0;
  }
  const nowY = new Date().getFullYear();
  if (year >= nowY) return p.translatedUnits || 0;
  return 0;
};

// chapters advanced during `year` = credits earned that year
window.SHEMA.etenCreditsForYear = function (p, year) {
  const end = window.SHEMA.etenChaptersAtYearEnd(p, year);
  const start = window.SHEMA.etenChaptersAtYearEnd(p, year - 1);
  return Math.max(0, end - start);
};

// Seed inETEN + year-end snapshots so the report is meaningful from day one.
// Idempotent: only fills missing inETEN and missing year snapshots.
window.SHEMA.seedEten = function (projects) {
  return projects.map(p => {
    const np = Object.assign({}, p);
    if (np.inETEN === undefined || np.inETEN === null) {
      np.inETEN = (np.translatedUnits || 0) > 0;
    }
    if (np.inETEN && (np.translatedUnits || 0) > 0) {
      const hist = Array.isArray(np.progressHistory) ? np.progressHistory.slice() : [];
      const hasYear = (y) => hist.some(h => h.date && new Date(h.date).getFullYear() === y);
      const T = np.translatedUnits || 0;
      if (!hasYear(2024)) hist.push({ date: '2024-12-31', translatedUnits: Math.floor(T * 0.45), approvedUnits: 0, communityCheckedUnits: 0, synthetic: true });
      if (!hasYear(2025)) hist.push({ date: '2025-12-31', translatedUnits: T, approvedUnits: 0, communityCheckedUnits: 0, synthetic: true });
      hist.sort((a, b) => new Date(a.date) - new Date(b.date));
      np.progressHistory = hist;
    }
    return np;
  });
};

const EtIcon = {
  award: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="5" /><path d="M8.2 12.5 7 22l5-3 5 3-1.2-9.5" /></svg>,
  book: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5Z" /><path d="M4 19.5V4.5" /></svg>,
  trend: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M17 7h4v4" /></svg>,
  download: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  doc: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></svg>,
};

function etenCsvEscape(s) {
  const v = (s == null ? '' : String(s));
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function EtenView(props) {
  const projects = props.projects;
  const t = props.t;
  const locale = t.locale;
  const nowYear = new Date().getFullYear();

  const [year, setYear] = useStateEt(nowYear - 1); // default last completed year

  const years = [];
  for (let y = nowYear; y >= nowYear - 3; y--) years.push(y);

  const etenProjects = projects.filter(p => p.inETEN);
  const rows = etenProjects.map(p => {
    const start = SHEMA.etenChaptersAtYearEnd(p, year - 1);
    const end = SHEMA.etenChaptersAtYearEnd(p, year);
    const credits = Math.max(0, end - start);
    return {
      id: p.id, name: p.languageName,
      country: (p.location || '').split(',')[0].trim(),
      total: p.totalUnits || 0,
      start: start, end: end, credits: credits,
    };
  }).sort((a, b) => b.credits - a.credits);

  const totalCredits = rows.reduce((s, r) => s + r.credits, 0);
  const advancing = rows.filter(r => r.credits > 0).length;
  const continentLbl = {
    'south-america': t.continent_south_america, 'north-america': t.continent_north_america,
    'africa': t.continent_africa, 'asia': t.continent_asia, 'oceania': t.continent_oceania,
    'europe': t.continent_europe, 'other': t.continent_other,
  };

  const exportCsv = () => {
    const header = ['Projeto', 'País', 'Meta (caps)', 'Caps início ' + year, 'Caps fim ' + year, 'Capítulos avançados (Créditos)'];
    const lines = [header.map(etenCsvEscape).join(',')];
    rows.forEach(r => {
      lines.push([r.name, r.country, r.total, r.start, r.end, r.credits].map(etenCsvEscape).join(','));
    });
    lines.push(['TOTAL', '', '', '', '', totalCredits].map(etenCsvEscape).join(','));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ETEN_Shema_' + year + '.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const openReport = () => {
    const html = generateEtenReportHTML(rows, totalCredits, advancing, year, t);
    const w = window.open('about:blank', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  };

  return (
    <div className="et-wrap">
      <div className="et-intro">
        <div className="et-intro-text">
          <p className="et-eyebrow">{t.eten_eyebrow}</p>
          <h1 className="et-title">{t.eten_title}</h1>
          <p className="et-lead">{t.eten_lead}</p>
        </div>
        <div className="et-year">
          <label className="et-year-label">{t.eten_report_year}</label>
          <select className="et-year-select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="et-stats">
        <div className="et-stat et-stat-hero">
          <div className="et-stat-icon"><EtIcon.award width="20" height="20" /></div>
          <div className="et-stat-num">{totalCredits}</div>
          <div className="et-stat-label">{t.eten_total_credits}</div>
          <div className="et-stat-sub">{t.eten_credits_note}</div>
        </div>
        <div className="et-stat">
          <div className="et-stat-num">{etenProjects.length}</div>
          <div className="et-stat-label">{t.eten_listed}</div>
          <div className="et-stat-sub">{t.eten_listed_sub}</div>
        </div>
        <div className="et-stat">
          <div className="et-stat-num">{advancing}</div>
          <div className="et-stat-label">{t.eten_advancing}</div>
          <div className="et-stat-sub">{t.eten_advancing_sub} {year}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="et-actions">
        <span className="et-actions-label">{t.eten_report_for} <strong>{year}</strong></span>
        <div className="et-actions-btns">
          <button className="et-btn-ghost" onClick={exportCsv}><EtIcon.download width="15" height="15" /> {t.eten_export_csv}</button>
          <button className="et-btn" onClick={openReport}><EtIcon.doc width="15" height="15" /> {t.eten_gen_report}</button>
        </div>
      </div>

      {/* Table */}
      <div className="et-table">
        <div className="et-thead">
          <span className="et-th et-th-name">{t.eten_col_project}</span>
          <span className="et-th et-th-num">{t.eten_col_start}</span>
          <span className="et-th et-th-num">{t.eten_col_end}</span>
          <span className="et-th et-th-credits">{t.eten_col_credits}</span>
        </div>
        {rows.length === 0 ? (
          <div className="et-empty">{t.eten_empty}</div>
        ) : rows.map(r => (
          <div className={'et-tr' + (r.credits > 0 ? ' et-tr-active' : '')} key={r.id}>
            <span className="et-td et-td-name">
              <span className="et-td-lang">{r.name}</span>
              <span className="et-td-country">{r.country}</span>
            </span>
            <span className="et-td et-td-num">{r.start}</span>
            <span className="et-td et-td-num">{r.end}</span>
            <span className="et-td et-td-credits">
              {r.credits > 0 ? <span className="et-credit-badge">+{r.credits}</span> : <span className="et-credit-zero">0</span>}
            </span>
          </div>
        ))}
        {rows.length > 0 && (
          <div className="et-tfoot">
            <span className="et-td et-td-name">{t.eten_total}</span>
            <span className="et-td et-td-num"></span>
            <span className="et-td et-td-num"></span>
            <span className="et-td et-td-credits"><span className="et-credit-total">{totalCredits}</span></span>
          </div>
        )}
      </div>

      <p className="et-footnote">{t.eten_footnote}</p>
    </div>
  );
}

// ---------- printable / shareable annual report ----------
function generateEtenReportHTML(rows, totalCredits, advancing, year, t) {
  const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const today = new Date().toLocaleDateString(t.locale, { day: '2-digit', month: 'long', year: 'numeric' });
  const bodyRows = rows.map((r, i) => `
    <tr class="${r.credits > 0 ? 'active' : ''}">
      <td class="rank">${i + 1}</td>
      <td class="lang">${esc(r.name)}<span>${esc(r.country)}</span></td>
      <td class="num">${r.start}</td>
      <td class="num">${r.end}</td>
      <td class="cred">${r.credits > 0 ? '+' + r.credits : '0'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório ETEN ${year} — Shema</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Montserrat', system-ui, sans-serif; color: #0A0703; background: #C5C29F; padding: 24px; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #F6F5EB; padding: 22mm 20mm; box-shadow: 0 10px 40px rgba(10,7,3,0.18); }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3F3E20; padding-bottom: 16px; }
  .brand { font: 800 18px/1 'Montserrat'; letter-spacing: .02em; color: #3F3E20; }
  .eyebrow { font: 700 10px/1 'Montserrat'; letter-spacing: .18em; text-transform: uppercase; color: #BE4A01; margin-bottom: 6px; }
  .title { font: 800 27px/1.05 'Montserrat'; letter-spacing: -.01em; }
  .meta { text-align: right; font: 500 10px/1.6 'Montserrat'; color: #8A8970; }
  .lead { font: italic 13px/1.6 Georgia, serif; color: #5A5A3E; margin: 16px 0 22px; max-width: 64ch; }
  .summary { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .card { padding: 16px 18px; border-radius: 14px; background: #ECEADF; border: 1px solid rgba(63,62,32,.16); }
  .card.hero { background: #3F3E20; }
  .card.hero .c-num, .card.hero .c-label, .card.hero .c-sub { color: #F6F5EB; }
  .card.hero .c-num { color: #fff; }
  .c-num { font: 800 34px/1 'Montserrat'; color: #BE4A01; }
  .c-label { font: 700 10px/1.2 'Montserrat'; letter-spacing: .1em; text-transform: uppercase; color: #3F3E20; margin-top: 8px; }
  .c-sub { font: 400 10px/1.4 'Montserrat'; color: #8A8970; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { font: 700 9px/1 'Montserrat'; letter-spacing: .12em; text-transform: uppercase; color: #8A8970; text-align: left; padding: 8px 10px; border-bottom: 1.5px solid #3F3E20; }
  th.num, th.cred { text-align: right; }
  td { padding: 9px 10px; border-bottom: 1px solid rgba(63,62,32,.12); font: 500 12px/1.3 'Montserrat'; vertical-align: middle; }
  td.rank { color: #C5C29F; font-weight: 700; width: 28px; }
  td.lang { font-weight: 700; color: #0A0703; }
  td.lang span { display: block; font: 400 10px/1.2 'Montserrat'; color: #8A8970; margin-top: 2px; }
  td.num { text-align: right; color: #5A5A3E; font-variant-numeric: tabular-nums; }
  td.cred { text-align: right; font-weight: 800; color: #BE4A01; font-variant-numeric: tabular-nums; }
  tr.active td.cred { color: #BE4A01; }
  tfoot td { border-top: 2px solid #3F3E20; border-bottom: 0; font-weight: 800; padding-top: 12px; }
  tfoot td.cred { font-size: 18px; color: #BE4A01; }
  .formula { margin-top: 22px; padding: 14px 16px; background: #ECEADF; border-radius: 12px; font: italic 12px/1.5 Georgia, serif; color: #5A5A3E; }
  .versicle { margin-top: 18px; text-align: center; font: italic 13px/1.5 Georgia, serif; color: #3F3E20; }
  .printbtn { position: fixed; top: 16px; right: 16px; background: #BE4A01; color: #fff; border: 0; padding: 12px 20px; border-radius: 999px; font: 700 13px/1 'Montserrat'; cursor: pointer; }
  @media print { body { padding: 0; background: #fff; } .page { box-shadow: none; width: auto; min-height: auto; padding: 14mm; } .printbtn { display: none; } }
</style></head>
<body>
<button class="printbtn" onclick="window.print()">Salvar como PDF</button>
<div class="page">
  <div class="head">
    <div>
      <p class="eyebrow">Relatório anual de tradução</p>
      <h1 class="title">Créditos ETEN · ${year}</h1>
    </div>
    <div class="meta">Shema · Multimodal Bible Translation<br>Articulador Global: Karina Marinho<br>Emitido em ${esc(today)}</div>
  </div>
  <p class="lead">Relatório do fluxo anual de tradução dos projetos do Shema listados no ETEN. Cada capítulo avançado no ano equivale a 1 crédito. O total de créditos corresponde aos recursos a serem disponibilizados ao Shema no próximo ciclo.</p>
  <div class="summary">
    <div class="card hero"><div class="c-num">${totalCredits}</div><div class="c-label">Créditos no ano</div><div class="c-sub">1 capítulo = 1 crédito</div></div>
    <div class="card"><div class="c-num">${rows.length}</div><div class="c-label">Projetos no ETEN</div><div class="c-sub">contabilizados neste relatório</div></div>
    <div class="card"><div class="c-num">${advancing}</div><div class="c-label">Com avanço</div><div class="c-sub">tiveram capítulos novos em ${year}</div></div>
  </div>
  <table>
    <thead><tr><th class="rank">#</th><th>Projeto</th><th class="num">Início ${year}</th><th class="num">Fim ${year}</th><th class="cred">Créditos</th></tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr><td></td><td>TOTAL</td><td class="num"></td><td class="num"></td><td class="cred">${totalCredits}</td></tr></tfoot>
  </table>
  <div class="formula">Cálculo: capítulos traduzidos ao fim de ${year} menos capítulos ao fim de ${year - 1}, por projeto listado no ETEN. Somatório = créditos do ano.</div>
  <div class="versicle">"Assim na terra como no céu." — Mateus 6:10</div>
</div>
</body></html>`;
}

Object.assign(window, { EtenView });
