/**
 * BeamSchematic — SVG beam visualization with loads and supports.
 */

import type { BeamType, LoadConfig, LoadType } from "@/lib/reliability";
import { Support, LengthUnit, getBeamTypeLabel, getLoadTypeLabel, loadColors } from "./beamTypes";

interface BeamSchematicProps {
  beamType: BeamType;
  loadType: LoadType;
  loadMode?: "single" | "hybrid";
  hybridLoads?: LoadConfig[];
  beamLength: number;
  lengthUnit: LengthUnit;
  convertLengthToDisplay: (v: number) => number;
  concentratedPosition: number;
  movingPosition: number;
  momentPosition: number;
  partialStart: number;
  partialEnd: number;
  trapStartIntensity: number;
  trapEndIntensity: number;
  triangularPeak: 0 | 1;
  forceAngle: number;
  loadIntensity: number;
  supports: Support[];
}

export function BeamSchematic({
  beamType, loadType, loadMode = "single", hybridLoads = [], beamLength, lengthUnit, convertLengthToDisplay,
  concentratedPosition, movingPosition, momentPosition,
  partialStart, partialEnd, trapStartIntensity, trapEndIntensity,
  triangularPeak, forceAngle, loadIntensity, supports,
}: BeamSchematicProps) {
  const isFullDistributed = loadType === "udl" || loadType === "construction-stage" || loadType === "prestress";
  const isPointLike = loadType === "concentrated" || loadType === "torsional" || loadType === "harmonic-equivalent";
  const isMovingLike = loadType === "moving" || loadType === "axle-train";
  const isTriangularLike = loadType === "triangular" || loadType === "snow-drift" || loadType === "hydrostatic";
  const isPartialLike = loadType === "partial-udl" || loadType === "patch";
  const isMomentLike = loadType === "moment" || loadType === "support-settlement" || loadType === "thermal-gradient";
  const hasHybridLoads = loadMode === "hybrid" && hybridLoads.length > 0;
  const beamLeft = 8;
  const beamRight = 92;
  const toPct = (value: number) => Math.max(beamLeft, Math.min(beamRight, beamLeft + value * (beamRight - beamLeft)));
  const activeLabel = hasHybridLoads ? `${hybridLoads.length} combined loads` : getLoadTypeLabel(loadType);

  const renderHybridLoad = (load: LoadConfig, index: number) => {
    const color = loadColors[index % loadColors.length];
    const position = toPct(load.type === "moving" || load.type === "axle-train" ? (load.movingStep ?? 0.5) : (load.position ?? 0.5));
    const start = toPct(load.startPosition ?? 0.25);
    const end = toPct(load.endPosition ?? 0.75);
    const yOffset = index * 5;
    const distributedTypes: LoadType[] = ["udl", "construction-stage", "prestress"];
    const partialTypes: LoadType[] = ["partial-udl", "patch"];
    const triangularTypes: LoadType[] = ["triangular", "snow-drift", "hydrostatic"];

    if (distributedTypes.includes(load.type)) {
      return (
        <g key={`hybrid-${index}`} opacity={0.9}>
          <line x1={`${beamLeft}%`} y1={18 + yOffset} x2={`${beamRight}%`} y2={18 + yOffset} stroke={color} strokeWidth="2" />
          {Array.from({ length: 8 }).map((_, i) => {
            const x = beamLeft + ((i + 0.5) / 8) * (beamRight - beamLeft);
            return <path key={i} d={`M ${x} ${18 + yOffset} V 44 l -3 -5 M ${x} 44 l 3 -5`} stroke={color} strokeWidth="1.6" fill="none" />;
          })}
        </g>
      );
    }
    if (partialTypes.includes(load.type)) {
      return (
        <g key={`hybrid-${index}`} opacity={0.9}>
          <rect x={`${start}%`} y={14 + yOffset} width={`${end - start}%`} height="30" fill={color} opacity="0.12" />
          <line x1={`${start}%`} y1={16 + yOffset} x2={`${end}%`} y2={16 + yOffset} stroke={color} strokeWidth="2" />
          {Array.from({ length: 4 }).map((_, i) => {
            const x = start + ((i + 0.5) / 4) * (end - start);
            return <path key={i} d={`M ${x} ${16 + yOffset} V 44 l -3 -5 M ${x} 44 l 3 -5`} stroke={color} strokeWidth="1.5" fill="none" />;
          })}
        </g>
      );
    }
    if (triangularTypes.includes(load.type)) {
      const points = (load.peakPosition ?? 0) === 0 ? `${beamLeft},12 ${beamRight},44 ${beamLeft},44` : `${beamLeft},44 ${beamRight},12 ${beamRight},44`;
      return <polygon key={`hybrid-${index}`} points={points} fill={color} opacity="0.18" stroke={color} strokeWidth="1.5" />;
    }
    if (load.type === "moment" || load.type === "support-settlement" || load.type === "thermal-gradient") {
      return (
        <g key={`hybrid-${index}`} transform={`translate(${position} 26)`}>
          <path d="M -8 6 A 10 10 0 1 1 8 6" fill="none" stroke={color} strokeWidth="2" />
          <path d="M 7 -1 L 13 6 L 4 8 Z" fill={color} />
        </g>
      );
    }
    return (
      <g key={`hybrid-${index}`} opacity={0.95}>
        <path d={`M ${position} ${12 + yOffset} V 44 l -4 -7 M ${position} 44 l 4 -7`} stroke={color} strokeWidth="2" fill="none" />
        {load.type === "moving" || load.type === "axle-train" ? <path d={`M ${position + 3} ${22 + yOffset} h 14 l -4 -3 M ${position + 17} ${22 + yOffset} l -4 3`} stroke={color} strokeWidth="1.4" fill="none" /> : null}
      </g>
    );
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Beam Schematic</h3>
      <div className="relative h-36 bg-muted/20 rounded-lg overflow-hidden">
        {/* Beam bar */}
        <div className="absolute top-1/2 left-8 right-8 h-4 bg-primary/60 -translate-y-1/2 rounded" />
        {(beamType === "tapered" || beamType === "beam-column" || beamType === "composite" || beamType === "elastic-foundation" || beamType === "spring-supported" || beamType === "gerber") && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {beamType === "tapered" && <polygon points="8,46 92,49 92,56 8,54" fill="hsl(var(--primary))" opacity="0.42" />}
            {beamType === "composite" && <rect x="8" y="40" width="84" height="4" fill="hsl(var(--chart-2))" opacity="0.75" />}
            {beamType === "beam-column" && (
              <>
                <path d="M 4 50 H 8 M 4 50 l 3 -3 M 4 50 l 3 3 M 96 50 H 92 M 96 50 l -3 -3 M 96 50 l -3 3" stroke="hsl(var(--chart-3))" strokeWidth="1.8" fill="none" />
                <text x="50" y="38" textAnchor="middle" fill="hsl(var(--chart-3))" fontSize="5">P-Delta</text>
              </>
            )}
            {beamType === "elastic-foundation" && Array.from({ length: 18 }).map((_, i) => {
              const x = 10 + i * 4.6;
              return <path key={i} d={`M ${x} 58 q 1.5 3 0 6 q -1.5 3 0 6`} stroke="hsl(var(--chart-posterior))" strokeWidth="0.9" fill="none" opacity="0.8" />;
            })}
            {beamType === "spring-supported" && Array.from({ length: 3 }).map((_, i) => {
              const x = [8, 50, 92][i];
              return <path key={i} d={`M ${x} 58 q 2 2 0 4 q -2 2 0 4 q 2 2 0 4`} stroke="hsl(var(--chart-posterior))" strokeWidth="1.2" fill="none" />;
            })}
            {beamType === "gerber" && <circle cx="50" cy="51" r="2.2" fill="hsl(var(--chart-posterior))" stroke="hsl(var(--background))" strokeWidth="1" />}
          </svg>
        )}

        {/* UDL arrows */}
        {!hasHybridLoads && isFullDistributed && (
          <div className="absolute top-4 left-8 right-8 flex justify-between">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-destructive/60" />
                <div className="w-2 h-2 border-l border-b border-destructive/60 -rotate-45 -mt-1" />
              </div>
            ))}
          </div>
        )}

        {/* Concentrated load */}
        {!hasHybridLoads && isPointLike && (
          <div
            className="absolute top-2 flex flex-col items-center"
            style={{ left: `calc(32px + ${concentratedPosition * (100 - 16)}%)` }}
          >
            <svg width="40" height="50" viewBox="0 0 40 50" style={{ transform: `rotate(${forceAngle}deg)` }}>
              <line x1="20" y1="0" x2="20" y2="35" stroke="hsl(var(--destructive))" strokeWidth="2" />
              <polygon points="14,30 20,42 26,30" fill="hsl(var(--destructive))" />
            </svg>
            <span className="text-xs text-destructive font-bold">P</span>
            {forceAngle !== 0 && <span className="text-[10px] text-muted-foreground">{forceAngle}°</span>}
          </div>
        )}

        {/* Triangular */}
        {!hasHybridLoads && isTriangularLike && (
          <svg className="absolute top-2 left-8 right-8 h-12" preserveAspectRatio="none">
            <defs>
              <linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                {triangularPeak === 0 ? (
                  <>
                    <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity="0.1" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity="0.6" />
                  </>
                )}
              </linearGradient>
            </defs>
            <polygon
              points={triangularPeak === 0 ? "0,0 100%,48 0,48" : "0,48 100%,0 100%,48"}
              fill="url(#triGrad)"
            />
            {Array.from({ length: 8 }).map((_, i) => {
              const x = ((i + 1) / 9) * 100;
              const height = triangularPeak === 0 ? (1 - (i + 1) / 9) * 40 : ((i + 1) / 9) * 40;
              return (
                <line key={i} x1={`${x}%`} y1="0" x2={`${x}%`} y2={height}
                  stroke="hsl(0 84% 60%)" strokeWidth="1" opacity="0.6" />
              );
            })}
          </svg>
        )}

        {/* Moving load */}
        {!hasHybridLoads && isMovingLike && (
          <div
            className="absolute top-2 flex flex-col items-center transition-all duration-100"
            style={{ left: `calc(32px + ${movingPosition * (100 - 16)}%)` }}
          >
            <svg width="40" height="50" viewBox="0 0 40 50" style={{ transform: `rotate(${forceAngle}deg)` }}>
              <line x1="20" y1="0" x2="20" y2="35" stroke="hsl(var(--chart-posterior))" strokeWidth="2" />
              <polygon points="14,30 20,42 26,30" fill="hsl(var(--chart-posterior))" />
            </svg>
            <span className="text-xs text-chart-posterior font-bold animate-pulse">P</span>
            {forceAngle !== 0 && <span className="text-[10px] text-muted-foreground">{forceAngle}°</span>}
          </div>
        )}

        {/* Partial UDL */}
        {!hasHybridLoads && isPartialLike && (
          <div className="absolute top-2 left-8 right-8 h-12">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <rect x={`${partialStart * 100}%`} y="0" width={`${(partialEnd - partialStart) * 100}%`} height="40"
                fill="hsl(var(--destructive))" opacity="0.15" />
              <line x1={`${partialStart * 100}%`} y1="4" x2={`${partialEnd * 100}%`} y2="4"
                stroke="hsl(var(--destructive))" strokeWidth="2" opacity="0.8" />
              {Array.from({ length: 6 }).map((_, i) => {
                const x = partialStart + ((i + 0.5) / 6) * (partialEnd - partialStart);
                return (
                  <g key={i}>
                    <line x1={`${x * 100}%`} y1="4" x2={`${x * 100}%`} y2="32"
                      stroke="hsl(var(--destructive))" strokeWidth="1.5" opacity="0.7" />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Trapezoidal */}
        {!hasHybridLoads && loadType === "trapezoidal" && (
          <svg className="absolute top-2 left-8 right-8 h-12" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${48 - (trapStartIntensity / 20000) * 40} 100%,${48 - (trapEndIntensity / 20000) * 40} 100%,48 0,48`}
              fill="url(#trapGrad)"
            />
            <line x1="0" y1={48 - (trapStartIntensity / 20000) * 40} x2="100%" y2={48 - (trapEndIntensity / 20000) * 40}
              stroke="hsl(var(--chart-2))" strokeWidth="2" />
            <text x="2%" y="12" fill="hsl(var(--chart-2))" fontSize="10" fontWeight="bold">w₁</text>
            <text x="92%" y="12" fill="hsl(var(--chart-2))" fontSize="10" fontWeight="bold">w₂</text>
          </svg>
        )}

        {/* Parabolic */}
        {!hasHybridLoads && loadType === "parabolic" && (
          <svg className="absolute top-2 left-8 right-8 h-12" preserveAspectRatio="none">
            <defs>
              <linearGradient id="paraGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity="0.1" />
                <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path d="M 0,48 Q 50%,0 100%,48" fill="url(#paraGrad)" />
            <path d="M 0,48 Q 50%,0 100%,48" fill="none" stroke="hsl(var(--chart-4))" strokeWidth="2" />
            <text x="50%" y="8" fill="hsl(var(--chart-4))" fontSize="10" fontWeight="bold" textAnchor="middle">w₀</text>
          </svg>
        )}

        {/* Applied Moment */}
        {!hasHybridLoads && isMomentLike && (
          <div className="absolute top-0 flex flex-col items-center"
            style={{ left: `calc(32px + ${momentPosition * (100 - 16)}%)`, transform: "translateX(-50%)" }}>
            <svg width="40" height="48" viewBox="0 0 40 48">
              <path d="M 8,24 A 12,12 0 1,1 32,24" fill="none" stroke="hsl(var(--accent))" strokeWidth="2.5" />
              <polygon points="30,18 36,24 28,26" fill="hsl(var(--accent))" />
              <circle cx="20" cy="28" r="2" fill="hsl(var(--accent))" />
            </svg>
            <span className="text-xs text-accent font-bold -mt-1">M</span>
          </div>
        )}

        {hasHybridLoads && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {hybridLoads.map((load, index) => renderHybridLoad(load, index))}
          </svg>
        )}

        {/* Dynamic supports */}
        {supports.map((support, idx) => {
          if (support.type === "fixed") {
            return (
              <div key={idx} className="absolute top-1/2 w-4 h-16 bg-muted-foreground/40 -translate-y-1/2"
                style={{ left: support.position === 0 ? "4px" : support.position === 1 ? "auto" : `calc(${support.position * 100}% - 2px)`, right: support.position === 1 ? "4px" : "auto" }} />
            );
          } else if (support.type === "pin") {
            return (
              <div key={idx} className="absolute bottom-3 flex flex-col items-center"
                style={{ left: `calc(32px + ${support.position * (100 - 16)}%)`, transform: "translateX(-50%)" }}>
                <svg width="20" height="16" viewBox="0 0 20 16">
                  <polygon points="10,0 0,14 20,14" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" />
                  <line x1="0" y1="16" x2="20" y2="16" stroke="hsl(var(--accent))" strokeWidth="2" />
                </svg>
              </div>
            );
          } else if (support.type === "roller") {
            return (
              <div key={idx} className="absolute bottom-3 flex flex-col items-center"
                style={{ left: `calc(32px + ${support.position * (100 - 16)}%)`, transform: "translateX(-50%)" }}>
                <svg width="20" height="18" viewBox="0 0 20 18">
                  <polygon points="10,0 0,10 20,10" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" />
                  <circle cx="5" cy="14" r="3" fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" />
                  <circle cx="15" cy="14" r="3" fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" />
                </svg>
              </div>
            );
          } else if (support.type === "hinge") {
            return (
              <div key={idx} className="absolute bottom-4 flex flex-col items-center"
                style={{ left: `calc(32px + ${support.position * (100 - 16)}%)`, transform: "translateX(-50%)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="6" fill="none" stroke="hsl(var(--chart-posterior))" strokeWidth="2" />
                  <circle cx="8" cy="8" r="2" fill="hsl(var(--chart-posterior))" />
                </svg>
              </div>
            );
          }
          return null;
        })}

        {/* Length label */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          L = {convertLengthToDisplay(beamLength).toFixed(2)} {lengthUnit}
        </div>
        <div className="absolute right-3 bottom-1 text-[10px] text-muted-foreground text-right">
          {getBeamTypeLabel(beamType)} | {activeLabel}
        </div>
      </div>
    </div>
  );
}
