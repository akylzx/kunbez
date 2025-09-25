# kunbez - AI-Powered Clinical Trial Intelligence
---
https://kunbez.vercel.app/

## Problem Statement

Families navigating rare diseases face an overwhelming challenge: scattered clinical trial information across multiple databases, complex eligibility criteria, and time-sensitive decisions that could change their loved one's outcome. Current tools either dump raw search results or provide oversimplified chatbot responses that lack clinical rigor.


## Quick Start

```bash
# Clone the repository
cd kunbez

# Install dependencies
npm install

# Run the development server
npm run dev

# Open your browser to http://localhost:5173 to view the application.

# Build for production
npm run build
```

---

## Project Structure

```
src/
├── agents/
│   ├── searchAgent.ts           # Live trial discovery & scoring
│   ├── eligibilityAgent.ts      # Patient-trial matching & questions
│   ├── reasoningAgent.ts        # Human-readable explanations
│   ├── pubmedAgent.ts          # Research context integration
│   └── watchlistAgent.ts       # Save trials & alerts
├── components/
│   ├── KnowledgeGraph.tsx      # D3.js network visualization  
│   ├── PatternAnalysis.tsx     # Statistical insights
│   ├── EnhancedIntakeForm.tsx  # Advanced patient profiling
│   ├── EnhancedTrialCard.tsx   # Rich trial presentation
│   └── ui/                     # Reusable UI components
├── lib/
│   └── trials.ts              # Data fetching & normalization
├── types/
│   └── clinicalProfile.ts     # TypeScript interfaces
└── App.tsx                    # Main application orchestration
```

---
