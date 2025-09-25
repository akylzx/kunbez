// Clinical catalog with regex extractors + evaluators

import { ClinicalPatientProfile, CriterionResult } from '../types/clinicalProfile';

export interface CriterionExtractor {
  id: string;
  name: string;
  intent: 'include' | 'exclude';
  patterns: RegExp[]; 
  extractor: (text: string) => ExtractedValue | null; 
  evaluator: (extracted: ExtractedValue, patient: ClinicalPatientProfile) => CriterionResult;
  priority: number; 
}

interface ExtractedValue {
  raw: string; 
  value?: number | string; 
  operator?: '>' | '>=' | '<' | '<=' | '=' | 'between';
  unit?: string;
  range?: [number, number];
}

const AgeCriterion: CriterionExtractor = {
  id: 'age',
  name: 'Age Requirements',
  intent: 'include',
  patterns: [
    /age[s]?\s*(?:between|from)?\s*(\d+)[-\s]*(?:to|and|-)?\s*(\d+)/i,
    /(\d+)\s*[-–]\s*(\d+)\s*years?\s*(?:of\s*age|old)/i,
    /(?:≥|>=|at least)\s*(\d+)\s*years?\s*(?:of\s*age|old)/i,
    /(?:≤|<=|no more than|maximum)\s*(\d+)\s*years?\s*(?:of\s*age|old)/i,
  ],
  extractor: (text: string) => {
    const rangeMatch = text.match(/age[s]?\s*(?:between|from)?\s*(\d+)[-\s]*(?:to|and|-)?\s*(\d+)/i) ||
                      text.match(/(\d+)\s*[-–]\s*(\d+)\s*years?\s*(?:of\s*age|old)/i);
    if (rangeMatch) {
      return {
        raw: rangeMatch[0],
        operator: 'between',
        range: [parseInt(rangeMatch[1]), parseInt(rangeMatch[2])]
      };
    }
    
    const minMatch = text.match(/(?:≥|>=|at least)\s*(\d+)\s*years?\s*(?:of\s*age|old)/i);
    if (minMatch) {
      return {
        raw: minMatch[0],
        operator: '>=',
        value: parseInt(minMatch[1])
      };
    }
    
    const maxMatch = text.match(/(?:≤|<=|no more than|maximum)\s*(\d+)\s*years?\s*(?:of\s*age|old)/i);
    if (maxMatch) {
      return {
        raw: maxMatch[0],
        operator: '<=',
        value: parseInt(maxMatch[1])
      };
    }
    
    return null;
  },
  evaluator: (extracted: ExtractedValue, patient: ClinicalPatientProfile) => {
    if (!patient.ageYears) {
      return {
        intent: 'include',
        criterion: 'age',
        status: 'unknown',
        confidence: 0,
        extractedValue: extracted.raw,
        patientValue: 'unknown',
        reason: 'Patient age not provided'
      };
    }
    
    let hit = false;
    if (extracted.operator === 'between' && extracted.range) {
      hit = patient.ageYears >= extracted.range[0] && patient.ageYears <= extracted.range[1];
    } else if (extracted.operator === '>=' && extracted.value) {
      hit = patient.ageYears >= (extracted.value as number);
    } else if (extracted.operator === '<=' && extracted.value) {
      hit = patient.ageYears <= (extracted.value as number);
    }
    
    return {
      intent: 'include',
      criterion: 'age',
      status: hit ? 'hit' : 'miss',
      confidence: 0.9,
      extractedValue: extracted.raw,
      patientValue: patient.ageYears,
      reason: hit 
        ? `Age ${patient.ageYears} meets requirement: ${extracted.raw}`
        : `Age ${patient.ageYears} does not meet requirement: ${extracted.raw}`
    };
  },
  priority: 10
};

