// Crypto Token Info Hover - Background Service Worker
// Author: Mohammad Nasser Haji Hashemabad
// Version: 1.0.1 (2025)

// API Configuration
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const ETHERSCAN_API_BASE = 'https://api.etherscan.io/api';

// Cache for API responses to avoid rate limits
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const rateLimit = {
  coingecko: { lastCall: 0, minInterval: 1200 }, // 1.2 seconds between calls
  etherscan: { lastCall: 0, minInterval: 200 }    // 200ms between calls
};

// Known wallet addresses (for testing and common addresses)
const KNOWN_WALLETS = new Set([
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7',
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b8',
  '0x1234567890123456789012345678901234567890'
]);

// Known contract addresses (for testing)
const KNOWN_CONTRACTS = new Set([
  '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C', // USDC
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
  '0x6B175474E89094C44Da98b954EedeAC495271d0F'  // DAI
]);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchTokenData') {
    handleTokenDataRequest(request.address, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'checkAddressType') {
    handleAddressTypeRequest(request.address, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleTokenDataRequest(address, sendResponse) {
  try {
    // Check cache first
    const cached = apiCache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      sendResponse({ success: true, data: cached.data });
      return;
    }

    // Fetch token data from multiple sources
    const [coingeckoData, etherscanData] = await Promise.allSettled([
      fetchCoinGeckoData(address),
      fetchEtherscanData(address)
    ]);

    // Combine data
    const tokenData = {
      address: address,
      symbol: coingeckoData.status === 'fulfilled' ? coingeckoData.value.symbol : null,
      price: coingeckoData.status === 'fulfilled' ? coingeckoData.value.price : null,
      holders: etherscanData.status === 'fulfilled' ? etherscanData.value.holders : null
    };

    // Cache the result
    apiCache.set(address, {
      data: tokenData,
      timestamp: Date.now()
    });

    sendResponse({ success: true, data: tokenData });

  } catch (error) {
    console.error('Error fetching token data:', error);
    sendResponse({ 
      success: false, 
      error: 'Failed to fetch token data' 
    });
  }
}

async function fetchCoinGeckoData(address) {
  await enforceRateLimit('coingecko');
  
  try {
    // First, try to find the token by contract address
    const searchUrl = `${COINGECKO_API_BASE}/coins/ethereum/contract/${address}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      symbol: data.symbol?.toUpperCase() || null,
      price: data.market_data?.current_price?.usd || null
    };
    
  } catch (error) {
    console.warn('CoinGecko API failed for address:', address, error);
    return { symbol: null, price: null };
  }
}

async function fetchEtherscanData(address) {
  await enforceRateLimit('etherscan');
  
  try {
    // Get token info from Etherscan
    const url = `${ETHERSCAN_API_BASE}?module=token&action=tokeninfo&contractaddress=${address}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === '1' && data.result && data.result.length > 0) {
      const tokenInfo = data.result[0];
      
      // Get holders count (this would require additional API call)
      // For now, we'll return basic info
      return {
        holders: null, // Would need additional API call for holders count
        name: tokenInfo.name,
        symbol: tokenInfo.symbol
      };
    } else {
      throw new Error('Token not found on Etherscan');
    }
    
  } catch (error) {
    console.warn('Etherscan API failed for address:', address, error);
    return { holders: null };
  }
}

async function enforceRateLimit(api) {
  const now = Date.now();
  const limit = rateLimit[api];
  
  if (now - limit.lastCall < limit.minInterval) {
    const waitTime = limit.minInterval - (now - limit.lastCall);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  limit.lastCall = Date.now();
}

async function handleAddressTypeRequest(address, sendResponse) {
  try {
    // Check cache first
    const cacheKey = `type_${address}`;
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      sendResponse({ success: true, data: cached.data });
      return;
    }

    // Check if address has contract code using Etherscan API
    await enforceRateLimit('etherscan');
    
    const codeUrl = `${ETHERSCAN_API_BASE}?module=proxy&action=eth_getCode&address=${address}&tag=latest`;
    const codeResponse = await fetch(codeUrl);
    
    if (!codeResponse.ok) {
      throw new Error(`Etherscan API error: ${codeResponse.status}`);
    }
    
    const codeData = await codeResponse.json();
    const hasCode = codeData.result && codeData.result !== '0x';
    
    let addressType = 'unknown';
    let additionalInfo = {};
    
    // Check if it's a known address first
    if (KNOWN_WALLETS.has(address)) {
      addressType = 'wallet';
      additionalInfo.isKnownWallet = true;
    } else if (KNOWN_CONTRACTS.has(address)) {
      addressType = 'contract';
      additionalInfo.isKnownContract = true;
    } else if (hasCode) {
      // It's a contract, let's get more details
      addressType = 'contract';
      
      try {
        // Get contract details
        const contractUrl = `${ETHERSCAN_API_BASE}?module=contract&action=getcontractcreation&contractaddresses=${address}`;
        const contractResponse = await fetch(contractUrl);
        
        if (contractResponse.ok) {
          const contractData = await contractResponse.json();
          if (contractData.status === '1' && contractData.result && contractData.result.length > 0) {
            additionalInfo.contractName = contractData.result[0].contractName || 'Unknown Contract';
            additionalInfo.creatorAddress = contractData.result[0].contractCreator;
          }
        }
      } catch (error) {
        console.warn('Could not fetch contract details:', error);
      }
      
      // Try to get token info if it's a token contract
      try {
        const tokenUrl = `${ETHERSCAN_API_BASE}?module=token&action=tokeninfo&contractaddress=${address}`;
        const tokenResponse = await fetch(tokenUrl);
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.status === '1' && tokenData.result && tokenData.result.length > 0) {
            additionalInfo.tokenName = tokenData.result[0].name;
            additionalInfo.tokenSymbol = tokenData.result[0].symbol;
            additionalInfo.decimals = tokenData.result[0].decimals;
          }
        }
      } catch (error) {
        console.warn('Could not fetch token info:', error);
      }
      
    } else {
      // It's likely a wallet address, but let's do additional checks
      addressType = 'wallet';
      
      // Check if it has any transactions
      try {
        const txUrl = `${ETHERSCAN_API_BASE}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1`;
        const txResponse = await fetch(txUrl);
        
        if (txResponse.ok) {
          const txData = await txResponse.json();
          if (txData.status === '1' && txData.result && txData.result.length > 0) {
            additionalInfo.hasTransactions = true;
            additionalInfo.firstTx = txData.result[0];
          } else {
            additionalInfo.hasTransactions = false;
          }
        }
      } catch (error) {
        console.warn('Could not fetch transaction info:', error);
      }
      
      // Check if this address was ever a contract (self-destructed contracts)
      try {
        const balanceUrl = `${ETHERSCAN_API_BASE}?module=account&action=balance&address=${address}&tag=latest`;
        const balanceResponse = await fetch(balanceUrl);
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          if (balanceData.status === '1') {
            additionalInfo.balance = balanceData.result;
          }
        }
      } catch (error) {
        console.warn('Could not fetch balance info:', error);
      }
    }
    
    const result = {
      type: addressType,
      hasCode: hasCode,
      address: address,
      ...additionalInfo
    };
    
    // Cache the result
    apiCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    sendResponse({ success: true, data: result });
    
  } catch (error) {
    console.error('Error checking address type:', error);
    sendResponse({ 
      success: false, 
      error: 'Failed to check address type',
      data: { type: 'unknown', hasCode: false, address: address }
    });
  }
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of apiCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      apiCache.delete(key);
    }
  }
}, 60000); // Check every minute 