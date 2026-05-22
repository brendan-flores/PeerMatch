const { MIN_BUDGET, MAX_BUDGET } = require('./budgetValidation');
const { URGENCY_VALUES } = require('./taskFeedDto');

const FILTER_ALL = 'all';

const URGENCY_FILTER_OPTIONS = [
  { id: FILTER_ALL, label: 'Any urgency', value: null },
  ...URGENCY_VALUES.map((value) => ({
    id: value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value,
  })),
];

function parseBudgetQueryValue(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(num) || !Number.isInteger(num)) return null;
  if (num < MIN_BUDGET || num > MAX_BUDGET) return null;
  return num;
}

/**
 * @param {import('express').Request['query']} query
 */
function parseFeedFiltersFromQuery(query) {
  const urgencyRaw = String(query?.urgency || FILTER_ALL).trim().toLowerCase();
  const urgency =
    urgencyRaw === FILTER_ALL || !urgencyRaw
      ? null
      : URGENCY_VALUES.includes(urgencyRaw)
        ? urgencyRaw
        : null;

  let minBudget = parseBudgetQueryValue(query?.minBudget ?? query?.rateFrom ?? query?.rateMin);
  let maxBudget = parseBudgetQueryValue(query?.maxBudget ?? query?.rateTo ?? query?.rateMax);

  if (minBudget != null && maxBudget != null && minBudget > maxBudget) {
    const swap = minBudget;
    minBudget = maxBudget;
    maxBudget = swap;
  }

  const rateRange =
    minBudget != null || maxBudget != null
      ? { min: minBudget, max: maxBudget }
      : null;

  return { urgency, rateRange };
}

/**
 * @param {Record<string, unknown>} baseQuery
 * @param {ReturnType<typeof parseFeedFiltersFromQuery>} filters
 */
function applyFeedFiltersToQuery(baseQuery, filters) {
  const query = { ...baseQuery };

  if (filters.urgency) {
    query.urgency = filters.urgency;
  }

  if (filters.rateRange) {
    const { min, max } = filters.rateRange;
    if (min != null || max != null) {
      query.budget = {};
      if (min != null) query.budget.$gte = min;
      if (max != null) query.budget.$lte = max;
    }
  }

  return query;
}

module.exports = {
  FILTER_ALL,
  MIN_BUDGET,
  MAX_BUDGET,
  URGENCY_FILTER_OPTIONS,
  URGENCY_VALUES,
  parseBudgetQueryValue,
  parseFeedFiltersFromQuery,
  applyFeedFiltersToQuery,
};
