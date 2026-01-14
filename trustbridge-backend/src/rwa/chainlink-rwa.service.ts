import { Injectable, Logger } from '@nestjs/common';
import { ChainlinkService } from '../chainlink/chainlink.service';
import { ConfigService } from '@nestjs/config';

export interface RWAPriceData {
  assetId: string;
  assetType: string;
  category: string;
  location: string;
  currentValue: number;
  priceChange24h: number;
  priceChangePercent: number;
  confidence: number;
  source: string;
  timestamp: Date;
  marketConditions: {
    volatility: number;
    liquidity: number;
    demand: number;
  };
}

export interface RWARiskData {
  assetId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: {
    marketVolatility: number;
    locationRisk: number;
    assetLiquidity: number;
    regulatoryRisk: number;
    weatherRisk?: number;
    economicRisk: number;
  };
  recommendations: string[];
  timestamp: Date;
}

export interface RWAMarketData {
  category: string;
  region: string;
  averagePrice: number;
  priceTrend: 'UP' | 'DOWN' | 'STABLE';
  volume24h: number;
  marketCap: number;
  confidence: number;
  timestamp: Date;
}

export interface AMCAssignmentData {
  assetId: string;
  availableAMCs: string[];
  selectedAMC: string;
  assignmentReason: string;
  confidence: number;
  timestamp: Date;
}

@Injectable()
export class ChainlinkRWAService {
  private readonly logger = new Logger(ChainlinkRWAService.name);

  constructor(
    private readonly chainlinkService: ChainlinkService,
    private readonly configService: ConfigService
  ) {}

  // ========================================
  // RWA PRICE FEEDS
  // ========================================

  async getRWAAssetPrice(assetId: string, assetType: string, category: string, location: string): Promise<RWAPriceData | null> {
    try {
      this.logger.log(`Getting Chainlink price data for RWA asset ${assetId} (${assetType})`);

      // Get base price from Chainlink feeds
      const basePrice = await this.getBasePriceForCategory(category, location);
      if (!basePrice) {
        throw new Error(`No price data available for ${category} in ${location}`);
      }

      // Apply location and asset-specific multipliers
      const locationMultiplier = await this.getLocationMultiplier(location);
      const assetTypeMultiplier = await this.getAssetTypeMultiplier(assetType);
      
      const currentValue = basePrice.price * locationMultiplier * assetTypeMultiplier;

      // Get market conditions
      const marketConditions = await this.getMarketConditions(category, location);

      // Calculate price changes (mock for now - would come from historical data)
      const priceChange24h = currentValue * (Math.random() * 0.1 - 0.05); // ±5% random change
      const priceChangePercent = (priceChange24h / currentValue) * 100;

      return {
        assetId,
        assetType,
        category,
        location,
        currentValue,
        priceChange24h,
        priceChangePercent,
        confidence: basePrice.confidence * 0.9, // Slightly lower confidence due to multipliers
        source: `Chainlink + Location/Asset Multipliers`,
        timestamp: new Date(),
        marketConditions
      };
    } catch (error) {
      this.logger.error(`Failed to get RWA price data for ${assetId}:`, error);
      return null;
    }
  }

  private async getBasePriceForCategory(category: string, location: string): Promise<{ price: number; confidence: number } | null> {
    try {
      // Map RWA categories to Chainlink feeds
      const feedMapping = {
        'Real Estate': 'REAL_ESTATE_INDEX',
        'Farmland': 'WHEAT', // Use agricultural commodity as proxy
        'Equipment': 'USD_HBAR', // Use stable currency as base
        'Commodities': 'BTC_USD', // Use crypto as proxy for commodities
        'Vehicles': 'USD_HBAR', // Use stable currency as base
        'Farm Produce': 'WHEAT' // Use agricultural commodity
      };

      const feedSymbol = feedMapping[category] || 'USD_HBAR';
      const priceData = await this.chainlinkService.getAssetPrice(feedSymbol, location);
      
      if (!priceData) {
        return null;
      }

      return {
        price: priceData.price,
        confidence: priceData.confidence
      };
    } catch (error) {
      this.logger.error(`Failed to get base price for ${category}:`, error);
      return null;
    }
  }

