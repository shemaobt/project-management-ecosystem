/* equipe.jsx — "Equipe" tab: editable organograma of the 3 regional roles
   (Anfitrião Regional, Facilitador de Projetos Internacional, Mobilizador de
   Recursos Financeiros) per region. Names persist to localStorage. */

const { useState: useStateEq } = React;

const EQ_CONT_LBL = {
  'south-america': 'América do Sul', 'north-america': 'América do Norte',
  'africa': 'África', 'asia': 'Ásia', 'oceania': 'Pacífico', 'europe': 'Europa', 'other': 'América Central',
};
const EQ_ROLES = [
  { key: 'coordinator', label: 'Administrador', team: 'Finanças e comunicação' },
  { key: 'obtLab', label: 'Operacional de Línguas', team: 'Progresso e treinamentos' },
  { key: 'resourceCircle', label: 'Intercessor', team: 'Oração e rede' },
];

function EquipeView(props) {
  const projects = props.projects;
  const t = props.t;
  const currentUser = props.currentUser;

  // regions that actually have projects
  const counts = {};
  projects.forEach(p => { const c = SHEMA.getContinent(p); counts[c] = (counts[c] || 0) + 1; });
  if (counts['europe'] === undefined) counts['europe'] = 0;
  const regions = Object.keys(counts).filter(k => counts[k] > 0 || k === 'europe').sort((a, b) => counts[b] - counts[a]);

  const [teams, setTeams] = useStateEq(() => {
    const o = {};
    regions.forEach(r => { o[r] = Object.assign({}, SHEMA.getTeamForContinent(r)); });
    return o;
  });
  const [dirty, setDirty] = useStateEq(false);
  const [saved, setSaved] = useStateEq(false);
  const [pi, setPiState] = useStateEq(() => {
    try { return JSON.parse(localStorage.getItem('shema-pi-team') || '{}'); } catch (e) { return {}; }
  });
  const setPi = (k, v) => setPiState(prev => {
    const next = { ...prev, [k]: v };
    try { localStorage.setItem('shema-pi-team', JSON.stringify(next)); } catch (e) {}
    return next;
  });

  const setField = (region, key, value) => {
    setTeams(tt => Object.assign({}, tt, { [region]: Object.assign({}, tt[region], { [key]: value }) }));
    setDirty(true); setSaved(false);
  };
  const save = () => {
    SHEMA.saveTeams(teams);
    if (props.onSaved) props.onSaved(teams);
    setDirty(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="eq-wrap">
      <div className="eq-intro">
        <p className="eq-eyebrow">{t.equipe_eyebrow}</p>
        <h1 className="eq-title">{t.equipe_title}</h1>
        <p className="eq-lead">{t.equipe_lead}</p>
      </div>

      {/* org top: Shema YWAM → (Círculo de Recursos · Projetos Internacionais) */}
      <div className="eq-super">
        <div className="eq-super-tag">Liderança internacional</div>
        <div className="eq-super-name-static">Shema YWAM</div>
      </div>
      <div className="eq-stem"></div>

      <div className="eq-pillars">
        <div className="eq-pillar">
          <div className="eq-pillar-tag">A mesa que financia</div>
          <div className="eq-pillar-name">Círculo de Recursos</div>
          <p className="eq-pillar-desc">Provê os recursos financeiros para os projetos acontecerem.</p>
          <div className="eq-cr-members">
            {['Edson Suzuki', 'Marcia Suzuki', 'Cleo Larsson', 'Jen Brownhill', 'Jessy Pfarrkircher', 'Meleah Ouedraogo', 'Youngshin Kim'].map((nm, idx) => (
              <input key={idx} className="eq-cr-input" value={pi['cr' + idx] ?? nm} onChange={e => setPi('cr' + idx, e.target.value)} placeholder="Nome" />
            ))}
          </div>
        </div>
        <div className="eq-pillar eq-pillar-accent">
          <div className="eq-pillar-tag">Coordena os times regionais</div>
          <div className="eq-pillar-name">Time de Projetos Internacionais</div>
          <div className="eq-pi-members">
            <div className="eq-pi-row">
              <input className="eq-pi-input" value={pi.m3 ?? 'Yongshin'} onChange={e => setPi('m3', e.target.value)} placeholder="Nome" />
              <input className="eq-pi-role-input" value={pi.r3 ?? 'Comunicação Estratégica Global'} onChange={e => setPi('r3', e.target.value)} />
            </div>
            <div className="eq-pi-row">
              <input className="eq-pi-input" value={currentUser || ''} onChange={e => props.setCurrentUser && props.setCurrentUser(e.target.value)} placeholder="Nome" />
              <input className="eq-pi-role-input" value={pi.r0 ?? 'Estrategista Global'} onChange={e => setPi('r0', e.target.value)} />
            </div>
            <div className="eq-pi-row">
              <input className="eq-pi-input" value={pi.m1 ?? 'Andreia · Roberto'} onChange={e => setPi('m1', e.target.value)} placeholder="Nome" />
              <input className="eq-pi-role-input" value={pi.r1 ?? 'Member Care'} onChange={e => setPi('r1', e.target.value)} />
            </div>
            <div className="eq-pi-row">
              <input className="eq-pi-input" value={pi.m2 ?? 'Alysa'} onChange={e => setPi('m2', e.target.value)} placeholder="Nome" />
              <input className="eq-pi-role-input" value={pi.r2 ?? 'Social Media'} onChange={e => setPi('r2', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
      <div className="eq-stem"></div>

      <div className="eq-grid">
        {regions.map(r => (
          <div className="eq-region" key={r}>
            <div className="eq-region-head">
              <span className="eq-region-name">Shema {EQ_CONT_LBL[r] || r}</span>
              <span className="eq-region-count">{counts[r]}</span>
            </div>
            <div className="eq-roles">
              {EQ_ROLES.map(role => (
                <div className="eq-role" key={role.key}>
                  <label className="eq-role-label">{role.label}</label>
                  <div className="eq-role-team">{role.team}</div>
                  <input
                    className="eq-input"
                    value={teams[r] ? (teams[r][role.key] || '') : ''}
                    onChange={e => setField(r, role.key, e.target.value)}
                    placeholder={t.equipe_placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="eq-savebar">
        {saved ? <span className="eq-saved-msg">{t.equipe_saved}</span> : <span className="eq-hint">{t.equipe_hint}</span>}
        <button className={`eq-save ${dirty ? '' : 'disabled'}`} onClick={save} disabled={!dirty}>{t.equipe_save}</button>
      </div>
    </div>
  );
}

Object.assign(window, { EquipeView });
