/* globe.jsx — Dark night globe with photo medallions */

const { useState: useGlobeState, useEffect: useGlobeEffect, useRef: useGlobeRef, useMemo: useGlobeMemo } = React;

const G_CONTINENT_PATHS = (typeof CONTINENT_PATHS !== 'undefined') ? CONTINENT_PATHS : [];
const G_CONTINENT_POLYS = (typeof SHEMA_CONTINENTS !== 'undefined') ? SHEMA_CONTINENTS : [];

// ---------- helpers ----------
function parsePathToLngLat(d) {
  const pts = [];
  const re = /[ML]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    const lng = (x / 1000) * 360 - 180;
    const lat = 90 - (y / 500) * 180;
    pts.push([lng, lat]);
  }
  return pts;
}

function pointInPoly(lng, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Build a dense land-dot grid
function buildLandDots() {
  const polys = G_CONTINENT_PATHS.map(parsePathToLngLat);
  const dots = [];
  const STEP = 2.2;
  for (let lat = -82; lat <= 80; lat += STEP) {
    const lngStep = STEP / Math.max(0.18, Math.cos(lat * Math.PI / 180));
    for (let lng = -180; lng < 180; lng += lngStep) {
      let hit = false;
      for (const poly of polys) {
        if (pointInPoly(lng, lat, poly)) { hit = true; break; }
      }
      if (hit) dots.push([lng, lat]);
    }
  }
  return dots;
}

function orthoProject(lng, lat, lambda, phi) {
  const dLng = (lng - lambda) * Math.PI / 180;
  const latR = lat * Math.PI / 180;
  const phiR = phi * Math.PI / 180;
  const cosLat = Math.cos(latR);
  const sinLat = Math.sin(latR);
  const cosDLng = Math.cos(dLng);
  const sinDLng = Math.sin(dLng);
  const x = cosLat * sinDLng;
  const y = Math.cos(phiR) * sinLat - Math.sin(phiR) * cosLat * cosDLng;
  const z = Math.sin(phiR) * sinLat + Math.cos(phiR) * cosLat * cosDLng;
  return { x, y, z };
}

// Subdivide a polygon's edges so projection curves smoothly on the sphere.
// Returns a denser polygon (same closed shape with more interpolated points).
function densifyPolygon(poly, stepDeg = 2) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dLng = b[0] - a[0];
    const dLat = b[1] - a[1];
    const dist = Math.sqrt(dLng * dLng + dLat * dLat);
    const steps = Math.max(1, Math.ceil(dist / stepDeg));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([a[0] + dLng * t, a[1] + dLat * t]);
    }
  }
  return out;
}

