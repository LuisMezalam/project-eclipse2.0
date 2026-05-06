import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SliderWithInput } from "@/components/SliderWithInput";
import { KaTeXFormula } from "@/components/KaTeXFormula";
import { Beaker, Calculator, FlaskConical } from "lucide-react";
import {
  reliabilityIndex,
  probabilityOfFailure,
  reliabilityAnalysis,
  monteCarloReliability,
  sormCorrection,
  estimateCurvature,
  analyzeDynamicResponse,
} from "@/lib/reliability";
import { normalCDF, normalInverseCDF } from "@/lib/probability";

// ── Shared result badge ──
function ResultBadge({ label, value, unit = "" }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-center gap-2 bg-muted/60 rounded-md px-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold text-foreground">{typeof value === "number" ? value.toExponential(4) : value}{unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}</span>
    </div>
  );
}

function ResultRow({ label, value, unit = "" }: { label: string; value: number; unit?: string }) {
  const display = Math.abs(value) < 0.001 || Math.abs(value) > 1e6 ? value.toExponential(4) : value.toFixed(4);
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground">{display}{unit && <span className="text-muted-foreground ml-1">{unit}</span>}</span>
    </div>
  );
}

function ResultsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1">
      <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1"><FlaskConical className="h-3 w-3" /> Live Results</p>
      {children}
    </div>
  );
}

