// Crypto Token Info Hover - Popup Script
// Author: Mohammad Nasser Haji Hashemabad
// Version: 1.0.1 (2025)

class PopupManager {
  constructor() {
    this.toggleSwitch = document.getElementById('toggleSwitch');
    this.statusElement = document.getElementById('status');
    this.isEnabled = true;
    
    this.init();
  }

  async init() {
    // Load current state from storage
    const result = await chrome.storage.local.get(['cryptoHoverEnabled']);
    this.isEnabled = result.cryptoHoverEnabled !== false; // Default to true
    
    this.updateUI();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.toggleSwitch.addEventListener('click', () => {
      this.toggleEnabled();
    });
  }

  async toggleEnabled() {
    this.isEnabled = !this.isEnabled;
    
    // Save to storage
    await chrome.storage.local.set({ cryptoHoverEnabled: this.isEnabled });
    
    // Update UI
    this.updateUI();
    
    // Send message to active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleEnabled',
          enabled: this.isEnabled
        });
      }
    } catch (error) {
      console.warn('Could not send message to tab:', error);
    }
  }

  updateUI() {
    if (this.isEnabled) {
      this.toggleSwitch.classList.add('active');
      this.statusElement.textContent = 'Highlighting is ON';
    } else {
      this.toggleSwitch.classList.remove('active');
      this.statusElement.textContent = 'Highlighting is OFF';
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 