import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Location } from '../types';

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}

export interface GPSVerification {
  verified: boolean;
  address: string;
  country: string;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  confidence: number;
}

export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  conditions: string;
  timestamp: Date;
  forecast: Array<{
    date: Date;
    temperature: number;
    precipitation: number;
    conditions: string;
  }>;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  timestamp: Date;
  source: string;
}

@Injectable()
export class ExternalApisService {
  private readonly logger = new Logger(ExternalApisService.name);
  
  // API Keys
  private readonly googleApiKey = this.configService.get<string>('GOOGLE_API_KEY');
  private readonly openWeatherApiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
  private readonly alphaVantageApiKey = this.configService.get<string>('ALPHA_VANTAGE_API_KEY');
  private readonly awsAccessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
  private readonly awsSecretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

  // External APIs configuration
  private readonly externalAPIs = {
    googleMaps: {
      apiKey: this.configService.get<string>('GOOGLE_MAPS_API_KEY'),
      baseUrl: 'https://maps.googleapis.com/maps/api',
    },
    openWeatherMap: {
      apiKey: this.configService.get<string>('OPENWEATHER_API_KEY'),
      baseUrl: 'https://api.openweathermap.org/data/2.5',
    },
  };

  constructor(private configService: ConfigService) {}

  // OCR Services
  async extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      // Try Google Vision API first
      if (this.googleApiKey) {
        return await this.extractTextWithGoogleVision(imageBuffer, mimeType);
      }
      
      // Fallback to AWS Textract
      if (this.awsAccessKey && this.awsSecretKey) {
        return await this.extractTextWithAWS(imageBuffer, mimeType);
      }
      
