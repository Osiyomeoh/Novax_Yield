/**
 * Price utility functions for TRUST token and HBAR conversions
 */

// Exchange rate: 1 HBAR = 100 TRUST tokens
export const HBAR_TO_TRUST_RATE = 100;

// Cache for HBAR price to avoid frequent API calls
let hbarPriceCache: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get current HBAR price in USD
 * Uses CoinGecko API as fallback since Chainlink requires contract interaction
 */
export async function getHBARPrice(): Promise<number> {
  // Check cache first
  if (hbarPriceCache && Date.now() - hbarPriceCache.timestamp < CACHE_DURATION) {
    return hbarPriceCache.price;
  }

  try {
    // Try CoinGecko API first (free, no API key required)
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd');
    const data = await response.json();
    
    if (data['hedera-hashgraph']?.usd) {
      const price = data['hedera-hashgraph'].usd;
      
      // Cache the price
      hbarPriceCache = {
        price,
        timestamp: Date.now()
      };
      
      console.log(`💰 HBAR price: $${price}`);
      return price;
    }
  } catch (error) {
    console.warn('Failed to fetch HBAR price from CoinGecko:', error);
  }

  // Fallback to a reasonable default price
  const fallbackPrice = 0.05; // $0.05 per HBAR (conservative estimate)
  console.warn(`Using fallback HBAR price: $${fallbackPrice}`);
  
  return fallbackPrice;
}

/**
 * Convert TRUST tokens to USD value
 * @param trustAmount - Amount of TRUST tokens
 * @returns USD value
 */
export async function trustToUSD(trustAmount: number): Promise<number> {
  const hbarPrice = await getHBARPrice();
  const hbarAmount = trustAmount / HBAR_TO_TRUST_RATE;
  return hbarAmount * hbarPrice;
}

/**
 * Convert USD value to TRUST tokens
 * @param usdAmount - USD amount
 * @returns TRUST token amount
 */
export async function usdToTrust(usdAmount: number): Promise<number> {
  const hbarPrice = await getHBARPrice();
  const hbarAmount = usdAmount / hbarPrice;
  return hbarAmount * HBAR_TO_TRUST_RATE;
}

/**
 * Format USD value with proper currency formatting
 * @param amount - USD amount
 * @returns Formatted string
 */
export function formatUSD(amount: number): string {
  if (amount === 0) {
    return '$0.00';
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  } else {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format TRUST token amount
 * @param amount - TRUST token amount
 * @returns Formatted string
 */
export function formatTRUST(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M TRUST`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K TRUST`;
  } else {
    return `${amount.toLocaleString()} TRUST`;
  }
}


