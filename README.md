# Crypto Token Info Hover

A free Chrome Extension that automatically highlights Ethereum contract addresses (0x...) on any webpage and displays token information on hover.

## 🚀 Features

- **Auto-Detection**: Automatically finds and highlights Ethereum addresses (0x...) on any webpage
- **Address Type Detection**: Distinguishes between smart contracts and wallet addresses
- **Visual Indicators**: Shows 📄 Contract, 👛 Wallet, or ❓ Unknown labels
- **Token Information**: Shows token symbol, current price, and holder count on hover
- **Direct Links**: Provides direct links to Etherscan for detailed token information
- **Smart Caching**: Implements intelligent caching to avoid API rate limits
- **Toggle Control**: Simple ON/OFF toggle in the extension popup
- **Modern UI**: Clean, responsive design with smooth animations
- **Free Forever**: 100% free with no paid features or tracking

## 📋 Requirements

- Google Chrome browser (version 88 or higher)
- Internet connection for API calls
- No API keys required (uses public APIs)

## 🛠️ Installation

### Local Development Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nasserhaji/crypto-token-info-hover.git
   cd crypto-token-info-hover
   ```

2. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `crypto-token-info-hover` folder

3. **Test the extension**
   - Visit any webpage with Ethereum addresses
   - Hover over highlighted addresses to see token information
   - Click the extension icon to toggle functionality

### Chrome Web Store Installation (Coming Soon)

1. Visit the Chrome Web Store
2. Search for "Crypto Token Info Hover"
3. Click "Add to Chrome"
4. Confirm the installation

## 🎯 How It Works

### Address Detection & Classification
- Uses regex pattern matching to find Ethereum addresses (0x followed by 40 hex characters)
- Automatically detects if an address is a smart contract or wallet
- Shows visual indicators: 📄 Contract (red), 👛 Wallet (green), ❓ Unknown (purple)
- Displays shortened addresses with type labels for better readability
- Works on any webpage with JavaScript enabled

### Token Information
- **CoinGecko API**: Fetches token symbol and current USD price
- **Etherscan API**: Retrieves token metadata and holder information
- **Smart Caching**: 5-minute cache to reduce API calls and avoid rate limits

### User Interface
- **Hover Tooltips**: Clean, modern tooltips with token information
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Supports high contrast mode and screen readers

## 📁 Project Structure

```
crypto-token-info-hover/
├── manifest.json          # Extension manifest (Manifest V3)
├── content.js            # Content script for DOM manipulation
├── background.js         # Background service worker for API calls
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── styles/
│   └── tooltip.css      # Tooltip and highlight styles
├── icons/
│   ├── icon16.png       # 16x16 extension icon
│   ├── icon48.png       # 48x48 extension icon
│   └── icon128.png      # 128x128 extension icon
└── README.md            # This file
```

## 🔧 Technical Details

### APIs Used
- **CoinGecko API**: Free public API for cryptocurrency data
- **Etherscan API**: Free public API for Ethereum blockchain data

### Rate Limiting
- CoinGecko: 1.2 seconds between calls
- Etherscan: 200ms between calls
- 5-minute cache for all API responses

### Browser Compatibility
- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## 🎨 Customization

### Styling
The extension uses CSS custom properties and can be easily customized:

```css
/* Custom highlight colors */
.crypto-address-highlight {
  background: linear-gradient(135deg, #your-color 0%, #your-color 100%);
}

/* Custom tooltip styling */
.crypto-tooltip {
  background: rgba(0, 0, 0, 0.95);
  border-radius: 12px;
}
```

### API Configuration
Modify `background.js` to use different APIs or add API keys:

```javascript
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const ETHERSCAN_API_BASE = 'https://api.etherscan.io/api';
```

## 🚀 Publishing to Chrome Web Store

1. **Prepare the extension**
   - Ensure all files are properly structured
   - Create proper icon files (PNG format)
   - Test thoroughly on different websites

2. **Create a developer account**
   - Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay the one-time $5 registration fee

3. **Upload the extension**
   - Create a new item
   - Upload a ZIP file of the extension
   - Fill in store listing details
   - Submit for review

4. **Store listing requirements**
   - Screenshots (1280x800 or 640x400)
   - Detailed description
   - Privacy policy (if collecting data)
   - Support contact information

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ES6+ JavaScript
- Follow Chrome Extension best practices
- Maintain clean, readable code
- Add comments for complex logic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Mohammad Nasser Haji Hashemabad** © 2025

- 🔗 LinkedIn: [https://linkedin.com/in/nasserhaji](https://linkedin.com/in/nasserhaji)
- 🔗 GitHub: [https://github.com/nasserhaji](https://github.com/nasserhaji)
- 🌐 Website: [https://mohammadnasser.com/](https://mohammadnasser.com/)

## 🙏 Acknowledgments

- CoinGecko for providing free cryptocurrency data API
- Etherscan for Ethereum blockchain data
- Chrome Extensions team for the excellent documentation
- Open source community for inspiration and tools

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/nasserhaji/crypto-token-info-hover/issues) page
2. Create a new issue with detailed information
3. Contact the author through LinkedIn or GitHub

## 🔄 Version History

- **v1.0.1** - Enhanced address type detection (2025)
  - Improved contract vs wallet detection
  - Better visual indicators
  - Enhanced tooltip information
  - Known address lists for testing
- **v1.0.0** - Initial release with basic functionality
  - Ethereum address detection
  - Token information tooltips
  - Toggle functionality
  - Modern UI design

---

**Made with ❤️ for the crypto community** 