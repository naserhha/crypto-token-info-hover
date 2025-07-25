// Crypto Token Info Hover - Content Script
// Author: Mohammad Nasser Haji Hashemabad
// Version: 1.0.1 (2025)

class CryptoTokenHover {
  constructor() {
    this.isEnabled = true;
    this.tooltip = null;
    this.currentAddress = null;
    this.cache = new Map();
    this.processing = false;
    this.debounceTimer = null;
    this.init();
  }

  async init() {
    // Get extension state from storage
    const result = await chrome.storage.local.get(['cryptoHoverEnabled']);
    this.isEnabled = result.cryptoHoverEnabled !== false; // Default to true
    
    if (this.isEnabled) {
      this.setupObserver();
      this.highlightAddresses();
    }
  }

  setupObserver() {
    // Observe DOM changes to highlight new addresses
    const observer = new MutationObserver(() => {
      if (this.isEnabled) {
        // Debounce the highlighting to prevent excessive processing
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
          this.highlightAddresses();
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  highlightAddresses() {
    // Skip if already processing or disabled
    if (!this.isEnabled || this.processing) return;
    
    this.processing = true;
    
    try {
      // Find all text nodes containing Ethereum addresses
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip nodes that are already processed or in script/style tags
            if (node.parentNode && 
                (node.parentNode.tagName === 'SCRIPT' || 
                 node.parentNode.tagName === 'STYLE' ||
                 node.parentNode.classList.contains('crypto-address-highlight'))) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        },
        false
      );

      const textNodes = [];
      let node;
      
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      // Process each text node separately
      textNodes.forEach(textNode => {
        this.processTextNode(textNode);
      });
    } catch (error) {
      console.warn('Error highlighting addresses:', error);
    } finally {
      this.processing = false;
    }
  }

  processTextNode(textNode) {
    const text = textNode.textContent;
    const ethAddressRegex = /0x[a-fA-F0-9]{40}/g;
    const matches = [];
    let match;
    
    // Find all matches in this text node
    while ((match = ethAddressRegex.exec(text)) !== null) {
      matches.push({
        address: match[0],
        index: match.index
      });
    }
    
    // If no matches, return early
    if (matches.length === 0) return;
    
    // Remove duplicates and sort by index in descending order
    const uniqueMatches = matches.filter((match, index, self) => 
      index === self.findIndex(m => m.address === match.address && m.index === match.index)
    );
    uniqueMatches.sort((a, b) => b.index - a.index);
    
    // Process each match
    uniqueMatches.forEach(({ address, index }) => {
      this.createHighlightedSpan(textNode, address, index);
    });
  }

  // Check if address is a contract or wallet
  async checkAddressType(address) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkAddressType',
        address: address
      });
      
