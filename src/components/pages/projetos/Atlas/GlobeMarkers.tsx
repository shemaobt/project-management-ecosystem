import { useTranslation } from "react-i18next";
import { HEALTH_LABEL_KEYS } from "../../../../constants/status";
import { getOverallHealth, getPriority } from "../../../../utils/health";
import { getStaleStatus } from "../../../../utils/recency";
import { markerRadius, type AtlasMarkerSource } from "./markers";
import { NIGHT_MARKER_TONES } from "./nightTheme";

export interface ProjectedMarker {
  source: AtlasMarkerSource;
  x: number;
  y: number;
  z: number;
  visible: boolean;
}

export interface GlobeMarkersProps {
  markers: ProjectedMarker[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (marker: ProjectedMarker) => void;
}

export function GlobeMarkers({
  markers,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: GlobeMarkersProps) {
  const { t } = useTranslation();
  return (
    <g>
      {markers
        .filter((m) => m.visible)
        .map((m) => {
          const project = m.source.project;
          const priority = getPriority(project);
          const stale = getStaleStatus(project);
          const health = getOverallHealth(project);
          const approximate = m.source.placement.precision === "region";
          const tone = NIGHT_MARKER_TONES[priority];
          const isHover = hoveredId === project.id;
          const isSelected = selectedId === project.id;
          const r = markerRadius(project);
          const opacity = priority === "canceled" ? 0.55 : m.z > 0 ? 1 : 0.25;
          return (
            <g
              key={project.id}
              transform={`translate(${m.x},${m.y})`}
              className="g-marker cursor-pointer"
              style={{ opacity }}
              onMouseEnter={() => onHover(project.id)}
              onMouseLeave={() => onHover(null)}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(m);
              }}
            >
              <title>
                {[
                  project.languageName,
                  t(HEALTH_LABEL_KEYS[health]),
                  project.sensitiveCountry
                    ? t("atlas_sensitive_marker")
                    : approximate
                      ? t("atlas_approx_position")
                      : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </title>
              <circle
                r={r + 6}
                className={tone.fillClass}
                opacity={isHover || isSelected ? 0.95 : tone.glowOpacity}
                filter="url(#marker-glow-strong)"
              />
              {(isSelected || isHover) && (
                <circle
                  r={r + 4}
                  fill="none"
                  className="stroke-branco/90"
                  strokeWidth="1.2"
                />
              )}
              {(priority === "critical" || stale === "critico") && (
                <circle
                  r={r + 3}
                  fill="none"
                  stroke="var(--shema-telha)"
                  strokeWidth="1"
                >
                  <animate
                    attributeName="r"
                    values={`${(r + 3) * 0.6};${(r + 3) * 1.9}`}
                    dur="2.2s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.2 0.8 0.25 1"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.9;0"
                    dur="2.2s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.2 0.8 0.25 1"
                  />
                </circle>
              )}
              {approximate && (
                <circle
                  r={r + 3.5}
                  fill="none"
                  className="stroke-branco/75"
                  strokeWidth="0.9"
                  strokeDasharray="2 2"
                />
              )}
              <circle r={r} className={tone.fillClass} />
              <circle r={r * 0.4} className="fill-night-shine" opacity="0.9" />
            </g>
          );
        })}
    </g>
  );
}
