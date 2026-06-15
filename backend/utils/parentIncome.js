export const PARENT_OCCUPATIONS = [
    'Homemaker',
    'Farmer',
    'Government Employee',
    'Private Employee',
    'Business',
    'Self Employed',
    'Daily Wage Worker',
    'Retired',
    'Unemployed',
    'Other',
];

const ZERO_INCOME_OCCUPATIONS = new Set(['Homemaker', 'Unemployed']);

export function isIncomeDisabled(occupation) {
    return ZERO_INCOME_OCCUPATIONS.has(occupation);
}

export function isIncomeRequired(occupation) {
    return Boolean(occupation) && !isIncomeDisabled(occupation);
}

export function resolveStoredParentIncome(occupation, incomeValue) {
    if (isIncomeDisabled(occupation)) {
        return 0;
    }
    const amount = Number(incomeValue);
    return Number.isNaN(amount) ? null : amount;
}

export function validateParentIncome(occupation, incomeValue, parentLabel = 'Parent') {
    if (!occupation) {
        return `${parentLabel} occupation is required.`;
    }
    if (isIncomeDisabled(occupation)) {
        return '';
    }
    if (incomeValue === '' || incomeValue == null) {
        return `${parentLabel} annual income is required for the selected occupation.`;
    }
    const amount = Number(incomeValue);
    if (Number.isNaN(amount) || amount < 0) {
        return `${parentLabel} annual income must be a valid non-negative number.`;
    }
    return '';
}

export function formatParentIncomeDisplay(occupation, income) {
    if (occupation === 'Homemaker') {
        return 'Not Applicable';
    }
    if (occupation === 'Unemployed') {
        return 'No Income';
    }
    if (income == null || income === '') {
        return '—';
    }
    return `₹ ${Number(income).toLocaleString('en-IN')}`;
}
