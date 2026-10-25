export type FormulaCategory =
  | "reliability"
  | "statistics"
  | "beams"
  | "trusses"
  | "dynamics"
  | "distributions"
  | "optimization"
  | "bayesian";

export type ToolTabId =
  | "reliability"
  | "static"
  | "truss"
  | "moments"
  | "dynamic"
  | "distributions"
  | "inference"
  | "mcmc"
  | "advanced";

export interface FormulaVariable {
  symbol: string;
  meaning: string;
}

export interface FormulaDefinition {
  id: string;
  name: string;
  category: FormulaCategory;
  formula: string;
  latex?: string;
  description: string;
  variables: FormulaVariable[];
  toolTabs: ToolTabId[];
  importance: "core" | "advanced" | "specialized";
  outputs: string[];
  watchpoints: string[];
}

export interface ToolDefinition {
  id: ToolTabId;
  label: string;
  purpose: string;
  workflow: string[];
  decisionOutputs: string[];
}

export const formulaLibrary: FormulaDefinition[] = [
  {
    id: "limit-state",
    name: "Limit State Function",
    category: "reliability",
    formula: "g(X) = R - S",
    latex: "g(\\mathbf{X}) = R - S",
    description: "Defines the safety margin between capacity and demand. Failure occurs when g(X) <= 0.",
    variables: [
      { symbol: "R", meaning: "Resistance or capacity" },
      { symbol: "S", meaning: "Load effect or demand" },
      { symbol: "g(X)", meaning: "Safety margin" },
    ],
    toolTabs: ["reliability", "static", "truss", "advanced"],
    importance: "core",
    outputs: ["Safety margin", "Failure boundary"],
    watchpoints: ["Keep R and S in compatible units.", "A positive mean margin can still have high failure probability when variance is large."],
  },
  {
    id: "reliability-index",
    name: "Reliability Index",
    category: "reliability",
    formula: "beta = (mu_R - mu_S) / sqrt(sigma_R^2 + sigma_S^2)",
    latex: "\\beta = \\frac{\\mu_R - \\mu_S}{\\sqrt{\\sigma_R^2 + \\sigma_S^2}}",
    description: "Measures distance from the mean safety margin to the failure boundary in standard deviation units.",
    variables: [
      { symbol: "mu_R", meaning: "Mean resistance" },
      { symbol: "mu_S", meaning: "Mean load effect" },
      { symbol: "sigma_R", meaning: "Resistance standard deviation" },
      { symbol: "sigma_S", meaning: "Load standard deviation" },
    ],
    toolTabs: ["reliability", "static", "truss", "advanced"],
    importance: "core",
    outputs: ["Reliability index", "Relative safety level"],
    watchpoints: ["Beta drops quickly when load variance or resistance CoV increases.", "For non-normal variables, treat beta as an approximation unless validated."],
  },
  {
    id: "probability-failure",
    name: "Probability of Failure",
    category: "reliability",
    formula: "Pf = Phi(-beta)",
    latex: "P_f = \\Phi(-\\beta)",
    description: "Maps reliability index to probability of violating the limit state using the standard normal CDF.",
    variables: [
      { symbol: "Phi", meaning: "Standard normal cumulative distribution function" },
      { symbol: "beta", meaning: "Reliability index" },
    ],
    toolTabs: ["reliability", "static", "truss", "advanced"],
    importance: "core",
    outputs: ["Probability of failure", "Risk class"],
    watchpoints: ["Very small Pf values need enough Monte Carlo samples to verify.", "Compare FORM and simulation when tails drive the result."],
  },
  {
    id: "fosm-margin",
    name: "FOSM Safety Margin",
    category: "reliability",
    formula: "mu_g = mu_R - mu_S; sigma_g^2 = sigma_R^2 + sigma_S^2",
    latex: "\\mu_g = \\mu_R - \\mu_S,\\quad \\sigma_g^2 = \\sigma_R^2 + \\sigma_S^2",
    description: "First-order second-moment propagation for a linearized safety margin.",
    variables: [
      { symbol: "mu_g", meaning: "Mean safety margin" },
      { symbol: "sigma_g", meaning: "Safety margin standard deviation" },
    ],
    toolTabs: ["reliability", "truss", "advanced"],
    importance: "core",
    outputs: ["Mean margin", "Margin variance", "FOSM beta"],
    watchpoints: ["The simple variance sum assumes independent R and S.", "Correlation should be modeled explicitly when load and resistance share drivers."],
  },
  {
    id: "beam-moment",
    name: "Simply Supported Beam Moment",
    category: "beams",
    formula: "M_max = wL^2 / 8",
    latex: "M_{max} = \\frac{wL^2}{8}",
    description: "Maximum bending moment for a simply supported beam under uniform distributed load.",
    variables: [
      { symbol: "w", meaning: "Uniform load intensity" },
      { symbol: "L", meaning: "Span length" },
      { symbol: "M_max", meaning: "Maximum bending moment" },
    ],
    toolTabs: ["static", "reliability", "moments"],
    importance: "core",
    outputs: ["Demand moment", "Load effect S"],
    watchpoints: ["Moment scales with L squared, so span changes dominate demand.", "Use the correct load model before feeding demand into Pf analysis."],
  },
  {
    id: "beam-deflection",
    name: "Beam Deflection",
    category: "beams",
    formula: "delta_max = 5wL^4 / (384EI)",
    latex: "\\delta_{max} = \\frac{5wL^4}{384EI}",
    description: "Midspan deflection for a simply supported beam under uniform distributed load.",
    variables: [
      { symbol: "E", meaning: "Elastic modulus" },
      { symbol: "I", meaning: "Second moment of area" },
      { symbol: "delta_max", meaning: "Maximum deflection" },
    ],
    toolTabs: ["static", "moments"],
    importance: "core",
    outputs: ["Serviceability demand", "Deflection sensitivity"],
    watchpoints: ["Deflection scales with L fourth, making long spans highly sensitive.", "Serviceability can control even when strength reliability looks acceptable."],
  },
  {
    id: "composite-section-elastic",
    name: "Bonded Isotropic Layers and Flexural Rigidity",
    category: "beams",
    formula: "n_i = E_i/E_ref; ȳ_E = Σ(E_i A_i y_i)/Σ(E_i A_i); (EI)_c = Σ E_i[I_i + A_i(y_i - ȳ_E)²]; I_tr = (EI)_c/E_ref; κ = M/(EI)_c; σ_i(y) = -E_i κ(y - ȳ_E)",
    latex: "n_i=\\frac{E_i}{E_{ref}},\\quad \\bar{y}_E=\\frac{\\sum_i E_i A_i y_i}{\\sum_i E_i A_i},\\quad (EI)_c=\\sum_i E_i\\left[I_i+A_i(y_i-\\bar{y}_E)^2\\right],\\quad I_{tr}=\\frac{(EI)_c}{E_{ref}},\\quad \\kappa=\\frac{M}{(EI)_c},\\quad \\sigma_i(y)=-E_i\\kappa(y-\\bar{y}_E)",
    description: "Combines material elastic moduli and layer geometry into one flexural rigidity. The beam solver receives E_ref and I_tr, so its stiffness E_ref I_tr equals the composite (EI)c; constituent stresses follow from the shared curvature.",
    variables: [
      { symbol: "E_i", meaning: "Elastic modulus of layer i" },
      { symbol: "A_i", meaning: "Area of layer i" },
      { symbol: "y_i", meaning: "Layer centroid elevation from the section datum" },
      { symbol: "I_i", meaning: "Centroidal second moment of area of layer i" },
      { symbol: "E_ref", meaning: "Reference modulus used to transform the section for the beam solver" },
      { symbol: "M, κ", meaning: "Section moment and elastic curvature" },
      { symbol: "σ_i", meaning: "Normal stress in material layer i" },
    ],
    toolTabs: ["static", "advanced"],
    importance: "specialized",
    outputs: ["Elastic neutral axis", "Composite EI", "Transformed I", "Layer stresses"],
    watchpoints: ["Assumes full bond/no interface slip and linear-elastic materials; slab width is the user-supplied effective width.", "Gross uncracked slab stiffness, code effective-width calculation, creep, construction staging, connector design, and code strength checks are outside this model."],
  },
  {
    id: "laminated-composite-beam-clt",
    name: "Laminated Composite Beam: Classical Lamination Theory",
    category: "beams",
    formula: "nu21=nu12*E2/E1; Q11=E1/(1-nu12*nu21); Q22=E2/(1-nu12*nu21); Q12=nu12*E2/(1-nu12*nu21); Q66=G12; Aij=Σ Qbarij*(zk-zk-1); Bij=1/2 Σ Qbarij*(zk²-zk-1²); Dij=1/3 Σ Qbarij*(zk³-zk-1³); {N;M}=[A B;B D]{eps0;kappa}; Mx_CLT=-Mbeam/b; EIeff=b/([ABD]^-1)_(kappax,Mx); eps(k,z)=eps0+z*kappa; sigma(k)=Qbar(k)*eps(k,z); FImax=max(|sigma1|/Xallow, |sigma2|/Yallow, |tau12|/S12)",
    latex: "\\nu_{21}=\\nu_{12}\\frac{E_2}{E_1},\\quad Q_{11}=\\frac{E_1}{1-\\nu_{12}\\nu_{21}},\\quad Q_{22}=\\frac{E_2}{1-\\nu_{12}\\nu_{21}},\\quad Q_{12}=\\frac{\\nu_{12}E_2}{1-\\nu_{12}\\nu_{21}},\\quad Q_{66}=G_{12}\\;\\;\\bar{\\mathbf Q}^{(k)}=\\mathcal T(\\mathbf Q^{(k)},\\theta_k)\\\\ A_{ij}=\\sum_k\\bar Q_{ij}^{(k)}(z_k-z_{k-1}),\\quad B_{ij}=\\frac12\\sum_k\\bar Q_{ij}^{(k)}(z_k^2-z_{k-1}^2),\\quad D_{ij}=\\frac13\\sum_k\\bar Q_{ij}^{(k)}(z_k^3-z_{k-1}^3)\\\\ \\begin{Bmatrix}\\mathbf N\\\\\\mathbf M\\end{Bmatrix}=\\begin{bmatrix}\\mathbf A&\\mathbf B\\\\\\mathbf B&\\mathbf D\\end{bmatrix}\\begin{Bmatrix}\\boldsymbol\\epsilon_0\\\\\\boldsymbol\\kappa\\end{Bmatrix},\\quad M_x^{CLT}=-\\frac{M_{beam}}{b},\\quad EI_{eff}=\\frac{b}{([ABD]^{-1})_{\\kappa_x,M_x}}\\\\ \\boldsymbol\\epsilon^{(k)}(z)=\\boldsymbol\\epsilon_0+z\\boldsymbol\\kappa,\\quad \\boldsymbol\\sigma^{(k)}=\\bar{\\mathbf Q}^{(k)}\\boldsymbol\\epsilon^{(k)},\\quad FI_{max}^{(k)}=\\max\\left(\\frac{|\\sigma_1|}{X_{allow}},\\frac{|\\sigma_2|}{Y_{allow}},\\frac{|\\tau_{12}|}{S_{12}}\\right)",
    description: "Uses each ply's orthotropic plane-stress stiffness and angle to form the laminate A, B, and D matrices. With zero membrane resultants and only beam-axis bending applied, the full ABD compliance gives curvature and effective EI for the beam solver. The beam sign convention maps positive sagging moment to negative CLT Mx for z positive upward. Ply surface stresses are checked with a maximum-stress first-ply screen.",
    variables: [
      { symbol: "E1, E2, G12, nu12", meaning: "Ply engineering constants in material axes 1-2" },
      { symbol: "theta_k, z_k", meaning: "Ply angle and through-thickness interface coordinate" },
      { symbol: "A, B, D", meaning: "Extensional, extension-bending coupling, and bending stiffness matrices" },
      { symbol: "N, M", meaning: "In-plane force and moment resultants per unit width" },
      { symbol: "epsilon0, kappa", meaning: "Mid-plane strain and curvature vectors" },
      { symbol: "b, EI_eff", meaning: "Beam width and effective beam-axis flexural rigidity" },
      { symbol: "Xt, Xc, Yt, Yc, S12", meaning: "Ply tensile, compressive, transverse, and shear allowables" },
    ],
    toolTabs: ["static", "advanced"],
    importance: "specialized",
    outputs: ["Laminate A/B/D matrices", "Effective beam EI", "Ply surface stresses", "Maximum-stress first-ply utilization"],
    watchpoints: ["Assumes linear-elastic plane-stress plies, perfect bonding, and classical laminate kinematics.", "The beam model omits transverse shear deformation, interlaminar failure, environmental effects, and progressive damage; the maximum-stress screen is not a design-code check."],
  },
  {
    id: "beam-capability-matrix",
    name: "Beam Capability Matrix",
    category: "beams",
    formula: "status(beam, load) in {exact, approximate, envelope, planned}",
    description: "Documents whether each beam/load combination is solved directly, treated as a screening approximation, handled as a moving-load envelope, or planned for a deeper solver.",
    variables: [
      { symbol: "beam", meaning: "Boundary condition or structural idealization" },
      { symbol: "load", meaning: "Applied load family" },
      { symbol: "status", meaning: "Solver confidence level" },
    ],
    toolTabs: ["static", "advanced"],
    importance: "advanced",
    outputs: ["Solver transparency", "Expansion roadmap", "Report caveats"],
    watchpoints: ["Do not interpret approximate combinations as final design checks.", "Vehicle axle trains, thermal loads, settlement, and arbitrary multi-span systems remain priority solver upgrades."],
  },
  {
    id: "beam-analysis-health",
    name: "Beam Analysis Health Gate",
    category: "beams",
    formula: "status = max(solver_level, geometry_validity, stress_ratio, deflection_ratio, Pf)",
    description: "Combines solver confidence, section validity, stress utilization, serviceability ratio, and reliability risk into a live status gate for the Static Loads workflow.",
    variables: [
      { symbol: "solver_level", meaning: "Exact, envelope, approximate, or planned model route" },
      { symbol: "stress_ratio", meaning: "Maximum stress divided by yield strength" },
      { symbol: "deflection_ratio", meaning: "Maximum deflection divided by the L/250 service check" },
      { symbol: "Pf", meaning: "FORM probability of failure for the active demand state" },
    ],
    toolTabs: ["static", "reliability", "advanced"],
    importance: "advanced",
    outputs: ["Ready/review status", "Critical flags", "Report caveats", "Live demand validation"],
    watchpoints: ["A ready status does not replace code checks or engineering judgment.", "Approximate and equivalent model routes should be documented when exported."],
  },
  {
    id: "beam-load-combinations",
    name: "Static Load Combination Presets",
    category: "beams",
    formula: "U = sum(gamma_i Q_i)",
    latex: "U = \\sum_i \\gamma_i Q_i",
    description: "Organizes LRFD, ASD, and service load factors so static beam cases can move toward code-style design workflows.",
    variables: [
      { symbol: "gamma_i", meaning: "Load factor for load component i" },
      { symbol: "Q_i", meaning: "Nominal load component" },
      { symbol: "U", meaning: "Factored design load effect" },
    ],
    toolTabs: ["static", "advanced"],
    importance: "advanced",
    outputs: ["Factored load effect", "Service check case", "Strength check case"],
    watchpoints: ["Actual code combinations vary by jurisdiction and structure type.", "Use presets as workflow scaffolding unless project-specific code rules are confirmed."],
  },
  {
    id: "expanded-static-beam-families",
    name: "Expanded Static Beam Families",
    category: "beams",
    formula: "beam in {multi-span, gerber, elastic-foundation, spring-supported, settlement, tapered, beam-column, composite}",
    description: "Adds higher-value beam idealizations to the Static Loads workflow while documenting which are exact solvers, equivalent screening models, or roadmap targets.",
    variables: [
      { symbol: "multi-span", meaning: "Arbitrary support layout represented by the current continuous-beam screening path" },
      { symbol: "foundation / springs", meaning: "Support flexibility families that need dedicated stiffness solvers for final design" },
      { symbol: "composite", meaning: "Fully bonded, uncracked elastic layers transformed into equivalent flexural rigidity" },
      { symbol: "tapered", meaning: "Non-prismatic geometry is currently represented with constant section stiffness" },
    ],
    toolTabs: ["static", "advanced"],
    importance: "specialized",
    outputs: ["Expanded beam type selector", "Support schematic", "Solver caveat"],
    watchpoints: ["Composite stiffness assumes full bond and an uncracked elastic section; connector and code strength checks are separate.", "Non-prismatic, foundation, and beam-column cases still need dedicated matrix or numerical solvers."],
  },
  {
    id: "advanced-static-load-families",
    name: "Advanced Static Load Families",
    category: "beams",
    formula: "load in {axle train, settlement, thermal, prestress, patch, torsion, snow, hydrostatic, staged, harmonic equivalent}",
    description: "Defines specialized load families and routes them to equivalent point, moment, triangular, partial distributed, or envelope models for immediate static screening.",
    variables: [
      { symbol: "P_eq", meaning: "Equivalent concentrated or moving demand" },
      { symbol: "M_eq", meaning: "Equivalent imposed moment from settlement or thermal gradient" },
      { symbol: "q_eq(x)", meaning: "Equivalent distributed pressure pattern" },
    ],
    toolTabs: ["static", "dynamic", "advanced"],
    importance: "specialized",
    outputs: ["Equivalent load path", "Static demand estimate", "Library-consistent caveat"],
    watchpoints: ["Axle trains, thermal gradients, and support settlement are especially sensitive to boundary assumptions.", "Equivalent static harmonic load is not a substitute for the Dynamic Loads tab when resonance governs."],
  },
  {
    id: "moment-statistics",
    name: "Moment Statistics",
    category: "statistics",
    formula: "mu = E[X], Var(X) = E[(X - mu)^2], CoV = sigma / mu",
    latex: "\\mu = E[X],\\quad Var(X)=E[(X-\\mu)^2],\\quad CoV=\\frac{\\sigma}{\\mu}",
    description: "Core moment definitions that transfer uncertainty between library formulas and analysis tabs.",
    variables: [
      { symbol: "mu", meaning: "Mean" },
      { symbol: "sigma", meaning: "Standard deviation" },
      { symbol: "CoV", meaning: "Coefficient of variation" },
    ],
    toolTabs: ["moments", "reliability", "static", "dynamic", "distributions"],
    importance: "core",
    outputs: ["Mean", "Variance", "CoV"],
    watchpoints: ["CoV becomes unstable when the mean approaches zero.", "Use moments from the same physical quantity before syncing tabs."],
  },
  {
    id: "higher-moments",
    name: "Higher-Order Moments",
    category: "statistics",
    formula: "skewness = mu_3 / sigma^3; kurtosis = mu_4 / sigma^4",
    latex: "\\gamma_1 = \\frac{\\mu_3}{\\sigma^3},\\quad \\kappa = \\frac{\\mu_4}{\\sigma^4}",
    description: "Skewness and kurtosis capture asymmetry and tail weight beyond mean and variance.",
    variables: [
      { symbol: "gamma_1", meaning: "Skewness" },
      { symbol: "kappa", meaning: "Kurtosis" },
      { symbol: "mu_n", meaning: "Central moment of order n" },
    ],
    toolTabs: ["moments", "distributions", "mcmc", "advanced"],
    importance: "advanced",
    outputs: ["Tail behavior", "Distribution shape", "Moment corrections"],
    watchpoints: ["High kurtosis can make normal approximations understate tail risk.", "Skewed loads can move the critical tail even when variance is unchanged."],
  },
  {
    id: "truss-stiffness",
    name: "Truss Element Stiffness",
    category: "trusses",
    formula: "k = AE / L",
    latex: "k = \\frac{AE}{L}",
    description: "Axial stiffness of a truss member before orientation transformation into the global stiffness matrix.",
    variables: [
      { symbol: "A", meaning: "Member cross-sectional area" },
      { symbol: "E", meaning: "Elastic modulus" },
      { symbol: "L", meaning: "Member length" },
    ],
    toolTabs: ["truss", "advanced"],
    importance: "core",
    outputs: ["Member stiffness", "Global stiffness contribution"],
    watchpoints: ["Small area or long members reduce stiffness and raise deformation demand.", "Buckling checks are separate from axial stress checks."],
  },
  {
    id: "truss-equilibrium",
    name: "Matrix Equilibrium",
    category: "trusses",
    formula: "K u = F",
    latex: "\\mathbf{K}\\mathbf{u} = \\mathbf{F}",
    description: "Global stiffness equilibrium used to solve nodal displacements and member forces.",
    variables: [
      { symbol: "K", meaning: "Global stiffness matrix" },
      { symbol: "u", meaning: "Nodal displacement vector" },
      { symbol: "F", meaning: "Applied force vector" },
    ],
    toolTabs: ["truss"],
    importance: "core",
    outputs: ["Displacements", "Member forces", "Load path"],
    watchpoints: ["Boundary conditions must remove rigid body motion.", "Ill-conditioned stiffness matrices can hide modeling mistakes."],
  },
  {
    id: "natural-frequency",
    name: "Natural Frequency",
    category: "dynamics",
    formula: "omega_n = sqrt(k / m)",
    latex: "\\omega_n = \\sqrt{\\frac{k}{m}}",
    description: "Undamped SDOF natural frequency used to compare excitation frequency against resonance risk.",
    variables: [
      { symbol: "k", meaning: "System stiffness" },
      { symbol: "m", meaning: "Mass" },
      { symbol: "omega_n", meaning: "Natural circular frequency" },
    ],
    toolTabs: ["dynamic", "advanced"],
    importance: "core",
    outputs: ["Natural frequency", "Period", "Resonance proximity"],
    watchpoints: ["Resonance risk rises when forcing frequency approaches natural frequency.", "Added mass or damaged stiffness shifts the frequency."],
  },
  {
    id: "dynamic-amplification",
    name: "Dynamic Amplification Factor",
    category: "dynamics",
    formula: "DAF = 1 / sqrt((1 - r^2)^2 + (2*zeta*r)^2)",
    latex: "DAF = \\frac{1}{\\sqrt{(1-r^2)^2 + (2\\zeta r)^2}}",
    description: "Scales static response for harmonic loading based on frequency ratio and damping.",
    variables: [
      { symbol: "r", meaning: "Frequency ratio omega / omega_n" },
      { symbol: "zeta", meaning: "Damping ratio" },
      { symbol: "DAF", meaning: "Dynamic amplification factor" },
    ],
    toolTabs: ["dynamic", "reliability"],
    importance: "core",
    outputs: ["Amplified demand", "Dynamic risk multiplier"],
    watchpoints: ["Low damping can produce large amplification near r = 1.", "Dynamic demand should feed reliability checks when vibration governs."],
  },
  {
    id: "effective-modal-system",
    name: "Effective Modal System",
    category: "dynamics",
    formula: "m_eff = Gamma_m m; k_eff = Gamma_k k; c_eff = Gamma_c c",
    latex: "m_{eff}=\\Gamma_m m,\\quad k_{eff}=\\Gamma_k k,\\quad c_{eff}=\\Gamma_c c",
    description: "Transforms base system properties into the equivalent model used by the selected schematic, support, excitation, isolation, and participating modes.",
    variables: [
      { symbol: "Gamma_m", meaning: "Mass participation modifier" },
      { symbol: "Gamma_k", meaning: "Support and model stiffness modifier" },
      { symbol: "Gamma_c", meaning: "Damping, excitation, and isolation modifier" },
    ],
    toolTabs: ["dynamic", "advanced"],
    importance: "advanced",
    outputs: ["Effective mass", "Effective stiffness", "Effective damping", "Model-consistent response"],
    watchpoints: ["Changing support flexibility can lower frequency even when the base stiffness slider is unchanged.", "Isolation reduces stiffness while raising damping, so displacement and acceleration can move in opposite directions."],
  },
  {
    id: "mode-participation",
    name: "Mode Participation",
    category: "dynamics",
    formula: "q_i(t) contributes by Gamma_i phi_i to x(t)",
    latex: "x(t) \\approx \\sum_i \\Gamma_i \\phi_i q_i(t)",
    description: "Approximates a distributed or multi-story system as a weighted sum of participating modal coordinates.",
    variables: [
      { symbol: "Gamma_i", meaning: "Participation factor for mode i" },
      { symbol: "phi_i", meaning: "Mode shape" },
      { symbol: "q_i(t)", meaning: "Modal response coordinate" },
    ],
    toolTabs: ["dynamic", "advanced"],
    importance: "advanced",
    outputs: ["Participating modes", "Equivalent mass scaling", "System schematic complexity"],
    watchpoints: ["One mode can be reasonable for compact systems, but bridges and buildings often need more than one participating mode.", "More modes increase effective participation and can reveal secondary response paths."],
  },
  {
    id: "dynamic-scenario-comparison",
    name: "Dynamic Scenario Comparison",
    category: "dynamics",
    formula: "case_i = {model, support, excitation, m_eff, k_eff, c_eff, DAF, x_max, beta, Pf}",
    description: "Stores each dynamic configuration with its effective system properties, response metrics, and reliability outputs for side-by-side screening.",
    variables: [
      { symbol: "case_i", meaning: "Saved dynamic design case" },
      { symbol: "x_max", meaning: "Maximum displacement response" },
      { symbol: "Pf", meaning: "Probability of displacement limit failure" },
    ],
    toolTabs: ["dynamic", "advanced"],
    importance: "advanced",
    outputs: ["Saved scenarios", "Comparison table", "Report-ready assumptions"],
    watchpoints: ["Compare cases with the same displacement limit when ranking risk.", "A lower DAF case can still be risky if its effective force or capacity limit is worse."],
  },
  {
    id: "normal-distribution",
    name: "Normal Distribution",
    category: "distributions",
    formula: "f(x) = 1/(sigma*sqrt(2*pi)) * exp(-(x-mu)^2/(2*sigma^2))",
    latex: "f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}",
    description: "Symmetric distribution commonly used for FORM approximations and measurement uncertainty.",
    variables: [
      { symbol: "mu", meaning: "Mean" },
      { symbol: "sigma", meaning: "Standard deviation" },
    ],
    toolTabs: ["distributions", "reliability", "moments"],
    importance: "core",
    outputs: ["Density", "CDF", "Tail probability"],
    watchpoints: ["Symmetry can be unrealistic for strictly positive loads or strengths.", "Tail fit matters more than center fit in reliability."],
  },
  {
    id: "lognormal-distribution",
    name: "Lognormal Distribution",
    category: "distributions",
    formula: "ln(X) ~ N(mu_ln, sigma_ln^2)",
    latex: "\\ln(X) \\sim N(\\mu_{ln}, \\sigma_{ln}^2)",
    description: "Positive-valued distribution often useful for material properties, demand multipliers, and uncertain capacities.",
    variables: [
      { symbol: "X", meaning: "Positive random variable" },
      { symbol: "mu_ln", meaning: "Mean of log variable" },
      { symbol: "sigma_ln", meaning: "Standard deviation of log variable" },
    ],
    toolTabs: ["distributions", "reliability", "advanced"],
    importance: "advanced",
    outputs: ["Positive-tail model", "Capacity or load distribution"],
    watchpoints: ["Mean and variance in physical space are not equal to log-space parameters.", "Large CoV creates strong right-tail behavior."],
  },
  {
    id: "bayes-rule",
    name: "Bayes Rule",
    category: "bayesian",
    formula: "P(theta | data) = P(data | theta) P(theta) / P(data)",
    latex: "P(\\theta|D)=\\frac{P(D|\\theta)P(\\theta)}{P(D)}",
    description: "Updates prior belief into posterior belief after observing evidence.",
    variables: [
      { symbol: "theta", meaning: "Unknown parameter" },
      { symbol: "D", meaning: "Observed data" },
      { symbol: "P(theta|D)", meaning: "Posterior distribution" },
    ],
    toolTabs: ["inference", "mcmc", "advanced"],
    importance: "core",
    outputs: ["Posterior distribution", "Updated parameter moments"],
    watchpoints: ["Weak priors let data dominate; strong priors require clear justification.", "Posterior uncertainty should flow back into reliability calculations."],
  },
  {
    id: "mcmc-estimator",
    name: "Monte Carlo Estimator",
    category: "statistics",
    formula: "Pf_hat = (1/N) sum I[g(X_i) <= 0]",
    latex: "\\hat{P}_f = \\frac{1}{N}\\sum_{i=1}^{N} I[g(X_i) \\le 0]",
    description: "Estimates failure probability by sampling and counting limit-state violations.",
    variables: [
      { symbol: "N", meaning: "Number of samples" },
      { symbol: "I", meaning: "Indicator function" },
      { symbol: "X_i", meaning: "Sampled random input" },
    ],
    toolTabs: ["reliability", "mcmc", "advanced"],
    importance: "advanced",
    outputs: ["Simulation Pf", "Validation evidence"],
    watchpoints: ["Rare failures require many samples or variance reduction.", "Use simulation to challenge, not blindly confirm, analytical assumptions."],
  },
  {
    id: "rbdo-objective",
    name: "Reliability-Based Design Optimization",
    category: "optimization",
    formula: "min C(d) subject to beta(d) >= beta_target",
    latex: "\\min C(\\mathbf{d})\\quad s.t.\\quad \\beta(\\mathbf{d}) \\ge \\beta_{target}",
    description: "Optimizes design cost or weight while maintaining target reliability.",
    variables: [
      { symbol: "d", meaning: "Design variable vector" },
      { symbol: "C(d)", meaning: "Cost or weight objective" },
      { symbol: "beta_target", meaning: "Required reliability index" },
    ],
    toolTabs: ["advanced", "truss", "static"],
    importance: "advanced",
    outputs: ["Recommended design", "Reliability constraint margin"],
    watchpoints: ["Optimization should expose tradeoffs, not only a single answer.", "Sensitivity signs matter when deciding whether to add capacity or reduce demand."],
  },
];

