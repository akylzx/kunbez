// Analyzes patterns across thousands of trials to extract insights

export interface TrialPattern {
    patternType: 'eligibility' | 'outcome' | 'design' | 'geographic' | 'temporal';
    pattern: string;
    confidence: number;
    supportingTrials: string[];
    insight: string;
    recommendation?: string;
  }
  
  export interface EligibilityPattern {
    criteriaType: string;
    frequency: number;
    totalTrials: number;
    associatedOutcomes: string[];
    geneticRequirements?: {
      required: boolean;
      specificMutations: string[];
      frequency: number;
    };
    agePatterns: {
      minAge: number;
      maxAge: number;
      mostCommonRange: [number, number];
    };
    criteriaPatterns?: Array<{
      term: string;
      frequency: number;
    }>;
  }
  
  export interface ResearchInsight {
    category: 'trend' | 'gap' | 'opportunity' | 'risk';
    title: string;
    description: string;
    evidence: string[];
    confidence: number;
    actionable: boolean;
    recommendation?: string;
  }
  
  export class PatternMiningEngine {
    constructor() {
      this.initializePatternDetectors();
    }
  
    private initializePatternDetectors() {
      console.log('🔬 Initializing Pattern Mining Engine...');
    }
  
    // Main pattern mining function 
    async minePatterns(condition: string, maxTrials: number = 1000): Promise<{
      eligibilityPatterns: EligibilityPattern[];
      researchInsights: ResearchInsight[];
      patterns: TrialPattern[];
    }> {
      console.log(`🔬 Mining patterns for "${condition}" across ${maxTrials} trials...`);
      
      const trials = await this.fetchMassiveTrialDataset(condition, maxTrials);
      console.log(`📊 Fetched ${trials.length} trials for analysis`);
      
      const eligibilityPatterns = this.analyzeEligibilityPatterns(trials);
      
      const researchInsights = this.identifyResearchInsights(trials);
      
      const patterns = this.extractCrossTrialPatterns(trials);
      
      return {
        eligibilityPatterns,
        researchInsights,
        patterns
      };
    }
  
    private async fetchMassiveTrialDataset(condition: string, maxTrials: number): Promise<any[]> {
      const allTrials: any[] = [];
      
      const searchTerms = this.generateSearchTerms(condition);
      
      for (const term of searchTerms) {
        try {
          const batch = await this.fetchTrialBatch(term, Math.ceil(maxTrials / searchTerms.length));
          allTrials.push(...batch);
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`Failed to fetch trials for term: ${term}`, error);
        }
      }
      
      const uniqueTrials = this.deduplicateTrials(allTrials);
      
      return uniqueTrials.slice(0, maxTrials);
    }
    
    private generateSearchTerms(condition: string): string[] {
      const baseTerms = [condition];
      
      const conditionLower = condition.toLowerCase();
      
      if (conditionLower.includes('disease')) {
        baseTerms.push(condition.replace(/disease/gi, 'disorder'));
        baseTerms.push(condition.replace(/disease/gi, 'syndrome'));
      }
      
      if (conditionLower.includes('type')) {
        const typeVariations = condition.match(/type\s+[A-Za-z0-9]+/gi);
        if (typeVariations) {
          baseTerms.push(condition.replace(/type\s+[A-Za-z0-9]+/gi, ''));
        }
      }
      
      if (conditionLower.includes('niemann-pick')) {
        baseTerms.push('lysosomal storage disease');
        baseTerms.push('sphingolipidosis');
      }
      
      
      const synonymMap: { [key: string]: string[] } = {
        'cancer': ['carcinoma', 'tumor', 'neoplasm', 'malignancy'],
        'diabetes': ['diabetic', 'hyperglycemia'],
        'alzheimer': ['dementia', 'cognitive decline'],
      };
      
      for (const [key, synonyms] of Object.entries(synonymMap)) {
        if (conditionLower.includes(key)) {
          baseTerms.push(...synonyms);
        }
      }
      
      return [...new Set(baseTerms)]; 
    }
  
    
    private async fetchTrialBatch(searchTerm: string, batchSize: number): Promise<any[]> {
      const params = new URLSearchParams();
      params.set("format", "json");
      params.set("query.term", searchTerm);
      params.set("pageSize", String(Math.min(batchSize, 50)));
      
      const url = `/ctgov2/api/v2/studies?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data?.studies || [];
    }
  
    
    private deduplicateTrials(trials: any[]): any[] {
      const seen = new Set();
      return trials.filter(trial => {
        const nctId = trial?.protocolSection?.identificationModule?.nctId;
        if (!nctId || seen.has(nctId)) return false;
        seen.add(nctId);
        return true;
      });
    }
  
    private analyzeEligibilityPatterns(trials: any[]): EligibilityPattern[] {
      const patterns: EligibilityPattern[] = [];
      
      const allCriteria = trials
        .map(t => t?.protocolSection?.eligibilityModule?.eligibilityCriteria)
        .filter(Boolean);
      
      const agePattern = this.analyzeAgePatterns(trials);
      
      const geneticPattern = this.analyzeGeneticRequirements(allCriteria);
      
      const criteriaPatterns = this.analyzeCriteriaPatterns(allCriteria);
      
      patterns.push({
        criteriaType: 'Age Requirements',
        frequency: agePattern.frequency,
        totalTrials: trials.length,
        associatedOutcomes: [],
        agePatterns: agePattern,
        geneticRequirements: geneticPattern,
        criteriaPatterns: criteriaPatterns
      });
      
      return patterns;
    }
  
    private analyzeAgePatterns(trials: any[]): any {
      const ages = trials
        .map(t => ({
          min: this.parseAge(t?.protocolSection?.eligibilityModule?.minimumAge),
          max: this.parseAge(t?.protocolSection?.eligibilityModule?.maximumAge)
        }))
        .filter(a => a.min !== null || a.max !== null);
      
      const minAges = ages.map(a => a.min).filter(a => a !== null);
      const maxAges = ages.map(a => a.max).filter(a => a !== null);
      
      return {
        frequency: ages.length / trials.length,
        minAge: minAges.length > 0 ? Math.min(...minAges) : 0,
        maxAge: maxAges.length > 0 ? Math.max(...maxAges) : 100,
        mostCommonRange: this.findMostCommonAgeRange(ages) as [number, number]
      };
    }
    private parseAge(ageStr: string): number | null {
      if (!ageStr) return null;
      const match = ageStr.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
  
    private findMostCommonAgeRange(ages: any[]): [number, number] {
      const validRanges = ages.filter(a => a.min !== null && a.max !== null);
      if (validRanges.length === 0) return [0, 100];
      
      const avgMin = validRanges.reduce((sum, a) => sum + a.min, 0) / validRanges.length;
      const avgMax = validRanges.reduce((sum, a) => sum + a.max, 0) / validRanges.length;
      
      return [Math.round(avgMin), Math.round(avgMax)];
    }
  
    private analyzeGeneticRequirements(criteria: string[]): any {
      const geneticTerms = ['genetic', 'mutation', 'variant', 'genotype', 'molecular', 'confirmed diagnosis'];
      
      let requiredCount = 0;
      const specificMutations: string[] = [];
      
      criteria.forEach(criterion => {
        const lowerCriterion = criterion.toLowerCase();
        
        if (geneticTerms.some(term => lowerCriterion.includes(term))) {
          requiredCount++;
        }
        
        const mutationMatches = criterion.match(/[A-Z]\d+[A-Z]/g);
        if (mutationMatches) {
          specificMutations.push(...mutationMatches);
        }
      });
      
      return {
        required: requiredCount > criteria.length * 0.3, // if >30% require genetic confirmation
        specificMutations: [...new Set(specificMutations)],
        frequency: requiredCount / criteria.length
      };
    }
    private analyzeCriteriaPatterns(criteria: string[]): Array<{ term: string; frequency: number }> {
      const commonTerms = [
        'performance status', 'prior therapy', 'organ function', 
        'laboratory values', 'informed consent', 'life expectancy'
      ];
      
      return commonTerms.map(term => ({
        term,
        frequency: criteria.filter(c => c.toLowerCase().includes(term)).length / criteria.length
      }));
    }
  
    private identifyResearchInsights(trials: any[]): ResearchInsight[] {
      const insights: ResearchInsight[] = [];
      
      const phaseInsight = this.analyzeTrialPhases(trials);
      if (phaseInsight) insights.push(phaseInsight);
      
      const geoInsight = this.analyzeGeographicPatterns(trials);
      if (geoInsight) insights.push(geoInsight);
      
      const sponsorInsight = this.analyzeSponsorPatterns(trials);
      if (sponsorInsight) insights.push(sponsorInsight);
      
      return insights;
    }
  
    private analyzeTrialPhases(trials: any[]): ResearchInsight | null {
      const phases = trials
        .map(t => t?.protocolSection?.designModule?.phases)
        .filter(Boolean)
        .flat();
      
      const phaseCounts = phases.reduce((acc: Record<string, number>, phase: string) => {
        acc[phase] = (acc[phase] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const totalPhases = (Object.values(phaseCounts) as number[]).reduce((a: number, b: number) => a + b, 0);
      const earlyPhasePercent = ((phaseCounts['PHASE1'] || 0) + (phaseCounts['PHASE2'] || 0)) / totalPhases;
      
      if (earlyPhasePercent > 0.7) {
        return {
          category: 'trend',
          title: 'Research Field in Early Development',
          description: `${Math.round(earlyPhasePercent * 100)}% of trials are in Phase 1-2, indicating this is an emerging research area with many experimental treatments.`,
          evidence: [`${phaseCounts['PHASE1'] || 0} Phase 1 trials`, `${phaseCounts['PHASE2'] || 0} Phase 2 trials`],
          confidence: 0.8,
          actionable: true,
          recommendation: 'Consider early-phase trials for access to cutting-edge treatments, but be aware of higher risks and uncertainty.'
        };
      }
      
      return null;
    }

    private analyzeGeographicPatterns(trials: any[]): ResearchInsight | null {
      const countries = trials
        .flatMap(t => t?.protocolSection?.contactsLocationsModule?.locations || [])
        .map(l => l?.country)
        .filter(Boolean);
      
      const countryCounts = countries.reduce((acc: any, country: string) => {
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});
      
      const sortedCountries = Object.entries(countryCounts)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 3);
      
      if (sortedCountries.length > 0) {
        return {
          category: 'opportunity',
          title: 'Geographic Research Concentration',
          description: `Research is concentrated in ${sortedCountries.map(([country]) => country).join(', ')}, which may indicate centers of excellence or funding patterns.`,
          evidence: sortedCountries.map(([country, count]) => `${country}: ${count} trials`),
          confidence: 0.7,
          actionable: true,
          recommendation: 'Consider trials in these regions for access to leading research programs.'
        };
      }
      
      return null;
    }
  
   
    private analyzeSponsorPatterns(trials: any[]): ResearchInsight | null {
      const sponsors = trials
        .map(t => t?.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name)
        .filter(Boolean);
      
      const sponsorCounts = sponsors.reduce((acc: any, sponsor: string) => {
        acc[sponsor] = (acc[sponsor] || 0) + 1;
        return acc;
      }, {});
      
      const topSponsors = Object.entries(sponsorCounts)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 5);
      
      const industrySponsors = topSponsors.filter(([sponsor]) => 
        !sponsor.toLowerCase().includes('university') && 
        !sponsor.toLowerCase().includes('hospital') &&
        !sponsor.toLowerCase().includes('institute')
      );
      
      if (industrySponsors.length > topSponsors.length * 0.6) {
        return {
          category: 'trend',
          title: 'High Industry Investment',
          description: `${Math.round((industrySponsors.length / topSponsors.length) * 100)}% of leading sponsors are pharmaceutical companies, indicating strong commercial interest.`,
          evidence: industrySponsors.map(([sponsor, count]) => `${sponsor}: ${count} trials`),
          confidence: 0.7,
          actionable: true,
          recommendation: 'Strong industry involvement suggests potential for drug approval and commercialization.'
        };
      }
      
      return null;
    }
  
    private extractCrossTrialPatterns(trials: any[]): TrialPattern[] {
      const patterns: TrialPattern[] = [];
      
      const eligibilityPattern = this.findCommonEligibilityPatterns(trials);
      if (eligibilityPattern) patterns.push(eligibilityPattern);
      
      const designPattern = this.findDesignPatterns(trials);
      if (designPattern) patterns.push(designPattern);
      
      return patterns;
    }
  
    private findCommonEligibilityPatterns(trials: any[]): TrialPattern | null {
      const criteria = trials
        .map(t => t?.protocolSection?.eligibilityModule?.eligibilityCriteria)
        .filter(Boolean);
      
      const geneticRequirementCount = criteria.filter(c => 
        c.toLowerCase().includes('genetic') || c.toLowerCase().includes('molecular')
      ).length;
      
      if (geneticRequirementCount > criteria.length * 0.5) {
        return {
          patternType: 'eligibility',
          pattern: 'Genetic confirmation required',
          confidence: geneticRequirementCount / criteria.length,
          supportingTrials: trials.slice(0, 10).map(t => t?.protocolSection?.identificationModule?.nctId).filter(Boolean),
          insight: `${Math.round((geneticRequirementCount / criteria.length) * 100)}% of trials require genetic or molecular confirmation of diagnosis.`,
          recommendation: 'Ensure genetic testing is completed before applying to trials in this condition.'
        };
      }
      
      return null;
    }
  
    private findDesignPatterns(trials: any[]): TrialPattern | null {
      const interventionTypes = trials
        .flatMap(t => t?.protocolSection?.armsInterventionsModule?.interventions || [])
        .map(i => i?.type)
        .filter(Boolean);
      
      const drugTrials = interventionTypes.filter(type => type === 'DRUG').length;
      const totalInterventions = interventionTypes.length;
      
      if (drugTrials > totalInterventions * 0.8) {
        return {
          patternType: 'design',
          pattern: 'Drug-focused research',
          confidence: drugTrials / totalInterventions,
          supportingTrials: trials.slice(0, 10).map(t => t?.protocolSection?.identificationModule?.nctId).filter(Boolean),
          insight: `${Math.round((drugTrials / totalInterventions) * 100)}% of interventions are drug-based therapies.`,
          recommendation: 'Research is heavily focused on pharmaceutical interventions rather than devices or procedures.'
        };
      }
      
      return null;
    }
  }