// PubMed Agent for RarePath

import { 
    searchPubMedByCondition, 
    searchPubMedByNCTId, 
    getPublicationsForTrials,
    type PubMedArticle,
    type PubMedSearchResult 
  } from '../lib/pubmed';
  import type { Trial } from '../lib/trials';
  
  export interface TrialWithPublications extends Trial {
    publications: PubMedArticle[];
    publicationCount: number;
    hasOutcomes: boolean;
    latestPublication?: PubMedArticle;
  }
  
  export interface ResearchInsights {
    totalPublications: number;
    studyTypes: Record<string, number>;
    topJournals: Array<{ journal: string; count: number }>;
    publicationTrend: Array<{ year: string; count: number }>;
    outcomeTrials: string[]; 
    leadingInvestigators: Array<{ name: string; count: number }>;
  }
  
  export class PubMedAgent {
    private cache: Map<string, any> = new Map();
    
    async searchResearchByCondition(
      condition: string, 
      maxResults: number = 20
    ): Promise<PubMedSearchResult> {
      const cacheKey = `condition:${condition}:${maxResults}`;
      
      if (this.cache.has(cacheKey)) {
        console.log(`Using cached PubMed results for: ${condition}`);
        return this.cache.get(cacheKey);
      }
      
      console.log(`PubMedAgent searching for: "${condition}"`);
      const result = await searchPubMedByCondition(condition, maxResults);
      
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
      
      return result;
    }
    
    async enrichTrialsWithPublications(trials: Trial[]): Promise<TrialWithPublications[]> {
      console.log(`Enriching ${trials.length} trials with publication data...`);
      
      const nctIds = trials.map(t => t.nctId);
      const publicationsMap = await getPublicationsForTrials(nctIds);
      
      return trials.map(trial => {
        const publications = publicationsMap[trial.nctId] || [];
        const hasOutcomes = this.hasOutcomePublications(publications);
        const latestPublication = this.getLatestPublication(publications);
        
        return {
          ...trial,
          publications,
          publicationCount: publications.length,
          hasOutcomes,
          latestPublication
        };
      });
    }
    
    generateResearchInsights(articles: PubMedArticle[]): ResearchInsights {
      console.log(`Generating research insights from ${articles.length} articles`);
      
      const studyTypes: Record<string, number> = {};
      articles.forEach(article => {
        const type = article.studyType || 'Unknown';
        studyTypes[type] = (studyTypes[type] || 0) + 1;
      });
      
      const journalCounts: Record<string, number> = {};
      articles.forEach(article => {
        if (article.journal) {
          journalCounts[article.journal] = (journalCounts[article.journal] || 0) + 1;
        }
      });
      
      const topJournals = Object.entries(journalCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([journal, count]) => ({ journal, count }));
      
      const yearCounts: Record<string, number> = {};
      articles.forEach(article => {
        const year = article.publishDate.split('-')[0];
        if (year && year !== '') {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      });
      
      const publicationTrend = Object.entries(yearCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, count]) => ({ year, count }));
      
      const outcomeTrials = [...new Set(
        articles
          .filter(article => this.isOutcomePublication(article))
          .flatMap(article => article.nctIds)
      )];
      
      const authorCounts: Record<string, number> = {};
      articles.forEach(article => {
        article.authors.forEach(author => {
          if (author) {
            authorCounts[author] = (authorCounts[author] || 0) + 1;
          }
        });
      });
      
      const leadingInvestigators = Object.entries(authorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([name, count]) => ({ name, count }));
      
      return {
        totalPublications: articles.length,
        studyTypes,
        topJournals,
        publicationTrend,
        outcomeTrials,
        leadingInvestigators
      };
    }
    

    async findSimilarTrials(
      targetCondition: string, 
      publications: PubMedArticle[]
    ): Promise<string[]> {
      const keywords = this.extractKeywords(publications);
      
      const searchQuery = [targetCondition, ...keywords.slice(0, 2)].join(' ');
      
      const searchResults = await this.searchResearchByCondition(
        searchQuery, 
        50
      );
      
      const similarNCTIds = [...new Set(
        searchResults.articles.flatMap(article => article.nctIds)
      )];
      
      return similarNCTIds;
    }
    
    async getTrialPublicationSummary(nctId: string): Promise<{
      publications: PubMedArticle[];
      summary: string;
      outcomeStatus: 'published' | 'pending' | 'unknown';
    }> {
      const publications = await searchPubMedByNCTId(nctId);
      
      const hasOutcomes = this.hasOutcomePublications(publications);
      const outcomeStatus = publications.length === 0 ? 'unknown' : 
                           hasOutcomes ? 'published' : 'pending';
      
      const summary = this.generatePublicationSummary(publications);
      
      return {
        publications,
        summary,
        outcomeStatus
      };
    }
    
    private hasOutcomePublications(publications: PubMedArticle[]): boolean {
      return publications.some(pub => this.isOutcomePublication(pub));
    }
    
    private isOutcomePublication(article: PubMedArticle): boolean {
      const text = `${article.title} ${article.abstract}`.toLowerCase();
      const outcomeKeywords = [
        'results', 'outcomes', 'efficacy', 'safety', 'endpoint',
        'primary outcome', 'secondary outcome', 'final analysis',
        'interim analysis', 'completed', 'follow-up'
      ];
      
      return outcomeKeywords.some(keyword => text.includes(keyword));
    }
    
    private getLatestPublication(publications: PubMedArticle[]): PubMedArticle | undefined {
      if (publications.length === 0) return undefined;
      
      return publications.sort((a, b) => 
        b.publishDate.localeCompare(a.publishDate)
      )[0];
    }
    
    private extractKeywords(publications: PubMedArticle[]): string[] {
      const allText = publications
        .map(pub => `${pub.title} ${pub.abstract}`)
        .join(' ')
        .toLowerCase();
      
      const commonWords = new Set([
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had',
        'study', 'trial', 'clinical', 'patients', 'treatment', 'therapy'
      ]);
      
      const words = allText
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.has(word));
      
      const wordCounts: Record<string, number> = {};
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
      
      return Object.entries(wordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
    }
    
    private generatePublicationSummary(publications: PubMedArticle[]): string {
      if (publications.length === 0) {
        return "No publications found for this trial.";
      }
      
      const outcomeCount = publications.filter(pub => this.isOutcomePublication(pub)).length;
      const latestYear = Math.max(...publications
        .map(pub => parseInt(pub.publishDate.split('-')[0]))
        .filter(year => !isNaN(year))
      );
      
      let summary = `${publications.length} publication${publications.length > 1 ? 's' : ''} found`;
      
      if (outcomeCount > 0) {
        summary += `, including ${outcomeCount} with outcome results`;
      }
      
      if (latestYear) {
        summary += `. Most recent publication: ${latestYear}`;
      }
      
      return summary + '.';
    }
  }
  
  export const pubmedAgent = new PubMedAgent();