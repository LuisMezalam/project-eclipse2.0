import { LoadType, BeamType, LoadConfig } from "@/lib/reliability";

interface LoadTypeDiagramProps {
  loadType?: LoadType;
  beamType: BeamType;
  hybridLoads?: LoadConfig[];
  beamLength?: number;
}

// Color palette for hybrid loads
const LOAD_COLORS = [
  { stroke: "hsl(0 84% 60%)", fill: "hsl(0 84% 60% / 0.2)", label: "destructive" },
  { stroke: "hsl(221 83% 53%)", fill: "hsl(221 83% 53% / 0.2)", label: "blue" },
  { stroke: "hsl(142 71% 45%)", fill: "hsl(142 71% 45% / 0.2)", label: "green" },
  { stroke: "hsl(262 83% 58%)", fill: "hsl(262 83% 58% / 0.2)", label: "purple" },
  { stroke: "hsl(38 92% 50%)", fill: "hsl(38 92% 50% / 0.2)", label: "amber" },
  { stroke: "hsl(189 94% 43%)", fill: "hsl(189 94% 43% / 0.2)", label: "cyan" },
];

export function LoadTypeDiagram({ loadType, beamType, hybridLoads, beamLength = 6 }: LoadTypeDiagramProps) {
  const width = 280;
  const height = hybridLoads && hybridLoads.length > 0 ? 140 : 100;
  const beamY = hybridLoads && hybridLoads.length > 0 ? 75 : 55;
  const beamStart = 20;
  const beamEnd = 260;
  const beamLen = beamEnd - beamStart;

  const renderSupportsForSimple = () => (
    <>
      <polygon
        points={`${beamStart},${beamY + 4} ${beamStart - 8},${beamY + 16} ${beamStart + 8},${beamY + 16}`}
        className="fill-muted-foreground/60 stroke-muted-foreground"
        strokeWidth={1.5}
      />
      <line x1={beamStart - 10} y1={beamY + 18} x2={beamStart + 10} y2={beamY + 18} className="stroke-muted-foreground" strokeWidth={1.5} />
      <circle cx={beamEnd} cy={beamY + 10} r={5} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />
      <line x1={beamEnd - 10} y1={beamY + 18} x2={beamEnd + 10} y2={beamY + 18} className="stroke-muted-foreground" strokeWidth={1.5} />
    </>
  );

  const renderSupports = () => {
    switch (beamType) {
      case "simply-supported":
        return renderSupportsForSimple();
      case "cantilever":
        return (
          <>
            <rect x={beamStart - 8} y={beamY - 15} width={8} height={30} className="fill-muted-foreground/40 stroke-muted-foreground" strokeWidth={1.5} />
            {[0, 1, 2, 3, 4].map(i => (
              <line key={i} x1={beamStart - 8} y1={beamY - 15 + i * 7} x2={beamStart - 2} y2={beamY - 9 + i * 7} className="stroke-muted-foreground" strokeWidth={1} />
            ))}
          </>
        );
      case "fixed-fixed":
        return (
          <>
            <rect x={beamStart - 8} y={beamY - 12} width={8} height={24} className="fill-muted-foreground/40 stroke-muted-foreground" strokeWidth={1.5} />
            {[0, 1, 2, 3].map(i => (
              <line key={`l${i}`} x1={beamStart - 8} y1={beamY - 12 + i * 6} x2={beamStart - 2} y2={beamY - 6 + i * 6} className="stroke-muted-foreground" strokeWidth={1} />
            ))}
            <rect x={beamEnd} y={beamY - 12} width={8} height={24} className="fill-muted-foreground/40 stroke-muted-foreground" strokeWidth={1.5} />
            {[0, 1, 2, 3].map(i => (
              <line key={`r${i}`} x1={beamEnd} y1={beamY - 12 + i * 6} x2={beamEnd + 6} y2={beamY - 6 + i * 6} className="stroke-muted-foreground" strokeWidth={1} />
            ))}
          </>
        );
      case "propped-cantilever":
        return (
          <>
            <rect x={beamStart - 8} y={beamY - 15} width={8} height={30} className="fill-muted-foreground/40 stroke-muted-foreground" strokeWidth={1.5} />
            {[0, 1, 2, 3, 4].map(i => (
              <line key={i} x1={beamStart - 8} y1={beamY - 15 + i * 7} x2={beamStart - 2} y2={beamY - 9 + i * 7} className="stroke-muted-foreground" strokeWidth={1} />
            ))}
            <circle cx={beamEnd} cy={beamY + 10} r={5} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />
            <line x1={beamEnd - 10} y1={beamY + 18} x2={beamEnd + 10} y2={beamY + 18} className="stroke-muted-foreground" strokeWidth={1.5} />
          </>
        );
      case "overhanging":
        return (
          <>
            <polygon
              points={`${beamStart + beamLen * 0.2},${beamY + 4} ${beamStart + beamLen * 0.2 - 6},${beamY + 14} ${beamStart + beamLen * 0.2 + 6},${beamY + 14}`}
              className="fill-muted-foreground/60 stroke-muted-foreground"
              strokeWidth={1.5}
            />
            <line x1={beamStart + beamLen * 0.2 - 8} y1={beamY + 16} x2={beamStart + beamLen * 0.2 + 8} y2={beamY + 16} className="stroke-muted-foreground" strokeWidth={1.5} />
            <circle cx={beamStart + beamLen * 0.8} cy={beamY + 10} r={5} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />
            <line x1={beamStart + beamLen * 0.8 - 8} y1={beamY + 18} x2={beamStart + beamLen * 0.8 + 8} y2={beamY + 18} className="stroke-muted-foreground" strokeWidth={1.5} />
          </>
        );
      case "continuous":
      case "multi-span":
      case "spring-supported":
        return (
          <>
            <polygon
              points={`${beamStart},${beamY + 4} ${beamStart - 6},${beamY + 14} ${beamStart + 6},${beamY + 14}`}
              className="fill-muted-foreground/60 stroke-muted-foreground"
              strokeWidth={1.5}
            />
            <line x1={beamStart - 8} y1={beamY + 16} x2={beamStart + 8} y2={beamY + 16} className="stroke-muted-foreground" strokeWidth={1.5} />
            <polygon
              points={`${beamStart + beamLen / 2},${beamY + 4} ${beamStart + beamLen / 2 - 6},${beamY + 14} ${beamStart + beamLen / 2 + 6},${beamY + 14}`}
              className="fill-accent/60 stroke-accent"
              strokeWidth={1.5}
            />
            <line x1={beamStart + beamLen / 2 - 8} y1={beamY + 16} x2={beamStart + beamLen / 2 + 8} y2={beamY + 16} className="stroke-accent" strokeWidth={1.5} />
            <circle cx={beamEnd} cy={beamY + 10} r={5} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />
            <line x1={beamEnd - 8} y1={beamY + 18} x2={beamEnd + 8} y2={beamY + 18} className="stroke-muted-foreground" strokeWidth={1.5} />
            {beamType === "multi-span" && (
              <circle cx={beamStart + beamLen * 0.75} cy={beamY + 10} r={4} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.2} />
            )}
            {beamType === "spring-supported" && [0.15, 0.5, 0.85].map((p) => (
              <path key={p} d={`M ${beamStart + beamLen * p} ${beamY + 8} q 4 3 0 6 q -4 3 0 6`} className="stroke-accent" strokeWidth={1.2} fill="none" />
            ))}
          </>
        );
      case "gerber":
        return (
          <>
            {renderSupportsForSimple()}
            <circle cx={beamStart + beamLen / 2} cy={beamY} r={4} className="fill-chart-posterior stroke-chart-posterior" strokeWidth={1.5} />
          </>
        );
      case "elastic-foundation":
      case "tapered":
      case "beam-column":
      case "composite":
      case "settlement":
        return renderSupportsForSimple();
      default:
        return renderSupportsForSimple();
    }
  };

  const renderSingleLoad = (load: LoadConfig, colorIndex: number, yOffset: number = 0) => {
    const color = LOAD_COLORS[colorIndex % LOAD_COLORS.length];
    const inv = load.inverted || false;
    
    // For inverted loads, arrows come from below the beam
    const topY = inv ? beamY + 6 : 10 + yOffset;
    const arrowTipY = inv ? beamY + 4 : beamY - 4;
    const arrowBaseY = inv ? beamY + 10 : beamY - 10;
    const loadTopY = inv ? beamY + 6 + (beamY - 16 - (10 + yOffset)) : 10 + yOffset;
    const distEndY = inv ? beamY + 6 : beamY - 6;
    
    // Direction multiplier for drawing
    const dir = inv ? 1 : -1;

    switch (load.type) {
      case 'udl':
      case 'construction-stage':
      case 'prestress':
        return (
          <g key={`load-${colorIndex}`}>
            {Array.from({ length: 8 }).map((_, i) => {
              const x = beamStart + ((i + 0.5) / 8) * beamLen;
              const lineEndY = inv ? beamY + 40 : 10 + yOffset;
              const lineStartY = inv ? beamY + 6 : beamY - 6;
              return (
                <g key={i}>
                  <line x1={x} y1={lineEndY} x2={x} y2={lineStartY} stroke={color.stroke} strokeWidth={1.5} />
                  <polygon points={`${x - 3},${arrowBaseY} ${x},${arrowTipY} ${x + 3},${arrowBaseY}`} fill={color.stroke} />
                </g>
              );
            })}
            <line x1={beamStart} y1={inv ? beamY + 40 : 10 + yOffset} x2={beamEnd} y2={inv ? beamY + 40 : 10 + yOffset} stroke={color.stroke} strokeWidth={2} />
          </g>
        );

      case 'concentrated':
      case 'torsional':
      case 'harmonic-equivalent': {
        const concX = beamStart + (load.position || 0.5) * beamLen;
        const lineEndY = inv ? beamY + 40 : 10 + yOffset;
        const lineStartY = inv ? beamY + 6 : beamY - 6;
        return (
          <g key={`load-${colorIndex}`}>
            <line x1={concX} y1={lineEndY} x2={concX} y2={lineStartY} stroke={color.stroke} strokeWidth={2} />
            <polygon points={`${concX - 5},${inv ? beamY + 12 : beamY - 12} ${concX},${arrowTipY} ${concX + 5},${inv ? beamY + 12 : beamY - 12}`} fill={color.stroke} />
            <text x={concX} y={inv ? beamY + 48 : 8 + yOffset} textAnchor="middle" fill={color.stroke} className="text-[9px] font-bold">P</text>
          </g>
        );
      }

      case 'triangular':
      case 'snow-drift':
      case 'hydrostatic': {
        const peak = load.peakPosition || 0;
        const triS = load.triStartPosition ?? 0;
        const triE = load.triEndPosition ?? 1;
        const loadStartX = beamStart + triS * beamLen;
        const loadEndX = beamStart + triE * beamLen;
        const loadWidth = loadEndX - loadStartX;
        
        if (inv) {
          // Inverted triangular: below beam
          const bottomY = beamY + 40;
          return (
            <g key={`load-${colorIndex}`}>
              <polygon
                points={peak === 0
                  ? `${loadStartX},${bottomY} ${loadEndX},${beamY + 6} ${loadStartX},${beamY + 6}`
                  : `${loadStartX},${beamY + 6} ${loadEndX},${bottomY} ${loadEndX},${beamY + 6}`
                }
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={1.5}
              />
              {Array.from({ length: 5 }).map((_, i) => {
                const t = (i + 1) / 6;
                const x = loadStartX + t * loadWidth;
                const h = peak === 0 ? (1 - t) : t;
                const lineY = beamY + 6 + h * (bottomY - beamY - 6);
                return (
                  <g key={i}>
                    <line x1={x} y1={lineY} x2={x} y2={beamY + 6} stroke={color.stroke} strokeWidth={1} />
                    <polygon points={`${x - 2},${beamY + 10} ${x},${beamY + 4} ${x + 2},${beamY + 10}`} fill={color.stroke} />
                  </g>
                );
              })}
            </g>
          );
        } else {
          const topYTri = 10 + yOffset;
          return (
            <g key={`load-${colorIndex}`}>
              <polygon
                points={peak === 0 
                  ? `${loadStartX},${topYTri} ${loadEndX},${beamY - 6} ${loadStartX},${beamY - 6}`
                  : `${loadStartX},${beamY - 6} ${loadEndX},${topYTri} ${loadEndX},${beamY - 6}`
                }
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={1.5}
              />
              {Array.from({ length: 5 }).map((_, i) => {
                const t = (i + 1) / 6;
                const x = loadStartX + t * loadWidth;
                const h = peak === 0 ? (1 - t) : t;
                return (
                  <g key={i}>
                    <line x1={x} y1={topYTri + (1 - h) * (beamY - 16 - topYTri)} x2={x} y2={beamY - 6} stroke={color.stroke} strokeWidth={1} />
                    <polygon points={`${x - 2},${beamY - 10} ${x},${beamY - 4} ${x + 2},${beamY - 10}`} fill={color.stroke} />
                  </g>
                );
              })}
            </g>
          );
        }
      }

      case 'partial-udl':
      case 'patch': {
        const partStart = beamStart + (load.startPosition || 0.25) * beamLen;
        const partEnd = beamStart + (load.endPosition || 0.75) * beamLen;
        if (inv) {
          const bottomY = beamY + 40;
          return (
            <g key={`load-${colorIndex}`}>
              <rect x={partStart} y={beamY + 6} width={partEnd - partStart} height={bottomY - beamY - 6} fill={color.fill} />
              <line x1={partStart} y1={bottomY} x2={partEnd} y2={bottomY} stroke={color.stroke} strokeWidth={2} />
              {Array.from({ length: 4 }).map((_, i) => {
                const x = partStart + ((i + 0.5) / 4) * (partEnd - partStart);
                return (
                  <g key={i}>
                    <line x1={x} y1={bottomY} x2={x} y2={beamY + 6} stroke={color.stroke} strokeWidth={1.5} />
                    <polygon points={`${x - 3},${beamY + 10} ${x},${beamY + 4} ${x + 3},${beamY + 10}`} fill={color.stroke} />
                  </g>
                );
              })}
            </g>
          );
        }
        return (
          <g key={`load-${colorIndex}`}>
            <rect x={partStart} y={topY} width={partEnd - partStart} height={beamY - 16 - topY} fill={color.fill} />
            <line x1={partStart} y1={topY} x2={partEnd} y2={topY} stroke={color.stroke} strokeWidth={2} />
            {Array.from({ length: 4 }).map((_, i) => {
              const x = partStart + ((i + 0.5) / 4) * (partEnd - partStart);
              return (
                <g key={i}>
                  <line x1={x} y1={topY} x2={x} y2={beamY - 6} stroke={color.stroke} strokeWidth={1.5} />
                  <polygon points={`${x - 3},${beamY - 10} ${x},${beamY - 4} ${x + 3},${beamY - 10}`} fill={color.stroke} />
                </g>
              );
            })}
          </g>
        );
      }

      case 'trapezoidal': {
        const w1 = load.startIntensity || 5000;
        const w2 = load.endIntensity || 2500;
        const maxW = Math.max(w1, w2);
        const span = beamY - 16 - (10 + yOffset);
        const h1 = (span * w1) / maxW;
        const h2 = (span * w2) / maxW;
        if (inv) {
          return (
            <g key={`load-${colorIndex}`}>
              <polygon
                points={`${beamStart},${beamY + 6 + h1} ${beamEnd},${beamY + 6 + h2} ${beamEnd},${beamY + 6} ${beamStart},${beamY + 6}`}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={1.5}
              />
              {Array.from({ length: 5 }).map((_, i) => {
                const t = (i + 0.5) / 5;
                const x = beamStart + t * beamLen;
                return (
                  <g key={i}>
                    <line x1={x} y1={beamY + 6 + h1 + t * (h2 - h1)} x2={x} y2={beamY + 6} stroke={color.stroke} strokeWidth={1} />
                    <polygon points={`${x - 2},${beamY + 10} ${x},${beamY + 4} ${x + 2},${beamY + 10}`} fill={color.stroke} />
                  </g>
                );
              })}
            </g>
          );
        }
        return (
          <g key={`load-${colorIndex}`}>
            <polygon
              points={`${beamStart},${beamY - 6 - h1} ${beamEnd},${beamY - 6 - h2} ${beamEnd},${beamY - 6} ${beamStart},${beamY - 6}`}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={1.5}
            />
            {Array.from({ length: 5 }).map((_, i) => {
              const t = (i + 0.5) / 5;
              const x = beamStart + t * beamLen;
              return (
                <g key={i}>
                  <line x1={x} y1={beamY - 6 - h1 - t * (h2 - h1)} x2={x} y2={beamY - 6} stroke={color.stroke} strokeWidth={1} />
                  <polygon points={`${x - 2},${beamY - 10} ${x},${beamY - 4} ${x + 2},${beamY - 10}`} fill={color.stroke} />
                </g>
              );
            })}
          </g>
        );
      }

      case 'parabolic': {
        const parabolicPoints = Array.from({ length: 20 }).map((_, i) => {
          const t = i / 19;
          const x = beamStart + t * beamLen;
          if (inv) {
            const y = beamY + 6 + (1 - 4 * (t - 0.5) ** 2) * 34;
            return `${x},${y}`;
          }
          const y = (10 + yOffset) + (1 - 4 * (t - 0.5) ** 2) * (beamY - 16 - (10 + yOffset));
          return `${x},${y}`;
        }).join(' ');
        if (inv) {
          return (
            <g key={`load-${colorIndex}`}>
              <polygon
                points={`${beamStart},${beamY + 6} ${parabolicPoints} ${beamEnd},${beamY + 6}`}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={1.5}
              />
            </g>
          );
        }
        return (
          <g key={`load-${colorIndex}`}>
            <polygon
              points={`${beamStart},${10 + yOffset} ${parabolicPoints} ${beamEnd},${10 + yOffset} ${beamEnd},${beamY - 6} ${beamStart},${beamY - 6}`}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={1.5}
            />
          </g>
        );
      }

      case 'moment':
      case 'support-settlement':
      case 'thermal-gradient': {
        const momentX = beamStart + (load.position || 0.5) * beamLen;
        const mY = inv ? beamY + 20 : beamY - 20;
        return (
          <g key={`load-${colorIndex}`}>
            <path
              d={inv
                ? `M ${momentX - 10} ${mY} A 10 10 0 1 0 ${momentX + 10} ${mY}`
                : `M ${momentX - 10} ${mY} A 10 10 0 1 1 ${momentX + 10} ${mY}`
              }
              stroke={color.stroke}
              fill="none"
              strokeWidth={2}
            />
            <polygon
              points={inv
                ? `${momentX + 6},${mY + 8} ${momentX + 12},${mY} ${momentX + 14},${mY + 5}`
                : `${momentX + 6},${mY - 10} ${momentX + 12},${mY - 2} ${momentX + 14},${mY - 7}`
              }
              fill={color.stroke}
            />
            <text x={momentX} y={inv ? mY + 18 : mY - 14} textAnchor="middle" fill={color.stroke} className="text-[9px] font-bold">M</text>
          </g>
        );
      }

      case 'moving':
      case 'axle-train': {
        const movingX = beamStart + (load.movingStep || 0.5) * beamLen;
        if (inv) {
          return (
            <g key={`load-${colorIndex}`}>
              <line x1={movingX} y1={beamY + 40} x2={movingX} y2={beamY + 10} stroke={color.stroke} strokeWidth={2} />
              <polygon points={`${movingX - 5},${beamY + 16} ${movingX},${beamY + 8} ${movingX + 5},${beamY + 16}`} fill={color.stroke} />
              <text x={movingX} y={beamY + 48} textAnchor="middle" fill={color.stroke} className="text-[9px] font-bold">P</text>
              <line x1={movingX + 8} y1={beamY + 20} x2={movingX + 25} y2={beamY + 20} stroke={color.stroke} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
              <polygon points={`${movingX + 22},${beamY + 17} ${movingX + 27},${beamY + 20} ${movingX + 22},${beamY + 23}`} fill={color.stroke} opacity={0.6} />
            </g>
          );
        }
        return (
          <g key={`load-${colorIndex}`}>
            <line x1={movingX} y1={topY} x2={movingX} y2={beamY - 10} stroke={color.stroke} strokeWidth={2} />
            <polygon points={`${movingX - 5},${beamY - 16} ${movingX},${beamY - 8} ${movingX + 5},${beamY - 16}`} fill={color.stroke} />
            <text x={movingX} y={topY - 2} textAnchor="middle" fill={color.stroke} className="text-[9px] font-bold">P</text>
            <line x1={movingX + 8} y1={beamY - 20} x2={movingX + 25} y2={beamY - 20} stroke={color.stroke} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
            <polygon points={`${movingX + 22},${beamY - 23} ${movingX + 27},${beamY - 20} ${movingX + 22},${beamY - 17}`} fill={color.stroke} opacity={0.6} />
          </g>
        );
      }

      case 'parametric': {
        const slope = load.slope || 1000;
        const intercept = load.intercept || 2000;
        const maxVal = Math.max(Math.abs(intercept), Math.abs(slope * beamLength + intercept));
        const paramPoints = Array.from({ length: 20 }).map((_, i) => {
          const t = i / 19;
          const x = beamStart + t * beamLen;
          const val = slope * (t * beamLength) + intercept;
          if (inv) {
            const y = beamY + 6 + Math.max(0, val / maxVal) * 34;
            return `${x},${y}`;
          }
          const y = beamY - 6 - Math.max(0, val / maxVal) * (beamY - 16 - topY);
          return `${x},${y}`;
        }).join(' ');
        return (
          <g key={`load-${colorIndex}`}>
            <polygon
              points={inv
                ? `${beamStart},${beamY + 6} ${paramPoints} ${beamEnd},${beamY + 6}`
                : `${beamStart},${beamY - 6} ${paramPoints} ${beamEnd},${beamY - 6}`
              }
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={1.5}
            />
            <text x={beamStart + beamLen / 2} y={inv ? beamY + 48 : topY + 5} textAnchor="middle" fill={color.stroke} className="text-[7px]">f(x)</text>
          </g>
        );
      }

      default:
        return null;
    }
  };

  const renderLegacyLoad = () => {
    if (!loadType) return null;
    const mockConfig: LoadConfig = {
      type: loadType,
      intensity: 5000,
      position: 0.5,
      peakPosition: 0,
      movingStep: 0.4,
      startPosition: 0.25,
      endPosition: 0.75,
      startIntensity: 5000,
      endIntensity: 2500,
    };
    return renderSingleLoad(mockConfig, 0);
  };

  const getLoadLabel = () => {
    if (hybridLoads && hybridLoads.length > 0) {
      if (hybridLoads.length === 1) {
        return getLoadLabelForType(hybridLoads[0].type);
      }
      return `${hybridLoads.length} Combined Load${hybridLoads.length > 1 ? 's' : ''}`;
    }
    if (!loadType) return '';
    return getLoadLabelForType(loadType);
  };

  const getLoadLabelForType = (type: LoadType) => {
    switch (type) {
      case 'udl': return 'Uniform Distributed Load';
      case 'concentrated': return 'Point Load';
      case 'triangular': return 'Triangular Load';
      case 'partial-udl': return 'Partial UDL';
      case 'trapezoidal': return 'Trapezoidal Load';
      case 'parabolic': return 'Parabolic Load';
      case 'moment': return 'Applied Moment';
      case 'moving': return 'Moving Load';
      case 'parametric': return 'Parametric f(x)';
      case 'axle-train': return 'Vehicle Axle Train';
      case 'support-settlement': return 'Support Settlement';
      case 'thermal-gradient': return 'Thermal Gradient';
      case 'prestress': return 'Prestress / PT Equivalent';
      case 'patch': return 'Patch / Wheel Contact';
      case 'torsional': return 'Eccentric / Torsional Load';
      case 'snow-drift': return 'Snow Drift Load';
      case 'hydrostatic': return 'Hydrostatic / Soil Pressure';
      case 'construction-stage': return 'Construction Stage Load';
      case 'harmonic-equivalent': return 'Harmonic Static Equivalent';
    }
  };

  // Check if any loads are inverted
  const hasInvertedLoads = hybridLoads 
    ? hybridLoads.some(l => l.inverted) 
    : false;

  return (
    <div className="flex flex-col items-center">
      <div className="bg-muted/20 rounded-lg p-2 border border-border/50">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Beam */}
          <rect x={beamStart} y={beamY - 4} width={beamLen} height={8} className="fill-primary/50 stroke-primary" strokeWidth={1.5} rx={2} />
          
          {/* Supports */}
          {renderSupports()}
          
          {/* Loads */}
          {hybridLoads && hybridLoads.length > 0
            ? hybridLoads.map((load, index) => renderSingleLoad(load, index))
            : renderLegacyLoad()
          }
          
          {/* Inverted load direction indicator */}
          {hasInvertedLoads && (
            <g>
              <text x={beamStart + beamLen + 5} y={beamY + 12} className="fill-chart-3 text-[8px] font-bold" textAnchor="start">↑</text>
              <text x={beamStart + beamLen + 5} y={beamY + 20} className="fill-chart-3 text-[6px]" textAnchor="start">INV</text>
            </g>
          )}
          
          {/* Length indicator */}
          <line x1={beamStart} y1={beamY + 22} x2={beamEnd} y2={beamY + 22} className="stroke-muted-foreground" strokeWidth={1} />
          <line x1={beamStart} y1={beamY + 18} x2={beamStart} y2={beamY + 26} className="stroke-muted-foreground" strokeWidth={1} />
          <line x1={beamEnd} y1={beamY + 18} x2={beamEnd} y2={beamY + 26} className="stroke-muted-foreground" strokeWidth={1} />
          <text x={beamStart + beamLen / 2} y={beamY + 32} textAnchor="middle" className="fill-foreground text-[9px] font-medium">L</text>
        </svg>
      </div>
      
      {/* Legend for hybrid loads */}
      {hybridLoads && hybridLoads.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-2 justify-center">
          {hybridLoads.map((load, index) => (
            <div key={index} className="flex items-center gap-1 text-[9px]">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: LOAD_COLORS[index % LOAD_COLORS.length].fill, border: `1px solid ${LOAD_COLORS[index % LOAD_COLORS.length].stroke}` }}
              />
              <span className="text-muted-foreground">L{index + 1}{load.inverted ? ' ↑' : ''}</span>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-[10px] text-muted-foreground mt-1">{getLoadLabel()}</p>
    </div>
  );
}
