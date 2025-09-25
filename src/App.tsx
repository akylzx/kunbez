import React, { useState, useEffect } from 'react'
import {
  Search,
  MapPin,
  Copy,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Globe,
  Brain,
  BarChart3,
  Users,
  TrendingUp,
  Target,
  Star,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Share2,
  Bell,
  Trash2,
  Download,
  BookOpen,
} from 'lucide-react'
import { SearchAgent } from './agents/searchAgent'
import { EligibilityAgent, EligibilityAgentV2, type PatientInput, type EligibilityDecision } from './agents/eligibilityAgent'
import { ReasoningAgent } from './agents/reasoningAgent'
import { PatternAnalysis } from './components/PatternAnalysis'
import { KnowledgeGraph } from './components/KnowledgeGraph'
import { type Trial } from './lib/trials'
import { EnhancedEligibilityDecision } from './types/clinicalProfile'

import {
  isSaved,
  toggleSave,
  getSavedTrials,
  getAlerts,
  checkSavedTrials
} from './agents/watchlistAgent'
import type { SavedTrial, WatchEvent } from './agents/watchlistAgent'
import { EnhancedIntakeForm } from './components/EnhancedIntakeForm'
import { EnhancedTrialCard } from './components/EnhancedTrialCard'
import { ClinicalPatientProfile } from './types/clinicalProfile'
import { pubmedAgent } from './agents/pubmedAgent'

import './App.css'


interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publishDate: string;
  abstract?: string;
  url: string;
}

type TrialResult = {
  trial: Trial;
  eligibility: EligibilityDecision | EnhancedEligibilityDecision;
  explanation: string;
  researchContext?: PubMedArticle[];
}


const ResearchInsights: React.FC<{
  articles: PubMedArticle[];
  condition: string;
  isExpanded?: boolean;
}> = ({ articles, condition, isExpanded = false }) => {
  const [showAll, setShowAll] = useState(isExpanded)

  console.log(`ResearchInsights: ${articles?.length || 0} articles for ${condition}`)

  if (!articles || articles.length === 0) {
    console.log('No articles to display')
    return null
  }

  const displayArticles = showAll ? articles : articles.slice(0, 2)

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
            onClick={() => {
              console.log(`Toggling research display: ${showAll} -> ${!showAll}`)
              setShowAll(!showAll)
            }}
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
  )
}


