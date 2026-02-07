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
  { id: 'starter', name: 'Starter', priceGbp: 5, bonusPercent: 0.1 },
  { id: 'plus', name: 'Plus', priceGbp: 15, bonusPercent: 0.2 },
  { id: 'pro', name: 'Pro', priceGbp: 30, bonusPercent: 0.3 },
  { id: 'studio', name: 'Studio', priceGbp: 60, bonusPercent: 0.4 },
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
