// Enhanced clinical intake form with comprehensive medical fields

import React, { useState } from 'react';
import { ClinicalPatientProfile } from '../types/clinicalProfile';
import { User, Activity, TestTube, Heart, AlertTriangle, Pill } from 'lucide-react';

interface EnhancedIntakeFormProps {
  onSubmit: (profile: ClinicalPatientProfile) => void;
  initialProfile?: Partial<ClinicalPatientProfile>;
  isLoading?: boolean;
}

export const EnhancedIntakeForm: React.FC<EnhancedIntakeFormProps> = ({
  onSubmit,
  initialProfile = {},
  isLoading = false
}) => {
  const [profile, setProfile] = useState<ClinicalPatientProfile>({
    diagnosis: '',
    ageYears: undefined,
    sexAtBirth: 'unknown',
    diseaseStage: 'unknown',
    performance: {},
    labs: {},
    pregnant: 'unknown',
    lactating: 'unknown',
    hbv: 'unknown',
    hcv: 'unknown',
    hiv: 'unknown',
    cnsMets: 'unknown',
    seizures: 'unknown',
    strongCYP3A: 'unknown',
    anticoagulants: 'unknown',
    qtProlonging: 'unknown',
    contraindications: [],
    genotypeKnown: 'unknown',
    priorTherapy: 'unknown',
    ...initialProfile
  });

  const [activeSection, setActiveSection] = useState<string>('demographics');

  const updateProfile = (updates: Partial<ClinicalPatientProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const updateLabs = (labUpdates: Partial<ClinicalPatientProfile['labs']>) => {
    setProfile(prev => ({
      ...prev,
      labs: { ...prev.labs, ...labUpdates }
    }));
  };

  const updatePerformance = (perfUpdates: Partial<ClinicalPatientProfile['performance']>) => {
    setProfile(prev => ({
      ...prev,
      performance: { ...prev.performance, ...perfUpdates }
    }));
  };

  const sections = [
    { id: 'demographics', label: 'Demographics', icon: User },
    { id: 'diagnosis', label: 'Diagnosis', icon: AlertTriangle },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'labs', label: 'Lab Values', icon: TestTube },
    { id: 'medical', label: 'Medical History', icon: Heart },
    { id: 'medications', label: 'Medications', icon: Pill }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(profile);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Section Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6 py-4">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Demographics Section */}
        {activeSection === 'demographics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Demographics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age (years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={profile.ageYears || ''}
                  onChange={(e) => updateProfile({ ageYears: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sex at Birth
                </label>
                <select
                  value={profile.sexAtBirth || 'unknown'}
                  onChange={(e) => updateProfile({ sexAtBirth: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Diagnosis Section */}
        {activeSection === 'diagnosis' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Diagnosis & Genetics
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Diagnosis
                </label>
                <input
                  type="text"
                  value={profile.diagnosis}
                  onChange={(e) => updateProfile({ diagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Niemann-Pick disease type C"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disease Stage
                  </label>
                  <select
                    value={profile.diseaseStage || 'unknown'}
                    onChange={(e) => updateProfile({ diseaseStage: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="early">Early</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Genetic Confirmation
                  </label>
                  <select
                    value={profile.genotypeKnown || 'unknown'}
                    onChange={(e) => updateProfile({ genotypeKnown: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="yes">Yes - Confirmed</option>
                    <option value="no">No - Not confirmed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gene (if known)
                </label>
                <input
                  type="text"
                  value={profile.gene || ''}
                  onChange={(e) => updateProfile({ gene: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., NPC1, BRCA1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Performance Section */}
        {activeSection === 'performance' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Status
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ECOG Performance Status
                </label>
                <select
                  value={profile.performance?.ECOG ?? ''}
                  onChange={(e) => updatePerformance({ ECOG: e.target.value ? parseInt(e.target.value) as any : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not assessed</option>
                  <option value="0">0 - Fully active</option>
                  <option value="1">1 - Restricted in strenuous activity</option>
                  <option value="2">2 - Ambulatory, up &gt;50% of waking hours</option>
                  <option value="3">3 - Capable of limited self-care</option>
                  <option value="4">4 - Completely disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Karnofsky Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="10"
                  value={profile.performance?.Karnofsky || ''}
                  onChange={(e) => updatePerformance({ Karnofsky: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 90"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prior Therapy
                </label>
                <select
                  value={profile.priorTherapy || 'unknown'}
                  onChange={(e) => updateProfile({ priorTherapy: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="no">No - Treatment naive</option>
                  <option value="yes">Yes - Prior treatment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lines of Therapy
                </label>
                <input
                  type="number"
                  min="0"
                  value={profile.linesOfTherapy || ''}
                  onChange={(e) => updateProfile({ linesOfTherapy: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Number of prior treatments"
                />
              </div>
            </div>
          </div>
        )}

        {/* Lab Values Section */}
        {activeSection === 'labs' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Laboratory Values
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hematology */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Hematology</h4>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    ANC (×10⁹/L)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={profile.labs?.anc || ''}
                    onChange={(e) => updateLabs({ anc: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="1.5"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Platelets (×10⁹/L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profile.labs?.platelets || ''}
                    onChange={(e) => updateLabs({ platelets: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="150"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Hemoglobin (g/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={profile.labs?.hemoglobin || ''}
                    onChange={(e) => updateLabs({ hemoglobin: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="12.0"
                  />
                </div>
              </div>

              {/* Organ Function */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Organ Function</h4>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Creatinine Clearance (mL/min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profile.labs?.creatinineCl || ''}
                    onChange={(e) => updateLabs({ creatinineCl: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="60"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    AST (U/L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profile.labs?.ast || ''}
                    onChange={(e) => updateLabs({ ast: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="40"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    ALT (U/L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profile.labs?.alt || ''}
                    onChange={(e) => updateLabs({ alt: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="40"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Bilirubin (mg/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={profile.labs?.bilirubin || ''}
                    onChange={(e) => updateLabs({ bilirubin: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="1.0"
                  />
                </div>
              </div>

              {/* Cardiac */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Cardiac</h4>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    LVEF (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={profile.labs?.lvefPct || ''}
                    onChange={(e) => updateLabs({ lvefPct: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="55"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    QTcF (ms)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profile.labs?.qtcF || ''}
                    onChange={(e) => updateLabs({ qtcF: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="450"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medical History Section */}
        {activeSection === 'medical' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Medical History
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Infections</h4>
                
                {(['hbv', 'hcv', 'hiv'] as const).map(infection => (
                  <div key={infection}>
                    <label className="block text-sm text-gray-600 mb-2">
                      {infection.toUpperCase()} Status
                    </label>
                    <select
                      value={profile[infection] || 'unknown'}
                      onChange={(e) => updateProfile({ [infection]: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="negative">Negative</option>
                      <option value="positive">Positive</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Complications</h4>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    CNS Metastases
                  </label>
                  <select
                    value={profile.cnsMets || 'unknown'}
                    onChange={(e) => updateProfile({ cnsMets: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Seizure History
                  </label>
                  <select
                    value={profile.seizures || 'unknown'}
                    onChange={(e) => updateProfile({ seizures: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {profile.sexAtBirth === 'female' && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Reproductive Status</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Pregnancy Status
                    </label>
                    <select
                      value={profile.pregnant || 'unknown'}
                      onChange={(e) => updateProfile({ pregnant: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Lactation Status
                    </label>
                    <select
                      value={profile.lactating || 'unknown'}
                      onChange={(e) => updateProfile({ lactating: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Medications Section */}
        {activeSection === 'medications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Concomitant Medications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strong CYP3A Inhibitors/Inducers
                </label>
                <select
                  value={profile.strongCYP3A || 'unknown'}
                  onChange={(e) => updateProfile({ strongCYP3A: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anticoagulants
                </label>
                <select
                  value={profile.anticoagulants || 'unknown'}
                  onChange={(e) => updateProfile({ anticoagulants: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QT-Prolonging Medications
                </label>
                <select
                  value={profile.qtProlonging || 'unknown'}
                  onChange={(e) => updateProfile({ qtProlonging: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Contraindications
              </label>
              <textarea
                value={profile.contraindications?.join('\n') || ''}
                onChange={(e) => updateProfile({ 
                  contraindications: e.target.value.split('\n').filter(line => line.trim()) 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter any additional contraindications or special considerations (one per line)"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Complete the essential fields and submit to find matching trials
            </div>
            <button
              type="submit"
              disabled={isLoading || !profile.diagnosis}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Finding Trials...' : 'Find Matching Trials'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};