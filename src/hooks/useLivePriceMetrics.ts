/**
 * useLivePriceMetrics Hook
 *
 * Bridges the price store to portfolio calculations, providing live metrics
 * that update in real-time as prices change.
 *
 * @module hooks/useLivePriceMetrics
 */

import { useMemo } from 'react';
import { Decimal } from 'decimal.js';
import { usePriceStore } from '@/lib/stores/price';
import { Holding, Asset } from '@/types';
import { HoldingPerformance } from '@/types/dashboard';

/**
 * Extended holding with live price data.
 */
export interface LiveHolding extends Holding {
  symbol: string;
  name: string;
  assetType: string;
  livePrice: number | null;
  liveValue: Decimal;
  liveGain: Decimal;
  liveGainPercent: number;
  dayChange: Decimal;
  dayChangePercent: number;
  hasLivePrice: boolean;
}

/**
 * Aggregated metrics calculated from live prices.
 */
export interface LiveMetrics {
  // Portfolio totals
  totalValue: Decimal;
  totalCost: Decimal;
  totalGain: Decimal;
  totalGainPercent: number;

  // Day change (from LivePriceData.change)
  dayChange: Decimal;
  dayChangePercent: number;

  // Per-holding live values for further calculations
  liveHoldings: LiveHolding[];

  // Top performers / biggest losers
  topPerformers: HoldingPerformance[];
  biggestLosers: HoldingPerformance[];

  // Status
  hasLivePrices: boolean;
  priceCount: number;
  holdingsWithPrices: number;
}

/**
 * Hook that subscribes to live prices and recalculates portfolio metrics.
 *
 * @param holdings - Array of holdings from portfolio store
 * @param assets - Array of assets for symbol/name lookup
 * @returns LiveMetrics with real-time calculated values
 */
export function useLivePriceMetrics(
  holdings: Holding[],
  assets: Asset[]
): LiveMetrics {
  // Subscribe to price store - this causes re-render when prices update
  const prices = usePriceStore((state) => state.prices);

  // Create asset lookup map
  const assetMap = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets]
  );

  // Calculate all metrics from live prices
  return useMemo(() => {
    if (!holdings || holdings.length === 0) {
      return {
        totalValue: new Decimal(0),
        totalCost: new Decimal(0),
        totalGain: new Decimal(0),
        totalGainPercent: 0,
        dayChange: new Decimal(0),
        dayChangePercent: 0,
        liveHoldings: [],
        topPerformers: [],
        biggestLosers: [],
        hasLivePrices: false,
        priceCount: 0,
        holdingsWithPrices: 0,
      };
    }

    let totalValue = new Decimal(0);
    let totalCost = new Decimal(0);
    let totalDayChange = new Decimal(0);
    let holdingsWithPrices = 0;
    const liveHoldings: LiveHolding[] = [];

    for (const holding of holdings) {
      const asset = assetMap.get(holding.assetId);
      if (!asset) continue;

      const priceData = prices.get(asset.symbol);
      const hasLivePrice = priceData !== undefined;

      let livePrice: number | null = null;
      let liveValue: Decimal;
      let liveGain: Decimal;
      let liveGainPercent: number;
      let dayChange: Decimal;
      let dayChangePercent: number;

      if (hasLivePrice && priceData) {
        holdingsWithPrices++;
        // displayPrice is already converted (pence to pounds for UK)
        livePrice = parseFloat(priceData.displayPrice);
        liveValue = holding.quantity.mul(livePrice);
        liveGain = liveValue.minus(holding.costBasis);
        liveGainPercent = holding.costBasis.isZero()
          ? 0
          : liveGain.div(holding.costBasis).mul(100).toNumber();

        // Day change from price data
        const priceChange = parseFloat(priceData.change);
        dayChange = holding.quantity.mul(priceChange);
        dayChangePercent = priceData.changePercent;
      } else {
        // Fall back to stored values
        liveValue = holding.currentValue;
        liveGain = holding.unrealizedGain;
        liveGainPercent = holding.costBasis.isZero()
          ? 0
          : liveGain.div(holding.costBasis).mul(100).toNumber();
        dayChange = new Decimal(0);
        dayChangePercent = 0;
      }

      totalValue = totalValue.plus(liveValue);
      totalCost = totalCost.plus(holding.costBasis);
      totalDayChange = totalDayChange.plus(dayChange);

      liveHoldings.push({
        ...holding,
        symbol: asset.symbol,
        name: asset.name,
        assetType: asset.type,
        livePrice,
        liveValue,
        liveGain,
        liveGainPercent,
        dayChange,
        dayChangePercent,
        hasLivePrice,
      });
    }

    // Calculate portfolio-level metrics
    const totalGain = totalValue.minus(totalCost);
    const totalGainPercent = totalCost.isZero()
      ? 0
      : totalGain.div(totalCost).mul(100).toNumber();

    // Calculate day change percent relative to previous value
    const previousTotalValue = totalValue.minus(totalDayChange);
    const dayChangePercent = previousTotalValue.isZero()
      ? 0
      : totalDayChange.div(previousTotalValue).mul(100).toNumber();

    // Calculate top performers and biggest losers
    const sortedByGain = [...liveHoldings]
      .filter((h) => h.hasLivePrice)
      .sort((a, b) => b.liveGainPercent - a.liveGainPercent);

    const topPerformers: HoldingPerformance[] = sortedByGain
      .filter((h) => h.liveGainPercent > 0)
      .slice(0, 5)
      .map((h) => ({
        holdingId: h.id,
        symbol: h.symbol,
        name: h.name,
        assetType: h.assetType,
        percentGain: h.liveGainPercent,
        absoluteGain: h.liveGain,
        currentValue: h.liveValue,
        periodStartValue: h.costBasis,
        period: 'ALL' as const,
        isInterpolated: false,
      }));

    const biggestLosers: HoldingPerformance[] = sortedByGain
      .filter((h) => h.liveGainPercent < 0)
      .reverse()
      .slice(0, 5)
      .map((h) => ({
        holdingId: h.id,
        symbol: h.symbol,
        name: h.name,
        assetType: h.assetType,
        percentGain: h.liveGainPercent,
        absoluteGain: h.liveGain,
        currentValue: h.liveValue,
        periodStartValue: h.costBasis,
        period: 'ALL' as const,
        isInterpolated: false,
      }));

    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      dayChange: totalDayChange,
      dayChangePercent,
      liveHoldings,
      topPerformers,
      biggestLosers,
      hasLivePrices: holdingsWithPrices > 0,
      priceCount: prices.size,
      holdingsWithPrices,
    };
  }, [holdings, assetMap, prices]);
}