      // Use FREE Tesseract.js as default
      return await this.extractTextWithTesseract(imageBuffer, mimeType);
    } catch (error) {
      this.logger.error('OCR extraction failed:', error);
      throw error;
    }
  }

  private async extractTextWithGoogleVision(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleApiKey}`,
        {
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }
      );

      const annotations = response.data.responses[0];
      const textAnnotations = annotations.textAnnotations || [];
      const documentAnnotations = annotations.fullTextAnnotation || {};

      let extractedText = '';
      let confidence = 0;

      if (textAnnotations.length > 0) {
        extractedText = textAnnotations[0].description || '';
        confidence = textAnnotations[0].score || 0.8;
      } else if (documentAnnotations.text) {
        extractedText = documentAnnotations.text;
        confidence = 0.9;
      }

      // Extract entities (names, dates, numbers)
      const entities = this.extractEntities(extractedText);

      return {
        text: extractedText,
        confidence,
        language: 'en', // TODO: Detect language
        entities,
      };
    } catch (error) {
      this.logger.error('Google Vision API failed:', error);
      throw error;
    }
  }

  private async extractTextWithAWS(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      // TODO: Implement AWS Textract integration
      this.logger.log('Using Tesseract OCR for text extraction');
      return this.extractTextWithTesseract(imageBuffer, mimeType);
    } catch (error) {
      this.logger.error('AWS Textract failed:', error);
      throw error;
    }
  }

  private async extractTextWithTesseract(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      // Validate image buffer first
      if (!imageBuffer || imageBuffer.length < 100) {
        this.logger.warn('Image buffer too small for OCR, using Tesseract');
        return this.extractTextWithTesseract(imageBuffer, mimeType);
      }

      // Use Tesseract.js for FREE OCR
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      
      const { data: { text, confidence } } = await worker.recognize(imageBuffer);
      await worker.terminate();
      
      return {
        text: text.trim(),
        confidence: confidence / 100, // Convert to 0-1 scale
        language: 'en',
        entities: this.extractEntities(text),
      };
    } catch (error) {
      this.logger.error('Tesseract.js OCR failed:', error);
      // Fallback to basic text extraction if Tesseract fails
      return this.extractBasicText(imageBuffer, mimeType);
    }
  }

  private async extractBasicText(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      // Basic text extraction using file metadata and content analysis
      const fileInfo = {
        size: imageBuffer.length,
        type: mimeType,
        timestamp: new Date().toISOString(),
      };

      // Extract basic information from file
      let extractedText = `Document Analysis Report\n`;
      extractedText += `File Type: ${mimeType}\n`;
      extractedText += `File Size: ${fileInfo.size} bytes\n`;
      extractedText += `Analysis Date: ${fileInfo.timestamp}\n`;
      extractedText += `Status: Basic analysis completed\n`;
      extractedText += `Note: Full OCR requires Tesseract.js integration\n`;

      return {
        text: extractedText,
        confidence: 0.6,
        language: 'en',
        entities: this.extractEntities(extractedText),
      };
    } catch (error) {
      this.logger.error('Basic text extraction failed:', error);
      throw new Error('Unable to extract text from document');
    }
  }

  private extractEntities(text: string): Array<{ type: string; value: string; confidence: number }> {
    // Basic entity extraction
    const entities: Array<{ type: string; value: string; confidence: number }> = [];
    
    // Extract common patterns
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b(?:\+?234|0)?[789][01]\d{8}\b/g,
      address: /\b\d+\s+[A-Za-z\s]+(?:Street|Road|Avenue|Lane|Drive|Way|Boulevard|Crescent|Close|Place|Square|Gardens|Estate|Village|Town|City|State|Country)\b/g,
      amount: /\b₦[\d,]+(?:\.\d{2})?\b|\b\d+(?:\.\d{2})?\s*(?:naira|NGN|₦)\b/g,
      date: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      id: /\b[A-Z]{2,3}\/\d{4}\/\d{3,6}\b/g,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        entities.push(...matches.map(match => ({
          type,
          value: match,
          confidence: 0.8,
        })));
      }
    }

    return entities;
  }

  private async getOpenStreetMapLocation(lat: number, lng: number): Promise<Location | null> {
    try {
      // Use OpenStreetMap Nominatim API (free)
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'TrustBridge/1.0',
        },
      });

      const data = response.data;
      if (!data || !data.address) {
        return null;
      }

      return {
        country: data.address.country || 'Unknown',
        region: data.address.state || data.address.region || 'Unknown',
        coordinates: { lat, lng },
        address: data.display_name,
      };
    } catch (error) {
      this.logger.error('OpenStreetMap geocoding failed:', error);
      return null;
    }
  }

  async getGPSLocation(lat: number, lng: number): Promise<Location | null> {
    try {
      if (!this.externalAPIs.googleMaps.apiKey) {
        this.logger.warn('Google Maps API key not configured, using OpenStreetMap');
        return this.getOpenStreetMapLocation(lat, lng);
      }

      const response = await axios.get(`${this.externalAPIs.googleMaps.baseUrl}/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.externalAPIs.googleMaps.apiKey,
        },
      });

      const results = response.data.results;
      if (!results || results.length === 0) {
        return null;
      }

      const result = results[0];
      const addressComponents = result.address_components;
      
      let country = 'Unknown';
      let region = 'Unknown';
      
      for (const component of addressComponents) {
        if (component.types.includes('country')) {
          country = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          region = component.long_name;
        }
      }

      return {
        address: result.formatted_address,
        country,
        region,
        coordinates: { lat, lng },
      };
    } catch (error) {
      this.logger.error('Google Geocoding failed:', error);
      throw error;
    }
  }

  private async verifyGPSWithOSM(lat: number, lng: number): Promise<Location | null> {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );

      const data = response.data;
      if (!data || !data.display_name) {
        return null;
      }

      return {
        address: data.display_name,
        country: data.address?.country || 'Unknown',
        region: data.address?.state || data.address?.county || 'Unknown',
        coordinates: { lat, lng },
      };
    } catch (error) {
      this.logger.error('OpenStreetMap geocoding failed:', error);
      throw error;
    }
  }

  // Weather Data
  async getWeatherData(lat: number, lng: number): Promise<WeatherData> {
    try {
      if (this.openWeatherApiKey) {
        return await this.getWeatherWithOpenWeather(lat, lng);
      }
      
      // Fallback to OpenStreetMap weather data
      return this.getOpenStreetMapWeather(lat, lng);
    } catch (error) {
      this.logger.error('Weather data fetch failed:', error);
      throw error;
    }
  }

  private async getWeatherWithOpenWeather(lat: number, lng: number): Promise<WeatherData> {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${this.openWeatherApiKey}&units=metric`
      );

      const data = response.data;
      
      return {
        location: data.name,
        temperature: data.main.temp,
        humidity: data.main.humidity,
        precipitation: data.rain?.['1h'] || 0,
        windSpeed: data.wind.speed,
        conditions: data.weather[0].description,
        timestamp: new Date(),
        forecast: [], // TODO: Implement forecast
      };
    } catch (error) {
      this.logger.error('OpenWeather API failed:', error);
      throw error;
    }
  }

  private async getOpenStreetMapWeather(lat: number, lng: number): Promise<WeatherData> {
    try {
      // Use OpenWeatherMap free tier or similar service
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          lat,
          lon: lng,
          appid: this.openWeatherApiKey || 'demo', // Use demo key if not configured
          units: 'metric',
        },
      });

      const data = response.data;
      return {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        precipitation: data.rain?.['1h'] || 0,
        windSpeed: data.wind.speed,
        conditions: data.weather[0].main.toLowerCase(),
        timestamp: new Date(),
        location: `${lat},${lng}`,
        forecast: [], // Empty forecast for now
      };
    } catch (error) {
      this.logger.error('OpenStreetMap weather fetch failed:', error);
      throw new Error('Unable to fetch weather data');
    }
  }

  async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      if (this.alphaVantageApiKey) {
        return await this.getMarketDataWithAlphaVantage(symbol);
      }
      
      // Fallback to Yahoo Finance
      return await this.getMarketDataWithYahoo(symbol);
    } catch (error) {
      this.logger.error('Market data fetch failed:', error);
      throw error;
    }
  }

  private async getMarketDataWithAlphaVantage(symbol: string): Promise<MarketData> {
    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageApiKey}`
      );

      const data = response.data['Global Quote'];
      if (!data) {
        throw new Error('No market data available');
      }

      return {
        symbol: data['01. symbol'],
        price: parseFloat(data['05. price']),
        change: parseFloat(data['09. change']),
        changePercent: parseFloat(data['10. change percent'].replace('%', '')),
        volume: parseInt(data['06. volume']),
        marketCap: 0, // Not provided by Alpha Vantage
        timestamp: new Date(),
        source: 'Alpha Vantage',
      };
    } catch (error) {
      this.logger.error('Alpha Vantage API failed:', error);
      throw error;
    }
  }

  private async getMarketDataWithYahoo(symbol: string): Promise<MarketData> {
    try {
      // TODO: Implement Yahoo Finance API integration
      this.logger.log('Yahoo Finance integration not implemented, using CoinGecko');
      return this.getMarketDataWithCoinGecko(symbol);
    } catch (error) {
      this.logger.error('Yahoo Finance API failed:', error);
      throw error;
    }
  }

  private async getMarketDataWithCoinGecko(symbol: string): Promise<MarketData> {
    try {
      // Use CoinGecko API for real market data
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`);
      
      const data = response.data[symbol.toLowerCase()];
      if (!data) {
        throw new Error(`Symbol ${symbol} not found`);
      }

      return {
        symbol: symbol.toUpperCase(),
        price: data.usd,
        change: data.usd_24h_change || 0,
        changePercent: data.usd_24h_change || 0,
        volume: data.usd_24h_vol || 0,
        marketCap: data.usd_market_cap || 0,
        timestamp: new Date(),
        source: 'CoinGecko API',
      };
    } catch (error) {
      this.logger.error('CoinGecko API failed:', error);
      throw new Error('Unable to fetch market data');
    }
  }

  async verifyGPSLocation(lat: number, lng: number, expectedLocation: string): Promise<{ verified: boolean; confidence: number }> {
    try {
      const location = await this.getGPSLocation(lat, lng);
      if (!location) {
        return { verified: false, confidence: 0 };
      }

      // Check if the location matches the expected location
      const locationText = (location.address || '').toLowerCase();
      const expectedText = expectedLocation.toLowerCase();
      
      const verified = locationText.includes(expectedText) || expectedText.includes(locationText);
      const confidence = verified ? 0.9 : 0.1;
      
      return { verified, confidence };
    } catch (error) {
      this.logger.error('GPS verification failed:', error);
      return { verified: false, confidence: 0 };
    }
  }

  // Document Verification
  async verifyDocument(documentBuffer: Buffer, documentType: string): Promise<{
    isValid: boolean;
    confidence: number;
    extractedData: any;
    issues: string[];
  }> {
    try {
      const ocrResult = await this.extractTextFromImage(documentBuffer, 'application/pdf');
      
      // Verify based on document type
      switch (documentType) {
        case 'land_certificate':
          return this.verifyLandCertificate(ocrResult);
        case 'business_license':
          return this.verifyBusinessLicense(ocrResult);
        case 'identity_document':
          return this.verifyIdentityDocument(ocrResult);
        default:
          return {
            isValid: true,
            confidence: ocrResult.confidence,
            extractedData: ocrResult,
            issues: [],
          };
      }
    } catch (error) {
      this.logger.error('Document verification failed:', error);
      throw error;
    }
  }

  private verifyLandCertificate(ocrResult: OCRResult): {
    isValid: boolean;
    confidence: number;
    extractedData: any;
    issues: string[];
  } {
    const issues: string[] = [];
    let confidence = ocrResult.confidence;

    // Check for required fields
    const requiredFields = ['owner', 'location', 'size', 'date'];
    const text = ocrResult.text.toLowerCase();
    
    for (const field of requiredFields) {
      if (!text.includes(field)) {
        issues.push(`Missing required field: ${field}`);
        confidence -= 0.1;
      }
    }

    // Check for suspicious patterns
    if (text.includes('fake') || text.includes('test')) {
      issues.push('Document appears to be fake or test document');
      confidence -= 0.3;
    }

    return {
      isValid: issues.length === 0,
      confidence: Math.max(0, confidence),
      extractedData: ocrResult,
      issues,
    };
  }

  private verifyBusinessLicense(ocrResult: OCRResult): {
    isValid: boolean;
    confidence: number;
    extractedData: any;
    issues: string[];
  } {
    const issues: string[] = [];
    let confidence = ocrResult.confidence;

    // Check for business license specific fields
    const requiredFields = ['license', 'business', 'registration', 'date'];
    const text = ocrResult.text.toLowerCase();
    
    for (const field of requiredFields) {
      if (!text.includes(field)) {
        issues.push(`Missing required field: ${field}`);
        confidence -= 0.1;
      }
    }

    return {
      isValid: issues.length === 0,
      confidence: Math.max(0, confidence),
      extractedData: ocrResult,
      issues,
    };
  }

  private verifyIdentityDocument(ocrResult: OCRResult): {
    isValid: boolean;
    confidence: number;
    extractedData: any;
    issues: string[];
  } {
    const issues: string[] = [];
    let confidence = ocrResult.confidence;

    // Check for identity document specific fields
    const requiredFields = ['name', 'id', 'date', 'birth'];
    const text = ocrResult.text.toLowerCase();
    
    for (const field of requiredFields) {
      if (!text.includes(field)) {
        issues.push(`Missing required field: ${field}`);
        confidence -= 0.1;
      }
    }

    return {
      isValid: issues.length === 0,
      confidence: Math.max(0, confidence),
      extractedData: ocrResult,
      issues,
    };
  }

  // Health Check
  async getHealthStatus(): Promise<{
    services: { [service: string]: boolean };
    lastChecked: Date;
  }> {
    const services: { [service: string]: boolean } = {};
    
    // Check Google APIs
    services.google_vision = !!this.googleApiKey;
    services.google_geocoding = !!this.googleApiKey;
    
    // Check Weather API
    services.openweather = !!this.openWeatherApiKey;
    
    // Check Market Data API
    services.alpha_vantage = !!this.alphaVantageApiKey;
    
    // Check AWS Services
    services.aws_textract = !!(this.awsAccessKey && this.awsSecretKey);

    return {
      services,
      lastChecked: new Date(),
    };
  }
}
