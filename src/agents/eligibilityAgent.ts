import type { Trial } from '../lib/trials';

export type PatientInput = {
  ageYears?: number;
  genotypeKnown?: "unknown" | "yes" | "no";
  priorTherapy?: "unknown" | "yes" | "no";
}

export type EligibilityDecision = {
  band: "High" | "Medium" | "Low";
  reasons: string[];
  uncertainties: string[];
  followUpQuestion?: string;
}

import { ClinicalPatientProfile, EnhancedEligibilityDecision } from '../types/clinicalProfile';

export function EligibilityAgent(patient: PatientInput, trial: Trial): EligibilityDecision {
  let band: "High" | "Medium" | "Low" = "Medium";
  const reasons: string[] = [];
  const uncertainties: string[] = [];
  let followUpQuestion: string | undefined;

  const eligibilityText = trial.eligibilityText?.toLowerCase() || "";
  
  console.log(`EligibilityAgent for ${trial.nctId}:`)
  console.log(`  eligibilityText: "${eligibilityText}"`)
  console.log(`  patient.genotypeKnown: "${patient.genotypeKnown}"`)

  if (trial.minAgeYears !== undefined && trial.maxAgeYears !== undefined && patient.ageYears !== undefined) {
    if (patient.ageYears >= trial.minAgeYears && patient.ageYears <= trial.maxAgeYears) {
      reasons.push("Age within eligibility range");
      band = "High";
    } else {
      uncertainties.push("Age outside stated range");
      band = "Low";
    }
  } else if (patient.ageYears !== undefined && (trial.minAgeYears !== undefined || trial.maxAgeYears !== undefined)) {
    if (trial.minAgeYears !== undefined && patient.ageYears >= trial.minAgeYears) {
      reasons.push("Age meets minimum requirement");
    } else if (trial.maxAgeYears !== undefined && patient.ageYears <= trial.maxAgeYears) {
      reasons.push("Age meets maximum requirement");
    } else {
      uncertainties.push("Age may not meet requirements");
      band = "Low";
    }
  }

  const hasGeneticRequirement = eligibilityText.includes("genetic") || 
                               eligibilityText.includes("molecular") || 
                               eligibilityText.includes("mutation") || 
                               eligibilityText.includes("confirmed diagnosis");

  console.log(`  hasGeneticRequirement: ${hasGeneticRequirement}`)

  if (hasGeneticRequirement) {
    if (patient.genotypeKnown === "yes") {
      reasons.push("Genetic diagnosis aligns with criteria");
      if (band === "Medium") band = "High";
    } else if (patient.genotypeKnown === "unknown") {
      uncertainties.push("Genetic confirmation likely required");
      followUpQuestion = "Do you have a confirmed genetic diagnosis?";
    } else if (patient.genotypeKnown === "no") {
      uncertainties.push("Genetic diagnosis may be required");
      band = band === "High" ? "Medium" : "Low";
    }
  }

  const excludesPriorTherapy = eligibilityText.includes("no prior treatment") || 
                              eligibilityText.includes("treatment-naïve") || 
                              eligibilityText.includes("treatment naive") ||
                              eligibilityText.includes("previous therapy excluded");

  if (excludesPriorTherapy) {
    if (patient.priorTherapy === "yes") {
      reasons.push("Prior therapy may be exclusion");
      band = band === "High" ? "Medium" : "Low";
    } else if (patient.priorTherapy === "unknown") {
      uncertainties.push("Prior therapy status may affect eligibility");
      if (!followUpQuestion) {
        followUpQuestion = "Have you received any prior disease-specific therapy?";
      }
    } else if (patient.priorTherapy === "no") {
      reasons.push("Treatment-naïve status matches criteria");
    }
  }

  if (eligibilityText.includes("all disease stages") || eligibilityText.includes("all stages")) {
    reasons.push("Study accepts all disease stages");
  }

  if (trial.phase === "Observational" || trial.phase === "Natural History") {
    reasons.push("Observational study with broad inclusion");
    if (band === "Medium") band = "High";
  }

  if (reasons.length === 0 && uncertainties.length === 0) {
    uncertainties.push("Limited eligibility information available");
  }

  return {
    band,
    reasons: reasons.slice(0, 4), 
    uncertainties: uncertainties.slice(0, 3), 
    followUpQuestion
  };
}

function convertLegacyPatientInput(legacy: PatientInput): ClinicalPatientProfile {
  return {
    ageYears: legacy.ageYears,
    genotypeKnown: legacy.genotypeKnown,
    priorTherapy: legacy.priorTherapy,
    diagnosis: "Unknown", // Default for legacy
    performance: {},
    labs: {},
    contraindications: []
  };
}

function SimpleEnhancedEligibilityAgent(
  patient: ClinicalPatientProfile, 
  trial: Trial
): EnhancedEligibilityDecision {
  const legacyPatient: PatientInput = {
    ageYears: patient.ageYears,
    genotypeKnown: patient.genotypeKnown,
    priorTherapy: patient.priorTherapy
  };
  
  const legacyResult = EligibilityAgent(legacyPatient, trial);
  
  return {
    band: legacyResult.band,
    score: legacyResult.band === 'High' ? 15 : legacyResult.band === 'Medium' ? 10 : 5,
    criteria: [],
    reasons: legacyResult.reasons,
    uncertainties: legacyResult.uncertainties,
    followUpQuestion: legacyResult.followUpQuestion,
    hardFailures: []
  };
}

export function EligibilityAgentV2(
  patient: ClinicalPatientProfile | PatientInput, 
  trial: Trial
): EnhancedEligibilityDecision {
  const isLegacy = !('diagnosis' in patient);
  
  if (isLegacy) {
    const clinicalProfile = convertLegacyPatientInput(patient as PatientInput);
    return SimpleEnhancedEligibilityAgent(clinicalProfile, trial);
  } else {
    return SimpleEnhancedEligibilityAgent(patient as ClinicalPatientProfile, trial);
  }
}