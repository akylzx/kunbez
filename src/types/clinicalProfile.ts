
export interface ClinicalPatientProfile {
    ageYears?: number;
    sexAtBirth?: 'male' | 'female' | 'unknown';
    
    diagnosis: string; 
    diagnosisCodes?: {
      icd10?: string[];
      orpha?: string[]; 
      omim?: string[]; 
    };
    gene?: string; 
    variantZygosity?: 'heterozygous' | 'homozygous' | 'compound_heterozygous' | 'hemizygous' | 'unknown';
    diseaseStage?: 'early' | 'intermediate' | 'advanced' | 'unknown';
    
    performance?: {
      ECOG?: 0 | 1 | 2 | 3 | 4; 
      Karnofsky?: number; 
    };
    
    linesOfTherapy?: number; 
    radiotherapyWithinDays?: number; 
    washoutDays?: number; 
    priorTherapy?: 'unknown' | 'yes' | 'no'; 
    
    pregnant?: 'yes' | 'no' | 'unknown';
    lactating?: 'yes' | 'no' | 'unknown';
    contraception?: 'adequate' | 'inadequate' | 'not_applicable' | 'unknown';
    
    labs?: {
      anc?: number; 
      platelets?: number; 
      hemoglobin?: number; 
      
      creatinineCl?: number; 
      eGFR?: number; 
      
      ast?: number; 
      alt?: number; 
      bilirubin?: number;
      inr?: number; 
      albumin?: number; 
      
      lvefPct?: number; 
      qtcF?: number;
    };
    
    
    hbv?: 'positive' | 'negative' | 'unknown'; 
    hcv?: 'positive' | 'negative' | 'unknown'; 
    hiv?: 'positive' | 'negative' | 'unknown'; 
    
    cnsMets?: 'yes' | 'no' | 'unknown'; 
    seizures?: 'yes' | 'no' | 'unknown';
    
    strongCYP3A?: 'yes' | 'no' | 'unknown'; 
    anticoagulants?: 'yes' | 'no' | 'unknown';
    qtProlonging?: 'yes' | 'no' | 'unknown'; 
    
    contraindications?: string[];
    genotypeKnown?: 'unknown' | 'yes' | 'no';
  }
  
  export interface CriterionResult {
    intent: 'include' | 'exclude';
    criterion: string; 
    status: 'hit' | 'miss' | 'unknown';
    confidence: number; 
    extractedValue?: string; 
    patientValue?: any; 
    reason: string; 
  }
  
  export interface EnhancedEligibilityDecision {
    band: 'High' | 'Medium' | 'Low';
    score: number; 
    criteria: CriterionResult[]; 
    reasons: string[];
    uncertainties: string[];
    followUpQuestion?: string;
    hardFailures: CriterionResult[]; 
  }