function QuestionsBlock({ questions }: { questions: string[] }) {
  return (
    <div className="pl-4 space-y-2 text-sm border-l-2 border-primary/30 mt-4">
      <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Discussion Questions</p>
      {questions.map((q, i) => <p key={i}>{i + 1}. {q}</p>)}
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 1: Monte Carlo Convergence
// ══════════════════════════════════════════════
function Exp1() {
  const [muR, setMuR] = useState(100);
  const [sigR, setSigR] = useState(15);
  const [muS, setMuS] = useState(70);
  const [sigS, setSigS] = useState(12);
  const [N, setN] = useState(10000);

  const results = useMemo(() => {
    const beta = reliabilityIndex(muR, sigR, muS, sigS);
    const pfAnalytic = probabilityOfFailure(beta);
    const mc = monteCarloReliability(muR, sigR, muS, sigS, N);
    const covEst = mc.pf > 0 ? Math.sqrt((1 - mc.pf) / (N * mc.pf)) : Infinity;
    const ciHalf = mc.pf > 0 ? 1.96 * Math.sqrt(mc.pf * (1 - mc.pf) / N) : 0;
    return { beta, pfAnalytic, pfMC: mc.pf, covEst, ciLow: Math.max(0, mc.pf - ciHalf), ciHigh: mc.pf + ciHalf };
  }, [muR, sigR, muS, sigS, N]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Investigate how sample size N affects Monte Carlo Pf convergence.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="μ_R (Mean Resistance)" value={muR} onChange={setMuR} min={50} max={200} step={1} unit="kN" />
        <SliderWithInput label="σ_R (Std Resistance)" value={sigR} onChange={setSigR} min={1} max={50} step={0.5} unit="kN" />
        <SliderWithInput label="μ_S (Mean Load)" value={muS} onChange={setMuS} min={20} max={150} step={1} unit="kN" />
        <SliderWithInput label="σ_S (Std Load)" value={sigS} onChange={setSigS} min={1} max={40} step={0.5} unit="kN" />
        <SliderWithInput label="N (Sample Size)" value={N} onChange={(v) => setN(Math.round(v))} min={100} max={100000} step={100} />
      </div>
      <ResultsCard>
        <ResultRow label="β (Analytic FORM)" value={results.beta} />
        <ResultRow label="Pf (Analytic)" value={results.pfAnalytic} />
        <ResultRow label="Pf (Monte Carlo)" value={results.pfMC} />
        <ResultRow label="MC CoV of Estimate" value={results.covEst} />
        <ResultRow label="95% CI Lower" value={results.ciLow} />
        <ResultRow label="95% CI Upper" value={results.ciHigh} />
      </ResultsCard>
      <QuestionsBlock questions={[
        "How does the coefficient of variation (CoV) of the Pf estimate scale with sample size N?",
        "What happens to the 95% confidence interval width as N is increased by a factor of 100?",
        "Why is Crude Monte Carlo computationally expensive for target reliabilities of β > 4.0?",
        "How does the initial random seed affect the Pf estimate at N = 10³ compared to N = 10⁶?",
        "In what scenarios would the empirical Pf reach exactly 0.0, and what does that imply about the actual probability?",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 2: FORM vs SORM
// ══════════════════════════════════════════════
function Exp2() {
  const [muR, setMuR] = useState(100);
  const [covR, setCovR] = useState(0.15);
  const [muS, setMuS] = useState(60);
  const [covS, setCovS] = useState(0.20);

  const results = useMemo(() => {
    const rel = reliabilityAnalysis(muR, covR, muS, covS);
    const relError = rel.pfSorm && rel.pf > 0 ? Math.abs(rel.pfSorm - rel.pf) / rel.pf * 100 : 0;
    return { ...rel, relError };
  }, [muR, covR, muS, covS]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Compare FORM and SORM to understand limit state curvature effects.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="μ_R (Mean Resistance)" value={muR} onChange={setMuR} min={50} max={200} step={1} unit="kN" />
        <SliderWithInput label="CoV_R" value={covR} onChange={setCovR} min={0.01} max={0.5} step={0.01} precision={2} />
        <SliderWithInput label="μ_S (Mean Load)" value={muS} onChange={setMuS} min={20} max={150} step={1} unit="kN" />
        <SliderWithInput label="CoV_S" value={covS} onChange={setCovS} min={0.01} max={0.5} step={0.01} precision={2} />
      </div>
      <ResultsCard>
        <ResultRow label="β (FORM)" value={results.beta} />
        <ResultRow label="Pf (FORM)" value={results.pf} />
        <ResultRow label="β (SORM)" value={results.betaSorm ?? results.beta} />
        <ResultRow label="Pf (SORM)" value={results.pfSorm ?? results.pf} />
        <ResultRow label="Curvature Correction" value={results.curvatureCorrection ?? 1} />
        <ResultRow label="Relative Error (%)" value={results.relError} unit="%" />
      </ResultsCard>
      <QuestionsBlock questions={[
        "Under what geometric condition of the limit state surface will FORM and SORM yield identical probabilities of failure?",
        "When analyzing a limit state with negative curvature (convex towards origin), does FORM typically overestimate or underestimate Pf?",
        "Explain the role of principal curvatures (κi) in Breitung's SORM correction formula.",
        "In the Truss Engine, how does yielding of multiple members affect the overall system limit state curvature compared to a single member?",
        "If standard deviation of the load increases dramatically relative to resistance, how does this affect the relative error between FORM and SORM?",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 3: Tail Sensitivity — Normal vs Lognormal
// ══════════════════════════════════════════════
function Exp3() {
  const [mean, setMean] = useState(50);
  const [cov, setCov] = useState(0.20);
  const [threshold, setThreshold] = useState(30);

  const results = useMemo(() => {
    const sigma = mean * cov;
    // Normal Pf: P(X < threshold)
    const pfNormal = normalCDF((threshold - mean) / sigma);
    const betaNormal = -normalInverseCDF(pfNormal);

    // Lognormal parameters
    const sigLn = Math.sqrt(Math.log(1 + cov * cov));
    const muLn = Math.log(mean / Math.sqrt(1 + cov * cov));
    // P(X < threshold) for Lognormal
    const pfLogn = threshold > 0 ? normalCDF((Math.log(threshold) - muLn) / sigLn) : 0;
    const betaLogn = pfLogn > 0 ? -normalInverseCDF(pfLogn) : Infinity;

    // Probability of negative values under Normal
    const pNegNormal = normalCDF(-mean / sigma);

    return { pfNormal, betaNormal, pfLogn, betaLogn, muLn, sigLn, pNegNormal };
  }, [mean, cov, threshold]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Observe how distribution selection governs structural reliability, especially in the tails.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="Mean (μ)" value={mean} onChange={setMean} min={10} max={200} step={1} />
        <SliderWithInput label="CoV" value={cov} onChange={setCov} min={0.05} max={0.60} step={0.01} precision={2} />
        <SliderWithInput label="Threshold (failure if X < this)" value={threshold} onChange={setThreshold} min={1} max={100} step={1} />
      </div>
      <ResultsCard>
        <ResultRow label="Pf (Normal)" value={results.pfNormal} />
        <ResultRow label="β (Normal)" value={results.betaNormal} />
        <ResultRow label="Pf (Lognormal)" value={results.pfLogn} />
        <ResultRow label="β (Lognormal)" value={results.betaLogn} />
        <ResultRow label="μ_ln" value={results.muLn} />
        <ResultRow label="σ_ln" value={results.sigLn} />
        <ResultRow label="P(X < 0) Normal" value={results.pNegNormal} />
      </ResultsCard>
      <QuestionsBlock questions={[
        "Compare the Pf of a Normal-Normal R-S model to a Lognormal-Lognormal model with identical means and variances. Which generally yields a higher Pf and why?",
        "How does the strictly positive domain of the Lognormal distribution prevent unphysical resistance values compared to the Normal distribution?",
        "What is the equivalent log-space mean (μ_ln) for a variable with mean 50 and CoV 0.2?",
        "When extreme loads govern (e.g., wind/seismic), why are Gumbel or Weibull distributions preferred over Normal distributions in the upper tail?",
        "How does increasing the skewness of the load distribution affect the reliability index β?",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 4: Correlation Effects
// ══════════════════════════════════════════════
function Exp4() {
  const [muR, setMuR] = useState(100);
  const [sigR, setSigR] = useState(15);
  const [muS, setMuS] = useState(70);
  const [sigS, setSigS] = useState(12);
  const [rho, setRho] = useState(0.0);

  const results = useMemo(() => {
    const varG = sigR * sigR + sigS * sigS - 2 * rho * sigR * sigS;
    const sigG = Math.sqrt(Math.max(varG, 1e-12));
    const meanG = muR - muS;
    const beta = meanG / sigG;
    const pf = probabilityOfFailure(beta);
    const betaUncorr = reliabilityIndex(muR, sigR, muS, sigS);
    const pfUncorr = probabilityOfFailure(betaUncorr);
    return { beta, pf, sigG, betaUncorr, pfUncorr, varG };
  }, [muR, sigR, muS, sigS, rho]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Quantify the effect of correlation between R and S on system safety.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="μ_R" value={muR} onChange={setMuR} min={50} max={200} step={1} unit="kN" />
        <SliderWithInput label="σ_R" value={sigR} onChange={setSigR} min={1} max={50} step={0.5} unit="kN" />
        <SliderWithInput label="μ_S" value={muS} onChange={setMuS} min={20} max={150} step={1} unit="kN" />
        <SliderWithInput label="σ_S" value={sigS} onChange={setSigS} min={1} max={40} step={0.5} unit="kN" />
        <SliderWithInput label="Correlation (ρ)" value={rho} onChange={setRho} min={-0.99} max={0.99} step={0.01} precision={2} />
      </div>
      <ResultsCard>
        <ResultRow label="β (with ρ)" value={results.beta} />
        <ResultRow label="Pf (with ρ)" value={results.pf} />
        <ResultRow label="β (uncorrelated)" value={results.betaUncorr} />
        <ResultRow label="Pf (uncorrelated)" value={results.pfUncorr} />
        <ResultRow label="σ_g (with ρ)" value={results.sigG} unit="kN" />
        <ResultRow label="Var(g) (with ρ)" value={results.varG} unit="kN²" />
      </ResultsCard>
      <QuestionsBlock questions={[
        "If structural resistance R and applied load S are positively correlated (ρ > 0), does the overall reliability increase or decrease? Why?",
        "In a parallel truss system, how does high positive correlation between member capacities affect the overall system ductility/redundancy?",
        "Explain mathematically how correlation (ρ) modifies the combined variance (σ_g²) in a linear limit state.",
        "When variables are correlated, what mathematical transformation is required before applying FORM? (Hint: Nataf or Rosenblatt)",
        "Can you find a configuration where adding negative correlation between two loads (e.g., Dead and Wind) actually increases the probability of failure?",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 5: Point vs Uniform Beam Load
// ══════════════════════════════════════════════
function Exp5() {
  const [L, setL] = useState(6);
  const [W, setW] = useState(20); // total load kN
  const [covW, setCovW] = useState(0.15);
  const [muR, setMuR] = useState(30); // resistance kN·m
  const [covR, setCovR] = useState(0.10);

  const results = useMemo(() => {
    // Uniform load: M = wL²/8 where w = W/L
    const M_uniform = W * L / 8;
    const sigW = W * covW;
    const varM_uniform = Math.pow(L / 8, 2) * sigW * sigW;
    const sigM_uniform = Math.sqrt(varM_uniform);

    // Point load at center: M = PL/4 where P = W
    const M_point = W * L / 4;
    const varM_point = Math.pow(L / 4, 2) * sigW * sigW;
    const sigM_point = Math.sqrt(varM_point);

    const sigR_abs = muR * covR;

    // β for uniform
    const betaU = (muR - M_uniform) / Math.sqrt(sigR_abs * sigR_abs + varM_uniform);
    const pfU = probabilityOfFailure(betaU);

    // β for point
    const betaP = (muR - M_point) / Math.sqrt(sigR_abs * sigR_abs + varM_point);
    const pfP = probabilityOfFailure(betaP);

    return { M_uniform, sigM_uniform, M_point, sigM_point, betaU, pfU, betaP, pfP };
  }, [L, W, covW, muR, covR]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Compare reliability for uniform vs point loads on a simply supported beam.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="Beam Length (L)" value={L} onChange={setL} min={2} max={15} step={0.5} unit="m" />
        <SliderWithInput label="Total Load (W)" value={W} onChange={setW} min={5} max={100} step={1} unit="kN" />
        <SliderWithInput label="Load CoV" value={covW} onChange={setCovW} min={0.05} max={0.40} step={0.01} precision={2} />
        <SliderWithInput label="Resistance (μ_R)" value={muR} onChange={setMuR} min={5} max={200} step={1} unit="kN·m" />
        <SliderWithInput label="Resistance CoV" value={covR} onChange={setCovR} min={0.02} max={0.30} step={0.01} precision={2} />
      </div>
      <ResultsCard>
        <Separator className="my-1" />
        <p className="text-xs font-semibold text-muted-foreground">Uniform Load (wL²/8)</p>
        <ResultRow label="E[M_max]" value={results.M_uniform} unit="kN·m" />
        <ResultRow label="σ(M_max)" value={results.sigM_uniform} unit="kN·m" />
        <ResultRow label="β" value={results.betaU} />
        <ResultRow label="Pf" value={results.pfU} />
        <Separator className="my-1" />
        <p className="text-xs font-semibold text-muted-foreground">Point Load (PL/4)</p>
        <ResultRow label="E[M_max]" value={results.M_point} unit="kN·m" />
        <ResultRow label="σ(M_max)" value={results.sigM_point} unit="kN·m" />
        <ResultRow label="β" value={results.betaP} />
        <ResultRow label="Pf" value={results.pfP} />
      </ResultsCard>
      <QuestionsBlock questions={[
        "Using Moment Calculus, how does the expected maximum bending moment compare between a uniform load w and a center point load P if total load W = P?",
        "How does the variance of the maximum moment differ between the two load cases?",
        "If the load position of a point load becomes a random variable, how does this spatial uncertainty affect the reliability of the beam?",
        "Which configuration is more sensitive to a 10% increase in load CoV: the uniformly loaded beam or the point-loaded beam?",
        "Describe the failure envelopes (shear vs moment) for these two cases and how they constrain the design.",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 6: Dynamic Response & Resonance
// ══════════════════════════════════════════════
function Exp6() {
  const [mass, setMass] = useState(1000);
  const [stiffness, setStiffness] = useState(100000);
  const [damping, setDamping] = useState(500);
  const [F0, setF0] = useState(5000);
  const [omega, setOmega] = useState(8);
  const [uMax, setUMax] = useState(0.05);
  const [dispCov, setDispCov] = useState(0.15);

  const results = useMemo(() => {
    const resp = analyzeDynamicResponse(mass, stiffness, damping, F0, omega);
    const wn = resp.naturalFrequency;
    const zeta = resp.dampingRatio;
    const r = omega / wn;
    const staticDisp = F0 / stiffness;
    const phase = Math.atan2(2 * zeta * r, 1 - r * r) * (180 / Math.PI);
    // Reliability
    const muD = resp.maxDisplacement;
    const sigD = muD * dispCov;
    const sigU = uMax * 0.1; // 10% CoV on allowable
    const beta = (uMax - muD) / Math.sqrt(sigD * sigD + sigU * sigU);
    const pf = probabilityOfFailure(beta);
    return { ...resp, r, staticDisp, phase, beta, pf };
  }, [mass, stiffness, damping, F0, omega, uMax, dispCov]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Analyze SDOF dynamic response, resonance, and reliability.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="Mass (m)" value={mass} onChange={setMass} min={100} max={5000} step={50} unit="kg" />
        <SliderWithInput label="Stiffness (k)" value={stiffness} onChange={setStiffness} min={10000} max={500000} step={1000} unit="N/m" />
        <SliderWithInput label="Damping (c)" value={damping} onChange={setDamping} min={10} max={5000} step={10} unit="N·s/m" />
        <SliderWithInput label="Force Amplitude (F₀)" value={F0} onChange={setF0} min={100} max={20000} step={100} unit="N" />
        <SliderWithInput label="Forcing Frequency (ω)" value={omega} onChange={setOmega} min={0.5} max={30} step={0.1} precision={1} unit="rad/s" />
        <SliderWithInput label="Max Allowable Disp" value={uMax} onChange={setUMax} min={0.005} max={0.2} step={0.005} precision={3} unit="m" />
        <SliderWithInput label="Displacement CoV" value={dispCov} onChange={setDispCov} min={0.05} max={0.40} step={0.01} precision={2} />
      </div>
      <ResultsCard>
        <ResultRow label="ωₙ (Natural Freq)" value={results.naturalFrequency} unit="rad/s" />
        <ResultRow label="ζ (Damping Ratio)" value={results.dampingRatio} />
        <ResultRow label="r (Freq Ratio)" value={results.r} />
        <ResultRow label="DAF" value={results.dynamicAmplificationFactor} />
        <ResultRow label="Static Disp" value={results.staticDisp} unit="m" />
        <ResultRow label="Max Dynamic Disp" value={results.maxDisplacement} unit="m" />
        <ResultRow label="Phase Angle" value={results.phase} unit="°" />
        <ResultRow label="β (Reliability)" value={results.beta} />
        <ResultRow label="Pf" value={results.pf} />
      </ResultsCard>
      <QuestionsBlock questions={[
        "How does the dynamic amplification factor (DAF) change as the forcing frequency approaches the natural frequency?",
        "What is the role of the damping ratio (ζ) in determining the peak displacement at resonance?",
        "When computing reliability against a maximum allowable displacement, why does uncertainty in stiffness (k) have a non-linear effect on Pf?",
        "How does the phase angle lag shift as the system transitions from stiffness-controlled to mass-controlled regimes?",
        "Compare the sensitivity of the reliability index β to a 5% error in mass vs a 5% error in damping near resonance.",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 7: First-Passage Failure
// ══════════════════════════════════════════════
function Exp7() {
  const [rmsResp, setRmsResp] = useState(0.012);
  const [threshold, setThreshold] = useState(0.05);
  const [zeroCrossRate, setZeroCrossRate] = useState(2.0);
  const [duration, setDuration] = useState(3600);

  const results = useMemo(() => {
    const eta = threshold / rmsResp;
    const nuPlus = zeroCrossRate;
    // Poisson first-passage: Pf = 1 - exp(-nuPlus * T * exp(-eta²/2))
    const exponent = -nuPlus * duration * Math.exp(-eta * eta / 2);
    const pf = 1 - Math.exp(exponent);
    const beta = pf > 0 && pf < 1 ? -normalInverseCDF(pf) : (pf <= 0 ? Infinity : -Infinity);
    const expectedMax = rmsResp * Math.sqrt(2 * Math.log(nuPlus * duration));
    return { eta, pf, beta, expectedMax, exponent };
  }, [rmsResp, threshold, zeroCrossRate, duration]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Estimate failure probabilities for stochastic dynamic processes via Poisson first-passage.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="RMS Response (σ)" value={rmsResp} onChange={setRmsResp} min={0.001} max={0.1} step={0.001} precision={3} unit="m" />
        <SliderWithInput label="Threshold" value={threshold} onChange={setThreshold} min={0.01} max={0.2} step={0.005} precision={3} unit="m" />
        <SliderWithInput label="Zero-Crossing Rate (ν₊)" value={zeroCrossRate} onChange={setZeroCrossRate} min={0.1} max={20} step={0.1} precision={1} unit="Hz" />
        <SliderWithInput label="Duration (T)" value={duration} onChange={setDuration} min={60} max={36000} step={60} unit="s" />
      </div>
      <ResultsCard>
        <ResultRow label="η (threshold/σ)" value={results.eta} />
        <ResultRow label="Expected Max Peak" value={results.expectedMax} unit="m" />
        <ResultRow label="Pf (First-Passage)" value={results.pf} />
        <ResultRow label="β" value={results.beta} />
      </ResultsCard>
      <QuestionsBlock questions={[
        "Define the relationship between the Power Spectral Density (PSD) input and the RMS response of the structure.",
        "How does the apparent frequency (zero-crossing rate) influence the expected maximum peak over a duration T?",
        "What assumption does the standard First-Passage (Poisson) reliability model make about peak clustering?",
        "How does doubling the duration of the random excitation (T) impact the reliability index β?",
        "In what ways do higher-order moments (skewness, kurtosis) of the response indicate non-Gaussian behavior?",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 8: System Redundancy
// ══════════════════════════════════════════════
function Exp8() {
  const [nMembers, setNMembers] = useState(5);
  const [pfMember, setPfMember] = useState(0.001);
  const [rhoSys, setRhoSys] = useState(0.3);

  const results = useMemo(() => {
    // Series system: Pf_sys ≈ 1 - ∏(1 - Pfi)
    const pfSeries = 1 - Math.pow(1 - pfMember, nMembers);
    // Upper bound (independent)
    const pfUpperBound = nMembers * pfMember;
    // Parallel system (all must fail): Pf_parallel = pfMember^n (independent)
    const pfParallel = Math.pow(pfMember, nMembers);
    // Correlated series bound (Ditlevsen): approximate
    const betaM = -normalInverseCDF(pfMember);
    // With correlation, effective β decreases for series
    const betaSysSeries = betaM - Math.sqrt(rhoSys) * 0.5 * Math.log(nMembers);
    const pfSeriesCorr = normalCDF(-betaSysSeries);
    // Redundancy factor
    const redundancy = pfSeries > 0 ? pfParallel / pfSeries : 0;
    return { pfSeries, pfUpperBound, pfParallel, pfSeriesCorr, betaM, betaSysSeries, redundancy };
  }, [nMembers, pfMember, rhoSys]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Compare member-level vs system-level reliability for series and parallel structural systems.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="Number of Members" value={nMembers} onChange={(v) => setNMembers(Math.round(v))} min={2} max={20} step={1} />
        <SliderWithInput label="Member Pf" value={pfMember} onChange={setPfMember} min={0.0001} max={0.05} step={0.0001} precision={4} />
        <SliderWithInput label="Capacity Correlation (ρ)" value={rhoSys} onChange={setRhoSys} min={0} max={0.99} step={0.01} precision={2} />
      </div>
      <ResultsCard>
        <ResultRow label="β (single member)" value={results.betaM} />
        <ResultRow label="Pf (Series, independent)" value={results.pfSeries} />
        <ResultRow label="Pf (Series, correlated)" value={results.pfSeriesCorr} />
        <ResultRow label="β (Series, correlated)" value={results.betaSysSeries} />
        <ResultRow label="Pf (Parallel, independent)" value={results.pfParallel} />
        <ResultRow label="Redundancy Ratio" value={results.redundancy} />
      </ResultsCard>
      <QuestionsBlock questions={[
        "In a statically determinate truss, if one member fails, what is the system probability of failure?",
        "In an indeterminate (redundant) truss, how does load redistribution after initial member yielding affect the ultimate Pf?",
        "How can Subset Simulation be applied effectively to model sequential failure paths (cut-sets)?",
        "Define the concept of a 'brittle' vs 'ductile' system failure mechanism in terms of their conditional probabilities.",
        "How does increasing the correlation among member yield strengths reduce the overall benefit of redundancy?",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 9: Importance Sampling vs Subset Simulation
// ══════════════════════════════════════════════
function Exp9() {
  const [targetBeta, setTargetBeta] = useState(4.0);
  const [N_mc, setN_mc] = useState(10000);
  const [p0, setP0] = useState(0.1);

  const results = useMemo(() => {
    const pfTarget = normalCDF(-targetBeta);
    // Crude MC: requires N ≈ 10 / Pf for CoV ≈ 30%
    const N_crude_req = Math.ceil(10 / pfTarget);
    const covCrudeMC = N_mc > 0 && pfTarget > 0 ? Math.sqrt((1 - pfTarget) / (N_mc * pfTarget)) : Infinity;
    // Importance Sampling: efficiency gain ≈ N_crude / N_IS
    const N_is_req = Math.ceil(100 * targetBeta); // rough approximation
    const efficiencyIS = N_crude_req / Math.max(N_is_req, 1);
    // Subset Simulation: levels = ceil(log(Pf) / log(p0))
    const nLevels = Math.ceil(Math.log(pfTarget) / Math.log(p0));
    const N_ss_total = nLevels * Math.ceil(N_mc * p0);
    const efficiencySS = N_crude_req / Math.max(N_ss_total, 1);
    return { pfTarget, N_crude_req, covCrudeMC, N_is_req, efficiencyIS, nLevels, N_ss_total, efficiencySS };
  }, [targetBeta, N_mc, p0]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Compare variance reduction techniques for rare event estimation.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="Target β" value={targetBeta} onChange={setTargetBeta} min={2} max={6} step={0.1} precision={1} />
        <SliderWithInput label="Available N (budget)" value={N_mc} onChange={(v) => setN_mc(Math.round(v))} min={100} max={100000} step={100} />
        <SliderWithInput label="p₀ (Subset conditional)" value={p0} onChange={setP0} min={0.05} max={0.3} step={0.01} precision={2} />
      </div>
      <ResultsCard>
        <ResultRow label="Target Pf" value={results.pfTarget} />
        <ResultRow label="N required (Crude MC)" value={results.N_crude_req} />
        <ResultRow label="CoV (Crude MC at N)" value={results.covCrudeMC} />
        <ResultRow label="N required (IS, approx)" value={results.N_is_req} />
        <ResultRow label="Efficiency Gain (IS)" value={results.efficiencyIS} unit="×" />
        <ResultRow label="Subset Levels" value={results.nLevels} />
        <ResultRow label="N total (Subset Sim)" value={results.N_ss_total} />
        <ResultRow label="Efficiency Gain (SS)" value={results.efficiencySS} unit="×" />
      </ResultsCard>
      <QuestionsBlock questions={[
        "Explain how Importance Sampling shifts the sampling distribution to artificially inflate the failure rate.",
        "What happens to the Importance Sampling efficiency if the proposal distribution is centered far from the true design point?",
        "Describe the Markov Chain Monte Carlo (MCMC) mechanism used to populate intermediate threshold levels in Subset Simulation.",
        "For a target Pf = 10⁻⁶, compare the theoretical number of samples required by Crude MC vs Subset Simulation (assuming p₀ = 0.1).",
        "Which method handles highly non-linear or multiple-design-point limit states better, and why?",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Experiment 10: RBDO
// ══════════════════════════════════════════════
function Exp10() {
  const [area, setArea] = useState(50); // cm²
  const [muLoad, setMuLoad] = useState(200); // kN
  const [covLoad, setCovLoad] = useState(0.15);
  const [fy, setFy] = useState(250); // MPa
  const [covFy, setCovFy] = useState(0.10);
  const [betaTarget, setBetaTarget] = useState(3.0);
  const [rho, setRho] = useState(1000); // penalty

  const results = useMemo(() => {
    // Resistance = fy * A (in kN: fy MPa * A cm² * 1e-1)
    const muR = fy * area * 1e-1; // kN
    const sigR = muR * covFy;
    const sigS = muLoad * covLoad;
    const beta = reliabilityIndex(muR, sigR, muLoad, sigS);
    const pf = probabilityOfFailure(beta);

    // Weight proxy (proportional to area)
    const weight = area; // arbitrary units

    // Penalty
    const violation = Math.max(0, betaTarget - beta);
    const penalty = rho * violation * violation;
    const lagrangian = weight + penalty;

    // Required area for target beta (closed-form for linear g)
    // β_target = (fy*A*0.1 - μS) / sqrt((fy*A*0.1*covFy)² + (μS*covLoad)²)
    // Solving: let x = fy*0.1*A
    // β² * (x²*covFy² + σS²) = (x - μS)²
    // Quadratic in x
    const c1 = 1 - beta * beta * covFy * covFy; // will use betaTarget
    const bt2 = betaTarget * betaTarget;
    const a_coeff = 1 - bt2 * covFy * covFy;
    const b_coeff = -2 * muLoad;
    const c_coeff = muLoad * muLoad - bt2 * sigS * sigS;
    const disc = b_coeff * b_coeff - 4 * a_coeff * c_coeff;
    let areaOpt = area;
    if (disc >= 0 && a_coeff !== 0) {
      const xOpt = (-b_coeff + Math.sqrt(disc)) / (2 * a_coeff);
      areaOpt = xOpt / (fy * 0.1);
    }

    // Deterministic design: safety factor approach (SF = 1.5 typical)
    const sfArea = (muLoad * 1.5) / (fy * 0.1);
    const betaDet = reliabilityIndex(fy * sfArea * 0.1, fy * sfArea * 0.1 * covFy, muLoad, sigS);

    return { muR, beta, pf, weight, lagrangian, penalty, areaOpt: Math.max(0, areaOpt), sfArea, betaDet };
  }, [area, muLoad, covLoad, fy, covFy, betaTarget, rho]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><strong>Objective:</strong> Optimize cross-sectional area to minimize weight while meeting a target β.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderWithInput label="Cross-Section Area (A)" value={area} onChange={setArea} min={10} max={200} step={1} unit="cm²" />
        <SliderWithInput label="μ_Load" value={muLoad} onChange={setMuLoad} min={50} max={500} step={5} unit="kN" />
        <SliderWithInput label="Load CoV" value={covLoad} onChange={setCovLoad} min={0.05} max={0.40} step={0.01} precision={2} />
        <SliderWithInput label="Yield Strength (fy)" value={fy} onChange={setFy} min={200} max={500} step={5} unit="MPa" />
        <SliderWithInput label="fy CoV" value={covFy} onChange={setCovFy} min={0.02} max={0.20} step={0.01} precision={2} />
        <SliderWithInput label="β Target" value={betaTarget} onChange={setBetaTarget} min={2.0} max={5.0} step={0.1} precision={1} />
        <SliderWithInput label="Penalty (ρ)" value={rho} onChange={setRho} min={10} max={10000} step={10} />
      </div>
      <ResultsCard>
        <ResultRow label="μ_R (Capacity)" value={results.muR} unit="kN" />
        <ResultRow label="β (Current)" value={results.beta} />
        <ResultRow label="Pf (Current)" value={results.pf} />
        <ResultRow label="Weight (Area)" value={results.weight} unit="cm²" />
        <ResultRow label="Penalty" value={results.penalty} />
        <ResultRow label="Lagrangian L(d)" value={results.lagrangian} />
        <Separator className="my-1" />
        <ResultRow label="Optimal Area (RBDO)" value={results.areaOpt} unit="cm²" />
        <ResultRow label="Deterministic Area (SF=1.5)" value={results.sfArea} unit="cm²" />
        <ResultRow label="β at Deterministic Design" value={results.betaDet} />
      </ResultsCard>
      <QuestionsBlock questions={[
        "In the RBDO formulation, what is the role of the penalty parameter (ρ) in the Lagrangian function?",
        "How does the optimization algorithm calculate the gradient of β with respect to member cross-sectional areas?",
        "If the CoV of the primary load increases, how must the optimal cross-sectional areas adjust to maintain the same target β?",
        "Contrast a deterministic optimization (using safety factors) with an RBDO approach in terms of material efficiency and actual safety.",
        "What are the computational challenges of nesting a FORM analysis inside an iterative optimization loop, and how might decoupling methods resolve them?",
      ]} />
    </div>
  );
}

// ══════════════════════════════════════════════
// Main export
// ══════════════════════════════════════════════
const experiments = [
  { id: "exp1", title: "1. Monte Carlo Convergence & Confidence Bounds", Component: Exp1 },
  { id: "exp2", title: "2. FORM vs SORM: Influence of Non-Linear Limit States", Component: Exp2 },
  { id: "exp3", title: "3. Tail Sensitivity: Normal vs Lognormal Distributions", Component: Exp3 },
  { id: "exp4", title: "4. Correlation Effects in Structural Systems", Component: Exp4 },
  { id: "exp5", title: "5. Load Configuration: Point vs Uniform on Beams", Component: Exp5 },
  { id: "exp6", title: "6. Dynamic Response Spectrum and Resonance", Component: Exp6 },
  { id: "exp7", title: "7. First-Passage Failure under Random Excitation", Component: Exp7 },
  { id: "exp8", title: "8. System Redundancy and Progressive Collapse", Component: Exp8 },
  { id: "exp9", title: "9. Importance Sampling vs Subset Simulation", Component: Exp9 },
  { id: "exp10", title: "10. Reliability-Based Design Optimization (RBDO)", Component: Exp10 },
];

export function LabExperiments({ showAnswerKey }: { showAnswerKey: boolean }) {
  return (
    <div className="space-y-4">
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            Virtual Lab Experiments
          </CardTitle>
          <CardDescription>
            Adjust parameters with the sliders and observe real-time changes. Type <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">?</kbd> outside of inputs to toggle the answer key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {experiments.map(({ id, title, Component }) => (
              <AccordionItem key={id} value={id}>
                <AccordionTrigger className="text-sm font-medium">{title}</AccordionTrigger>
                <AccordionContent>
                  <Component />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {showAnswerKey && (
        <Card className="glass-card border-accent/30 bg-accent/5 mt-6 animate-in fade-in slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-accent-foreground flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Answer Key: Expected Outcomes
            </CardTitle>
            <CardDescription>
              Instructor reference for the 10 virtual lab experiments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {answerKeys.map(({ id, title, answers }) => (
                <AccordionItem key={id} value={id}>
                  <AccordionTrigger className="text-sm font-medium">{title}</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2 text-muted-foreground">
                    {answers.map((a, i) => <p key={i}>{i + 1}. {a}</p>)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const answerKeys = [
  { id: "ak1", title: "1. Monte Carlo Convergence", answers: [
    "CoV scales inversely with the square root of N: CoV ∝ 1/√N.",
    "Increasing N by 100x reduces the CI width by a factor of 10.",
    "β = 4 implies Pf ≈ 3e-5. To get a stable estimate, millions of samples are required, creating a computational bottleneck.",
    "At low N, different seeds yield wildly different Pf values (high variance). At N=1e6, seed choice produces negligible differences.",
    "If no samples fall in the failure domain, Pf=0.0 empirically, but it only implies the true Pf is likely < 1/N. It does not mean failure is impossible."
  ]},
  { id: "ak2", title: "2. FORM vs SORM", answers: [
    "They are identical when the limit state surface is perfectly linear (a hyperplane) in standard normal space.",
    "Negative curvature (convex) means FORM overestimates Pf, as it includes safe regions as failure regions.",
    "The principal curvatures adjust the FORM hyperplane to fit a paraboloid, correcting the integration volume over the failure domain.",
    "Multiple yielding members create sharp corners or highly non-linear boundaries in the limit state, making SORM corrections much more significant.",
    "High load standard deviation pushes the design point further out, amplifying non-linearities and increasing the relative error of FORM."
  ]},
  { id: "ak3", title: "3. Tail Sensitivity", answers: [
    "Normal-Normal generally yields higher Pf because the Normal resistance has a thicker lower tail that can go negative, unlike Lognormal.",
    "Lognormal bounds values at strictly > 0, physically matching variables like yield strength or stiffness that cannot be negative.",
    "Use formulas: σ_ln² = ln(1 + 0.2²) ≈ 0.039. μ_ln = ln(50) - 0.039/2 ≈ 3.89.",
    "Wind/seismic loads are extreme value phenomena. EV distributions model the thick right tail of maximums better than the symmetric Normal bell curve.",
    "Higher load skewness thickens the upper tail of the load, pushing demand higher and significantly decreasing β."
  ]},
  { id: "ak4", title: "4. Correlation Effects", answers: [
    "Positive R-S correlation increases reliability. If load is high, resistance is also likely high, shrinking the variance of the safety margin (R-S).",
    "High positive capacity correlation reduces redundancy; if one member is weak, they all are, leading to brittle system failure.",
    "σ_g² = σ_R² + σ_S² - 2ρ(σ_R)(σ_S). Positive ρ reduces the total variance.",
    "Nataf or Rosenblatt transformations are required to map correlated non-normal variables into independent standard normal space.",
    "Yes. If S = D + W (Dead + Wind), negative correlation means a low dead load occurs with high wind load, reducing stabilizing gravity effects and increasing uplift failure probability."
  ]},
  { id: "ak5", title: "5. Load Configuration", answers: [
    "Uniform M_max = WL/8. Point load M_max = WL/4. The point load produces exactly double the expected maximum moment.",
    "Variance for point load is (L/4)² × Var(W). Variance for uniform is (L/8)² × Var(W). Point load variance is 4x higher.",
    "Spatial uncertainty introduces non-linear variance. The moment becomes a product of random variables, increasing the overall CoV of the demand.",
    "The point-loaded beam is more sensitive due to the larger scalar multiplier (L/4 vs L/8) acting on the load variance.",
    "Point load envelope is linear/triangular; uniform is parabolic. Uniform loads distribute shear linearly; point loads create constant shear blocks."
  ]},
  { id: "ak6", title: "6. Dynamic Response", answers: [
    "DAF spikes sharply to a maximum peak (limited only by damping) when ratio r = 1.",
    "At resonance, response is purely damping-controlled. Peak displacement is proportional to 1/(2ζ).",
    "Changing stiffness alters both the static displacement (P/k) and shifts the natural frequency, changing the resonance condition entirely (non-linear).",
    "Phase lag shifts from 0° (static/stiffness) to 90° (resonance/damping) to 180° (mass-controlled high frequency).",
    "Near resonance, damping controls completely. A 5% error in damping drastically alters Pf, whereas mass errors simply shift the tuning slightly."
  ]},
  { id: "ak7", title: "7. Random Excitation", answers: [
    "The RMS response (σ) is the square root of the integral of the PSD over all frequencies.",
    "Higher frequency means more oscillations per second, increasing the statistical chance of a peak exceeding the threshold within time T.",
    "It assumes threshold crossings are independent (Poisson). In reality, narrowband systems have clumped crossings, meaning Poisson overestimates Pf.",
    "Doubling T roughly doubles the cumulative probability of failure, decreasing β (though logarithmically, not linearly).",
    "Non-zero skewness indicates asymmetric response; kurtosis > 3 indicates 'fat tails' with more frequent extreme peaks than Gaussian theory predicts."
  ]},
  { id: "ak8", title: "8. System Redundancy", answers: [
    "System Pf = Probability of the weakest link failing (series system). Pf_sys ≈ Σ Pf_i.",
    "Load redistribution allows the system to survive the first failure. Ultimate Pf is the probability of the sequence of failures leading to collapse.",
    "Subset simulation sets intermediate levels exactly matching the sequential yielding of members, stepping through the load redistribution states.",
    "Brittle: P(System Failure | Member 1 Fails) ≈ 1.0. Ductile: P(System Failure | Member 1 Fails) << 1.0.",
    "High correlation means if one member is weak, alternative load paths are also likely weak, defeating the purpose of redundancy."
  ]},
  { id: "ak9", title: "9. Advanced Sampling", answers: [
    "IS generates samples near the failure region (design point) and weights them by the ratio of true PDF to proposal PDF to prevent bias.",
    "Efficiency plummets. It can become worse than Crude MC if samples are placed in irrelevant regions with extreme weighting artifacts.",
    "MCMC takes successful samples from Level i and takes random walks to generate conditionally distributed samples for Level i+1 without restarting.",
    "Crude MC needs ~10⁸ samples (100/Pf). Subset Simulation needs ~6 levels × ~1,000 samples = ~6,000 samples. Massive efficiency gain.",
    "Subset Simulation handles multiple design points better because it doesn't require knowing a specific design point beforehand to center a proposal distribution."
  ]},
  { id: "ak10", title: "10. RBDO", answers: [
    "It converts the hard reliability constraint (β ≥ β_target) into an objective penalty. If β < β_target, the solver pays a price proportional to ρ.",
    "Using Finite Difference or analytically via the chain rule through the FORM algorithm equations.",
    "Higher load variance decreases β. The optimizer must iteratively increase cross-sectional areas to boost capacity and restore β to the target.",
    "Deterministic LRFD uses uniform load factors, often leading to over-design. RBDO assigns material exactly where uncertainty dictates, saving weight.",
    "Nesting FORM inside optimization is a 'double loop' (expensive). Decoupling methods like PMA (Performance Measure Approach) evaluate constraints inversely, vastly speeding up convergence."
  ]},
];
