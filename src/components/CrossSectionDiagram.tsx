import { CrossSectionType } from "@/lib/reliability";

interface CrossSectionDiagramProps {
  type: CrossSectionType;
  // Rectangular
  width?: number;
  height?: number;
  // Circular
  diameter?: number;
  // Hollow rectangular
  innerWidth?: number;
  innerHeight?: number;
  // Hollow circular
  innerDiameter?: number;
  // I-beam
  flangeWidth?: number;
  flangeThickness?: number;
  webThickness?: number;
}

export function CrossSectionDiagram({
  type,
  width = 100,
  height = 200,
  diameter = 150,
  innerWidth = 80,
  innerHeight = 160,
  innerDiameter = 120,
  flangeWidth = 150,
  flangeThickness = 15,
  webThickness = 10,
}: CrossSectionDiagramProps) {
  const svgSize = 180;
  const padding = 20;
  const availableSize = svgSize - 2 * padding;

  // Calculate scale to fit the shape
  const getScale = () => {
    switch (type) {
      case 'rectangular':
      case 'hollow-rectangular':
        return Math.min(availableSize / (width * 1000), availableSize / (height * 1000));
      case 'circular':
      case 'hollow-circular':
        return availableSize / (diameter * 1000);
      case 'i-beam':
        return Math.min(availableSize / (flangeWidth * 1000), availableSize / (height * 1000));
      default:
        return 1;
    }
  };

  const scale = getScale();
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  const renderRectangular = () => {
    const w = width * 1000 * scale;
    const h = height * 1000 * scale;
    return (
      <>
        <rect
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          className="fill-primary/30 stroke-primary"
          strokeWidth={2}
        />
        {/* Dimension annotations */}
        <g className="text-[10px] fill-muted-foreground">
          {/* Width dimension */}
          <line x1={cx - w / 2} y1={cy + h / 2 + 10} x2={cx + w / 2} y2={cy + h / 2 + 10} stroke="currentColor" strokeWidth={1} />
          <line x1={cx - w / 2} y1={cy + h / 2 + 5} x2={cx - w / 2} y2={cy + h / 2 + 15} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + w / 2} y1={cy + h / 2 + 5} x2={cx + w / 2} y2={cy + h / 2 + 15} stroke="currentColor" strokeWidth={1} />
          <text x={cx} y={cy + h / 2 + 25} textAnchor="middle" className="fill-foreground text-[9px] font-medium">b</text>
          
          {/* Height dimension */}
          <line x1={cx + w / 2 + 10} y1={cy - h / 2} x2={cx + w / 2 + 10} y2={cy + h / 2} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + w / 2 + 5} y1={cy - h / 2} x2={cx + w / 2 + 15} y2={cy - h / 2} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + w / 2 + 5} y1={cy + h / 2} x2={cx + w / 2 + 15} y2={cy + h / 2} stroke="currentColor" strokeWidth={1} />
          <text x={cx + w / 2 + 25} y={cy + 3} textAnchor="middle" className="fill-foreground text-[9px] font-medium">h</text>
        </g>
        {/* Neutral axis */}
        <line x1={cx - w / 2 - 5} y1={cy} x2={cx + w / 2 + 5} y2={cy} stroke="hsl(var(--chart-2))" strokeWidth={1} strokeDasharray="4 2" />
        <text x={cx - w / 2 - 10} y={cy + 3} textAnchor="end" className="fill-chart-2 text-[8px]">N.A.</text>
      </>
    );
  };

  const renderCircular = () => {
    const r = (diameter * 1000 * scale) / 2;
    return (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          className="fill-primary/30 stroke-primary"
          strokeWidth={2}
        />
        {/* Diameter dimension */}
        <g className="text-[10px] fill-muted-foreground">
          <line x1={cx - r} y1={cy + r + 15} x2={cx + r} y2={cy + r + 15} stroke="currentColor" strokeWidth={1} />
          <line x1={cx - r} y1={cy + r + 10} x2={cx - r} y2={cy + r + 20} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + r} y1={cy + r + 10} x2={cx + r} y2={cy + r + 20} stroke="currentColor" strokeWidth={1} />
          <text x={cx} y={cy + r + 30} textAnchor="middle" className="fill-foreground text-[9px] font-medium">d</text>
        </g>
        {/* Neutral axis */}
        <line x1={cx - r - 5} y1={cy} x2={cx + r + 5} y2={cy} stroke="hsl(var(--chart-2))" strokeWidth={1} strokeDasharray="4 2" />
        <text x={cx - r - 10} y={cy + 3} textAnchor="end" className="fill-chart-2 text-[8px]">N.A.</text>
      </>
    );
  };

  const renderHollowRectangular = () => {
    const wo = width * 1000 * scale;
    const ho = height * 1000 * scale;
    const wi = innerWidth * 1000 * scale;
    const hi = innerHeight * 1000 * scale;
    return (
      <>
        {/* Outer rectangle */}
        <rect
          x={cx - wo / 2}
          y={cy - ho / 2}
          width={wo}
          height={ho}
          className="fill-primary/30 stroke-primary"
          strokeWidth={2}
        />
        {/* Inner rectangle (cutout) */}
        <rect
          x={cx - wi / 2}
          y={cy - hi / 2}
          width={wi}
          height={hi}
          className="fill-background stroke-primary"
          strokeWidth={1.5}
        />
        {/* Wall thickness indication */}
        <g className="text-[10px] fill-muted-foreground">
          {/* Outer width */}
          <line x1={cx - wo / 2} y1={cy + ho / 2 + 10} x2={cx + wo / 2} y2={cy + ho / 2 + 10} stroke="currentColor" strokeWidth={1} />
          <line x1={cx - wo / 2} y1={cy + ho / 2 + 5} x2={cx - wo / 2} y2={cy + ho / 2 + 15} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + wo / 2} y1={cy + ho / 2 + 5} x2={cx + wo / 2} y2={cy + ho / 2 + 15} stroke="currentColor" strokeWidth={1} />
          <text x={cx} y={cy + ho / 2 + 25} textAnchor="middle" className="fill-foreground text-[9px] font-medium">B</text>
          
          {/* Outer height */}
          <line x1={cx + wo / 2 + 10} y1={cy - ho / 2} x2={cx + wo / 2 + 10} y2={cy + ho / 2} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + wo / 2 + 5} y1={cy - ho / 2} x2={cx + wo / 2 + 15} y2={cy - ho / 2} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + wo / 2 + 5} y1={cy + ho / 2} x2={cx + wo / 2 + 15} y2={cy + ho / 2} stroke="currentColor" strokeWidth={1} />
          <text x={cx + wo / 2 + 25} y={cy + 3} textAnchor="middle" className="fill-foreground text-[9px] font-medium">H</text>
          
          {/* Wall thickness */}
          <text x={cx - wo / 4 - wi / 4} y={cy} textAnchor="middle" className="fill-primary text-[8px] font-medium">t</text>
        </g>
        {/* Neutral axis */}
        <line x1={cx - wo / 2 - 5} y1={cy} x2={cx + wo / 2 + 5} y2={cy} stroke="hsl(var(--chart-2))" strokeWidth={1} strokeDasharray="4 2" />
      </>
    );
  };

  const renderHollowCircular = () => {
    const ro = (diameter * 1000 * scale) / 2;
    const ri = (innerDiameter * 1000 * scale) / 2;
    return (
      <>
        {/* Outer circle */}
        <circle
          cx={cx}
          cy={cy}
          r={ro}
          className="fill-primary/30 stroke-primary"
          strokeWidth={2}
        />
        {/* Inner circle (cutout) */}
        <circle
          cx={cx}
          cy={cy}
          r={ri}
          className="fill-background stroke-primary"
          strokeWidth={1.5}
        />
        {/* Dimensions */}
        <g className="text-[10px] fill-muted-foreground">
          {/* Outer diameter */}
          <line x1={cx - ro} y1={cy + ro + 15} x2={cx + ro} y2={cy + ro + 15} stroke="currentColor" strokeWidth={1} />
          <line x1={cx - ro} y1={cy + ro + 10} x2={cx - ro} y2={cy + ro + 20} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + ro} y1={cy + ro + 10} x2={cx + ro} y2={cy + ro + 20} stroke="currentColor" strokeWidth={1} />
          <text x={cx} y={cy + ro + 30} textAnchor="middle" className="fill-foreground text-[9px] font-medium">D</text>
          
          {/* Inner diameter */}
          <line x1={cx - ri} y1={cy - ro - 15} x2={cx + ri} y2={cy - ro - 15} stroke="currentColor" strokeWidth={1} />
          <line x1={cx - ri} y1={cy - ro - 10} x2={cx - ri} y2={cy - ro - 20} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + ri} y1={cy - ro - 10} x2={cx + ri} y2={cy - ro - 20} stroke="currentColor" strokeWidth={1} />
          <text x={cx} y={cy - ro - 25} textAnchor="middle" className="fill-foreground text-[9px] font-medium">d</text>
          
          {/* Wall thickness */}
          <text x={cx + (ro + ri) / 2} y={cy - 2} textAnchor="middle" className="fill-primary text-[8px] font-medium">t</text>
        </g>
        {/* Neutral axis */}
        <line x1={cx - ro - 5} y1={cy} x2={cx + ro + 5} y2={cy} stroke="hsl(var(--chart-2))" strokeWidth={1} strokeDasharray="4 2" />
      </>
    );
  };

  const renderIBeam = () => {
    const h = height * 1000 * scale;
    const bf = flangeWidth * 1000 * scale;
    const tf = flangeThickness * 1000 * scale;
    const tw = webThickness * 1000 * scale;

    return (
      <>
        {/* Top flange */}
        <rect
          x={cx - bf / 2}
          y={cy - h / 2}
          width={bf}
          height={tf}
          className="fill-primary/30 stroke-primary"
          strokeWidth={2}
        />
        {/* Web */}
        <rect
          x={cx - tw / 2}
          y={cy - h / 2 + tf}
          width={tw}
          height={h - 2 * tf}
          className="fill-primary/30 stroke-primary"
          strokeWidth={2}
        />
        {/* Bottom flange */}
        <rect
          x={cx - bf / 2}
          y={cy + h / 2 - tf}
          width={bf}
          height={tf}
          className="fill-primary/30 stroke-primary"
          strokeWidth={2}
        />
        
        {/* Dimensions */}
        <g className="text-[10px] fill-muted-foreground">
          {/* Flange width */}
          <line x1={cx - bf / 2} y1={cy + h / 2 + 10} x2={cx + bf / 2} y2={cy + h / 2 + 10} stroke="currentColor" strokeWidth={1} />
          <line x1={cx - bf / 2} y1={cy + h / 2 + 5} x2={cx - bf / 2} y2={cy + h / 2 + 15} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + bf / 2} y1={cy + h / 2 + 5} x2={cx + bf / 2} y2={cy + h / 2 + 15} stroke="currentColor" strokeWidth={1} />
          <text x={cx} y={cy + h / 2 + 25} textAnchor="middle" className="fill-foreground text-[9px] font-medium">b<tspan fontSize="6" dy="2">f</tspan></text>
          
          {/* Total height */}
          <line x1={cx + bf / 2 + 10} y1={cy - h / 2} x2={cx + bf / 2 + 10} y2={cy + h / 2} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + bf / 2 + 5} y1={cy - h / 2} x2={cx + bf / 2 + 15} y2={cy - h / 2} stroke="currentColor" strokeWidth={1} />
          <line x1={cx + bf / 2 + 5} y1={cy + h / 2} x2={cx + bf / 2 + 15} y2={cy + h / 2} stroke="currentColor" strokeWidth={1} />
          <text x={cx + bf / 2 + 25} y={cy + 3} textAnchor="middle" className="fill-foreground text-[9px] font-medium">d</text>
          
          {/* Flange thickness */}
          <text x={cx - bf / 4} y={cy - h / 2 + tf / 2 + 3} textAnchor="middle" className="fill-primary text-[7px] font-medium">t<tspan fontSize="5" dy="1">f</tspan></text>
          
          {/* Web thickness */}
          <text x={cx + tw / 2 + 8} y={cy} textAnchor="start" className="fill-primary text-[7px] font-medium">t<tspan fontSize="5" dy="1">w</tspan></text>
        </g>
        
        {/* Neutral axis */}
        <line x1={cx - bf / 2 - 5} y1={cy} x2={cx + bf / 2 + 5} y2={cy} stroke="hsl(var(--chart-2))" strokeWidth={1} strokeDasharray="4 2" />
        <text x={cx - bf / 2 - 10} y={cy + 3} textAnchor="end" className="fill-chart-2 text-[8px]">N.A.</text>
      </>
    );
  };

  const renderShape = () => {
    switch (type) {
      case 'rectangular':
        return renderRectangular();
      case 'circular':
        return renderCircular();
      case 'hollow-rectangular':
        return renderHollowRectangular();
      case 'hollow-circular':
        return renderHollowCircular();
      case 'i-beam':
        return renderIBeam();
      default:
        return null;
    }
  };

  const getShapeTitle = () => {
    switch (type) {
      case 'rectangular': return 'Rectangular Section';
      case 'circular': return 'Circular Section';
      case 'hollow-rectangular': return 'Hollow Rectangular';
      case 'hollow-circular': return 'Hollow Circular (Pipe)';
      case 'i-beam': return 'I-Beam / Wide Flange';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-sm font-medium text-foreground mb-2">{getShapeTitle()}</h4>
      <div className="bg-muted/20 rounded-lg p-2 border border-border/50">
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          {renderShape()}
        </svg>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
        <span className="inline-block w-3 h-px bg-chart-2" style={{ borderTop: '1px dashed' }} />
        <span>Neutral Axis</span>
      </p>
    </div>
  );
}