const GeneticCriterion: CriterionExtractor = {
  id: 'genetic',
  name: 'Genetic Confirmation',
  intent: 'include',
  patterns: [
    /genetic(?:ally)?\s*confirmed/i,
    /molecular(?:ly)?\s*confirmed/i,
    /confirmed\s*(?:genetic\s*)?diagnosis/i,
    /(?:genetic|molecular)\s*testing/i,
  ],
  extractor: (text: string) => {
    const patterns = [
      /genetic(?:ally)?\s*confirmed/i,
      /molecular(?:ly)?\s*confirmed/i,
      /confirmed\s*(?:genetic\s*)?diagnosis/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          raw: match[0],
          value: 'required'
        };
      }
    }
    return null;
  },
  evaluator: (extracted: ExtractedValue, patient: ClinicalPatientProfile) => {
    if (patient.genotypeKnown === 'yes' || (patient.gene && patient.diagnosisCodes)) {
      return {
        intent: 'include',
        criterion: 'genetic',
        status: 'hit',
        confidence: 0.8,
        extractedValue: extracted.raw,
        patientValue: 'confirmed',
        reason: 'Genetic diagnosis is confirmed'
      };
    } else if (patient.genotypeKnown === 'no') {
      return {
        intent: 'include',
        criterion: 'genetic',
        status: 'miss',
        confidence: 0.9,
        extractedValue: extracted.raw,
        patientValue: 'not confirmed',
        reason: 'Genetic confirmation required but not available'
      };
    } else {
      return {
        intent: 'include',
        criterion: 'genetic',
        status: 'unknown',
        confidence: 0,
        extractedValue: extracted.raw,
        patientValue: 'unknown',
        reason: 'Genetic confirmation status unknown'
      };
    }
  },
  priority: 9
};

const PriorTherapyExclusionCriterion: CriterionExtractor = {
  id: 'prior_therapy_exclusion',
  name: 'Prior Therapy Exclusion',
  intent: 'exclude',
  patterns: [
    /no\s*prior\s*(?:systemic\s*)?(?:anti-?cancer\s*)?treatment/i,
    /treatment[-\s]na[iï]ve/i,
    /na[iï]ve\s*to\s*(?:systemic\s*)?treatment/i,
    /no\s*previous\s*therapy/i,
  ],
  extractor: (text: string) => {
    const patterns = [
      /no\s*prior\s*(?:systemic\s*)?(?:anti-?cancer\s*)?treatment/i,
      /treatment[-\s]na[iï]ve/i,
      /na[iï]ve\s*to\s*(?:systemic\s*)?treatment/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          raw: match[0],
          value: 'excluded'
        };
      }
    }
    return null;
  },
  evaluator: (extracted: ExtractedValue, patient: ClinicalPatientProfile) => {
    const hasPriorTherapy = patient.priorTherapy === 'yes' || (patient.linesOfTherapy && patient.linesOfTherapy > 0);
    
    if (hasPriorTherapy) {
      return {
        intent: 'exclude',
        criterion: 'prior_therapy_exclusion',
        status: 'hit', 
        confidence: 0.8,
        extractedValue: extracted.raw,
        patientValue: 'has prior therapy',
        reason: 'Patient has prior therapy but trial excludes prior treatment'
      };
    } else if (patient.priorTherapy === 'no' || patient.linesOfTherapy === 0) {
      return {
        intent: 'exclude',
        criterion: 'prior_therapy_exclusion',
        status: 'miss', 
        confidence: 0.9,
        extractedValue: extracted.raw,
        patientValue: 'treatment naive',
        reason: 'Patient is treatment-naive, meets exclusion requirement'
      };
    } else {
      return {
        intent: 'exclude',
        criterion: 'prior_therapy_exclusion',
        status: 'unknown',
        confidence: 0,
        extractedValue: extracted.raw,
        patientValue: 'unknown',
        reason: 'Prior therapy status unknown'
      };
    }
  },
  priority: 8
};

export const CRITERION_CATALOG: CriterionExtractor[] = [
  AgeCriterion,
  GeneticCriterion,
  PriorTherapyExclusionCriterion,
];

export function getHighestPriorityUnknown(results: CriterionResult[]): CriterionResult | null {
  const unknowns = results.filter(r => r.status === 'unknown');
  if (unknowns.length === 0) return null;
  

  let highest = unknowns[0];
  let highestPriority = -1;
  
  for (const result of unknowns) {
    const criterion = CRITERION_CATALOG.find(c => c.id === result.criterion);
    if (criterion && criterion.priority > highestPriority) {
      highest = result;
      highestPriority = criterion.priority;
    }
  }
  
  return highest;
}