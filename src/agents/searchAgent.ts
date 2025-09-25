// SearchAgent with PubMed integration

import { fetchTrialsReal } from '../lib/ctgov';
import { pubmedAgent } from './pubmedAgent';
import { type Trial } from '../lib/trials';
import { type PubMedSearchResult } from '../lib/pubmed';

export interface EnhancedSearchResult {
  trials: Trial[];
  publications: PubMedSearchResult;
  enrichedTrials: any[]; 
}

type ScoredTrial = Trial & { score: number };

export async function SearchAgent({
  disease,
  state,
  includePubMed = true
}: {
  disease: string;
  state?: string;
  includePubMed?: boolean;
}): Promise<Trial[]> {
  console.log(`SearchAgent called for disease: "${disease}", state: "${state}", includePubMed: ${includePubMed}`);
  
  try {
    const fromApi = await fetchTrialsReal({ 
      condition: disease, 
      state, 
      max: 25 
    });

    console.log(`ClinicalTrials.gov returned ${fromApi.length} trials`);

    if (fromApi.length === 0) {
      console.log(`No trials found for condition: "${disease}" in state: "${state || 'any'}"`);
      return [];
    }

    const scored: ScoredTrial[] = fromApi.map(t => {
      let score = 0;
      
      if (state && t.locations?.some(l => 
        l.toUpperCase().includes(`, ${state.toUpperCase()}`) ||
        l.toUpperCase().includes(`${state.toUpperCase()},`) ||
        l.toUpperCase().includes(`${state.toUpperCase()} `) ||
        l.toUpperCase().includes(`${state.toUpperCase()}`)
      )) {
        score += 3;
      }
      
      if (!state || ['US', 'USA', 'UNITED STATES'].includes(state.toUpperCase())) {
        if (t.locations?.some(l => /United States/i.test(l))) {
          score += 1;
        }
      }
      
      if (t.status && /recruiting|active|enrolling/i.test(t.status)) {
        score += 1;
      }
      
      if (t.eligibilityText && t.eligibilityText.length > 50) {
        score += 0.5;
      }

      return { ...t, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);
    const result = sorted.slice(0, 10);
    
    console.log(`Returning ${result.length} scored trials. Top scores:`, 
      result.slice(0, 3).map(t => ({ nctId: t.nctId, score: t.score, title: t.title.substring(0, 50) + '...' }))
    );

    return result.map(({ score, ...trial }) => trial);
    
  } catch (error) {
    console.error('SearchAgent error:', error);
    return [];
  }
}

export async function EnhancedSearchAgent({
  disease,
  state
}: {
  disease: string;
  state?: string;
}): Promise<EnhancedSearchResult> {
  console.log(`EnhancedSearchAgent called for: "${disease}"`);
  
  try {
    const [trials, publications] = await Promise.all([
      SearchAgent({ disease, state, includePubMed: false }),
      pubmedAgent.searchResearchByCondition(disease, 20)
    ]);
    
    console.log(`Enhanced search found: ${trials.length} trials, ${publications.articles.length} publications`);
    
    // Enrich trials with publication data
    let enrichedTrials: any[] = [];
    if (trials.length > 0) {
      enrichedTrials = await pubmedAgent.enrichTrialsWithPublications(trials);
      console.log(`Enriched ${enrichedTrials.length} trials with publication data`);
    }
    
    return {
      trials,
      publications,
      enrichedTrials
    };
  } catch (error) {
    console.error('EnhancedSearchAgent error:', error);
    return {
      trials: [],
      publications: { articles: [], totalCount: 0, query: disease },
      enrichedTrials: []
    };
  }
}