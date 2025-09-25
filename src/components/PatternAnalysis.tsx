// PatternAnalysis with PubMed Research Trends

import { useState } from 'react';
import { Brain, TrendingUp, Users, MapPin, Clock, AlertTriangle, CheckCircle, Info, BookOpen, BarChart3 } from 'lucide-react';
import { PatternMiningEngine, TrialPattern, ResearchInsight, EligibilityPattern } from '../agents/patternMiningAgent';
import { pubmedAgent } from '../agents/pubmedAgent';

interface PatternAnalysisProps {
  condition: string;
  onAnalysisComplete?: (insights: any) => void;
}

interface ResearchTrends {
  totalPublications: number;
  recentGrowth: number;
  publicationsByYear: { year: string; count: number }[];
  topKeywords: string[];
  researchMomentum: 'accelerating' | 'stable' | 'declining';
  latestResearch: any[];
}

export function PatternAnalysis({ condition, onAnalysisComplete }: PatternAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    eligibilityPatterns: EligibilityPattern[];
    researchInsights: ResearchInsight[];
    patterns: TrialPattern[];
    researchTrends?: ResearchTrends;
  } | null>(null);
  const [progress, setProgress] = useState('');

  const analyzePublicationYears = (articles: any[]) => {
    const yearCounts: Record<string, number> = {};
    
    articles.forEach(article => {
      const year = article.publishDate?.split('-')[0];
      if (year && year.match(/^\d{4}$/)) {
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    return Object.entries(yearCounts)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  const calculateRecentGrowth = (publicationsByYear: { year: string; count: number }[]) => {
    const currentYear = new Date().getFullYear();
    const recent = publicationsByYear
      .filter(p => parseInt(p.year) >= currentYear - 2)
      .reduce((sum, p) => sum + p.count, 0);
    
    const previous = publicationsByYear
      .filter(p => parseInt(p.year) >= currentYear - 4 && parseInt(p.year) < currentYear - 2)
      .reduce((sum, p) => sum + p.count, 0);
    
    if (previous === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - previous) / previous) * 100);
  };

  const extractTopKeywords = (articles: any[]) => {
    const allText = articles
      .map(article => `${article.title || ''} ${article.abstract || ''}`)
      .join(' ')
      .toLowerCase();
    
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had',
      'study', 'trial', 'clinical', 'patients', 'treatment', 'therapy', 'disease',
      'results', 'analysis', 'data', 'methods', 'conclusion', 'background'
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
      .slice(0, 8)
      .map(([word]) => word);
  };

  const determineResearchMomentum = (recentGrowth: number): 'accelerating' | 'stable' | 'declining' => {
    if (recentGrowth > 20) return 'accelerating';
    if (recentGrowth < -20) return 'declining';
    return 'stable';
  };

  const analyzeResearchTrends = async (condition: string): Promise<ResearchTrends> => {
    console.log('🔬 Analyzing PubMed research trends...');
    
    try {
      // Get research articles from PubMed
      const pubmedResult = await pubmedAgent.searchResearchByCondition(condition, 50);
      
      if (!pubmedResult || pubmedResult.articles.length === 0) {
        return {
          totalPublications: 0,
          recentGrowth: 0,
          publicationsByYear: [],
          topKeywords: [],
          researchMomentum: 'stable',
          latestResearch: []
        };
      }

      const publicationsByYear = analyzePublicationYears(pubmedResult.articles);
      
      const recentGrowth = calculateRecentGrowth(publicationsByYear);
      
      const topKeywords = extractTopKeywords(pubmedResult.articles);
      
      const researchMomentum = determineResearchMomentum(recentGrowth);
      
      return {
        totalPublications: pubmedResult.totalCount || 0,
        recentGrowth,
        publicationsByYear,
        topKeywords,
        researchMomentum,
        latestResearch: pubmedResult.articles.slice(0, 5)
      };
    } catch (error) {
      console.error('Error analyzing research trends:', error);
      return {
        totalPublications: 0,
        recentGrowth: 0,
        publicationsByYear: [],
        topKeywords: [],
        researchMomentum: 'stable',
        latestResearch: []
      };
    }
  };

  const runPatternAnalysis = async () => {
    if (!condition.trim()) return;
    
    setIsAnalyzing(true);
    setProgress('Initializing pattern mining engine...');
    
    try {
      const engine = new PatternMiningEngine();
      
      setProgress('Fetching comprehensive trial dataset...');
      const trialResults = await engine.minePatterns(condition, 500);
      
      setProgress('Analyzing PubMed research trends...');
      const researchTrends = await analyzeResearchTrends(condition);
      
      setProgress('Analysis complete!');
      
      const enhancedResults = {
        ...trialResults,
        researchTrends
      };
      
      setAnalysis(enhancedResults);
      onAnalysisComplete?.(enhancedResults);
      
    } catch (error) {
      console.error('Pattern analysis failed:', error);
      setProgress('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getInsightIcon = (category: string) => {
    switch (category) {
      case 'trend': return <TrendingUp className="h-5 w-5" />;
      case 'opportunity': return <CheckCircle className="h-5 w-5" />;
      case 'risk': return <AlertTriangle className="h-5 w-5" />;
      case 'gap': return <Info className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getInsightStyles = (category: string) => {
    switch (category) {
      case 'trend': return {
        borderColor: 'border-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600'
      };
      case 'opportunity': return {
        borderColor: 'border-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-600'
      };
      case 'risk': return {
        borderColor: 'border-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-600'
      };
      case 'gap': return {
        borderColor: 'border-yellow-500',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-600'
      };
      default: return {
        borderColor: 'border-gray-500',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600'
      };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMomentumColor = (momentum: string) => {
    switch (momentum) {
      case 'accelerating': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* FIXED: Removed duplicate title - keeping only the main header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI Pattern Analysis</h2>
          <p className="text-sm text-gray-600">Discover hidden patterns, trends, and insights across clinical trial landscapes and research trends using advanced AI analysis.</p>
        </div>
      </div>

      {!analysis && (
        <div className="text-center py-8">
          <button
            onClick={runPatternAnalysis}
            disabled={isAnalyzing || !condition.trim()}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className="h-5 w-5" />
            {isAnalyzing ? 'Analyzing Patterns...' : 'Analyze Patterns & Research Trends'}
          </button>
          
          {isAnalyzing && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">{progress}</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4 max-w-md mx-auto">
            Click the button above to start the comprehensive analysis.
          </p>
        </div>
      )}

      {analysis && (
        <div className="space-y-8">
          {/* Research Trends Section */}
          {analysis.researchTrends && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                PubMed Research Trends
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total Publications</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">
                    {analysis.researchTrends.totalPublications.toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Research articles found</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Recent Growth</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    {analysis.researchTrends.recentGrowth > 0 ? '+' : ''}{analysis.researchTrends.recentGrowth}%
                  </div>
                  <div className="text-xs text-green-600 mt-1">Last 2 years vs previous 2</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Research Momentum</span>
                  </div>
                  <div className={`text-2xl font-bold capitalize ${getMomentumColor(analysis.researchTrends.researchMomentum)}`}>
                    {analysis.researchTrends.researchMomentum}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">Publication trend</div>
                </div>
              </div>

              {/* Hot Keywords */}
              {analysis.researchTrends.topKeywords.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">🔥 Hot Research Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.researchTrends.topKeywords.map((keyword, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest Research Preview */}
              {analysis.researchTrends.latestResearch.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3">📚 Latest Research Highlights</h4>
                  <div className="space-y-2">
                    {analysis.researchTrends.latestResearch.slice(0, 3).map((article, idx) => (
                      <div key={idx} className="bg-white rounded p-3">
                        <a 
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:text-blue-900 font-medium text-sm hover:underline block"
                        >
                          {article.title}
                        </a>
                        <div className="text-xs text-gray-600 mt-1">
                          {article.authors?.[0]} et al. • {article.journal} • {article.publishDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Research Insights Section - FIXED */}
          {analysis.researchInsights && analysis.researchInsights.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Clinical Trial Insights
              </h3>
              
              <div className="grid gap-4">
                {analysis.researchInsights.map((insight, idx) => {
                  const styles = getInsightStyles(insight.category);
                  return (
                    <div key={idx} className={`border-l-4 ${styles.borderColor} ${styles.bgColor} p-4 rounded-r-lg`}>
                      <div className="flex items-start gap-3">
                        <div className={`${styles.textColor} mt-0.5`}>
                          {getInsightIcon(insight.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full bg-white ${getConfidenceColor(insight.confidence)}`}>
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </div>
                          
                          <p className="text-gray-700 mb-3">{insight.description}</p>
                          
                          {insight.evidence && insight.evidence.length > 0 && (
                            <div className="text-xs text-gray-600">
                              <strong>Evidence:</strong> {insight.evidence.join(', ')}
                            </div>
                          )}
                          
                          {insight.actionable && insight.recommendation && (
                            <div className="mt-2 p-2 bg-white rounded text-sm">
                              <strong className="text-gray-900">Recommendation:</strong> {insight.recommendation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Eligibility Patterns */}
          {analysis.eligibilityPatterns && analysis.eligibilityPatterns.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Eligibility Patterns
              </h3>
              
              <div className="grid gap-6">
                {analysis.eligibilityPatterns.map((pattern, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Age Requirements</h4>
                        <p className="text-sm text-gray-600">Analysis of {pattern.totalTrials} trials</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{pattern.agePatterns.minAge}</div>
                        <div className="text-sm text-gray-600">Minimum Age</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{pattern.agePatterns.maxAge}</div>
                        <div className="text-sm text-gray-600">Maximum Age</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Most Common Range</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {pattern.agePatterns.mostCommonRange[0]} - {pattern.agePatterns.mostCommonRange[1]} years
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {pattern.geneticRequirements && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-medium text-gray-900 mb-2">Genetic Requirements</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Genetic Confirmation:</span>
                              <span className={`font-medium ${pattern.geneticRequirements.required ? 
                                'text-red-600' : 'text-green-600'}`}>
                                {pattern.geneticRequirements.required ? 'Usually Required' : 'Often Optional'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Frequency:</span>
                              <span className="font-medium">{Math.round(pattern.geneticRequirements.frequency * 100)}% of trials</span>
                            </div>
                            {pattern.geneticRequirements.specificMutations.length > 0 && (
                              <div>
                                <span className="text-gray-600">Common mutations:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {pattern.geneticRequirements.specificMutations.slice(0, 5).map((mutation, mutIdx) => (
                                    <span key={mutIdx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                      {mutation}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Trial Patterns */}
          {analysis.patterns && analysis.patterns.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                Cross-Trial Patterns
              </h3>
              
              <div className="space-y-4">
                {analysis.patterns.map((pattern, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 capitalize">{pattern.patternType} Pattern</h4>
                      <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getConfidenceColor(pattern.confidence)}`}>
                        {Math.round(pattern.confidence * 100)}% confidence
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded mb-2">
                        {pattern.pattern}
                      </span>
                      <p className="text-gray-700">{pattern.insight}</p>
                    </div>
                    
                    {pattern.recommendation && (
                      <div className="bg-purple-50 rounded p-3">
                        <p className="text-sm text-purple-800">
                          <strong>Recommendation:</strong> {pattern.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}