  private async getLocationMultiplier(location: string): Promise<number> {
    // Location-based price multipliers (mock data - would come from real estate APIs)
    const locationMultipliers = {
      'Victoria Island, Lagos, Nigeria': 2.5,
      'Lekki, Lagos, Nigeria': 1.8,
      'Port Harcourt, Rivers, Nigeria': 1.2,
      'Abuja, Nigeria': 1.5,
      'Kano, Nigeria': 0.8,
      'Lagos, Nigeria': 2.0,
      'New York, USA': 3.0,
      'London, UK': 2.8,
      'Dubai, UAE': 2.2,
      'Singapore': 2.5
    };

    return locationMultipliers[location] || 1.0;
  }

  private async getAssetTypeMultiplier(assetType: string): Promise<number> {
    // Asset type-specific multipliers
    const assetTypeMultipliers = {
      'Commercial Building': 1.0,
      'Residential Property': 0.8,
      'Agricultural Land': 0.6,
      'Mining Equipment': 1.2,
      'Construction Equipment': 1.1,
      'Vehicles': 0.9,
      'Gold': 1.5,
      'Oil': 1.3
    };

    return assetTypeMultipliers[assetType] || 1.0;
  }

  private async getMarketConditions(category: string, location: string): Promise<{ volatility: number; liquidity: number; demand: number }> {
    // Mock market conditions - would come from real market data APIs
    return {
      volatility: Math.random() * 0.3 + 0.1, // 10-40%
      liquidity: Math.random() * 0.8 + 0.2, // 20-100%
      demand: Math.random() * 0.9 + 0.1 // 10-100%
    };
  }

  // ========================================
  // RWA RISK ASSESSMENT
  // ========================================

