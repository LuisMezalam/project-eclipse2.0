export type DynamicSystemModelId = "sdof" | "equipment" | "bridge" | "building";
export type DynamicSupportModel = "fixed" | "flexible" | "isolated";
export type DynamicExcitationType = "harmonic" | "impulse" | "seismic" | "wind";

export interface DynamicSystemPreset {
  id: DynamicSystemModelId;
  label: string;
  description: string;
  massFactor: number;
  stiffnessFactor: number;
  dampingFactor: number;
  recommendedModes: number;
  loadPath: string;
}

export interface EffectiveDynamicSystem {
  mass: number;
  stiffness: number;
  damping: number;
  forceAmplitude: number;
  modeParticipation: number;
  supportFactor: number;
  excitationFactor: number;
}

export const dynamicSystemPresets: DynamicSystemPreset[] = [
  {
    id: "sdof",
    label: "SDOF oscillator",
    description: "Single lumped mass with one dominant lateral or vertical mode.",
    massFactor: 1,
    stiffnessFactor: 1,
    dampingFactor: 1,
    recommendedModes: 1,
    loadPath: "mass -> spring/damper -> support",
  },
  {
    id: "equipment",
    label: "Equipment mount",
    description: "Machine or component mounted on pads, isolators, or a supporting frame.",
    massFactor: 0.8,
    stiffnessFactor: 1.35,
    dampingFactor: 1.2,
    recommendedModes: 1,
    loadPath: "equipment -> mount -> base plate",
  },
  {
    id: "bridge",
    label: "Bridge span",
    description: "Distributed span idealized as a dominant modal mass and equivalent stiffness.",
    massFactor: 1.25,
    stiffnessFactor: 0.72,
    dampingFactor: 0.85,
    recommendedModes: 3,
    loadPath: "deck -> bearings -> abutments",
  },
  {
    id: "building",
    label: "Shear building",
    description: "Multi-story lateral system represented by participating modal mass.",
    massFactor: 1.6,
    stiffnessFactor: 0.58,
    dampingFactor: 1.1,
    recommendedModes: 4,
    loadPath: "floors -> frame/core -> foundation",
  },
];

export const supportModelFactors: Record<DynamicSupportModel, { label: string; stiffness: number; damping: number }> = {
  fixed: { label: "Fixed base", stiffness: 1, damping: 1 },
  flexible: { label: "Flexible support", stiffness: 0.72, damping: 0.9 },
  isolated: { label: "Base isolated", stiffness: 0.42, damping: 1.8 },
};

export const excitationFactors: Record<DynamicExcitationType, { label: string; force: number; damping: number }> = {
  harmonic: { label: "Harmonic force", force: 1, damping: 1 },
  impulse: { label: "Impulse/shock", force: 1.35, damping: 0.9 },
  seismic: { label: "Base motion", force: 1.15, damping: 1.1 },
  wind: { label: "Wind gust", force: 0.85, damping: 1 },
};

export function getDynamicSystemPreset(id: DynamicSystemModelId): DynamicSystemPreset {
  return dynamicSystemPresets.find((preset) => preset.id === id) ?? dynamicSystemPresets[0];
}

export function computeEffectiveDynamicSystem(params: {
  modelId: DynamicSystemModelId;
  supportModel: DynamicSupportModel;
  excitationType: DynamicExcitationType;
  mass: number;
  stiffness: number;
  damping: number;
  forceAmplitude: number;
  activeModes: number;
  isolationEnabled: boolean;
}): EffectiveDynamicSystem {
  const preset = getDynamicSystemPreset(params.modelId);
  const support = supportModelFactors[params.supportModel];
  const excitation = excitationFactors[params.excitationType];
  const modeParticipation = Math.min(1.45, 0.78 + params.activeModes * 0.12);
  const isolationStiffnessFactor = params.isolationEnabled ? 0.65 : 1;
  const isolationDampingFactor = params.isolationEnabled ? 1.45 : 1;

  return {
    mass: params.mass * preset.massFactor * modeParticipation,
    stiffness: params.stiffness * preset.stiffnessFactor * support.stiffness * isolationStiffnessFactor,
    damping: params.damping * preset.dampingFactor * support.damping * excitation.damping * isolationDampingFactor,
    forceAmplitude: params.forceAmplitude * excitation.force * modeParticipation,
    modeParticipation,
    supportFactor: support.stiffness * isolationStiffnessFactor,
    excitationFactor: excitation.force,
  };
}
