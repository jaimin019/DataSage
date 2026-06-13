'use client'

import { usePreferenceStore } from '@/store/preferenceStore'
import { PreferenceCard } from './PreferenceCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  onStartAnalysis: () => void
}

export function PreferenceForm({ onStartAnalysis }: Props) {
  const {
    currentStep,
    setStep,
    preferences,
    setGoal,
    setTargetColumn,
    setDepth,
    toggleFocusArea,
    setOutlierHandling,
    availableColumns,
    resetToDefaults,
  } = usePreferenceStore()

  const handleNext = () => setStep(currentStep + 1)
  const handleBack = () => setStep(currentStep - 1)
  
  const handleSkipToDefaults = () => {
    resetToDefaults()
    onStartAnalysis()
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">What are you trying to accomplish?</h3>
              <p className="text-sm text-muted-foreground">DataSage will focus its analysis on your goal.</p>
            </div>
            <PreferenceCard
              icon="🔍"
              label="Explore patterns"
              description="Find correlations, clusters, trends"
              selected={preferences.goal === 'explore'}
              onClick={() => setGoal('explore')}
            />
            <PreferenceCard
              icon="🤖"
              label="Prepare for ML"
              description="Feature quality, missing data, types"
              selected={preferences.goal === 'prepare_ml'}
              onClick={() => setGoal('prepare_ml')}
            />
            <PreferenceCard
              icon="🚨"
              label="Detect anomalies"
              description="Find outliers and data quality issues"
              selected={preferences.goal === 'detect_anomalies'}
              onClick={() => setGoal('detect_anomalies')}
            />
            <PreferenceCard
              icon="📈"
              label="Forecast trends"
              description="Predict future values over time"
              selected={preferences.goal === 'forecast'}
              onClick={() => setGoal('forecast')}
            />
            <PreferenceCard
              icon="⚡"
              label="Quick overview"
              description="Fast summary, skip deep analysis"
              selected={preferences.goal === 'quick_overview'}
              onClick={() => setGoal('quick_overview')}
            />
          </div>
        )
      case 1:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Which column matters most to you?</h3>
              <p className="text-sm text-muted-foreground">Insights will prioritize this column. Skip if unsure.</p>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              <PreferenceCard
                icon="🤷"
                label="No preference"
                description="Analyze all columns equally"
                selected={preferences.target_column === null}
                onClick={() => setTargetColumn(null)}
              />
              {availableColumns.map(col => (
                <PreferenceCard
                  key={col}
                  icon="📊"
                  label={col}
                  description={`Column: ${col}`}
                  selected={preferences.target_column === col}
                  onClick={() => setTargetColumn(col)}
                />
              ))}
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">How deep should the analysis go?</h3>
              <p className="text-sm text-muted-foreground">Actual time varies with dataset size.</p>
            </div>
            <PreferenceCard
              icon="⚡"
              label="Quick (~15-30 seconds)"
              description="Basic stats, 4 charts, top 3 insights (No clustering, fast)"
              selected={preferences.depth === 'quick'}
              onClick={() => setDepth('quick')}
            />
            <PreferenceCard
              icon="✨"
              label="Standard (~45-90 seconds) [default]"
              description="Full pipeline, 10 charts, 5 insights"
              selected={preferences.depth === 'standard'}
              onClick={() => setDepth('standard')}
            />
            <PreferenceCard
              icon="🔬"
              label="Deep (2-3 minutes)"
              description="All analyses, 16 charts, 7 insights (Best for important datasets)"
              selected={preferences.depth === 'deep'}
              onClick={() => setDepth('deep')}
            />
          </div>
        )
      case 3:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">What should DataSage focus on?</h3>
              <p className="text-sm text-muted-foreground">Select all that apply. Leave empty for a balanced analysis.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'data_quality', label: '🧹 Data quality' },
                { id: 'distributions', label: '📊 Distributions' },
                { id: 'correlations', label: '🔗 Correlations' },
                { id: 'anomalies', label: '🚨 Anomalies' },
                { id: 'clustering', label: '🔵 Clustering' },
                { id: 'forecasting', label: '📈 Forecasting' },
              ].map(area => {
                const isSelected = preferences.focus_areas.includes(area.id as any)
                return (
                  <button
                    key={area.id}
                    onClick={() => toggleFocusArea(area.id as any)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                      isSelected ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {area.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Selecting nothing = analyze everything (recommended)</p>
          </div>
        )
      case 4:
        return (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">How should outliers be handled?</h3>
              <p className="text-sm text-muted-foreground">Outliers are unusual data points that may be errors or genuine extremes.</p>
            </div>
            <PreferenceCard
              icon="🚩"
              label="Flag only (recommended)"
              description="Outliers are marked in the report but kept in data. You decide what to do with them."
              selected={preferences.outlier_handling === 'flag_only'}
              onClick={() => setOutlierHandling('flag_only')}
            />
            <PreferenceCard
              icon="🗑️"
              label="Remove extreme outliers"
              description="Values beyond 3× IQR are automatically removed. Use when you're sure extreme values are errors."
              selected={preferences.outlier_handling === 'remove_extreme'}
              onClick={() => setOutlierHandling('remove_extreme')}
            />
            {preferences.outlier_handling === 'remove_extreme' && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-600 text-sm mt-3 flex gap-2">
                <span>⚠️</span>
                <span>This permanently removes rows from your analysis. The cleaned CSV will not contain these rows.</span>
              </div>
            )}
          </div>
        )
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2">✅ Your Analysis Settings</h3>
            <div className="bg-muted p-4 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Goal:</span>
                <span className="font-medium capitalize">{preferences.goal.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Target:</span>
                <span className="font-medium">{preferences.target_column || 'None'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Depth:</span>
                <span className="font-medium capitalize">{preferences.depth}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Focus:</span>
                <span className="font-medium">
                  {preferences.focus_areas.length > 0 
                    ? preferences.focus_areas.map(f => f.replace('_', ' ')).join(', ') 
                    : 'Balanced'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outliers:</span>
                <span className="font-medium capitalize">{preferences.outlier_handling.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                ← Change settings
              </Button>
              <Button className="flex-1" onClick={onStartAnalysis}>
                🚀 Start Analysis
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg border-muted/50 bg-background/50 backdrop-blur-sm mt-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-medium text-muted-foreground">
            {currentStep < 5 ? `Customize Your Analysis` : `Summary`}
          </span>
          <button onClick={handleSkipToDefaults} className="text-sm text-primary hover:underline">
            Skip → Use defaults
          </button>
        </div>
        
        {currentStep < 5 && (
          <div className="flex gap-1 mb-6">
            {[0, 1, 2, 3, 4].map(step => (
              <div 
                key={step} 
                className={`h-2 flex-1 rounded-full ${step <= currentStep ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        )}

        {renderStepContent()}

        {currentStep < 5 && (
          <div className="flex justify-between items-center mt-8 pt-4 border-t">
            <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
              ← Back
            </Button>
            <div className="flex gap-2 items-center">
              <button 
                onClick={handleSkipToDefaults}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 mr-2"
              >
                Skip all
              </button>
              <Button onClick={handleNext}>
                Continue →
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