  async getRWARiskAssessment(assetId: string, category: string, location: string, expectedAPY: number): Promise<RWARiskData> {
    try {
      this.logger.log(`Calculating Chainlink-based risk assessment for RWA asset ${assetId}`);

      // Get market volatility from Chainlink feeds
      const marketVolatility = await this.getMarketVolatility(category, location);
      
      // Get location risk factors
      const locationRisk = await this.getLocationRisk(location);
      
      // Get asset liquidity based on category
      const assetLiquidity = this.getAssetLiquidity(category);
      
      // Get regulatory risk
      const regulatoryRisk = await this.getRegulatoryRisk(location);
      
      // Get weather risk for agricultural assets
      const weatherRisk = category === 'Farmland' || category === 'Farm Produce' 
        ? await this.getWeatherRisk(location) 
        : undefined;
      
      // Get economic risk
      const economicRisk = await this.getEconomicRisk(location);

      // Calculate overall risk score
      const riskFactors = {
        marketVolatility,
        locationRisk,
        assetLiquidity,
        regulatoryRisk,
        weatherRisk: weatherRisk || 0,
        economicRisk
      };

      const riskScore = this.calculateRiskScore(riskFactors, expectedAPY);
      const riskLevel = this.determineRiskLevel(riskScore);

      // Generate recommendations
      const recommendations = this.generateRiskRecommendations(riskFactors, riskLevel);

      return {
        assetId,
        riskScore,
        riskLevel,
        factors: riskFactors,
        recommendations,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to calculate risk assessment for ${assetId}:`, error);
      throw new Error(`Risk assessment failed: ${error.message}`);
    }
  }

  private async getMarketVolatility(category: string, location: string): Promise<number> {
    try {
      // Use Chainlink price feeds to calculate volatility
      const priceData = await this.chainlinkService.getAssetPrice(category, location);
      if (!priceData) {
        return 0.3; // Default moderate volatility
      }

      // Mock volatility calculation - would use historical price data
      return Math.random() * 0.4 + 0.1; // 10-50% volatility
    } catch (error) {
      this.logger.warn(`Failed to get market volatility: ${error.message}`);
      return 0.3; // Default moderate volatility
    }
  }

  private async getLocationRisk(location: string): Promise<number> {
    // Location risk factors (mock data - would come from real risk assessment APIs)
    const locationRisks = {
      'Victoria Island, Lagos, Nigeria': 0.2, // Low risk - prime location
      'Lekki, Lagos, Nigeria': 0.3, // Medium-low risk
      'Port Harcourt, Rivers, Nigeria': 0.4, // Medium risk
      'Abuja, Nigeria': 0.2, // Low risk - capital city
      'Kano, Nigeria': 0.5, // Medium-high risk
      'New York, USA': 0.1, // Very low risk
      'London, UK': 0.1, // Very low risk
      'Dubai, UAE': 0.2, // Low risk
      'Singapore': 0.1 // Very low risk
    };

    return locationRisks[location] || 0.4; // Default medium risk
  }

  private getAssetLiquidity(category: string): number {
    // Asset liquidity based on category
    const liquidityScores = {
      'Real Estate': 0.8, // High liquidity
      'Farmland': 0.4, // Medium liquidity
      'Equipment': 0.3, // Low liquidity
      'Commodities': 0.9, // Very high liquidity
      'Vehicles': 0.6, // Medium-high liquidity
      'Farm Produce': 0.5 // Medium liquidity
    };

    return liquidityScores[category] || 0.5;
  }

  private async getRegulatoryRisk(location: string): Promise<number> {
    // Regulatory risk by jurisdiction (mock data)
    const regulatoryRisks = {
      'Nigeria': 0.4, // Medium risk
      'USA': 0.1, // Low risk
      'UK': 0.1, // Low risk
      'UAE': 0.2, // Low-medium risk
      'Singapore': 0.1 // Low risk
    };

    // Extract country from location
    const country = location.split(',').pop()?.trim() || 'Nigeria';
    return regulatoryRisks[country] || 0.4;
  }

  private async getWeatherRisk(location: string): Promise<number> {
    try {
      // For now, use default coordinates (Lagos, Nigeria)
      // In production, you'd geocode the location string to get lat/lng
      const lat = 6.5244;
      const lng = 3.3792;
      const weatherData = await this.chainlinkService.getWeatherData(lat, lng);
      if (!weatherData) {
        return 0.3; // Default moderate weather risk
      }

      // Calculate weather risk based on conditions
      let weatherRisk = 0.1; // Base low risk

      // High temperature risk
      if (weatherData.temperature > 35) weatherRisk += 0.2;
      if (weatherData.temperature < 5) weatherRisk += 0.1;

      // Precipitation risk
      if (weatherData.precipitation > 50) weatherRisk += 0.2;
      if (weatherData.precipitation < 10) weatherRisk += 0.1;

      // Wind risk
      if (weatherData.windSpeed > 20) weatherRisk += 0.1;

      return Math.min(weatherRisk, 0.8); // Cap at 80% risk
    } catch (error) {
      this.logger.warn(`Failed to get weather risk: ${error.message}`);
      return 0.3; // Default moderate weather risk
    }
  }

  private async getEconomicRisk(location: string): Promise<number> {
    // Economic risk by location (mock data - would come from economic indicators)
    const economicRisks = {
      'Victoria Island, Lagos, Nigeria': 0.3,
      'Lekki, Lagos, Nigeria': 0.3,
      'Port Harcourt, Rivers, Nigeria': 0.4,
      'Abuja, Nigeria': 0.2,
      'Kano, Nigeria': 0.5,
      'New York, USA': 0.1,
      'London, UK': 0.1,
      'Dubai, UAE': 0.2,
      'Singapore': 0.1
    };

    return economicRisks[location] || 0.4;
  }

  private calculateRiskScore(factors: any, expectedAPY: number): number {
    const weights = {
      marketVolatility: 0.25,
      locationRisk: 0.20,
      assetLiquidity: 0.15,
      regulatoryRisk: 0.15,
      weatherRisk: 0.10,
      economicRisk: 0.15
    };

    let riskScore = 0;
    for (const [factor, value] of Object.entries(factors)) {
      if (value !== undefined && typeof value === 'number') {
        riskScore += value * (weights[factor] || 0);
      }
    }

    // Adjust for APY - higher APY typically means higher risk
    const apyRiskAdjustment = Math.min(expectedAPY / 50, 0.3); // Cap at 30% additional risk
    riskScore += apyRiskAdjustment;

    return Math.min(riskScore, 1.0); // Cap at 100% risk
  }

  private determineRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (riskScore <= 0.3) return 'LOW';
    if (riskScore <= 0.6) return 'MEDIUM';
    return 'HIGH';
  }

  private generateRiskRecommendations(factors: any, riskLevel: string): string[] {
    const recommendations = [];

    if (factors.marketVolatility > 0.4) {
      recommendations.push('Consider hedging against market volatility');
    }

    if (factors.locationRisk > 0.4) {
      recommendations.push('Location presents higher risk - ensure proper insurance coverage');
    }

    if (factors.assetLiquidity < 0.4) {
      recommendations.push('Asset has low liquidity - consider longer investment horizon');
    }

    if (factors.regulatoryRisk > 0.3) {
      recommendations.push('Monitor regulatory changes in the jurisdiction');
    }

    if (factors.weatherRisk > 0.4) {
      recommendations.push('Implement weather risk mitigation strategies');
    }

    if (factors.economicRisk > 0.4) {
      recommendations.push('Diversify across different economic regions');
    }

    if (riskLevel === 'HIGH') {
      recommendations.push('Consider reducing position size or increasing due diligence');
    }

    return recommendations;
  }

  // ========================================
  // AMC ASSIGNMENT WITH CHAINLINK VRF
  // ========================================

  async assignAMCWithVRF(assetId: string, availableAMCs: string[]): Promise<AMCAssignmentData> {
    try {
      this.logger.log(`Using Chainlink VRF to assign AMC for asset ${assetId}`);

      // Request random number from Chainlink VRF
      const vrfResult = await this.chainlinkService.requestRandomNumber();
      
      if (!vrfResult) {
        throw new Error('Failed to get random value from Chainlink VRF');
      }

      // Use random value to select AMC
      const randomIndex = parseInt(vrfResult.randomValue, 16) % availableAMCs.length;
      const selectedAMC = availableAMCs[randomIndex];

      // Generate assignment reason
      const assignmentReason = this.generateAssignmentReason(selectedAMC, vrfResult.randomValue);

      return {
        assetId,
        availableAMCs,
        selectedAMC,
        assignmentReason,
        confidence: 0.95, // High confidence due to Chainlink VRF
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to assign AMC with VRF for ${assetId}:`, error);
      throw new Error(`AMC assignment failed: ${error.message}`);
    }
  }

