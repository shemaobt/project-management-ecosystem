/* worldmap.jsx — Atlas world map view */

const { useState: useStateMap, useRef: useRefMap } = React;

// Equirectangular projection: world is 0..1000 x 0..500 viewport
// x = (lng + 180) / 360 * 1000
// y = (90 - lat) / 180 * 500

// Simplified continent path data (chunky outlines for a printed-atlas feel).
// Drawn at 1000x500 viewBox.
const CONTINENT_PATHS = [
  // NORTH AMERICA — Alaska → Hudson Bay → Greenland → US East → Florida → Yucatán → Panama → Baja → Cascadia → Alaska south
  "M 80,55 L 165,52 L 235,65 L 290,55 L 360,30 L 405,38 L 420,75 L 385,95 L 360,120 L 335,160 L 305,195 L 265,210 L 245,210 L 220,195 L 195,180 L 175,158 L 160,128 L 145,108 L 130,98 L 90,90 L 60,80 Z",
  // CENTRAL AMERICA bridge
  "M 245,210 L 270,225 L 285,232 L 295,228 L 280,218 Z",
  // SOUTH AMERICA
  "M 295,228 L 335,228 L 365,245 L 400,265 L 405,290 L 395,325 L 370,360 L 345,395 L 325,410 L 305,395 L 295,355 L 290,320 L 285,290 L 280,265 L 280,240 Z",
  // EUROPE (small chunky mainland)
  "M 470,108 L 500,98 L 525,90 L 555,82 L 585,88 L 595,105 L 580,128 L 558,138 L 530,142 L 510,148 L 488,142 L 475,128 Z",
  // BRITISH ISLES
  "M 470,112 L 482,108 L 478,128 L 468,128 Z",
  // SCANDINAVIA
  "M 545,55 L 575,52 L 590,72 L 580,98 L 562,102 L 552,82 Z",
  // AFRICA
  "M 478,170 L 510,148 L 540,150 L 565,162 L 588,175 L 615,195 L 632,222 L 625,255 L 615,290 L 595,325 L 568,348 L 540,355 L 510,345 L 488,315 L 478,275 L 472,235 L 470,200 Z",
  // ARABIA
  "M 595,180 L 625,180 L 642,205 L 630,228 L 605,228 L 595,205 Z",
  // ASIA — Russia, Siberia, China, SE Asia
  "M 590,55 L 685,45 L 770,42 L 850,52 L 905,65 L 950,72 L 980,85 L 960,108 L 920,120 L 880,138 L 840,150 L 820,178 L 805,205 L 780,215 L 758,210 L 740,200 L 720,195 L 700,200 L 678,205 L 660,200 L 645,180 L 625,165 L 615,148 L 600,128 L 595,98 L 588,78 Z",
  // INDIA
  "M 700,205 L 730,210 L 745,220 L 745,240 L 728,255 L 712,242 L 702,225 Z",
  // SE ASIA / Indonesia
  "M 820,215 L 855,220 L 880,225 L 875,242 L 845,245 L 820,238 Z",
  // JAPAN
  "M 880,128 L 895,128 L 905,148 L 895,160 L 880,152 Z",
  // AUSTRALIA
  "M 845,330 L 880,322 L 915,325 L 932,340 L 928,365 L 905,378 L 875,378 L 850,372 L 838,355 Z",
  // NEW ZEALAND
  "M 935,378 L 948,385 L 945,398 L 935,395 Z",
  // GREENLAND
  "M 395,40 L 420,32 L 440,55 L 432,82 L 412,82 L 398,68 Z",
  // MADAGASCAR
  "M 635,295 L 645,305 L 642,325 L 628,325 L 625,308 Z",
];

function project(lng, lat) {
  return [
    ((lng + 180) / 360) * 1000,
    ((90 - lat) / 180) * 500,
  ];
}

