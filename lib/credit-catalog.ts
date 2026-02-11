// Credit pack definitions for the Stripe checkout flow.
// Each pack has a GBP price, a volume bonus percentage, and a computed credit
// total. Higher-tier packs give proportionally more credits per pound.

import {
  CREDIT_VALUE_GBP,
  MICRO_PER_CREDIT,
  microToCredits,
} from './credits';

export type CreditPackage = {
  id: string;
  name: string;
  priceGbp: number;
  bonusPercent: number;
  credits: number;
};

const BASE_PACKAGES: Array<Omit<CreditPackage, 'credits'>> = [
  { id: 'starter', name: 'Starter', priceGbp: 3, bonusPercent: 0 },
  { id: 'plus', name: 'Plus', priceGbp: 8, bonusPercent: 0 },
];

const baseCreditsForPrice = (priceGbp: number) =>
  priceGbp / CREDIT_VALUE_GBP;

export const CREDIT_PACKAGES: CreditPackage[] = BASE_PACKAGES.map((pack) => {
  const baseCredits = baseCreditsForPrice(pack.priceGbp);
  const credits = Math.round(baseCredits * (1 + pack.bonusPercent));
  return {
    ...pack,
    credits,
  };
});

export const describeCredits = (credits: number) =>
  microToCredits(credits * MICRO_PER_CREDIT).toFixed(0);
