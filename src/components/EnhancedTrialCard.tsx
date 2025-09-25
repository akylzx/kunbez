// Advanced trial result card for detailed clinical matching

import React, { useState } from 'react';
import { Trial } from '../lib/trials';
import { EnhancedEligibilityDecision, CriterionResult } from '../types/clinicalProfile';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  Star,
  MapPin,
  Activity,
  TestTube,
  Heart,
  AlertTriangle,
  User,
  BookOpen  
} from 'lucide-react';


interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publishDate: string;
  abstract?: string;
  url: string;
}

interface EnhancedTrialCardProps {
  trial: Trial;
  eligibility: EnhancedEligibilityDecision;
  explanation: string;
  researchContext?: PubMedArticle[];  
  onSave?: (trial: Trial) => void;
  isSaved?: boolean;
  onEmailDraft?: (trial: Trial) => void;
}

const ResearchInsights: React.FC<{
  articles: PubMedArticle[];
  condition: string;
  isExpanded?: boolean;
}> = ({ articles, condition, isExpanded = false }) => {
  const [showAll, setShowAll] = useState(isExpanded);
  
  if (!articles || articles.length === 0) {
    return null;
  }

  const displayArticles = showAll ? articles : articles.slice(0, 2);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mt-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Latest Research
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            {articles.length} studies
          </span>
        </h4>
        {articles.length > 2 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAll ? 'Show less' : `Show all ${articles.length}`}
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {displayArticles.map((article, idx) => (
          <div key={article.pmid || idx} className="bg-white/60 rounded-lg p-3 border border-blue-100">
            <a 
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:text-blue-900 font-medium text-sm hover:underline block mb-1"
            >
              {article.title}
            </a>
            <div className="text-blue-600 text-xs mb-2">
              {article.authors?.[0]} {article.authors?.length > 1 ? 'et al.' : ''} • {article.journal} • {article.publishDate}
            </div>
            {article.abstract && (
              <p className="text-gray-700 text-xs line-clamp-2">
                {article.abstract.substring(0, 150)}...
              </p>
            )}
          </div>
        ))}
      </div>
      
      {articles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-700">
            💡 These studies provide scientific context for treatment approaches in {condition}
          </p>
        </div>
      )}
    </div>
  );
};

