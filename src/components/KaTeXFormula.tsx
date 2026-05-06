import { useRef, useEffect, memo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface KaTeXFormulaProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const KaTeXFormula = memo(({ latex, displayMode = true, className = "" }: KaTeXFormulaProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, {
          displayMode,
          throwOnError: false,
          trust: false,
          strict: false,
        });
      } catch {
        if (ref.current) ref.current.textContent = latex;
      }
    }
  }, [latex, displayMode]);

  return <div ref={ref} className={`katex-container ${className}`} />;
});

KaTeXFormula.displayName = "KaTeXFormula";