export const toolDefinitions: Record<ToolTabId, ToolDefinition> = {
  reliability: {
    id: "reliability",
    label: "Pf Analysis",
    purpose: "Convert load and resistance uncertainty into beta, probability of failure, and validation checks.",
    workflow: ["Define R and S", "Compute safety margin moments", "Estimate beta and Pf", "Compare analytical result with simulation"],
    decisionOutputs: ["Reliability index", "Probability of failure", "Risk interpretation", "Monte Carlo confirmation"],
  },
  static: {
    id: "static",
    label: "Static Loads",
    purpose: "Turn beam geometry and loading into structural demand that can feed reliability analysis.",
    workflow: ["Set span, section, and material properties", "Choose support layout", "Enter single or hybrid loads", "Transform composite layers into E_ref I_tr when selected", "Read V, M, constituent stress, and deflection", "Review assumptions and solver confidence"],
    decisionOutputs: ["Maximum moment", "Deflection", "Demand sensitivity", "Reliability-ready load effect"],
  },
  truss: {
    id: "truss",
    label: "Truss",
    purpose: "Solve load paths, member forces, and uncertainty-sensitive safety margins for truss systems.",
    workflow: ["Assemble stiffness", "Apply supports and loads", "Solve K u = F", "Convert member demand into safety factors or beta"],
    decisionOutputs: ["Member force map", "Displacement map", "Critical members", "System reliability cues"],
  },
  moments: {
    id: "moments",
    label: "Stat Moments",
    purpose: "Explain how mean, variance, skewness, and kurtosis change mechanical demand and tail behavior.",
    workflow: ["Set raw moments", "Convert to central moments", "Inspect shape metrics", "Push compatible moments into load models"],
    decisionOutputs: ["Mean", "Variance", "Skewness", "Kurtosis", "Tail-risk warning"],
  },
  dynamic: {
    id: "dynamic",
    label: "Dynamic Loads",
    purpose: "Translate vibration parameters into amplified structural demand and resonance risk.",
    workflow: ["Estimate mass and stiffness", "Compute natural frequency", "Compare excitation ratio", "Apply DAF to reliability demand"],
    decisionOutputs: ["Natural frequency", "Amplification factor", "Resonance proximity", "Dynamic demand multiplier"],
  },
  distributions: {
    id: "distributions",
    label: "Distributions",
    purpose: "Choose probability models and inspect how their shapes affect reliability tails.",
    workflow: ["Select distribution family", "Set parameters", "Inspect density and tail behavior", "Match moments to reliability inputs"],
    decisionOutputs: ["Distribution parameters", "Tail probability", "Moment fit", "Model suitability"],
  },
  inference: {
    id: "inference",
    label: "Inference",
    purpose: "Update uncertain model parameters as evidence arrives.",
    workflow: ["Choose prior", "Observe data", "Update posterior", "Use posterior moments in reliability analysis"],
    decisionOutputs: ["Posterior mean", "Posterior variance", "Credible range", "Evidence-updated reliability inputs"],
  },
  mcmc: {
    id: "mcmc",
    label: "MCMC",
    purpose: "Sample complex posteriors and tail events when closed-form formulas are too restrictive.",
    workflow: ["Define target distribution", "Run sampler", "Check convergence", "Estimate posterior moments or Pf"],
    decisionOutputs: ["Sample cloud", "Moment estimates", "Tail samples", "Simulation-backed Pf"],
  },
  advanced: {
    id: "advanced",
    label: "Advanced",
    purpose: "Combine optimization, time dependence, simulation, and system reliability into design decisions.",
    workflow: ["Set target beta", "Run advanced reliability model", "Inspect sensitivities", "Select design actions"],
    decisionOutputs: ["RBDO recommendation", "Sensitivity ranking", "Time-dependent reliability", "System risk"],
  },
};

export function getFormulasForTab(tabId: ToolTabId): FormulaDefinition[] {
  return formulaLibrary.filter((formula) => formula.toolTabs.includes(tabId));
}

export function getFormulaById(id: string): FormulaDefinition | undefined {
  return formulaLibrary.find((formula) => formula.id === id);
}

export function getFormulasByCategory(category: FormulaCategory): FormulaDefinition[] {
  return formulaLibrary.filter((formula) => formula.category === category);
}

export function searchFormulas(query: string): FormulaDefinition[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return formulaLibrary;
  }

  return formulaLibrary.filter((formula) => {
    const searchable = [
      formula.name,
      formula.category,
      formula.formula,
      formula.description,
      ...formula.variables.map((variable) => `${variable.symbol} ${variable.meaning}`),
      ...formula.outputs,
      ...formula.watchpoints,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}
