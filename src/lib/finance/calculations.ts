import "server-only";
import { Prisma } from "@/generated/prisma/client";

const { Decimal } = Prisma;
export type Money = InstanceType<typeof Decimal>;

export function toMoney(value: Prisma.Decimal | number | string): Money {
  return new Decimal(value as never);
}

export function sumMoney(values: Array<Prisma.Decimal | number | string>): Money {
  return values.reduce<Money>((acc, v) => acc.plus(toMoney(v)), new Decimal(0));
}

export interface FinanceSummary {
  totalRevenue: Money;
  totalExpense: Money;
  contributionMargin: Money;
  provisionalProfit: Money;
}

export function summarizeFinance(
  revenues: Array<Prisma.Decimal | number | string>,
  expenses: Array<Prisma.Decimal | number | string>,
): FinanceSummary {
  const totalRevenue = sumMoney(revenues);
  const totalExpense = sumMoney(expenses);
  const contributionMargin = totalRevenue.minus(totalExpense);
  return {
    totalRevenue,
    totalExpense,
    contributionMargin,
    provisionalProfit: contributionMargin,
  };
}

export interface TaxReserveInput {
  provisionalProfit: Prisma.Decimal | number | string;
  reserveRatePercent: Prisma.Decimal | number | string;
  tradeTaxReservePercent: Prisma.Decimal | number | string;
  incomeTaxReservePercent: Prisma.Decimal | number | string;
}

export interface TaxReserveResult {
  generalReserve: Money;
  tradeTaxReserve: Money;
  incomeTaxReserve: Money;
  totalReserve: Money;
  netAfterReserve: Money;
}

/**
 * Non-binding tax reserve estimate: applies configurable percentages to the
 * provisional profit. This is a planning aid, not tax advice — every UI
 * surface that renders this must carry the "unverbindliche Schätzung" label.
 */
export function estimateTaxReserve(input: TaxReserveInput): TaxReserveResult {
  const profit = toMoney(input.provisionalProfit);
  const base = profit.isPositive() ? profit : new Decimal(0);

  const generalReserve = base.times(toMoney(input.reserveRatePercent)).dividedBy(100);
  const tradeTaxReserve = base
    .times(toMoney(input.tradeTaxReservePercent))
    .dividedBy(100);
  const incomeTaxReserve = base
    .times(toMoney(input.incomeTaxReservePercent))
    .dividedBy(100);
  const totalReserve = generalReserve.plus(tradeTaxReserve).plus(incomeTaxReserve);

  return {
    generalReserve,
    tradeTaxReserve,
    incomeTaxReserve,
    totalReserve,
    netAfterReserve: profit.minus(totalReserve),
  };
}
