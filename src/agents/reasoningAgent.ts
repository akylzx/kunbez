import type { Trial } from '../lib/trials';
import type { EligibilityDecision } from './eligibilityAgent';

export function ReasoningAgent(trial: Trial, eligibility: EligibilityDecision): string {
  const { band, reasons, uncertainties } = eligibility;
  
  let explanation = "";
  
  if (band === "High") {
    explanation = "This trial appears highly suitable";
  } else if (band === "Medium") {
    explanation = "This trial shows moderate suitability";
  } else {
    explanation = "This trial has limited suitability";
  }

  if (reasons.length > 0) {
    const topReasons = reasons.slice(0, 2);
    explanation += ` because ${topReasons.join(" and ").toLowerCase()}`;
  }

  if (trial.phase) {
    explanation += ` for this ${trial.phase} study`;
  }

  if (uncertainties.length > 0) {
    const mainUncertainty = uncertainties[0];
    explanation += `. However, ${mainUncertainty.toLowerCase()} which may affect eligibility`;
  }

  if (!explanation.endsWith('.')) {
    explanation += '.';
  }

  return explanation;
}