function WorldMap({ projects, t, onSelect }) {
  const [hoverId, setHoverId] = useStateMap(null);
  const [tooltip, setTooltip] = useStateMap(null); // {x, y, project}
  const wrapRef = useRefMap();

  const points = projects
    .filter(p => p.coords)
    .map(p => {
      const [x, y] = project(p.coords[0], p.coords[1]);
      return { p, x, y };
    });

  // jitter overlapping markers a tiny bit so they don't perfectly stack
  // (group by rounded coord, push apart)
  const grouped = {};
  points.forEach(pt => {
    const key = `${Math.round(pt.x / 6)},${Math.round(pt.y / 6)}`;
    grouped[key] = grouped[key] || [];
    grouped[key].push(pt);
  });
  Object.values(grouped).forEach(group => {
    if (group.length > 1) {
      const n = group.length;
      group.forEach((pt, i) => {
        const angle = (i / n) * Math.PI * 2;
        pt.x += Math.cos(angle) * 6;
        pt.y += Math.sin(angle) * 6;
      });
    }
  });

  const handleEnter = (e, pt) => {
    setHoverId(pt.p.id);
    const wrapRect = wrapRef.current.getBoundingClientRect();
    setTooltip({
      x: (pt.x / 1000) * wrapRect.width,
      y: (pt.y / 500) * wrapRect.height,
      project: pt.p,
    });
  };
  const handleLeave = () => {
    setHoverId(null);
    setTooltip(null);
  };

  return (
    <div className="atlas-map" ref={wrapRef}>
      <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" className="atlas-map-svg" aria-label="World map">
        {/* graticule (gentle latitude lines) */}
        <g className="graticule">
          {[0, 100, 200, 300, 400, 500].map(y => (
            <line key={y} x1="0" y1={y} x2="1000" y2={y} />
          ))}
          {[0, 200, 400, 600, 800, 1000].map(x => (
            <line key={x} x1={x} y1="0" x2={x} y2="500" />
          ))}
        </g>
        {/* equator slightly stronger */}
        <line x1="0" y1="250" x2="1000" y2="250" className="equator" />
        {/* continents */}
        <g className="continents">
          {CONTINENT_PATHS.map((d, i) => <path key={i} d={d} />)}
        </g>
        {/* markers */}
        <g className="markers">
          {points.map(pt => {
            const priority = SHEMA.getPriority(pt.p);
            const stale = SHEMA.getStaleStatus(pt.p);
            const isHover = hoverId === pt.p.id;
            const progress = SHEMA.getProgress(pt.p);
            // marker radius based on speaker count (log scale)
            const r = pt.p.speakerCount > 100000 ? 7 : pt.p.speakerCount > 10000 ? 6 : 5;
            return (
              <g
                key={pt.p.id}
                transform={`translate(${pt.x},${pt.y})`}
                className={`marker priority-${priority} ${isHover ? 'hover' : ''}`}
                onMouseEnter={(e) => handleEnter(e, pt)}
                onMouseLeave={handleLeave}
                onClick={() => onSelect(pt.p)}
                style={{ cursor: 'pointer' }}
              >
                {/* outer pulse ring (for critical/stale) */}
                {(priority === 'critical' || stale === 'critico') && (
                  <circle r={r + 6} className="marker-pulse" />
                )}
                {/* halo */}
                <circle r={r + 3} className="marker-halo" />
                {/* core */}
                <circle r={r} className="marker-core" />
                {/* progress arc */}
                {progress > 0 && progress < 100 && (
                  <circle r={r - 1.5} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"
                    strokeDasharray={`${(r - 1.5) * 2 * Math.PI * progress / 100} ${(r - 1.5) * 2 * Math.PI}`}
                    transform="rotate(-90)" />
                )}
                {progress >= 100 && (
                  <text x="0" y="3" textAnchor="middle" fontSize="9" fontWeight="900" fill="#F6F5EB">✓</text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* tooltip */}
      {tooltip && (
        <div className="atlas-map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="amt-name">{tooltip.project.languageName}</div>
          <div className="amt-meta">
            <span className="amt-code">{tooltip.project.languageCode}</span>
            · {(tooltip.project.location || '').split('—')[0].trim()}
          </div>
          <div className="amt-progress">
            <span style={{ color: 'var(--shema-telha)', fontWeight: 700 }}>{Math.round(SHEMA.getProgress(tooltip.project))}%</span> · {tooltip.project.team}
          </div>
        </div>
      )}

      {/* legend */}
      <div className="atlas-map-legend">
        <span className="aml-item"><i className="dot priority-default" /> {t.status_in_progress || 'Em andamento'}</span>
        <span className="aml-item"><i className="dot priority-warning" /> {t.health_attention}</span>
        <span className="aml-item"><i className="dot priority-critical" /> {t.health_critical}</span>
        <span className="aml-item"><i className="dot priority-completed" /> {t.status_completed}</span>
      </div>
    </div>
  );
}

Object.assign(window, { WorldMap });
