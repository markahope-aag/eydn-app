# Wedding Planning Tools Documentation

This document covers the interactive wedding planning tools available on the eydn platform for lead generation and user engagement.

## Overview

The eydn platform includes several interactive tools designed to:
- Provide value to users before they sign up
- Generate leads for business development
- Assess user needs and planning style
- Convert visitors into trial users

## Available Tools

### 1. Wedding Budget Calculator

**Location**: `/tools/wedding-budget-calculator`  
**Purpose**: Interactive budget planning with detailed breakdown visualization  

#### Features
- Real-time budget calculation with category breakdown
- Visual budget distribution with interactive bars
- Customizable budget amounts
- Exportable budget summaries
- Lead capture integration

#### Implementation
```typescript
// src/components/tools/WeddingBudgetCalculator.tsx
export function WeddingBudgetCalculator() {
  const [budget, setBudget] = useState(50000);
  const [location, setLocation] = useState("");
  const [guestCount, setGuestCount] = useState(100);
  
  // Budget breakdown percentages (keep in sync with API)
  const BREAKDOWN = [
    { label: "Venue", pct: 0.238 },
    { label: "Catering & bar", pct: 0.192 },
    { label: "Photography & video", pct: 0.12 },
    // ... more categories
  ];
}
```

#### Budget Categories
- **Venue** (23.8%) - Reception and ceremony venues
- **Catering & Bar** (19.2%) - Food, drinks, and service
- **Photography & Video** (12%) - Professional documentation
- **Florals & Decor** (9%) - Flowers and decorative elements
- **Attire & Beauty** (6.5%) - Wedding attire and beauty services
- **Music & Entertainment** (6%) - DJ, band, and entertainment
- **Rehearsal Dinner** (4%) - Pre-wedding celebration
- **Stationery & Gifts** (2.5%) - Invitations and favors
- **Transportation** (2%) - Wedding day transport
- **Ceremony & Officiant** (1.5%) - Ceremony costs

#### Lead Capture
When users save their budget calculation:
- **API Endpoint**: `POST /api/tools/calculator-save`
- **Data Captured**: Budget amount, location, guest count, contact info
- **Integration**: Syncs to marketing database for follow-up
- **Email**: Sends detailed budget breakdown via email

```typescript
// API Response Structure
{
  "success": true,
  "shortCode": "abc123", // For referencing saved calculation
  "allocations": [
    {
      "label": "Venue",
      "amount": 11900,
      "percentage": 23.8
    }
    // ... more allocations
  ]
}
```

#### Embed Functionality
- **Embed URL**: `/tools/wedding-budget-calculator/embed`
- **Responsive**: Adapts to various container sizes
- **Iframe-friendly**: Can be embedded on external sites
- **Clean UI**: Minimal styling for external use

### 2. Planning Style Quiz

**Location**: `/tools/wedding-planning-style`  
**Purpose**: Assess user's wedding planning approach and preferences  

#### Quiz Structure
```typescript
// src/lib/quizzes/planning-style.ts
export const planningStyleQuiz = {
  id: "planning_style",
  title: "What's Your Wedding Planning Style?",
  description: "Discover your unique approach to wedding planning",
  questions: [
    {
      id: "timeline",
      text: "When did you start (or plan to start) wedding planning?",
      type: "single-choice",
      options: [
        { id: "12_plus", text: "12+ months before", weight: { organized: 3, relaxed: 1 } },
        { id: "6_12", text: "6-12 months before", weight: { organized: 2, relaxed: 2 } },
        // ... more options
      ]
    }
    // ... more questions
  ]
};
```

#### Planning Style Results
- **The Organized Planner**: Detailed, timeline-focused approach
- **The Creative Visionary**: Design and aesthetics focused
- **The Relaxed Planner**: Go-with-the-flow approach
- **The Practical Planner**: Budget and efficiency focused

#### Integration Features
- **Personalized Results**: Detailed analysis of planning style
- **Recommendations**: Tailored advice based on results
- **Email Follow-up**: Results sent via email with additional tips
- **CRM Integration**: Results sync to marketing automation

### 3. Do I Need a Planner? Assessment

**Location**: `/tools/do-i-need-a-planner`  
**Purpose**: Help couples determine if they should hire a professional planner  

#### Assessment Criteria
```typescript
// src/lib/quizzes/planner-assessment.ts
export const plannerAssessmentQuiz = {
  id: "planner_assessment",
  title: "Do I Need a Wedding Planner?",
  categories: [
    "time_availability",
    "budget_complexity", 
    "stress_management",
    "vendor_connections",
    "event_experience"
  ]
};
```

#### Recommendation Engine
Based on quiz responses, provides one of four recommendations:
- **Full-Service Planner**: For complex weddings or busy couples
- **Day-of Coordinator**: For organized couples needing execution help
- **DIY with eydn**: For couples who want to plan themselves with AI assistance
- **Hybrid Approach**: Combination of professional help and self-planning

#### Business Logic
```typescript
// Scoring algorithm determines recommendation
function calculatePlannerNeed(responses: QuizResponse[]): PlannerRecommendation {
  const scores = {
    time: calculateTimeScore(responses),
    complexity: calculateComplexityScore(responses),
    stress: calculateStressScore(responses),
    experience: calculateExperienceScore(responses)
  };
  
  if (scores.complexity > 8 || scores.time < 3) return "full_service";
  if (scores.stress > 7 && scores.experience < 4) return "day_of";
  if (scores.time > 6 && scores.stress < 5) return "diy_with_eydn";
  return "hybrid";
}
```

