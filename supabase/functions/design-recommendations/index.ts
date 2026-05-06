import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://mezastaticaldynamics.lovable.app',
  'https://id-preview--f6fc2174-ea35-480b-994a-92bc2b742976.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const VALID_ANALYSIS_TYPES = ['static-beam', 'dynamic', 'form'] as const;
type AnalysisType = typeof VALID_ANALYSIS_TYPES[number];

function isValidAnalysisType(value: unknown): value is AnalysisType {
  return typeof value === 'string' && (VALID_ANALYSIS_TYPES as readonly string[]).includes(value);
}

function validateNumericParam(value: unknown, name: string): number {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    throw new ValidationError(`Invalid numeric parameter: ${name}`);
  }
  return num;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { analysisType, parameters } = body;

    // Validate analysisType
    if (!isValidAnalysisType(analysisType)) {
      return new Response(JSON.stringify({ error: `Invalid analysis type. Must be one of: ${VALID_ANALYSIS_TYPES.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate parameters is an object
    if (!parameters || typeof parameters !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid parameters. Must be an object.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("AI service not configured");
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Received request for design recommendations:", { analysisType });

    const systemPrompt = `You are an expert structural reliability engineer specializing in probabilistic design and failure analysis. 
Your role is to analyze structural parameters and provide actionable design recommendations to reduce the probability of failure.
Always provide specific, quantitative recommendations when possible.
Format your response as a JSON object with the following structure:
{
  "recommendations": [
    {
      "title": "Brief title of the recommendation",
      "description": "Detailed description of what to change and why",
      "impact": "high" | "medium" | "low",
      "category": "material" | "geometry" | "loading" | "safety-factor" | "uncertainty"
    }
  ],
  "summary": "A brief 1-2 sentence summary of the overall reliability situation",
  "reliabilityAssessment": "critical" | "marginal" | "acceptable" | "excellent"
}`;

    let userPrompt = "";

    if (analysisType === "static-beam") {
      const VALID_BEAM_TYPES = ['simply-supported', 'cantilever', 'fixed-fixed', 'propped-cantilever', 'overhanging', 'continuous'];
      const beamType = VALID_BEAM_TYPES.includes(String(parameters.beamType))
        ? String(parameters.beamType)
        : 'simply-supported';
      const length = validateNumericParam(parameters.length, "length");
      const load = validateNumericParam(parameters.load, "load");
      const E = validateNumericParam(parameters.E, "E");
      const I = validateNumericParam(parameters.I, "I");
      const width = validateNumericParam(parameters.width, "width");
      const height = validateNumericParam(parameters.height, "height");
      const yieldStrength = validateNumericParam(parameters.yieldStrength, "yieldStrength");
      const loadCOV = validateNumericParam(parameters.loadCOV, "loadCOV");
      const strengthCOV = validateNumericParam(parameters.strengthCOV, "strengthCOV");
      const reliabilityIndex = validateNumericParam(parameters.reliabilityIndex, "reliabilityIndex");
      const pof = validateNumericParam(parameters.pof, "pof");

      userPrompt = `Analyze the following simply supported beam design and provide recommendations to reduce the probability of failure:

BEAM CONFIGURATION:
- Type: ${beamType}
- Length: ${length} m
- Applied Load (UDL): ${load} kN/m
- Elastic Modulus: ${E} GPa
- Moment of Inertia: ${I} m⁴
- Cross-section: ${width}m × ${height}m
- Yield Strength: ${yieldStrength} MPa

UNCERTAINTY PARAMETERS:
- Load COV: ${(loadCOV * 100).toFixed(1)}%
- Strength COV: ${(strengthCOV * 100).toFixed(1)}%

RELIABILITY RESULTS:
- Reliability Index (β): ${reliabilityIndex.toFixed(3)}
- Probability of Failure: ${(pof * 100).toFixed(4)}%

Target reliability index for structural design is typically β ≥ 3.0 (Pf ≤ 0.135%).
Provide specific recommendations to improve this design's reliability.`;
    } else if (analysisType === "dynamic") {
      const mass = validateNumericParam(parameters.mass, "mass");
      const stiffness = validateNumericParam(parameters.stiffness, "stiffness");
      const damping = validateNumericParam(parameters.damping, "damping");
      const forceAmplitude = validateNumericParam(parameters.forceAmplitude, "forceAmplitude");
      const frequency = validateNumericParam(parameters.frequency, "frequency");
      const displacementLimit = validateNumericParam(parameters.displacementLimit, "displacementLimit");
      const reliabilityIndex = validateNumericParam(parameters.reliabilityIndex, "reliabilityIndex");
      const pof = validateNumericParam(parameters.pof, "pof");

      userPrompt = `Analyze the following dynamic SDOF system and provide recommendations to reduce the probability of failure:

SYSTEM PARAMETERS:
- Mass: ${mass} kg
- Stiffness: ${stiffness} N/m
- Damping Ratio: ${(damping * 100).toFixed(1)}%
- Force Amplitude: ${forceAmplitude} N
- Excitation Frequency: ${frequency} Hz
- Displacement Limit: ${displacementLimit} m

RELIABILITY RESULTS:
- Reliability Index (β): ${reliabilityIndex.toFixed(3)}
- Probability of Failure: ${(pof * 100).toFixed(4)}%

Consider resonance effects, dynamic amplification, and provide recommendations to improve reliability.`;
    } else if (analysisType === "form") {
      const resistanceMean = validateNumericParam(parameters.resistanceMean, "resistanceMean");
      const resistanceCOV = validateNumericParam(parameters.resistanceCOV, "resistanceCOV");
      const loadMean = validateNumericParam(parameters.loadMean, "loadMean");
      const loadCOV = validateNumericParam(parameters.loadCOV, "loadCOV");
      const reliabilityIndex = validateNumericParam(parameters.reliabilityIndex, "reliabilityIndex");
      const pof = validateNumericParam(parameters.pof, "pof");
      const monteCarloPoF = validateNumericParam(parameters.monteCarloPoF, "monteCarloPoF");

      userPrompt = `Analyze the following FORM reliability analysis and provide recommendations to reduce the probability of failure:

RESISTANCE (R):
- Mean: ${resistanceMean}
- COV: ${(resistanceCOV * 100).toFixed(1)}%

LOAD (S):
- Mean: ${loadMean}
- COV: ${(loadCOV * 100).toFixed(1)}%

RELIABILITY RESULTS:
- FORM Reliability Index (β): ${reliabilityIndex.toFixed(3)}
- FORM Probability of Failure: ${(pof * 100).toFixed(4)}%
- Monte Carlo Verification: ${(monteCarloPoF * 100).toFixed(4)}%

The limit state function is G(R,S) = R - S.
Provide recommendations to improve reliability by modifying material properties, design values, or reducing uncertainties.`;
    }

    console.log("Sending request to AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI service encountered an error. Please try again later.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log("AI response received successfully");

    const content = data.choices?.[0]?.message?.content;
    
    // Try to parse as JSON, handling markdown code blocks
    let recommendations;
    try {
      let jsonStr = content;
      if (content.includes("```json")) {
        jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      } else if (content.includes("```")) {
        jsonStr = content.replace(/```\n?/g, "").trim();
      }
      recommendations = JSON.parse(jsonStr);
    } catch {
      console.log("Could not parse as JSON, returning raw content");
      recommendations = {
        recommendations: [{
          title: "AI Analysis",
          description: content,
          impact: "medium",
          category: "general"
        }],
        summary: "Analysis complete",
        reliabilityAssessment: "marginal"
      };
    }

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in design-recommendations function:", error);
    
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error. Please try again later.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