export const EnhancedTrialCard: React.FC<EnhancedTrialCardProps> = ({
  trial,
  eligibility,
  explanation,
  researchContext,  
  onSave,
  isSaved = false,
  onEmailDraft
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'criteria' | 'details' | 'research'>('summary'); 

  const getBandColor = (band: string) => {
    switch (band) {
      case 'High': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCriterionIcon = (criterion: CriterionResult) => {
    if (criterion.status === 'hit') {
      return criterion.intent === 'include' 
        ? <CheckCircle className="h-4 w-4 text-green-600" />
        : <XCircle className="h-4 w-4 text-red-600" />;
    } else if (criterion.status === 'miss') {
      return criterion.intent === 'include'
        ? <XCircle className="h-4 w-4 text-red-600" />
        : <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getCriterionColor = (criterion: CriterionResult) => {
    if (criterion.status === 'hit') {
      return criterion.intent === 'include' ? 'text-green-700' : 'text-red-700';
    } else if (criterion.status === 'miss') {
      return criterion.intent === 'include' ? 'text-red-700' : 'text-green-700';
    } else {
      return 'text-yellow-700';
    }
  };

  const groupCriteriaByType = (criteria: CriterionResult[]) => {
    const groups: Record<string, CriterionResult[]> = {
      demographics: [],
      performance: [],
      labs: [],
      medical: [],
      other: []
    };

    criteria.forEach(criterion => {
      switch (criterion.criterion) {
        case 'age':
          groups.demographics.push(criterion);
          break;
        case 'ecog':
        case 'prior_therapy_exclusion':
          groups.performance.push(criterion);
          break;
        case 'anc':
        case 'platelets':
        case 'hemoglobin':
        case 'ast':
        case 'alt':
        case 'bilirubin':
        case 'creatinine':
          groups.labs.push(criterion);
          break;
        case 'genetic':
        case 'pregnancy_exclusion':
        case 'hbv':
        case 'hcv':
        case 'hiv':
          groups.medical.push(criterion);
          break;
        default:
          groups.other.push(criterion);
      }
    });

    return groups;
  };

  const criteriaGroups = groupCriteriaByType(eligibility.criteria);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getBandColor(eligibility.band)}`}>
                {eligibility.band} Match
              </span>
              <span className="text-sm text-gray-500">Score: {eligibility.score.toFixed(1)}</span>
              {trial.phase && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  {trial.phase}
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {trial.title}
            </h3>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="font-mono">{trial.nctId}</span>
              {trial.locations && trial.locations.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {trial.locations[0]}
                  {trial.locations.length > 1 && ` +${trial.locations.length - 1} more`}
                </span>
              )}
            </div>

            <p className="text-gray-700">{explanation}</p>

            {/* ADD RESEARCH PREVIEW IN HEADER */}
            {researchContext && researchContext.length > 0 && !isExpanded && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">{researchContext.length} research articles available</span>
                  <span className="text-blue-600">• Click to explore research context</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {onSave && (
              <button
                onClick={() => onSave(trial)}
                className={`p-2 rounded-lg transition-colors ${
                  isSaved 
                    ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' 
                    : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                }`}
              >
                <Star className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Hard Failures Warning */}
        {eligibility.hardFailures.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Exclusion Criteria Met</span>
            </div>
            <ul className="mt-1 text-sm text-red-700 space-y-1">
              {eligibility.hardFailures.map((failure, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {failure.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up Question */}
        {eligibility.followUpQuestion && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Additional Information Needed</span>
            </div>
            <p className="mt-1 text-sm text-blue-700">{eligibility.followUpQuestion}</p>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Tab Navigation - ADD RESEARCH TAB */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'summary', label: 'Summary', icon: Activity },
              { id: 'criteria', label: 'Criteria Details', icon: TestTube },
              { id: 'details', label: 'Trial Details', icon: Heart },
              ...(researchContext && researchContext.length > 0 ? [{ id: 'research', label: 'Research Context', icon: BookOpen }] : [])  // CONDITIONALLY ADD RESEARCH TAB
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === 'research' && researchContext && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {researchContext.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'summary' && (
              <div className="space-y-4">
                {/* Reasons */}
                {eligibility.reasons.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Why This Trial Matches
                    </h4>
                    <ul className="space-y-1">
                      {eligibility.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-green-700 flex items-center gap-2">
                          <span className="w-1 h-1 bg-green-600 rounded-full"></span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Uncertainties */}
                {eligibility.uncertainties.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Areas of Uncertainty
                    </h4>
                    <ul className="space-y-1">
                      {eligibility.uncertainties.map((uncertainty, idx) => (
                        <li key={idx} className="text-sm text-yellow-700 flex items-center gap-2">
                          <span className="w-1 h-1 bg-yellow-600 rounded-full"></span>
                          {uncertainty}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'criteria' && (
              <div className="space-y-6">
                {Object.entries(criteriaGroups).map(([groupName, criteria]) => {
                  if (criteria.length === 0) return null;
                  
                  const groupIcons = {
                    demographics: User,
                    performance: Activity,
                    labs: TestTube,
                    medical: Heart,
                    other: AlertTriangle
                  };
                  
                  const Icon = groupIcons[groupName as keyof typeof groupIcons];
                  
                  return (
                    <div key={groupName}>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2 capitalize">
                        <Icon className="h-4 w-4" />
                        {groupName}
                      </h4>
                      
                      <div className="space-y-2">
                        {criteria.map((criterion, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            {getCriterionIcon(criterion)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 capitalize">
                                  {criterion.criterion.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {Math.round(criterion.confidence * 100)}% confidence
                                </span>
                              </div>
                              <p className={`text-sm mt-1 ${getCriterionColor(criterion)}`}>
                                {criterion.reason}
                              </p>
                              {criterion.extractedValue && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Trial requirement: {criterion.extractedValue}
                                </p>
                              )}
                              {criterion.patientValue && criterion.patientValue !== 'unknown' && (
                                <p className="text-xs text-gray-500">
                                  Patient value: {criterion.patientValue}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-4">
                {trial.eligibilityText && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Eligibility Criteria</h4>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                      {trial.eligibilityText}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trial.minAgeYears !== undefined && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Minimum Age</span>
                      <p className="text-gray-900">{trial.minAgeYears} years</p>
                    </div>
                  )}
                  
                  {trial.maxAgeYears !== undefined && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Maximum Age</span>
                      <p className="text-gray-900">{trial.maxAgeYears} years</p>
                    </div>
                  )}
                  
                  {trial.status && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status</span>
                      <p className="text-gray-900 capitalize">{trial.status}</p>
                    </div>
                  )}
                </div>

                {trial.locations && trial.locations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Locations</h4>
                    <div className="space-y-1">
                      {trial.locations.map((location, idx) => (
                        <p key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {location}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ADD RESEARCH TAB CONTENT */}
            {activeTab === 'research' && researchContext && (
              <div>
                <ResearchInsights 
                  articles={researchContext} 
                  condition={trial.title}
                  isExpanded={true}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <a
                  href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on ClinicalTrials.gov
                </a>
              </div>
              
              {onEmailDraft && (
                <button
                  onClick={() => onEmailDraft(trial)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Draft Email to Coordinator
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};