## Tool Management System

### Analytics Integration
All tools integrate with PostHog for detailed analytics:
- **Tool Usage**: Track which tools are most popular
- **Conversion Rates**: Monitor tool-to-signup conversion
- **User Behavior**: Analyze how users interact with tools
- **A/B Testing**: Test different tool variants

### Lead Management
Tools feed into comprehensive lead management system:
- **Automatic Scoring**: Leads scored based on tool engagement
- **Segmentation**: Users segmented by tool usage patterns  
- **Follow-up Automation**: Email sequences based on tool completion
- **CRM Integration**: All leads sync to marketing automation

### Email Integration
All tools can send follow-up emails:
```typescript
// Email templates for tool results
export const getCalculatorEmail = (data: CalculatorData) => ({
  subject: "Your Wedding Budget Breakdown",
  html: `
    <h2>Your $${data.budget.toLocaleString()} Wedding Budget</h2>
    <div class="breakdown">
      ${data.allocations.map(item => `
        <div class="category">
          <span>${item.label}</span>
          <span>$${item.amount.toLocaleString()}</span>
        </div>
      `).join('')}
    </div>
  `
});
```

## API Endpoints

### Tool Save Endpoints
- **POST** `/api/tools/calculator-save` - Save budget calculator results
- **POST** `/api/tools/quiz-complete` - Complete planning style or planner assessment quiz

### Tool Data Endpoints  
- **GET** `/api/tools/calculator/[code]` - Retrieve saved calculator results
- **GET** `/api/tools/quiz/[id]/results` - Get quiz results and recommendations

## Rate Limiting
All tool endpoints are rate limited to prevent abuse:
```typescript
// Rate limits for tool endpoints
const TOOL_RATE_LIMITS = {
  calculator_save: { limit: 3, windowSeconds: 300 }, // 3 saves per 5 minutes
  quiz_complete: { limit: 5, windowSeconds: 300 },   // 5 completions per 5 minutes
};
```

## SEO and Marketing

### Content Marketing
Tools serve as valuable content for SEO and social media:
- **Blog Integration**: Tool results can be shared as blog content
- **Social Sharing**: Results optimized for social media sharing
- **SEO Optimization**: Each tool page optimized for relevant keywords

### Lead Magnets
Tools function as effective lead magnets:
- **High Value**: Provide immediate value to users
- **Low Friction**: Quick completion encourages participation
- **Actionable Results**: Users get practical, usable information
- **Follow-up Opportunities**: Natural segue to paid services

## Development Guidelines

### Adding New Tools
When creating new tools:

1. **Create Tool Component**
   ```typescript
   // src/components/tools/NewTool.tsx
   export function NewTool() {
     // Tool implementation
   }
   ```

2. **Create API Endpoints**
   ```typescript
   // src/app/api/tools/new-tool/route.ts
   export async function POST(request: Request) {
     // API logic with rate limiting
   }
   ```

3. **Add Route Pages**
   ```typescript
   // src/app/tools/new-tool/page.tsx
   export default function NewToolPage() {
     return <NewTool />;
   }
   ```

4. **Configure Analytics**
   - Add PostHog event tracking
   - Set up conversion goals
   - Configure email automation

### Testing Tools
All tools should include comprehensive tests:
```typescript
// src/components/tools/NewTool.test.tsx
describe('NewTool', () => {
  it('calculates results correctly', () => {
    // Test tool calculations
  });
  
  it('saves results to API', async () => {
    // Test API integration
  });
  
  it('handles errors gracefully', () => {
    // Test error handling
  });
});
```

## Performance Considerations

### Lazy Loading
Tools are loaded dynamically to improve initial page load:
```typescript
const WeddingBudgetCalculator = dynamic(
  () => import('@/components/tools/WeddingBudgetCalculator'),
  { loading: () => <ToolSkeleton /> }
);
```

### Caching Strategy
- **Static Generation**: Tool pages are statically generated
- **API Caching**: Tool data cached with appropriate TTL
- **CDN Optimization**: Static assets served from CDN

### Bundle Optimization
- **Code Splitting**: Each tool is a separate bundle
- **Tree Shaking**: Unused chart libraries are eliminated
- **Compression**: All tool assets are compressed

## Future Tool Ideas

### Planned Tools
- **Guest List Size Calculator**: Help couples estimate guest count
- **Timeline Builder**: Interactive wedding planning timeline
- **Vendor Comparison Tool**: Compare different vendor options
- **Wedding Style Quiz**: Determine preferred wedding aesthetic
- **Budget vs Reality Check**: Compare budget to actual market costs

### Integration Opportunities
- **Pinterest Integration**: Save mood board items directly
- **Google Calendar**: Add planning milestones to calendar
- **Vendor Directory**: Connect tool results to vendor recommendations
- **Real-time Pricing**: Connect to live vendor pricing data

This tools system provides valuable lead generation while offering genuine value to potential users, supporting the platform's growth and user acquisition strategy.