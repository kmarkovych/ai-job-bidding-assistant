# AI Job Bidding Assistant

A powerful Chrome extension that helps freelancers create compelling job proposals using AI. Generate personalized, professional proposals for job posts on Upwork, Freelancer, and Fiverr with just one click.

## Features

- **AI-Powered Proposal Generation**: Leverages OpenAI GPT-4 or Anthropic Claude to create tailored proposals
- **Multi-Platform Support**: Works seamlessly on Upwork, Freelancer, and Fiverr
- **Customizable Settings**: Control tone, length, and style of proposals
- **Profile Integration**: Include your skills and experience automatically
- **One-Click Operation**: Floating button on job pages for instant access
- **Editable Output**: Review and customize AI-generated proposals before submission
- **Secure Storage**: API keys stored securely in Chrome's encrypted storage

## Installation

### From Source (Development)

1. **Clone or download this repository** to your local machine

2. **Get an API Key** from your preferred AI provider:
   - **OpenAI**: Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Claude AI**: Visit [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

3. **Create extension icons** (optional for development):
   - Navigate to the `icons` folder
   - Open `create-icons.html` in a browser
   - Save the generated icons as `icon16.png`, `icon48.png`, and `icon128.png`
   - Or use any 16x16, 48x48, and 128x128 PNG images

4. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click "Load unpacked"
   - Select the `upwork_bid` folder
   - The extension should now appear in your extensions list

5. **Configure the extension**:
   - Click the extension icon in your Chrome toolbar
   - Click "Settings" button
   - Choose your AI provider (OpenAI or Claude)
   - Enter your API key
   - Fill in your profile information (skills, experience, specialization)
   - Adjust proposal settings (tone, length, template)
   - Click "Save Settings"

## Usage

### Basic Usage

1. **Navigate to a job posting** on Upwork, Freelancer, or Fiverr

2. **Click the "Generate Proposal" button** that appears in the bottom-right corner of the page

3. **Wait for AI to generate your proposal** (usually 3-10 seconds)

4. **Review and edit** the generated proposal in the modal window

5. **Copy to clipboard** and paste into the job application form

6. **Add your pricing** and any other required information

7. **Submit your bid!**

### Advanced Configuration

#### Proposal Tone Options
- **Professional**: Formal and business-like (default)
- **Friendly**: Warm and approachable
- **Enthusiastic**: Energetic and passionate
- **Formal**: Very professional and corporate

#### Proposal Length Options
- **Short**: 100-150 words - Quick and concise
- **Medium**: 150-250 words - Balanced approach (recommended)
- **Long**: 250-400 words - Detailed and comprehensive

#### Custom Templates
You can create custom proposal templates in the settings. The AI will adapt your template to each job posting. Leave blank for fully AI-generated proposals.

#### Profile Information
Fill in your profile details to help the AI create more personalized proposals:
- **Skills**: Comma-separated list of your technical skills
- **Experience**: Brief description of your background and achievements
- **Specialization**: Your primary area of expertise

## Supported Platforms

- **Upwork**: ✅ Full support
- **Freelancer**: ✅ Full support
- **Fiverr**: ✅ Full support

## API Costs

This extension uses AI APIs which have associated costs:

### OpenAI Pricing (as of 2024)
- **GPT-4**: ~$0.03-0.06 per proposal
- **GPT-4 Turbo**: ~$0.01-0.03 per proposal
- **GPT-3.5 Turbo**: ~$0.001-0.003 per proposal (cheapest)

### Anthropic Claude Pricing
- **Claude 3.5 Sonnet**: ~$0.003-0.015 per proposal (recommended)
- **Claude 3 Opus**: ~$0.015-0.075 per proposal (most capable)
- **Claude 3 Sonnet**: ~$0.003-0.015 per proposal

**Estimate**: You can generate 50-1000 proposals for $1-5 depending on your model choice.

## Privacy & Security

- **API keys are stored locally** in Chrome's encrypted sync storage
- **No data is sent to third parties** except your chosen AI provider
- **Job data is only used for proposal generation** and not stored
- **All processing happens in real-time** - no databases or tracking

**⚠️ Important Security Note**: This extension stores API keys in your browser. While Chrome encrypts this data, browser extensions are less secure than server-side applications. **Please read [SECURITY.md](SECURITY.md)** for important security considerations and best practices.

**Recommended**:
- Set spending limits on your API keys
- Use dedicated API keys for this extension
- Only use on trusted, personal devices
- Review [SECURITY.md](SECURITY.md) before first use

## Troubleshooting

### Extension button doesn't appear
- Make sure you're on a supported platform (Upwork, Freelancer, Fiverr)
- Refresh the page after installing the extension
- Check that the extension is enabled in `chrome://extensions/`

### "API key not configured" error
- Open extension settings
- Enter your API key
- Make sure there are no extra spaces
- Verify the key is valid by testing on the API provider's website

### Proposal generation fails
- Check your internet connection
- Verify your API key has available credits
- Try a different AI model (GPT-3.5 Turbo is most reliable)
- Check the browser console for detailed error messages

### Job data not detected
- Some platforms update their HTML structure frequently
- Try refreshing the page
- Make sure you're on an actual job posting page (not the job list)

## Development

### Project Structure

```
upwork_bid/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content.js            # Page interaction and UI injection
├── content.css           # Styles for injected UI
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.js            # Settings functionality
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Technologies Used

- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No frameworks, lightweight and fast
- **Chrome Storage API**: Secure settings storage
- **OpenAI API**: GPT-4 and GPT-3.5 Turbo models
- **Anthropic API**: Claude 3 family models

### Modifying the Extension

To add support for more platforms:
1. Add the domain to `host_permissions` in `manifest.json`
2. Add URL patterns to `content_scripts.matches` in `manifest.json`
3. Update `detectPlatform()` function in `content.js`
4. Add platform-specific selectors to `extractJobData()` in `content.js`

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## License

MIT License - Feel free to use and modify for personal or commercial use.

## Disclaimer

This extension is provided "as is" without warranty. Users are responsible for:
- Their own API usage and costs
- Reviewing all AI-generated content before submission
- Complying with platform terms of service
- Ensuring proposals are accurate and truthful

**Important**: Always review and personalize AI-generated proposals. While AI can create great starting points, your unique voice and genuine interest in the project are what win jobs.

## Support

For issues, questions, or feature requests:
- **Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Comprehensive debugging guide
- Review the troubleshooting section above
- Open an issue on GitHub
- Review your API provider's documentation

## Changelog

### Version 1.0.0 (2025-01-17)
- Initial release
- Support for Upwork, Freelancer, and Fiverr
- OpenAI and Claude AI integration
- Customizable tone and length settings
- Profile management
- Template support

---

**Happy Bidding!** 🚀

Remember: AI is a tool to help you work smarter, not to replace your unique expertise and personal touch. Use it wisely!
