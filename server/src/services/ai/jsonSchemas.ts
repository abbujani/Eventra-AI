/**
 * Gemini-compatible JSON Schema objects used to steer structured output.
 *
 * Only keywords supported by the Gemini API are used (type, format,
 * description, enum, properties, required, items, minItems, maxItems).
 * Responses are still re-validated with the Zod schemas in `schemas.ts`.
 */

const str = (description?: string) => ({ type: 'string', ...(description ? { description } : {}) });
const num = (description?: string) => ({ type: 'number', ...(description ? { description } : {}) });
const strArray = (description?: string) => ({
  type: 'array',
  items: { type: 'string' },
  ...(description ? { description } : {}),
});

export const eventPlanJsonSchema = {
  type: 'object',
  properties: {
    eventOverview: {
      type: 'object',
      properties: {
        title: str('A short, compelling title for the event.'),
        summary: str('A 2-4 sentence overview of the celebration.'),
        planningAssumptions: strArray('Assumptions the plan is based on.'),
      },
      required: ['title', 'summary', 'planningAssumptions'],
    },
    theme: {
      type: 'object',
      properties: {
        name: str('The theme name.'),
        description: str('A description of the theme mood and look.'),
        colors: strArray('Hex codes or descriptive colour names for the palette.'),
        decorationIdeas: strArray('Concrete decoration ideas.'),
      },
      required: ['name', 'description', 'colors', 'decorationIdeas'],
    },
    budget: {
      type: 'object',
      properties: {
        currency: str('ISO 4217 currency code matching the requested currency.'),
        totalBudget: num('The total budget in the requested currency.'),
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: str('Budget category name.'),
              estimatedAmount: num('Estimated amount in the requested currency.'),
              reasoning: str('Why this estimate is reasonable.'),
            },
            required: ['name', 'estimatedAmount'],
          },
        },
        contingencyAmount: num('A contingency reserve, typically 5-10% of the budget.'),
        savingTips: strArray('Practical ways to reduce cost.'),
      },
      required: ['currency', 'totalBudget', 'categories', 'contingencyAmount', 'savingTips'],
    },
    timeline: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          time: str('A time or relative point, e.g. "09:00" or "4 weeks before".'),
          title: str('Short task title.'),
          description: str('What happens.'),
          category: str('Category such as ceremony, catering, decor.'),
        },
        required: ['time', 'title'],
      },
    },
    vendorChecklist: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: str('Vendor category.'),
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          tasks: strArray('Booking and evaluation tasks.'),
          suggestedBookingWindow: str('When to book, e.g. "3 months before".'),
        },
        required: ['category', 'priority', 'tasks'],
      },
    },
    menuIdeas: strArray('Food and beverage ideas.'),
    guestExperienceIdeas: strArray('Ideas to delight guests.'),
    entertainmentRecommendations: strArray('Entertainment ideas.'),
    preparationTasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: str('Task title.'),
          description: str('Task detail.'),
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          relativeDeadline: str('When it should be done, e.g. "2 weeks before".'),
        },
        required: ['title', 'priority'],
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: str('Risk title.'),
          mitigation: str('How to mitigate it.'),
        },
        required: ['title', 'mitigation'],
      },
    },
    nextActions: strArray('The most important next actions.'),
  },
  required: [
    'eventOverview',
    'theme',
    'budget',
    'timeline',
    'vendorChecklist',
    'menuIdeas',
    'guestExperienceIdeas',
    'entertainmentRecommendations',
    'preparationTasks',
    'risks',
    'nextActions',
  ],
};

export const menuPlanJsonSchema = {
  type: 'object',
  properties: {
    summary: str('A short summary of the proposed menu.'),
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: str('Meal segment, e.g. Dinner.'),
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: str('Dish or drink name.'),
                kind: {
                  type: 'string',
                  enum: ['vegetarian', 'non-vegetarian', 'vegan', 'beverage', 'dessert', 'snack', 'other'],
                },
                notes: str('Short note, e.g. allergens or spice level.'),
              },
              required: ['name', 'kind'],
            },
          },
        },
        required: ['name', 'items'],
      },
    },
    dietaryNotes: strArray('Notes about dietary coverage.'),
    allergyWarning: str('A reminder to verify ingredients and cross-contamination with the caterer.'),
    budgetNotes: str('Notes on keeping the menu within budget.'),
  },
  required: ['summary', 'segments', 'dietaryNotes'],
};

export const taskSuggestionsJsonSchema = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: str('Actionable task title.'),
          category: str('Task category.'),
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          relativeDeadline: str('When it should be completed, e.g. "3 weeks before".'),
          description: str('Task detail.'),
        },
        required: ['title', 'category', 'priority'],
      },
    },
  },
  required: ['tasks'],
};

export const budgetAdviceJsonSchema = {
  type: 'object',
  properties: {
    summary: str('Summary of the optimisation.'),
    targetCurrency: str('ISO 4217 currency code.'),
    originalTotal: num('The original total estimate.'),
    revisedTotal: num('The revised total estimate after savings.'),
    totalSavingPercent: num('Percentage saved versus the original total.'),
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: str('Budget category.'),
          currentEstimate: num('Current estimate.'),
          suggestedAmount: num('Suggested new estimate.'),
          reasoning: str('Why this change is realistic.'),
        },
        required: ['category', 'currentEstimate', 'suggestedAmount', 'reasoning'],
      },
    },
    caveats: strArray('Important caveats, e.g. that figures are illustrative.'),
  },
  required: [
    'summary',
    'targetCurrency',
    'originalTotal',
    'revisedTotal',
    'totalSavingPercent',
    'recommendations',
    'caveats',
  ],
};
