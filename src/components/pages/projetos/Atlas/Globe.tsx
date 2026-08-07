import { useEffect, useMemo, useRef, useState } from "react";
import {
  GLOBE_INITIAL_ROTATION,
  type GlobeFocusPoint,
} from "../../../../constants/geo";
import { geoAPI } from "../../../../fixtures";
import type { Project } from "../../../../types/project";
import type { GeoOutline } from "../../../../types/region";
import { GlobeMarkers, type ProjectedMarker } from "./GlobeMarkers";
import {
  GlobeControls,
  GlobeHint,
  NightStatsOverlay,
  SensitiveNotice,
} from "./GlobeOverlays";
import { GlobeDefs, GlobeGraticule, GlobeLand } from "./GlobeScenery";
import {
  buildMarkerSources,
  buildNightStats,
  countWithheld,
} from "./markers";
import { Medallion } from "./Medallion";
import {
  densifyPolygon,
  orthoProject,
  projectPolygonOutline,
  spreadOverlapping,
} from "./projection";
import { STAGE_BACKGROUND, STAR_FIELD, STAR_LAYER } from "./nightTheme";

const R = 180;

interface Rotation {
  lambda: number;
  phi: number;
}

export interface GlobeProps {
  projects: Project[];
  onSelect?: (project: Project) => void;
}

export function Globe({ projects, onSelect }: GlobeProps) {
  const [rotation, setRotation] = useState<Rotation>({
    ...GLOBE_INITIAL_ROTATION,
  });
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [medPos, setMedPos] = useState<{
    x: number;
    y: number;
    side: "left" | "right";
  }>({ x: 0, y: 0, side: "right" });
  const [outlines, setOutlines] = useState<GeoOutline[]>([]);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startLambda: number;
    startPhi: number;
  } | null>(null);
  const lastTimeRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [prevProjects, setPrevProjects] = useState(projects);
  if (projects !== prevProjects) {
    setPrevProjects(projects);
    if (selectedId && !projects.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }

  useEffect(() => {
    let active = true;
    void geoAPI.outlines().then((loaded) => {
      if (active) setOutlines(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const densePolys = useMemo(
    () => outlines.map((poly) => densifyPolygon(poly, 1.8)),
    [outlines],
  );

  useEffect(() => {
    let raf: number;
    lastTimeRef.current = performance.now();
    const step = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (autoRotate && !dragRef.current && !selectedId) {
        setRotation((r) => ({
          ...r,
          lambda: ((r.lambda - dt * 6 + 540) % 360) - 180,
        }));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, selectedId]);

  const onMouseDown = (event: React.MouseEvent) => {
    if ((event.target as Element).closest(".g-marker")) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLambda: rotation.lambda,
      startPhi: rotation.phi,
    };
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragRef.current) return;
      const drag = dragRef.current;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setRotation({
        lambda: ((drag.startLambda + dx * 0.45 + 540) % 360) - 180,
        phi: Math.max(-80, Math.min(80, drag.startPhi - dy * 0.45)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const focusOn = (targetLambda: number, targetPhi: number) => {
    const start = { ...rotation };
    const dur = 900;
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const delta = ((targetLambda - start.lambda + 540) % 360) - 180;
    let t0: number | null = null;
    const animate = (now: number) => {
      if (t0 === null) t0 = now;
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

  const continentSegments = useMemo(
    () =>
      densePolys.flatMap((poly) =>
        projectPolygonOutline(poly, rotation.lambda, rotation.phi, R),
      ),
    [densePolys, rotation],
  );

  const sources = useMemo(() => buildMarkerSources(projects), [projects]);

  const markers = useMemo<ProjectedMarker[]>(() => {
    const projected = sources.map((source) => {
      const [lng, lat] = source.placement.coords;
      const p = orthoProject(lng, lat, rotation.lambda, rotation.phi);
      return {
        source,
        x: p.x * R,
        y: -p.y * R,
        z: p.z,
        visible: p.z > -0.05,
      };
    });
    return spreadOverlapping(projected);
  }, [sources, rotation]);

  const stats = useMemo(() => buildNightStats(projects), [projects]);
  const withheld = useMemo(() => countWithheld(sources), [sources]);

  const selected = projects.find((p) => p.id === selectedId);
  const selectedMarker = selected
    ? markers.find((m) => m.source.project.id === selectedId)
    : undefined;

  useEffect(() => {
    if (
      !selectedMarker ||
      !selectedMarker.visible ||
      !svgRef.current ||
      !stageRef.current
    ) {
      return;
    }
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
      side: selectedMarker.x > 0 ? "right" : "left",
    });
  }, [selectedMarker]);

  const handleMarkerClick = (marker: ProjectedMarker) => {
    setSelectedId(marker.source.project.id);
    focusOn(
      marker.source.placement.coords[0],
      marker.source.placement.coords[1],
    );
  };

  const handleFocusPoint = (point: GlobeFocusPoint) => {
    setSelectedId(null);
    focusOn(point.coords[0], point.coords[1]);
  };

  return (
    <div className="mb-6">
      <div
        ref={stageRef}
        className="relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-lg border border-telha/25 p-7 max-lg:min-h-[460px] max-lg:p-4.5 max-sm:min-h-[360px] max-sm:p-3"
        style={{ background: STAGE_BACKGROUND }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: STAR_FIELD }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-95 mix-blend-screen"
          style={{ backgroundImage: STAR_LAYER }}
        />

        <GlobeControls
          autoRotate={autoRotate}
          onToggleRotate={() => setAutoRotate((previous) => !previous)}
          onFocus={handleFocusPoint}
        />
        <NightStatsOverlay stats={stats} />
        <SensitiveNotice count={withheld} />

        <svg
          ref={svgRef}
          viewBox={`-${R + 30} -${R + 30} ${2 * (R + 30)} ${2 * (R + 30)}`}
          className="relative z-1 block h-auto w-full max-w-[640px] cursor-grab select-none active:cursor-grabbing"
          onMouseDown={onMouseDown}
        >
          <GlobeDefs />

          <circle r={R + 28} fill="url(#night-glow)" />
          <circle r={R} fill="url(#night-sphere)" />

          <GlobeGraticule lambda={rotation.lambda} phi={rotation.phi} radius={R} />
          <GlobeLand segments={continentSegments} />

          {selectedMarker && selectedMarker.visible && (
            <g>
              <circle
                cx={selectedMarker.x}
                cy={selectedMarker.y}
                r={14}
                fill="none"
                className="stroke-telha/50"
                strokeWidth="1"
              />
              <circle
                cx={selectedMarker.x}
                cy={selectedMarker.y}
                r={22}
                fill="none"
                className="stroke-telha/25"
                strokeWidth="1"
              />
            </g>
          )}

          <GlobeMarkers
            markers={markers}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={setHoveredId}
            onSelect={handleMarkerClick}
          />

          <circle r={R} fill="url(#terminator)" pointerEvents="none" />
          <circle r={R} fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth="1" />
          <circle
            r={R - 0.5}
            fill="none"
            className="stroke-telha/22"
            strokeWidth="0.5"
          />
        </svg>

        {selected && selectedMarker && selectedMarker.visible && (
          <div
            className="absolute z-5 w-[200px]"
            style={{
              left: medPos.side === "right" ? medPos.x - 220 : medPos.x + 28,
              top: medPos.y - 130,
            }}
          >
            <Medallion
              project={selected}
              onClose={() => setSelectedId(null)}
              onOpen={onSelect ? () => onSelect(selected) : undefined}
            />
          </div>
        )}

        <GlobeHint />
      </div>
    </div>
  );
}
