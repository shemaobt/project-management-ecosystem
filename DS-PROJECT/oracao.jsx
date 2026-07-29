/* oracao.jsx — Mural de Oração: compiles all prayer requests across projects
   (from the two field forms — Pulso Mensal and Avaliação de Saúde, both written
   to project.prayerRequests — plus shared need items). Exports a shareable
   text file and a database (CSV / JSON) for intercessor groups worldwide. */

const { useState: useStateOr, useMemo: useMemoOr } = React;

// Build the prayer database from projects.
window.SHEMA = window.SHEMA || {};
window.SHEMA.seedPrayers = function (projects) {
  const seed = {
    'ashaninka': 'Pelos anciãos da aldeia que recebem o Evangelho de João nesta semana. Por força física dos tradutores na estiagem.',
    'awa-cuaiquer': 'Por sabedoria na checagem comunitária e por proteção nas viagens entre as comunidades.',
    'baikeno': 'Agradecemos pela conclusão de Marcos. Orem pela gravação em áudio que começa este mês.',
    'banawa': 'Por recursos para o gravador de áudio e por saúde da líder Lidia.',
    'korowai': 'Por unidade na equipe e por abertura dos anciãos para o material traduzido.',
    'gavak': 'Pela nova facilitadora assumindo as revisões, e por descanso da equipe.',
    'welaun': 'Orem pela comunidade que ouviu as primeiras histórias e por mais contadores locais.',
    'mosimo': 'Por chuvas na região e por provisão para a próxima visita de campo.',
  };
  return projects.map(p => {
    if (!p.prayerRequests && seed[p.id]) {
      return { ...p, prayerRequests: seed[p.id], healthAssessmentDate: p.healthAssessmentDate || '2026-05-14' };
    }
    return p;
  });
};
window.SHEMA.buildPrayerDB = function (projects) {
  const out = [];
  projects.forEach(p => {
    const region = (window.SHEMA.getContinent ? window.SHEMA.getContinent(p) : 'other');
    const date = p.healthAssessmentDate || p.lastUpdated || '';
    if (p.prayerRequests && p.prayerRequests.trim()) {
      out.push({
        id: p.id + '-pr',
        projectId: p.id,
        language: p.languageName || '—',
        base: p.team || p.ywamBase || '',
        country: (p.location || '').split(',')[0].trim(),
        region,
        text: p.prayerRequests.trim(),
        source: 'Formulário',
        answered: false,
        date,
      });
    }
    (p.needsItems || []).forEach((it, i) => {
      if (it.prayerShared && it.description) {
        out.push({
          id: p.id + '-need' + i,
          projectId: p.id,
          language: p.languageName || '—',
          base: p.team || p.ywamBase || '',
          country: (p.location || '').split(',')[0].trim(),
          region,
          text: it.description.trim(),
          source: 'Necessidade',
          answered: !!it.prayerAnswered,
          date,
        });
      }
    });
  });
  // newest first
  out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return out;
};

const OR_CONT_LBL = {
  'south-america': 'América do Sul', 'north-america': 'América do Norte',
  'africa': 'África', 'asia': 'Ásia', 'oceania': 'Oceania', 'europe': 'Europa', 'other': 'Outros',
};

