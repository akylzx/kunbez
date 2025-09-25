
export type Trial = {
  nctId: string;
  title: string;
  phase?: string;
  locations: string[];
  eligibilityText?: string;
  minAgeYears?: number;
  maxAgeYears?: number;
  status?: string;
};

export const SEED_TRIALS: Trial[] = [
  {
    nctId: "NCT02534844",
    title: "Efficacy and Safety of Miglustat in Niemann-Pick Disease Type C",
    phase: "Phase 3",
    locations: ["Boston, MA", "New York, NY", "United States"],
    eligibilityText:
      `Inclusion Criteria: Confirmed genetic diagnosis of Niemann-Pick disease type C by molecular testing. No prior treatment with miglustat or cyclodextrin compounds. Adequate organ function as determined by laboratory tests.
Exclusion Criteria: Prior disease-specific therapy within 6 months; significant cardiac disease.`,
    minAgeYears: 5,
    maxAgeYears: 65,
    status: "recruiting",
  },
  {
    nctId: "NCT04210045",
    title: "Natural History Study of Niemann-Pick Disease Type C",
    phase: "Observational",
    locations: ["Philadelphia, PA", "United States"],
    eligibilityText:
      `Inclusion: Diagnosis of NPC (clinical suspicion acceptable). All disease stages acceptable.
Exclusion: Inability to comply with assessments.`,
    minAgeYears: 0,
    maxAgeYears: 99,
    status: "active",
  },
  {
    nctId: "NCT03133416",
    title: "Phase II Study of Novel Cancer Treatment (Demo)",
    phase: "Phase II",
    locations: ["San Francisco, CA", "United States"],
    eligibilityText:
      `Inclusion: Adults 18–75 years; treatment-naïve for the target therapy.
Exclusion: Prior therapy with study drug; uncontrolled comorbidity.`,
    minAgeYears: 18,
    maxAgeYears: 75,
    status: "recruiting",
  },
];

export async function fetchTrials(opts: {
  condition: string;
  max?: number;
}): Promise<Trial[]> {
  const { condition, max = 8 } = opts;

  
  const filtered = SEED_TRIALS.filter(t =>
    t.title.toLowerCase().includes(condition.toLowerCase())
  );

  return filtered.slice(0, max);
}