      if (response.success) {
        return response.data;
      }
    } catch (error) {
      console.warn('Error checking address type:', error);
    }
    
    return { type: 'unknown', hasCode: false };
  }

  createHighlightedSpan(textNode, address, index) {
    // Check if textNode is still valid and not already processed
    if (!textNode || !textNode.parentNode) {
      return;
    }
    
    // Check if this specific address is already highlighted in this text node
    const existingHighlight = textNode.parentNode.querySelector(`[data-address="${address}"]`);
    if (existingHighlight) {
      return;
    }
    
    const text = textNode.textContent;
    const before = text.substring(0, index);
    const after = text.substring(index + 42); // 42 = length of Ethereum address
    
    const fragment = document.createDocumentFragment();
    
    if (before) {
      fragment.appendChild(document.createTextNode(before));
    }
    
    const span = document.createElement('span');
    span.textContent = address;
    span.className = 'crypto-address-highlight';
    span.dataset.address = address;
    
    // Add hover events
    span.addEventListener('mouseenter', (e) => this.showTooltip(e, address));
    span.addEventListener('mouseleave', () => this.hideTooltip());
    
    fragment.appendChild(span);
    
    if (after) {
      fragment.appendChild(document.createTextNode(after));
    }
    
    // Double-check parentNode exists before replacing
    if (textNode.parentNode) {
      try {
        textNode.parentNode.replaceChild(fragment, textNode);
        
        // Check address type and update display after successful replacement
        this.checkAddressType(address).then(addressType => {
          if (span.parentNode) {
            this.updateAddressDisplay(span, addressType);
          }
        });
      } catch (error) {
        console.warn('Failed to replace text node:', error);
      }
    }
  }

  updateAddressDisplay(span, addressType) {
    const address = span.dataset.address;
    const shortAddress = address.substring(0, 6) + '...' + address.substring(38);
    
    if (addressType.type === 'contract') {
      let contractLabel = '📄 Contract';
      
      // Add more specific labels based on contract type
      if (addressType.tokenSymbol) {
        contractLabel = `🪙 ${addressType.tokenSymbol}`;
      } else if (addressType.contractName && addressType.contractName !== 'Unknown Contract') {
        contractLabel = `📋 ${addressType.contractName}`;
      }
      
      span.innerHTML = `
        <span class="address-text">${shortAddress}</span>
        <span class="address-type contract">${contractLabel}</span>
      `;
      span.classList.add('contract-address');
      
      // Store additional info for tooltip
      span.dataset.contractName = addressType.contractName || '';
      span.dataset.tokenSymbol = addressType.tokenSymbol || '';
      span.dataset.tokenName = addressType.tokenName || '';
      
    } else if (addressType.type === 'wallet') {
      let walletLabel = '👛 Wallet';
      
      // Add activity indicator
      if (addressType.isKnownWallet) {
        walletLabel = '👛 Known Wallet';
      } else if (addressType.hasTransactions !== undefined) {
        if (addressType.hasTransactions) {
          walletLabel = '👛 Active Wallet';
        } else {
          walletLabel = '👛 New Wallet';
        }
      }
      
      span.innerHTML = `
        <span class="address-text">${shortAddress}</span>
        <span class="address-type wallet">${walletLabel}</span>
      `;
      span.classList.add('wallet-address');
      
      // Store additional info for tooltip
      span.dataset.hasTransactions = addressType.hasTransactions || false;
      span.dataset.isKnownWallet = addressType.isKnownWallet || false;
      
    } else {
      span.innerHTML = `
        <span class="address-text">${shortAddress}</span>
        <span class="address-type unknown">❓ Unknown</span>
      `;
      span.classList.add('unknown-address');
    }
  }

  async showTooltip(event, address) {
    if (!this.isEnabled) return;
    
    this.hideTooltip();
    
    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'crypto-tooltip';
    this.tooltip.innerHTML = `
      <div class="tooltip-content">
        <div class="loading">Loading token info...</div>
      </div>
    `;
    
    document.body.appendChild(this.tooltip);
    
    // Position tooltip
    this.positionTooltip(event);
    
    // Fetch token data
    try {
      const tokenData = await this.fetchTokenData(address);
      this.updateTooltip(tokenData);
    } catch (error) {
      this.updateTooltip({ error: 'Failed to load token data' });
    }
  }

  async fetchTokenData(address) {
    // Check cache first
    if (this.cache.has(address)) {
      const cached = this.cache.get(address);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
        return cached.data;
      }
    }

    // Send message to background script to fetch data
    const response = await chrome.runtime.sendMessage({
      action: 'fetchTokenData',
      address: address
    });

    if (response.success) {
      // Cache the result
      this.cache.set(address, {
        data: response.data,
        timestamp: Date.now()
      });
      return response.data;
    } else {
      throw new Error(response.error);
    }
  }

  updateTooltip(data) {
    if (!this.tooltip) return;
    
    if (data.error) {
      this.tooltip.innerHTML = `
        <div class="tooltip-content">
          <div class="error">${data.error}</div>
        </div>
      `;
      return;
    }

    // Get additional info from the span element
    const span = document.querySelector(`[data-address="${data.address}"]`);
    const contractName = span?.dataset.contractName || '';
    const tokenSymbol = span?.dataset.tokenSymbol || '';
    const tokenName = span?.dataset.tokenName || '';
    const hasTransactions = span?.dataset.hasTransactions || false;

    const price = data.price ? `$${parseFloat(data.price).toFixed(6)}` : 'N/A';
    const symbol = data.symbol || tokenSymbol || 'Unknown';
    const holders = data.holders ? data.holders.toLocaleString() : 'N/A';
    
    let tooltipContent = '';
    
    if (data.type === 'contract') {
      tooltipContent = `
        <div class="tooltip-content">
          <div class="token-symbol">${symbol}</div>
          ${tokenName ? `<div class="token-name">${tokenName}</div>` : ''}
          ${contractName ? `<div class="contract-name">Contract: ${contractName}</div>` : ''}
          <div class="token-price">Price: ${price}</div>
          <div class="token-holders">Holders: ${holders}</div>
          <div class="token-link">
            <a href="https://etherscan.io/address/${data.address}" target="_blank">
              View Contract on Etherscan
            </a>
          </div>
        </div>
      `;
    } else if (data.type === 'wallet') {
      let walletStatus = 'Wallet';
      let walletInfo = '';
      
      if (span?.dataset.isKnownWallet === 'true') {
        walletStatus = 'Known Wallet';
        walletInfo = 'This is a known wallet address';
      } else if (hasTransactions === 'true') {
        walletStatus = 'Active Wallet';
        walletInfo = 'Has transaction history';
      } else {
        walletStatus = 'New Wallet';
        walletInfo = 'No transactions yet';
      }
      
      tooltipContent = `
        <div class="tooltip-content">
          <div class="wallet-title">👛 ${walletStatus}</div>
          <div class="wallet-address">${data.address}</div>
          <div class="wallet-info">
            ${walletInfo}
          </div>
          <div class="token-link">
            <a href="https://etherscan.io/address/${data.address}" target="_blank">
              View Wallet on Etherscan
            </a>
          </div>
        </div>
      `;
    } else {
      tooltipContent = `
        <div class="tooltip-content">
          <div class="unknown-title">❓ Unknown Address</div>
          <div class="unknown-address">${data.address}</div>
          <div class="token-link">
            <a href="https://etherscan.io/address/${data.address}" target="_blank">
              View on Etherscan
            </a>
          </div>
        </div>
      `;
    }
    
    this.tooltip.innerHTML = tooltipContent;
  }

  positionTooltip(event) {
    if (!this.tooltip) return;
    
    const rect = event.target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 10;
    
    // Adjust if tooltip would go off screen
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - tooltipRect.height - 10;
    }
    
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  toggleEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      // Clear any existing debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.highlightAddresses();
    } else {
      // Remove all highlights
      const highlights = document.querySelectorAll('.crypto-address-highlight');
      highlights.forEach(highlight => {
        try {
          const text = highlight.textContent;
          if (highlight.parentNode) {
            highlight.parentNode.replaceChild(document.createTextNode(text), highlight);
          }
        } catch (error) {
          console.warn('Error removing highlight:', error);
        }
      });
      this.hideTooltip();
    }
  }
}

// Initialize the extension
const cryptoHover = new CryptoTokenHover();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleEnabled') {
    cryptoHover.toggleEnabled(request.enabled);
    sendResponse({ success: true });
  }
}); 