type ViewMode = 'search' | 'patterns' | 'network';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('search')
  const [disease, setDisease] = useState("")
  const [state, setState] = useState("")

  const [clinicalProfile, setClinicalProfile] = useState<ClinicalPatientProfile>({
    diagnosis: disease,
    ageYears: undefined,
    sexAtBirth: 'unknown',
    genotypeKnown: 'unknown',
    priorTherapy: 'unknown',
    performance: {},
    labs: {},
    contraindications: []
  })

  const [useEnhancedMatching, setUseEnhancedMatching] = useState(false)

  const [results, setResults] = useState<TrialResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [expandedTrials, setExpandedTrials] = useState<Set<string>>(new Set())

  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const [savedList, setSavedList] = useState<SavedTrial[]>(getSavedTrials())
  const [alerts, setAlerts] = useState<WatchEvent[]>(getAlerts())
  const [alertCount, setAlertCount] = useState<number>(alerts.length)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    const m: Record<string, boolean> = {}
    getSavedTrials().forEach(t => { m[t.nctId] = true })
    setSavedMap(m)
    setSavedList(getSavedTrials())
    const currentAlerts = getAlerts()
    setAlerts(currentAlerts)
    setAlertCount(currentAlerts.length)

    const run = async () => {
      try {
        const events = await checkSavedTrials({ state })
        if (events.length) {
          const next = getAlerts()
          setAlerts(next)
          setAlertCount(next.length)
        }
      } catch (e) {
        console.warn('watcher error', e)
      }
    }
    run()
    const id = window.setInterval(run, 3 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [state])

  useEffect(() => {
    if (showSaved) setSavedList(getSavedTrials())
  }, [showSaved])

  const handleDemoMode = () => {
    console.log('🎯 Loading Example 1: Duchenne Muscular Dystrophy')

    const duchennProfile: ClinicalPatientProfile = {
      diagnosis: "Duchenne Muscular Dystrophy",
      ageYears: 8,
      sexAtBirth: 'male',
      genotypeKnown: 'yes',
      priorTherapy: 'no',

      diseaseStage: 'intermediate',
      gene: 'DMD',
      variantZygosity: 'hemizygous',
      performance: {
        ECOG: 1,
        Karnofsky: 80
      },

      linesOfTherapy: 0,
      washoutDays: 0,
      radiotherapyWithinDays: undefined,
      pregnant: 'unknown',
      lactating: 'unknown',
      contraception: 'not_applicable',

      labs: {
        anc: 3.5,
        platelets: 250,
        hemoglobin: 12.5,
        creatinineCl: 120,
        eGFR: 110,
        ast: 25,
        alt: 20,
        bilirubin: 0.5,
        albumin: 4.2,
        lvefPct: 60,
        qtcF: 400
      },

      hbv: 'negative',
      hcv: 'negative',
      hiv: 'negative',
      cnsMets: 'no',
      seizures: 'no',

      strongCYP3A: 'no',
      anticoagulants: 'no',
      qtProlonging: 'no',

      contraindications: []
    }

    setDisease("Duchenne Muscular Dystrophy")
    setState("CA")
    setClinicalProfile(duchennProfile)

    console.log('✅ Example 1 profile loaded - ready for both simple and enhanced matching')
  }

  const fillEnhancedDemoProfile = () => {
    console.log('🎯 Loading Example 2: AML FLT3+ Demo Profile...')

    const demoProfile: ClinicalPatientProfile = {
      ageYears: 52,
      sexAtBirth: 'female',
      diagnosis: 'Acute Myeloid Leukemia',
      diagnosisCodes: { icd10: ['C92.0'], omim: ['601626'] },
      gene: 'FLT3',
      variantZygosity: 'heterozygous',
      diseaseStage: 'intermediate',
      performance: { ECOG: 1, Karnofsky: 80 },
      linesOfTherapy: 1,
      washoutDays: 28,
      radiotherapyWithinDays: 90,
      priorTherapy: 'yes',
      genotypeKnown: 'yes',
      pregnant: 'no',
      lactating: 'no',
      contraception: 'adequate',
      labs: {
        anc: 1.2,
        platelets: 85,
        hemoglobin: 9.8,
        creatinineCl: 95,
        eGFR: 92,
        ast: 28,
        alt: 32,
        bilirubin: 0.8,
        inr: 1.1,
        albumin: 3.8,
        lvefPct: 58,
        qtcF: 420
      },
      hbv: 'negative',
      hcv: 'negative',
      hiv: 'negative',
      cnsMets: 'no',
      seizures: 'no',
      strongCYP3A: 'no',
      anticoagulants: 'no',
      qtProlonging: 'no',
      contraindications: []
    }

    setUseEnhancedMatching(true)
    setClinicalProfile(demoProfile)
    setDisease('Acute Myeloid Leukemia')
    setState('CA')

    console.log('✅ Example 2 profile loaded with enhanced matching enabled')
  }

  const handleFindTrials = async () => {
    console.log('🧪 STARTING PubMed research capture...')
    console.log('🔍 Searching for condition:', clinicalProfile.diagnosis || disease)

    let researchContext: { articles: PubMedArticle[] } | null = null
    try {
      console.log('📡 Making PubMed API call...')

      const searchTerm = (clinicalProfile.diagnosis || disease || '').trim()
      let maxResults = 20
      if (searchTerm.toLowerCase().includes('cancer') || searchTerm.toLowerCase().includes('leukemia')) {
        maxResults = 25
      } else if (searchTerm.toLowerCase().includes('duchenne') || searchTerm.toLowerCase().includes('rare')) {
        maxResults = 15
      }

      const pubmedResult = await pubmedAgent.searchResearchByCondition(
        searchTerm,
        maxResults
      )
      console.log(`✅ PubMed API returned ${pubmedResult.articles.length} articles (requested ${maxResults})`)
      researchContext = pubmedResult
    } catch (error) {
      console.error('❌ PubMed research capture FAILED:', error)
    }

    setIsLoading(true)
    setResults([])
    setHasSearched(false)

    try {
      const trials = await SearchAgent({ disease: clinicalProfile.diagnosis || disease, state })
      setHasSearched(true)

      if (trials.length === 0) {
        setResults([])
        return
      }

      const trialResults: TrialResult[] = trials.map(trial => {
        const eligibility = useEnhancedMatching
          ? EligibilityAgentV2(clinicalProfile, trial)
          : EligibilityAgent(
              {
                ageYears: clinicalProfile.ageYears,
                genotypeKnown: clinicalProfile.genotypeKnown,
                priorTherapy: clinicalProfile.priorTherapy
              } as PatientInput,
              trial
            )

        const explanation = ReasoningAgent(trial, eligibility)

        console.log(`Trial ${trial.nctId}: ${researchContext?.articles?.length || 0} research articles`)

        return {
          trial,
          eligibility,
          explanation,
          researchContext: researchContext?.articles || []
        }
      })

      setResults(trialResults)

      const nextSaved: Record<string, boolean> = {}
      trialResults.forEach((r: any) => { nextSaved[r.trial.nctId] = isSaved(r.trial.nctId) })
      setSavedMap(nextSaved)
    } catch (error) {
      console.error('Error finding trials:', error)
      setHasSearched(true)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAnswer = (field: "genotypeKnown" | "priorTherapy", value: "yes" | "no") => {
    const updatedProfile: ClinicalPatientProfile = { ...clinicalProfile, [field]: value }
    setClinicalProfile(updatedProfile)

    const updatedResults = results.map(result => {
      const eligibility = useEnhancedMatching
        ? EligibilityAgentV2(updatedProfile, result.trial)
        : EligibilityAgent({
            ageYears: updatedProfile.ageYears,
            genotypeKnown: updatedProfile.genotypeKnown,
            priorTherapy: updatedProfile.priorTherapy
          } as PatientInput, result.trial)
      const explanation = ReasoningAgent(result.trial, eligibility)
      return { ...result, eligibility, explanation }
    })
    setResults(updatedResults)
  }

  const toggleTrialExpansion = (nctId: string) => {
    setExpandedTrials(prev => {
      const s = new Set(prev)
      s.has(nctId) ? s.delete(nctId) : s.add(nctId)
      return s
    })
  }

  const openEmailDraft = (trialLike: { nctId: string; title?: string }) => {
    const subject = `Inquiry about clinical trial ${trialLike.nctId}`
    const body = `Dear Study Coordinator,

I am writing to inquire about potential eligibility for the clinical trial "${trialLike.title || '[Title]'}" (${trialLike.nctId}).

Patient Profile:
- Disease: ${clinicalProfile.diagnosis || disease}
- Age: ${clinicalProfile.ageYears ?? '[Age not provided]'} years
- Location: ${state || '[Location not provided]'}
- Genetic diagnosis confirmed: ${clinicalProfile.genotypeKnown === 'yes' ? 'Yes' : clinicalProfile.genotypeKnown === 'no' ? 'No' : 'Unknown'}
- Prior disease-specific therapy: ${clinicalProfile.priorTherapy === 'yes' ? 'Yes' : clinicalProfile.priorTherapy === 'no' ? 'No' : 'Unknown'}

Could you please provide information about:
1. Current enrollment status
2. Detailed eligibility requirements
3. Next steps for potential participation

Thank you for your time and consideration.

Best regards,
[Your name and contact information]`
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink, '_self')
  }

  const handleToggleSave = (trial: Trial) => {
    const nowSaved = toggleSave(trial)
    setSavedMap(prev => ({ ...prev, [trial.nctId]: nowSaved }))
    setSavedList(getSavedTrials())
  }

  const handleClearAlerts = () => {
    try { localStorage.setItem('rarepath_alerts', '[]') } catch {}
    setAlerts([])
    setAlertCount(0)
  }

  const exportSavedCsv = () => {
    const rows = getSavedTrials()
    if (!rows.length) return
    const header = ['NCT ID','Title','Status','Locations','Phase']
    const lines = [header.join(',')].concat(
      rows.map(r => [
        r.nctId,
        JSON.stringify(r.title || ''),
        r.status || '',
        JSON.stringify((r.locations || []).join(' | ')),
        ''
      ].join(','))
    )
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'rarepath_saved_trials.csv'
    a.click()
  }

  const getEmptyStateMessage = () => {
    if (state) {
      return {
        title: `No trials found in ${state}`,
        description: `We couldn't find any active clinical trials for "${clinicalProfile.diagnosis || disease}" in ${state}. Try searching without location filters or consider nearby regions.`,
        suggestions: [
          "Remove the location filter to see trials globally",
          "Try searching for a broader condition name",
          "Check for trials in nearby states or countries"
        ]
      }
    } else {
      return {
        title: "No trials found",
        description: `We couldn't find any active clinical trials for "${clinicalProfile.diagnosis || disease}". This could mean there are currently no recruiting trials for this specific condition.`,
        suggestions: [
          "Try alternative condition names or spellings",
          "Search for the broader disease category",
          "Consider related conditions or synonyms",
          "Check back later as new trials are added regularly"
        ]
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 pointer-events-none"></div>
        <div className="relative max-w-6xl mx-auto py-12 px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                kunbez
              </h1>
            </div>
            <p className="text-xl text-gray-700 mb-2">AI-Powered Clinical Trial Intelligence</p>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover trials, analyze research patterns, and unlock insights across thousands of studies
            </p>
            <div className="flex justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">500+</div>
                <div className="text-sm text-gray-600">Trials Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">15+</div>
                <div className="text-sm text-gray-600">Disease Areas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">95%</div>
                <div className="text-sm text-gray-600">Accuracy Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-2 flex">
            <button
              onClick={() => setViewMode('search')}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium ${
                viewMode === 'search' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Search className="h-5 w-5" />
              Trial Discovery
              {viewMode === 'search' && <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>}
            </button>
            <button
              onClick={() => setViewMode('patterns')}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium ${
                viewMode === 'patterns' 
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Brain className="h-5 w-5" />
              Pattern Analysis
              {viewMode === 'patterns' && <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>}
            </button>
            <button
              onClick={() => setViewMode('network')}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium ${
                viewMode === 'network' 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Share2 className="h-5 w-5" />
              Knowledge Graph
              {viewMode === 'network' && <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>}
            </button>
          </div>
        </div>

        {/* Intake section */}
        {viewMode === 'search' && (
          <div className="space-y-6">
            {/* Toggle for enhanced vs legacy */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useEnhancedMatching}
                  onChange={(e) => {
                    const willUseEnhanced = e.target.checked
                    console.log(`Switching to ${willUseEnhanced ? 'enhanced' : 'simple'} matching mode`)

                    if (willUseEnhanced && (!clinicalProfile.labs || Object.keys(clinicalProfile.labs).length === 0)) {
                      console.log('Enhancing profile for advanced matching...')

                      const enhancedProfile: ClinicalPatientProfile = {
                        ...clinicalProfile,

                        performance: clinicalProfile.performance || {
                          ECOG: clinicalProfile.ageYears && clinicalProfile.ageYears < 18 ? 1 : 0,
                          Karnofsky: clinicalProfile.ageYears && clinicalProfile.ageYears < 18 ? 80 : 90
                        },

                        labs: clinicalProfile.labs || {
                          anc: clinicalProfile.ageYears && clinicalProfile.ageYears < 18 ? 3.5 : 2.0,
                          platelets: 250,
                          hemoglobin: clinicalProfile.ageYears && clinicalProfile.ageYears < 18 ? 12.5 : 14.0,
                          creatinineCl: clinicalProfile.ageYears && clinicalProfile.ageYears < 18 ? 120 : 90,
                          eGFR: clinicalProfile.ageYears && clinicalProfile.ageYears < 18 ? 110 : 85,
                          ast: 25,
                          alt: 22,
                          bilirubin: 0.7,
                          albumin: 4.0,
                          lvefPct: 60,
                          qtcF: 420
                        },

                        hbv: clinicalProfile.hbv || 'negative',
                        hcv: clinicalProfile.hcv || 'negative',
                        hiv: clinicalProfile.hiv || 'negative',
                        cnsMets: clinicalProfile.cnsMets || 'no',
                        seizures: clinicalProfile.seizures || 'no',
                        strongCYP3A: clinicalProfile.strongCYP3A || 'no',
                        anticoagulants: clinicalProfile.anticoagulants || 'no',
                        qtProlonging: clinicalProfile.qtProlonging || 'no',

                        pregnant: clinicalProfile.pregnant || (
                          clinicalProfile.sexAtBirth === 'female' &&
                          clinicalProfile.ageYears &&
                          clinicalProfile.ageYears >= 12 ? 'unknown' : 'unknown'
                        ),
                        lactating: clinicalProfile.lactating || 'unknown',
                        contraception: clinicalProfile.contraception || 'unknown',

                        contraindications: clinicalProfile.contraindications || []
                      }

                      setClinicalProfile(enhancedProfile)
                      console.log('✅ Profile enhanced for advanced matching')
                    }

                    setUseEnhancedMatching(willUseEnhanced)
                  }}
                  className="rounded"
                />
                <span className="text-sm font-medium text-blue-900">
                  Use Advanced Clinical Matching
                </span>
              </label>
              <span className="text-xs text-blue-700">
                {useEnhancedMatching ? 'Advanced medical criteria evaluation' : 'Simple matching'}
              </span>
            </div>

            {useEnhancedMatching ? (
              <EnhancedIntakeForm
                onSubmit={(profile) => {
                  setClinicalProfile(profile)
                  if (profile.diagnosis) setDisease(profile.diagnosis)
                  if (profile.diagnosis) handleFindTrials()
                }}
                initialProfile={clinicalProfile}
                isLoading={isLoading}
              />
            ) : (
              // Legacy simple form 
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Patient Profile</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Disease/Condition
                    </label>
                    <input
                      type="text"
                      value={disease}
                      onChange={(e) => {
                        setDisease(e.target.value)
                        setClinicalProfile(p => ({ ...p, diagnosis: e.target.value }))
                      }}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/50"
                      placeholder="e.g., Niemann-Pick disease type C"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all duration-200 bg-white/50"
                      placeholder="e.g., CA, NY, France"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Age (years)</label>
                    <input
                      type="number"
                      value={clinicalProfile.ageYears ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined
                        setClinicalProfile(p => ({ ...p, ageYears: val }))
                      }}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 bg-white/50"
                      placeholder="e.g., 12"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Genetic diagnosis confirmed?</label>
                    <select
                      value={clinicalProfile.genotypeKnown}
                      onChange={(e) => setClinicalProfile(p => ({ ...p, genotypeKnown: e.target.value as any }))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 bg-white/50"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Prior disease-specific therapy?</label>
                    <select
                      value={clinicalProfile.priorTherapy}
                      onChange={(e) => setClinicalProfile(p => ({ ...p, priorTherapy: e.target.value as any }))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 bg-white/50"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={handleFindTrials}
                disabled={isLoading || !(clinicalProfile.diagnosis || disease).trim()}
                className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-xl font-semibold"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Finding trials...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 group-hover:rotate-12 transition-transform duration-200" />
                    Find Trials
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </button>

              {/* Example 2 (AML) */}
              <button
                onClick={fillEnhancedDemoProfile}
                className="flex items-center gap-2 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-white hover:border-gray-400 transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Example 2
              </button>

              {/* Example 1 */}
              <button
                onClick={handleDemoMode}
                className="flex items-center gap-2 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-white hover:border-gray-400 transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Example 1
              </button>
            </div>

            {/* Search Results */}
            <div className="space-y-6">
              {results.length > 0 && (
                <>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-xl border border-green-200 p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Live ClinicalTrials.gov
                          </div>
                          <span className="text-gray-600 font-medium">
                            {results.length} trial{results.length !== 1 ? 's' : ''} discovered
                          </span>
                          {results[0]?.researchContext?.length ? (
                            <div className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              Live PubMed • {results[0].researchContext.length} research articles
                            </div>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-600">
                          Real-time data from the world's largest clinical trial database
                          {results[0]?.researchContext?.length ? ' • Enhanced with latest research context' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {results.map((result, index) => {
                      if (useEnhancedMatching) {
                        return (
                          <EnhancedTrialCard
                            key={result.trial.nctId}
                            trial={result.trial}
                            eligibility={result.eligibility as EnhancedEligibilityDecision}
                            explanation={result.explanation}
                            researchContext={result.researchContext}
                            onSave={handleToggleSave}
                            isSaved={!!savedMap[result.trial.nctId]}
                            onEmailDraft={openEmailDraft}
                          />
                        )
                      }

                      const { trial, eligibility, explanation } = result
                      const isExpanded = expandedTrials.has(trial.nctId)
                      return (
                        <div key={trial.nctId} className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 hover:bg-white/90">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-mono text-gray-600">
                                  #{index + 1}
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  (eligibility as EligibilityDecision).band === 'High' ? 'bg-green-100 text-green-800 border border-green-200' :
                                  (eligibility as EligibilityDecision).band === 'Medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                  'bg-red-100 text-red-800 border border-red-200'
                                }`}>
                                  {(eligibility as EligibilityDecision).band} Match
                                </div>
                              </div>

                              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-200">
                                <a
                                  href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-2"
                                >
                                  {trial.title}
                                  <ExternalLink className="h-4 w-4 text-blue-500 opacity-70 hover:opacity-100" />
                                </a>
                              </h3>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                                <span className="flex items-center gap-1 font-medium bg-gray-100 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <a
                                    href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    {trial.nctId}
                                    <ExternalLink className="h-3 w-3 opacity-70" />
                                  </a>
                                </span>
                                {trial.phase && (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">
                                    {trial.phase}
                                  </span>
                                )}
                                {trial.locations && trial.locations.length > 0 && (
                                  <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                                    <MapPin className="h-3 w-3" />
                                    {trial.locations.slice(0, 2).join(', ')}
                                    {trial.locations.length > 2 && ` +${trial.locations.length - 2} more`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mb-6">
                            <p className="text-gray-700 leading-relaxed">{explanation}</p>

                            {result.researchContext && result.researchContext.length > 0 && (
                              <ResearchInsights
                                articles={result.researchContext}
                                condition={clinicalProfile.diagnosis || disease}
                              />
                            )}
                          </div>

                          {(eligibility as EligibilityDecision).followUpQuestion && (
                            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                              <p className="text-sm text-blue-800 mb-3 font-medium">
                                <strong>Quick question to refine match:</strong> {(eligibility as EligibilityDecision).followUpQuestion}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleQuickAnswer(
                                    (eligibility as EligibilityDecision).followUpQuestion?.includes('genetic') ? 'genotypeKnown' : 'priorTherapy',
                                    'yes'
                                  )}
                                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => handleQuickAnswer(
                                    (eligibility as EligibilityDecision).followUpQuestion?.includes('genetic') ? 'genotypeKnown' : 'priorTherapy',
                                    'no'
                                  )}
                                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => toggleTrialExpansion(trial.nctId)}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              View Details & Criteria
                            </button>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleSave(trial)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 font-medium ${
                                  savedMap[trial.nctId]
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title={savedMap[trial.nctId] ? 'Remove from watchlist' : 'Save to watchlist'}
                              >
                                {savedMap[trial.nctId] ? '★ Saved' : '☆ Save'}
                              </button>

                              <a
                                href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-all duration-200 font-medium"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View on ClinicalTrials.gov
                              </a>

                              <button
                                onClick={() => openEmailDraft(trial)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition-all duration-200 font-medium"
                              >
                                <Copy className="h-3 w-3" />
                                Open Email Draft
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-green-50 p-4 rounded-xl">
                                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Why this matches
                                  </h4>
                                  <ul className="text-sm text-green-800 space-y-2">
                                    {(eligibility as EligibilityDecision).reasons.map((reason, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <div className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="bg-yellow-50 p-4 rounded-xl">
                                  <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    Uncertainties
                                  </h4>
                                  <ul className="text-sm text-yellow-800 space-y-2">
                                    {(eligibility as EligibilityDecision).uncertainties.map((uncertainty, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <div className="w-1 h-1 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                                        {uncertainty}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {trial.eligibilityText && (
                                <div className="mt-6">
                                  <h4 className="font-semibold text-gray-900 mb-3">Full Eligibility Criteria</h4>
                                  <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 max-h-40 overflow-y-auto border">
                                    {trial.eligibilityText}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Empty State */}
              {hasSearched && results.length === 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="p-6 bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl">
                      <AlertCircle className="h-12 w-12 text-orange-600" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {getEmptyStateMessage().title}
                  </h3>

                  <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                    {getEmptyStateMessage().description}
                  </p>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-4">💡 Suggestions to improve your search:</h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      {getEmptyStateMessage().suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      onClick={() => setState("")}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg"
                    >
                      <Globe className="h-4 w-4" />
                      Search Globally
                    </button>

                    <button
                      onClick={handleDemoMode}
                      className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-white hover:border-gray-400 transition-all duration-200 font-medium"
                    >
                      Try Example
                    </button>

                    <button
                      onClick={() => setViewMode('patterns')}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 rounded-xl hover:from-purple-200 hover:to-purple-300 transition-all duration-200 font-medium"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Analyze Patterns
                    </button>

                    <button
                      onClick={() => setViewMode('network')}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-100 to-green-200 text-green-700 rounded-xl hover:from-green-200 hover:to-green-300 transition-all duration-200 font-medium"
                    >
                      <Share2 className="h-4 w-4" />
                      View Network
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pattern Analysis View */}
        {viewMode === 'patterns' && (
          <div className="space-y-8">
            <PatternAnalysis
              condition={disease}
              onAnalysisComplete={(insights) => {
                console.log('Pattern analysis complete:', insights)
              }}
            />
          </div>
        )}

        {/* Knowledge Graph View */}
        {viewMode === 'network' && (
          <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Share2 className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Research Network Graph</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent"></div>
                <div className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Interactive Network
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                Explore the interconnected network of clinical trials, researchers, institutions, and interventions in an interactive knowledge graph.
              </p>

              {results.length > 0 ? (
                <KnowledgeGraph
                  condition={disease}
                  trials={results.map(r => r.trial)}
                  onNodeClick={(node) => {
                    console.log('Node clicked:', node)
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-green-100 rounded-full">
                      <Share2 className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Network Data Available</h3>
                  <p className="text-gray-600 mb-6">
                    Run a trial search first to generate the knowledge graph visualization.
                  </p>
                  <button
                    onClick={() => setViewMode('search')}
                    className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-medium"
                  >
                    <Search className="h-4 w-4" />
                    Search for Trials
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Saved (top-right) */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={() => setShowSaved(s => !s)}
          className="relative flex items-center gap-2 bg-white border border-gray-200 shadow-lg hover:shadow-xl rounded-full px-4 py-3"
          aria-label="Open saved"
        >
          <Star className="h-5 w-5" />
          <span className="text-sm font-medium">Saved</span>
          {savedList.length > 0 && (
            <span className="absolute -top-1 -right-1 text-xs text-white bg-amber-500 rounded-full px-1.5 py-0.5">
              {savedList.length}
            </span>
          )}
        </button>

        {showSaved && (
          <div className="mt-3 w-[28rem] max-h-[26rem] overflow-auto bg-white border border-gray-200 shadow-2xl rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Saved Trials</h4>
              <button
                onClick={exportSavedCsv}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
                title="Export CSV"
              >
                <Download className="h-3 w-3" /> Export
              </button>
            </div>

            {savedList.length === 0 ? (
              <p className="text-sm text-gray-600">No saved trials yet. Click “☆ Save” on a result to watch it.</p>
            ) : (
              <ul className="space-y-3">
                {savedList.map((t) => (
                  <li key={t.nctId} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="pr-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {t.title || t.nctId}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {t.nctId} · {t.status || 'Unknown status'}
                        </div>
                        {t.locations && t.locations.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            {t.locations.slice(0,2).join(', ')}{t.locations.length>2 ? ` +${t.locations.length-2}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`https://clinicaltrials.gov/study/${t.nctId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Open
                        </a>
                        <button
                          onClick={() => openEmailDraft({ nctId: t.nctId, title: t.title })}
                          className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          Email
                        </button>
                        <button
                          onClick={() => {
                            toggleSave({ nctId: t.nctId, title: t.title } as any)
                            setSavedMap(prev => ({ ...prev, [t.nctId]: false }))
                            setSavedList(getSavedTrials())
                          }}
                          className="text-xs px-2 py-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          Unsave
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Floating Alerts (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowAlerts(s => !s)}
          className="relative flex items-center gap-2 bg-white border border-gray-200 shadow-lg hover:shadow-xl rounded-full px-4 py-3"
          aria-label="Open alerts"
        >
          <Bell className="h-5 w-5" />
          <span className="text-sm font-medium">Updates</span>
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 text-xs text-white bg-red-500 rounded-full px-1.5 py-0.5">
              {alertCount}
            </span>
          )}
        </button>

        {showAlerts && (
          <div className="mt-3 w-96 max-h-96 overflow-auto bg-white border border-gray-200 shadow-2xl rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Watchlist Alerts</h4>
              <button
                onClick={handleClearAlerts}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
                title="Clear alerts"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>

            {alerts.length === 0 ? (
              <p className="text-sm text-gray-600">No alerts yet. Star some trials to get updates.</p>
            ) : (
              <ul className="space-y-2">
                {alerts
                  .slice()
                  .sort((a, b) => b.ts - a.ts)
                  .map((e, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="mt-1 block h-2 w-2 rounded-full bg-blue-500"></span>
                      <div>
                        <div className="font-medium">
                          {e.nctId} — {e.type === 'status'
                            ? 'Status change'
                            : e.type === 'site'
                              ? 'New site near you'
                              : e.type === 'similar'
                                ? 'Similar trial found'
                                : 'Protocol update'}
                        </div>
                        {e.details && <div className="text-gray-600">{e.details}</div>}
                        <div className="text-xs text-gray-400">{new Date(e.ts).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