// Project a polygon and return an array of visible-side polylines.
// When a polygon crosses the visibility horizon, we break it into multiple segments.
function projectPolygonOutline(poly, lambda, phi, R) {
  const segments = [];
  let current = [];
  for (const [lng, lat] of poly) {
    const p = orthoProject(lng, lat, lambda, phi);
    if (p.z > 0.02) {
      current.push([p.x * R, -p.y * R]);
    } else if (current.length > 1) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

// ============================================================
// GLOBE COMPONENT
// ============================================================
function Globe({ projects, t, onSelect }) {
  const [rotation, setRotation] = useGlobeState({ lambda: -55, phi: -15 });
  const [autoRotate, setAutoRotate] = useGlobeState(true);
  const [hoveredId, setHoveredId] = useGlobeState(null);
  const [selectedId, setSelectedId] = useGlobeState(null);
  const [medPos, setMedPos] = useGlobeState({ x: 0, y: 0, side: 'right' });
  const dragRef = useGlobeRef(null);
  const lastTimeRef = useGlobeRef(performance.now());
  const svgRef = useGlobeRef(null);
  const stageRef = useGlobeRef(null);

  const landDots = useGlobeMemo(() => buildLandDots(), []);
  const densePolys = useGlobeMemo(() => G_CONTINENT_POLYS.map(p => densifyPolygon(p, 1.8)), []);

  // Auto-rotate
  useGlobeEffect(() => {
    let raf;
    const step = (now) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (autoRotate && !dragRef.current && !selectedId) {
        setRotation(r => ({ ...r, lambda: (r.lambda - dt * 6 + 540) % 360 - 180 }));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, selectedId]);

  // Drag handlers
  const onMouseDown = (e) => {
    if (e.target.closest('.g-marker, foreignObject, .g-medallion-close')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLambda: rotation.lambda, startPhi: rotation.phi };
  };
  useGlobeEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      const d = dragRef.current;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setRotation({
        lambda: ((d.startLambda + dx * 0.45 + 540) % 360) - 180,
        phi: Math.max(-80, Math.min(80, d.startPhi - dy * 0.45)),
      });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const R = 180;

  const visibleDots = useGlobeMemo(() => {
    return landDots
      .map(([lng, lat]) => orthoProject(lng, lat, rotation.lambda, rotation.phi))
      .filter(p => p.z > 0.02)
      .map(p => ({ x: p.x * R, y: -p.y * R, z: p.z }));
  }, [landDots, rotation]);

  const continentSegments = useGlobeMemo(() => {
    return densePolys.flatMap(poly => projectPolygonOutline(poly, rotation.lambda, rotation.phi, R));
  }, [densePolys, rotation]);

  const markers = useGlobeMemo(() => {
    return projects
      .filter(p => p.coords)
      .map(p => {
        const proj = orthoProject(p.coords[0], p.coords[1], rotation.lambda, rotation.phi);
        return { p, x: proj.x * R, y: -proj.y * R, z: proj.z, visible: proj.z > -0.05 };
      });
  }, [projects, rotation]);

  // Smooth rotation to focus a region
  const focusOn = (targetLambda, targetPhi) => {
    const start = { ...rotation };
    const t0 = performance.now();
    const dur = 900;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    let delta = ((targetLambda - start.lambda + 540) % 360) - 180;
    const animate = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = ease(k);
      setRotation({
        lambda: start.lambda + delta * e,
        phi: start.phi + (targetPhi - start.phi) * e,
      });
      if (k < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  const handleMarkerClick = (p) => {
    setSelectedId(p.id);
    focusOn(p.coords[0], p.coords[1]);
  };

  const closeMedallion = () => {
    setSelectedId(null);
  };

  const selected = projects.find(p => p.id === selectedId);
  const selectedMarker = selected ? markers.find(m => m.p.id === selectedId) : null;

  // Compute medallion screen position whenever selected marker moves
  useGlobeEffect(() => {
    if (!selectedMarker || !selectedMarker.visible || !svgRef.current || !stageRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = selectedMarker.x;
    pt.y = selectedMarker.y;
    const screen = pt.matrixTransform(ctm);
    const stageRect = stageRef.current.getBoundingClientRect();
    setMedPos({
      x: screen.x - stageRect.left,
      y: screen.y - stageRect.top,
      side: selectedMarker.x > 0 ? 'right' : 'left',
    });
  }, [selectedMarker, rotation.lambda, rotation.phi]);

  // Stats summary
  const stats = useGlobeMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(p => SHEMA.getProjectStatus(p) === 'em-andamento' || SHEMA.getProjectStatus(p) === 'final').length;
    const regions = new Set(projects.map(p => (p.location || '').split(',').pop()?.trim()).filter(Boolean));
    return { total, inProgress, regions: regions.size };
  }, [projects]);

  return (
    <div className="atlas-night">
      <div className="globe-stage night" ref={stageRef}>
        <div className="globe-controls night">
          <button className="gc-btn" onClick={() => setAutoRotate(!autoRotate)} title="auto-rotate">
            {autoRotate ? '❚❚' : '▶'}
          </button>
          <div className="gc-divider" />
          <button className="gc-btn lbl" onClick={() => { setSelectedId(null); focusOn(-55, -15); }}>BR</button>
          <button className="gc-btn lbl" onClick={() => { setSelectedId(null); focusOn(-5, 10); }}>AF</button>
          <button className="gc-btn lbl" onClick={() => { setSelectedId(null); focusOn(120, 0); }}>SE</button>
        </div>

        {/* night stats overlay */}
        <div className="night-stats">
          <div className="ns-item">
            <span className="ns-num">{stats.total}</span>
            <span className="ns-lbl">{t.locale === 'pt-BR' ? 'línguas' : 'languages'}</span>
          </div>
          <div className="ns-item">
            <span className="ns-num">{stats.regions}</span>
            <span className="ns-lbl">{t.locale === 'pt-BR' ? 'regiões' : 'regions'}</span>
          </div>
          <div className="ns-item">
            <span className="ns-num">{stats.inProgress}</span>
            <span className="ns-lbl">{t.locale === 'pt-BR' ? 'ativos' : 'active'}</span>
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`-${R + 30} -${R + 30} ${2 * (R + 30)} ${2 * (R + 30)}`}
          className="globe-svg night"
          onMouseDown={onMouseDown}
        >
          <defs>
            <radialGradient id="night-sphere" cx="38%" cy="32%" r="80%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#F6F5EB" />
              <stop offset="100%" stopColor="#A8A484" />
            </radialGradient>
            <radialGradient id="night-glow" cx="50%" cy="50%" r="62%">
              <stop offset="60%" stopColor="#5A8BC8" stopOpacity="0" />
              <stop offset="92%" stopColor="#5A8BC8" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#BE4A01" stopOpacity="0.32" />
            </radialGradient>
            <radialGradient id="terminator" cx="32%" cy="28%" r="88%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="55%" stopColor="rgba(60,40,30,0)" />
              <stop offset="100%" stopColor="rgba(20,10,30,0.55)" />
            </radialGradient>
            <filter id="marker-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="1.6" />
              </feComponentTransfer>
            </filter>
            <filter id="marker-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="2" />
              </feComponentTransfer>
            </filter>
          </defs>

          {/* outer warm glow halo */}
          <circle r={R + 28} fill="url(#night-glow)" />

          {/* sphere */}
          <circle r={R} fill="url(#night-sphere)" />

          {/* graticule */}
          <g className="g-graticule night">
            {[-60, -30, 0, 30, 60].map(lat => {
              const pts = [];
              for (let lng = -180; lng <= 180; lng += 5) {
                const p = orthoProject(lng, lat, rotation.lambda, rotation.phi);
                if (p.z > 0) pts.push(`${p.x * R},${-p.y * R}`);
              }
              if (pts.length < 2) return null;
              return <polyline key={'lat' + lat} points={pts.join(' ')} fill="none" />;
            })}
            {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].map(lng => {
              const pts = [];
              for (let lat = -85; lat <= 85; lat += 5) {
                const p = orthoProject(lng, lat, rotation.lambda, rotation.phi);
                if (p.z > 0) pts.push(`${p.x * R},${-p.y * R}`);
              }
              if (pts.length < 2) return null;
              return <polyline key={'lng' + lng} points={pts.join(' ')} fill="none" />;
            })}
          </g>

          {/* continent outlines */}
          <g className="g-outlines">
            {continentSegments.map((seg, i) => (
              <polyline key={i} points={seg.map(([x, y]) => `${x},${y}`).join(' ')} />
            ))}
          </g>
          {/* land subtle fill (closed polygons that don't cross horizon) */}
          <g className="g-land-fill">
            {continentSegments.filter(s => s.length > 4).map((seg, i) => {
              // close the polygon for fill if it visually wraps
              const pts = seg.map(([x, y]) => `${x},${y}`).join(' ');
              return <polyline key={i} points={pts} />;
            })}
          </g>

          {/* connection line from marker to medallion (under marker for layering) */}
          {selectedMarker && selectedMarker.visible && (
            <g className="medallion-link">
              <circle cx={selectedMarker.x} cy={selectedMarker.y} r={14} fill="none" stroke="rgba(190,74,1,0.5)" strokeWidth="1" />
              <circle cx={selectedMarker.x} cy={selectedMarker.y} r={22} fill="none" stroke="rgba(190,74,1,0.25)" strokeWidth="1" />
            </g>
          )}

          {/* markers */}
          <g className="g-markers night">
            {markers.filter(m => m.visible).map(m => {
              const priority = SHEMA.getPriority(m.p);
              const stale = SHEMA.getStaleStatus(m.p);
              const isHover = hoveredId === m.p.id;
              const isSelected = selectedId === m.p.id;
              const r = m.p.speakerCount > 100000 ? 5.5 : m.p.speakerCount > 10000 ? 4.8 : 4.2;
              const opacity = m.z > 0 ? 1 : 0.25;
              return (
                <g key={m.p.id}
                   transform={`translate(${m.x},${m.y})`}
                   className={`g-marker night priority-${priority} ${isHover ? 'hover' : ''} ${isSelected ? 'selected' : ''}`}
                   style={{ opacity, cursor: 'pointer' }}
                   onMouseEnter={() => setHoveredId(m.p.id)}
                   onMouseLeave={() => setHoveredId(null)}
                   onClick={(e) => { e.stopPropagation(); handleMarkerClick(m.p); }}
                >
                  {/* outer glow */}
                  <circle r={r + 6} className="g-marker-glow" filter="url(#marker-glow-strong)" />
                  {(isSelected || isHover) && <circle r={r + 4} className="g-marker-ring" />}
                  {(priority === 'critical' || stale === 'critico') && (
                    <circle r={r + 3} className="g-marker-pulse" />
                  )}
                  <circle r={r} className="g-marker-core" />
                  <circle r={r * 0.4} className="g-marker-shine" />
                </g>
              );
            })}
          </g>

          {/* rim shadow */}
          <circle r={R} fill="url(#terminator)" pointerEvents="none" />
          <circle r={R} fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth="1" />
          <circle r={R - 0.5} fill="none" stroke="rgba(190,74,1,0.22)" strokeWidth="0.5" />
        </svg>

        {/* MEDALLION (photo card) — absolute positioned in stage */}
        {selectedMarker && selectedMarker.visible && (
          <div
            className="g-medallion-wrap"
            style={{
              left: medPos.side === 'right' ? medPos.x - 220 : medPos.x + 28,
              top: medPos.y - 130,
            }}
          >
            <Medallion p={selected} t={t} onClose={closeMedallion} onOpen={() => onSelect(selected)} />
          </div>
        )}

        <div className="globe-hint night">
          <span>↔ {t.locale === 'pt-BR' ? 'arraste · clique no ponto' : 'drag · click a dot'}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MEDALLION (photo card that pops near marker)
// ============================================================
function Medallion({ p, t, onClose, onOpen }) {
  const progress = SHEMA.getProgress(p);
  const priority = SHEMA.getPriority(p);

  return (
    <div className={`g-medallion priority-${priority}`} xmlns="http://www.w3.org/1999/xhtml">
      <button className="g-medallion-close" onClick={onClose} title="Fechar">×</button>

      <div className="g-medallion-photo">
        <image-slot
          id={`shema-photo-${p.id}`}
          shape="circle"
          placeholder=" "
        ></image-slot>
        <div className={`g-medallion-tag priority-${priority}`}>{p.languageCode || '—'}</div>
      </div>

      <div className="g-medallion-name">{p.languageName}</div>
      <div className="g-medallion-loc">{(p.location || '').split('—')[0].split(',')[0].trim()}</div>

      {p.portion && (
        <div className="g-medallion-portion">📖 {p.portion}</div>
      )}

      <div className="g-medallion-stats">
        <div className="g-mstat">
          <span className="g-mstat-num">{Math.round(progress)}<small>%</small></span>
          <span className="g-mstat-lbl">{t.d_p_translated.split(' ')[0]}</span>
        </div>
        <div className="g-mstat">
          <span className="g-mstat-num">{p.speakerCount > 1000 ? `${Math.round(p.speakerCount / 1000)}k` : p.speakerCount || '—'}</span>
          <span className="g-mstat-lbl">{t.d_speakers}</span>
        </div>
      </div>

      <button className="g-medallion-open" onClick={onOpen}>
        {t.locale === 'pt-BR' ? 'Ver projeto →' : 'Open project →'}
      </button>
    </div>
  );
}

Object.assign(window, { Globe, Medallion });