  private generateAssignmentReason(selectedAMC: string, randomValue: string): string {
    const reasons = [
      `Random selection via Chainlink VRF (${randomValue.slice(0, 8)}...) ensures fair distribution`,
      `Chainlink VRF guarantees unbiased AMC assignment for transparent asset management`,
      `Verifiable random selection provides tamper-proof AMC assignment process`,
      `Decentralized randomness ensures no single party can influence AMC selection`
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  // ========================================
  // MARKET DATA AGGREGATION
  // ========================================

  async getRWAMarketData(category: string, region: string): Promise<RWAMarketData> {
    try {
      this.logger.log(`Getting Chainlink-based market data for ${category} in ${region}`);

      // Get base market data from Chainlink feeds
      const basePrice = await this.getBasePriceForCategory(category, region);
      if (!basePrice) {
        throw new Error(`No market data available for ${category} in ${region}`);
      }

      // Calculate market metrics
      const averagePrice = basePrice.price;
      const priceTrend = this.calculatePriceTrend(category, region);
      const volume24h = this.calculateVolume24h(category, region);
      const marketCap = this.calculateMarketCap(category, region, averagePrice);

      return {
        category,
        region,
        averagePrice,
        priceTrend,
        volume24h,
        marketCap,
        confidence: basePrice.confidence,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to get market data for ${category} in ${region}:`, error);
      throw new Error(`Market data retrieval failed: ${error.message}`);
    }
  }

  private calculatePriceTrend(category: string, region: string): 'UP' | 'DOWN' | 'STABLE' {
    // Mock price trend calculation - would use historical data
    const trend = Math.random();
    if (trend > 0.6) return 'UP';
    if (trend < 0.4) return 'DOWN';
    return 'STABLE';
  }

  private calculateVolume24h(category: string, region: string): number {
    // Mock volume calculation - would use real trading data
    const baseVolume = {
      'Real Estate': 1000000,
      'Farmland': 500000,
      'Equipment': 200000,
      'Commodities': 2000000,
      'Vehicles': 300000,
      'Farm Produce': 400000
    };

    return baseVolume[category] || 500000;
  }

  private calculateMarketCap(category: string, region: string, averagePrice: number): number {
    // Mock market cap calculation
    const assetCount = {
      'Real Estate': 1000,
      'Farmland': 500,
      'Equipment': 200,
      'Commodities': 5000,
      'Vehicles': 300,
      'Farm Produce': 800
    };

    return averagePrice * (assetCount[category] || 1000);
  }
}
