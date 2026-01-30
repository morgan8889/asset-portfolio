/**
 * Tests for Region Inference Utility
 */

import { describe, it, expect } from 'vitest';
import { inferRegion, getRegionName, getRegionFlag } from '../region-inference';
import { Region } from '@/types/asset';

describe('Region Inference', () => {
  describe('inferRegion', () => {
    describe('ticker suffix detection', () => {
      it('should detect UK stocks (.L suffix)', () => {
        expect(inferRegion('VOD.L')).toBe('UK');
        expect(inferRegion('HSBA.L')).toBe('UK');
        expect(inferRegion('BP.LON')).toBe('UK');
      });

      it('should detect Canadian stocks', () => {
        expect(inferRegion('TD.TO')).toBe('CA'); // Toronto Stock Exchange
        expect(inferRegion('SHOP.TO')).toBe('CA');
        expect(inferRegion('ABC.V')).toBe('CA'); // TSX Venture
      });

      it('should detect European stocks', () => {
        expect(inferRegion('SAP.DE')).toBe('EU'); // Deutsche Börse
        expect(inferRegion('VOW3.F')).toBe('EU'); // Frankfurt
        expect(inferRegion('MC.PA')).toBe('EU'); // Paris
        expect(inferRegion('ASML.AS')).toBe('EU'); // Amsterdam
        expect(inferRegion('ENI.MI')).toBe('EU'); // Milan
        expect(inferRegion('TEF.MC')).toBe('EU'); // Madrid
      });

      it('should detect APAC stocks', () => {
        expect(inferRegion('0700.HK')).toBe('APAC'); // Hong Kong
        expect(inferRegion('7203.T')).toBe('APAC'); // Tokyo
        expect(inferRegion('600519.SS')).toBe('APAC'); // Shanghai
        expect(inferRegion('000001.SZ')).toBe('APAC'); // Shenzhen
        expect(inferRegion('005930.KS')).toBe('APAC'); // Korea
        expect(inferRegion('BHP.AX')).toBe('APAC'); // Australia
        expect(inferRegion('AIR.NZ')).toBe('APAC'); // New Zealand
        expect(inferRegion('DBS.SI')).toBe('APAC'); // Singapore
        expect(inferRegion('2330.TW')).toBe('APAC'); // Taiwan
      });

      it('should detect emerging market stocks', () => {
        expect(inferRegion('PTT.BK')).toBe('EMERGING'); // Thailand
        expect(inferRegion('ASII.JK')).toBe('EMERGING'); // Indonesia
        expect(inferRegion('MAYBANK.KL')).toBe('EMERGING'); // Malaysia
        expect(inferRegion('RELIANCE.BO')).toBe('EMERGING'); // Bombay
        expect(inferRegion('TCS.NS')).toBe('EMERGING'); // NSE India
        expect(inferRegion('PETR4.SA')).toBe('EMERGING'); // Brazil
        expect(inferRegion('WALMEX.MX')).toBe('EMERGING'); // Mexico
        expect(inferRegion('THYAO.IS')).toBe('EMERGING'); // Turkey
        expect(inferRegion('2330.TWO')).toBe('EMERGING'); // Taiwan OTC
      });

      it('should be case-insensitive for suffixes', () => {
        expect(inferRegion('vod.l')).toBe('UK');
        expect(inferRegion('VOD.L')).toBe('UK');
        expect(inferRegion('Vod.L')).toBe('UK');
      });
    });

    describe('exchange detection', () => {
      it('should detect US exchanges', () => {
        expect(inferRegion('AAPL', 'NYSE')).toBe('US');
        expect(inferRegion('MSFT', 'NASDAQ')).toBe('US');
        expect(inferRegion('SPY', 'AMEX')).toBe('US');
      });

      it('should detect UK exchanges', () => {
        expect(inferRegion('VOD', 'LSE')).toBe('UK');
        expect(inferRegion('WIZZ', 'AIM')).toBe('UK');
      });

      it('should detect Canadian exchanges', () => {
        expect(inferRegion('SHOP', 'TSX')).toBe('CA');
      });

      it('should detect European exchanges', () => {
        expect(inferRegion('SAP', 'FRA')).toBe('EU'); // Frankfurt
        expect(inferRegion('MC', 'EPA')).toBe('EU'); // Paris
        expect(inferRegion('ASML', 'AMS')).toBe('EU'); // Amsterdam
        expect(inferRegion('ENI', 'BIT')).toBe('EU'); // Milan
        expect(inferRegion('TEF', 'BME')).toBe('EU'); // Madrid
      });

      it('should detect APAC exchanges', () => {
        expect(inferRegion('0700', 'HKEX')).toBe('APAC'); // Hong Kong
        expect(inferRegion('7203', 'TSE')).toBe('APAC'); // Tokyo
        expect(inferRegion('600519', 'SSE')).toBe('APAC'); // Shanghai
        expect(inferRegion('000001', 'SZSE')).toBe('APAC'); // Shenzhen
        expect(inferRegion('005930', 'KRX')).toBe('APAC'); // Korea
        expect(inferRegion('BHP', 'ASX')).toBe('APAC'); // Australia
      });

      it('should detect emerging market exchanges', () => {
        expect(inferRegion('RELIANCE', 'NSE')).toBe('EMERGING'); // India NSE
        expect(inferRegion('TCS', 'BSE')).toBe('EMERGING'); // India BSE
        expect(inferRegion('PETR4', 'BOVESPA')).toBe('EMERGING'); // Brazil
        expect(inferRegion('WALMEX', 'BMV')).toBe('EMERGING'); // Mexico
      });

      it('should be case-insensitive for exchanges', () => {
        expect(inferRegion('AAPL', 'nyse')).toBe('US');
        expect(inferRegion('AAPL', 'NYSE')).toBe('US');
        expect(inferRegion('AAPL', 'Nyse')).toBe('US');
      });

      it('should prioritize suffix over exchange', () => {
        // Even if exchange says NYSE, .L suffix should win
        expect(inferRegion('VOD.L', 'NYSE')).toBe('UK');
      });
    });

    describe('crypto detection', () => {
      it('should detect crypto with -USD suffix', () => {
        expect(inferRegion('BTC-USD')).toBe('OTHER');
        expect(inferRegion('ETH-USD')).toBe('OTHER');
        expect(inferRegion('SOL-USD')).toBe('OTHER');
      });

      it('should detect crypto with /USD format', () => {
        expect(inferRegion('BTC/USD')).toBe('OTHER');
        expect(inferRegion('ETH/USD')).toBe('OTHER');
      });

      it('should detect USDT pairs', () => {
        expect(inferRegion('BTCUSDT')).toBe('OTHER');
        expect(inferRegion('ETHUSDT')).toBe('OTHER');
      });

      it('should not detect stock with USD in company name', () => {
        // A stock with "USD" in the middle should default to US
        expect(inferRegion('USDCORP')).toBe('US');
        expect(inferRegion('CORPORUSD')).toBe('US');
      });
    });

    describe('default behavior', () => {
      it('should default to US for stocks without suffix or exchange', () => {
        expect(inferRegion('AAPL')).toBe('US');
        expect(inferRegion('MSFT')).toBe('US');
        expect(inferRegion('TSLA')).toBe('US');
      });

      it('should default to US for unknown exchanges', () => {
        expect(inferRegion('ABC', 'UNKNOWN_EXCHANGE')).toBe('US');
      });

      it('should default to US for unknown suffixes', () => {
        expect(inferRegion('ABC.XYZ')).toBe('US');
      });
    });
  });

  describe('getRegionName', () => {
    it('should return human-readable region names', () => {
      const cases: [Region, string][] = [
        ['US', 'United States'],
        ['UK', 'United Kingdom'],
        ['EU', 'Europe'],
        ['APAC', 'Asia-Pacific'],
        ['EMERGING', 'Emerging Markets'],
        ['CA', 'Canada'],
        ['OTHER', 'Other'],
      ];

      cases.forEach(([region, expectedName]) => {
        expect(getRegionName(region)).toBe(expectedName);
      });
    });
  });

  describe('getRegionFlag', () => {
    it('should return flag emojis for regions', () => {
      const cases: [Region, string][] = [
        ['US', '🇺🇸'],
        ['UK', '🇬🇧'],
        ['EU', '🇪🇺'],
        ['APAC', '🌏'],
        ['EMERGING', '🌍'],
        ['CA', '🇨🇦'],
        ['OTHER', '🌐'],
      ];

      cases.forEach(([region, expectedFlag]) => {
        expect(getRegionFlag(region)).toBe(expectedFlag);
      });
    });
  });

  describe('real-world examples', () => {
    it('should correctly infer popular stocks', () => {
      // US stocks
      expect(inferRegion('AAPL')).toBe('US');
      expect(inferRegion('GOOGL')).toBe('US');
      expect(inferRegion('TSLA')).toBe('US');

      // UK stocks
      expect(inferRegion('HSBA.L')).toBe('UK');
      expect(inferRegion('LLOY.L')).toBe('UK');

      // EU stocks
      expect(inferRegion('BMW.DE')).toBe('EU');
      expect(inferRegion('OR.PA')).toBe('EU');

      // APAC stocks
      expect(inferRegion('SONY.T')).toBe('APAC');
      expect(inferRegion('TCEHY.HK')).toBe('APAC');

      // Crypto
      expect(inferRegion('BTC-USD')).toBe('OTHER');
      expect(inferRegion('ETH-USD')).toBe('OTHER');
    });

    it('should handle mixed case ticker symbols', () => {
      expect(inferRegion('aapl')).toBe('US');
      expect(inferRegion('Aapl')).toBe('US');
      expect(inferRegion('hsba.l')).toBe('UK');
      expect(inferRegion('HSBA.l')).toBe('UK');
    });
  });
});