function orDownload(filename, text, mime) {
  const blob = new Blob([mime.indexOf('csv') >= 0 ? '\ufeff' + text : text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function orCsvCell(s) {
  const v = (s == null ? '' : String(s));
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function OracaoView(props) {
  const projects = props.projects;
  const t = props.t;
  const locale = t.locale;
  const db = useMemoOr(() => SHEMA.buildPrayerDB(projects), [projects]);
  const [sub, setSub] = useStateOr('mural');

  const [region, setRegion] = useStateOr('all');
  const regions = useMemoOr(() => {
    const set = {};
    db.forEach(e => { set[e.region] = (set[e.region] || 0) + 1; });
    return Object.keys(set).sort((a, b) => set[b] - set[a]).map(k => ({ k, n: set[k] }));
  }, [db]);

  const rows = region === 'all' ? db : db.filter(e => e.region === region);
  const today = new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

  const fmt = (d) => d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // --- exports ---
  const exportTxt = () => {
    const lines = [];
    lines.push('MURAL DE ORAÇÃO · SHEMÁ');
    lines.push('Gerado em ' + today + (region !== 'all' ? ' · ' + (OR_CONT_LBL[region] || region) : ' · Todas as regiões'));
    lines.push('“Assim na terra como no céu.” — Mateus 6:10');
    lines.push('');
    let cur = '';
    rows.forEach(e => {
      const reg = OR_CONT_LBL[e.region] || e.region;
      if (reg !== cur) { cur = reg; lines.push(''); lines.push('— ' + reg.toUpperCase() + ' —'); }
      lines.push('');
      lines.push('• ' + e.language + (e.base ? ' (' + e.base + ')' : '') + (e.answered ? ' ✔ RESPONDIDA' : ''));
      lines.push('  ' + e.text);
    });
    orDownload('Mural_de_Oracao_Shema_' + new Date().toISOString().split('T')[0] + '.txt', lines.join('\n'), 'text/plain');
  };
  const exportCsv = () => {
    const head = ['Língua', 'Base', 'País', 'Região', 'Pedido', 'Origem', 'Respondida', 'Data'];
    const lines = [head.map(orCsvCell).join(',')];
    rows.forEach(e => lines.push([e.language, e.base, e.country, OR_CONT_LBL[e.region] || e.region, e.text, e.source, e.answered ? 'Sim' : 'Não', e.date].map(orCsvCell).join(',')));
    orDownload('Mural_de_Oracao_Shema_' + new Date().toISOString().split('T')[0] + '.csv', lines.join('\n'), 'text/csv');
  };
  const exportJson = () => {
    orDownload('Mural_de_Oracao_Shema_' + new Date().toISOString().split('T')[0] + '.json', JSON.stringify({ generated: new Date().toISOString(), scope: region, total: rows.length, prayers: rows }, null, 2), 'application/json');
  };
  const shareWhatsapp = () => {
    const head = '*Mural de Oração · Shema*\n' + today + '\n';
    const body = rows.slice(0, 30).map(e => '🕊 *' + e.language + '*' + (e.base ? ' (' + e.base + ')' : '') + '\n' + e.text).join('\n\n');
    window.open('https://wa.me/?text=' + encodeURIComponent(head + '\n' + body), '_blank');
  };

  const answeredCount = db.filter(e => e.answered).length;

  return (
    <div className="or-wrap">
      <div className="or-intro">
        <div>
          <p className="or-eyebrow">{t.oracao_eyebrow}</p>
          <h1 className="or-title">{t.oracao_title}</h1>
          <p className="or-lead">{t.oracao_lead}</p>
        </div>
      </div>

      <div className="or-subnav">
        <button type="button" className={`or-subtab ${sub === 'mural' ? 'on' : ''}`} onClick={() => setSub('mural')}>{t.oracao_sub_mural}</button>
        <button type="button" className={`or-subtab ${sub === 'rede' ? 'on' : ''}`} onClick={() => setSub('rede')}>{t.oracao_sub_rede}</button>
      </div>

      {sub === 'rede' ? (
        <IntercessoresView projects={projects} t={t} embedded={true} />
      ) : (
      <React.Fragment>
      <div className="or-stats">
        <div className="or-stat or-stat-hero">
          <div className="or-stat-num">{db.length}</div>
          <div className="or-stat-label">{t.oracao_total}</div>
        </div>
        <div className="or-stat">
          <div className="or-stat-num">{regions.length}</div>
          <div className="or-stat-label">{t.oracao_regions}</div>
        </div>
        <div className="or-stat">
          <div className="or-stat-num">{answeredCount}</div>
          <div className="or-stat-label">{t.oracao_answered}</div>
        </div>
      </div>

      <div className="or-toolbar">
        <div className="or-filters">
          <button className={`or-chip ${region === 'all' ? 'on' : ''}`} onClick={() => setRegion('all')}>{t.oracao_all} <span>{db.length}</span></button>
          {regions.map(r => (
            <button key={r.k} className={`or-chip ${region === r.k ? 'on' : ''}`} onClick={() => setRegion(r.k)}>{OR_CONT_LBL[r.k] || r.k} <span>{r.n}</span></button>
          ))}
        </div>
        <div className="or-actions">
          <button className="or-btn-ghost" onClick={shareWhatsapp} title="WhatsApp">{t.oracao_share}</button>
          <button className="or-btn-ghost" onClick={exportTxt}>TXT</button>
          <button className="or-btn-ghost" onClick={exportCsv}>CSV</button>
          <button className="or-btn" onClick={exportJson}>{t.oracao_db}</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="or-empty">{t.oracao_empty}</div>
      ) : (
        <div className="or-grid">
          {rows.map(e => (
            <div key={e.id} className={`or-card ${e.answered ? 'answered' : ''}`}>
              <div className="or-card-head">
                <span className="or-card-lang">{e.language}</span>
                <span className="or-card-region">{OR_CONT_LBL[e.region] || e.region}</span>
              </div>
              <p className="or-card-text">{e.text}</p>
              <div className="or-card-foot">
                <span className="or-card-base">{e.base || e.country}</span>
                <span className="or-card-meta">{e.answered ? t.oracao_answered_tag : e.source} · {fmt(e.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="or-foot-note">{t.oracao_footnote}</p>
      </React.Fragment>
      )}
    </div>
  );
}

Object.assign(window, { OracaoView });
