# Security Considerations

This document outlines important security considerations when using the AI Job Bidding Assistant Chrome extension.

## API Key Security

### Understanding the Risk

**Important**: This extension requires your AI API keys to be stored in the browser extension. While we take precautions, browser extensions are inherently less secure than server-side applications.

### How API Keys Are Stored

1. **Chrome's Encrypted Storage**: API keys are stored using Chrome's `storage.sync` API
2. **Encrypted at Rest**: Chrome encrypts this data on your device
3. **Synced Across Devices**: If Chrome sync is enabled, keys sync (encrypted) to your other devices
4. **No Server Storage**: Keys are NEVER sent to any server except the AI providers (OpenAI/Claude)

### Potential Risks

1. **Browser Extension Access**
   - Other extensions with broad permissions could potentially access storage
   - Malicious extensions could read your stored keys
   - **Mitigation**: Only install trusted extensions from Chrome Web Store

2. **Physical Device Access**
   - Someone with access to your unlocked computer could access the extension
   - **Mitigation**: Lock your computer when away, use strong Chrome profile password

3. **Code Inspection**
   - Browser extensions can be inspected and their stored data viewed
   - **Mitigation**: Use API keys with spending limits (see below)

4. **Network Interception**
   - API keys are sent over HTTPS to OpenAI/Claude
   - HTTPS prevents interception, but compromised certificates could expose keys
   - **Mitigation**: Ensure you're on a trusted network

## Recommended Security Practices

### 1. Use API Keys with Spending Limits

**OpenAI**:
- Go to https://platform.openai.com/settings/organization/limits
- Set "Usage limits" to a comfortable amount (e.g., $10/month)
- Set up billing alerts

**Claude**:
- Go to https://console.anthropic.com/settings/limits
- Set monthly spending limits
- Enable usage notifications

### 2. Create Separate API Keys for Browser Use

**Best Practice**: Create a dedicated API key specifically for this extension:
- Name it "Chrome Extension - Upwork Assistant"
- Set lower spending limits on this key
- If compromised, you can revoke just this key
- Your main/production keys remain safe

### 3. Regular Key Rotation

**Recommended**:
- Rotate (regenerate) your API key every 1-3 months
- Immediately rotate if you suspect compromise
- Delete old keys after rotation

### 4. Monitor API Usage

**Check regularly**:
- OpenAI: https://platform.openai.com/usage
- Claude: https://console.anthropic.com/settings/usage
- Look for unexpected usage spikes
- Verify usage matches your proposal generation

### 5. Secure Your Browser Profile

**Chrome Profile Security**:
- Use a strong password on your Chrome profile
- Enable Chrome sync encryption with passphrase
- Sign out of Chrome when sharing devices
- Keep Chrome updated

### 6. Extension Security

**Safe Usage**:
- Only install extensions from Chrome Web Store
- Review extension permissions before installing
- Regularly audit your installed extensions
- Remove extensions you no longer use
- Keep the extension updated

## What This Extension Does NOT Do

### We Do NOT:

1. ❌ Send API keys to any third-party servers
2. ❌ Store keys in plain text
3. ❌ Log API keys to console (except in debug messages, which you can disable)
4. ❌ Share keys with other extensions
5. ❌ Transmit keys over unencrypted connections
6. ❌ Store keys in localStorage or cookies
7. ❌ Include analytics or tracking code
8. ❌ Phone home to any server (except OpenAI/Claude APIs)

### We DO:

1. ✅ Store keys in Chrome's encrypted storage
2. ✅ Send keys only to official OpenAI/Claude APIs over HTTPS
3. ✅ Use HTTPS for all API communications
4. ✅ Keep keys local to your device/Chrome sync
5. ✅ Provide open source code you can audit
6. ✅ Follow Chrome extension security best practices

## Anthropic's "Dangerous" Header

### Why the scary name?

The Claude API requires this header for browser requests:
```javascript
'anthropic-dangerous-direct-browser-access': 'true'
```

**This is named "dangerous" by Anthropic to warn developers that:**
- Browser-based API usage exposes keys in the client
- Keys in browsers can be extracted by determined attackers
- Server-side usage is more secure
- They want you to understand the tradeoff

**Is it actually dangerous?**
- For personal use with spending limits: **Low risk**
- For production applications: **Use a server instead**
- For our use case (personal productivity): **Acceptable risk with precautions**

## If Your API Key Is Compromised

### Immediate Actions:

1. **Revoke the Key**:
   - OpenAI: https://platform.openai.com/api-keys → Delete key
   - Claude: https://console.anthropic.com/settings/keys → Delete key

2. **Check Usage**:
   - Review recent API usage for unauthorized charges
   - Check if spending limits were exceeded

3. **Contact Support** (if needed):
   - OpenAI: help.openai.com
   - Claude: support@anthropic.com
   - Dispute unauthorized charges

4. **Generate New Key**:
   - Create a fresh API key
   - Update extension settings
   - Set appropriate spending limits

5. **Review Security**:
   - Check other installed extensions
   - Scan for malware
   - Review recent account activity

## Comparing Security Levels

### Most Secure → Least Secure

1. **Server-side API** (keys never touch browser)
   - Enterprise applications
   - Multi-user systems
   - High-volume usage

2. **Browser Extension with Precautions** (this extension)
   - Personal use
   - Spending limits set
   - Trusted device
   - Regular key rotation

3. **Hardcoded API Keys in Public Code**
   - Never do this
   - Keys immediately compromised
   - Leads to bill shock

## Alternative: Self-Host with Server

If you want maximum security, consider:

1. **Deploy a Server**:
   - Host a simple API server on Heroku/Railway/etc.
   - Server stores API keys securely
   - Extension calls YOUR server, not OpenAI/Claude directly
   - Server makes API calls on your behalf

2. **Benefits**:
   - Keys never in browser
   - Better rate limiting control
   - Centralized usage monitoring
   - Can add authentication

3. **Tradeoffs**:
   - More complex setup
   - Requires hosting costs
   - Server maintenance
   - Overkill for personal use

## Questions?

**Q: Should I use this extension?**
A: Yes, if you set spending limits and understand the risks. It's designed for personal productivity, not enterprise use.

**Q: Can my employer see my API key?**
A: If you're on a corporate network with HTTPS inspection, potentially yes. Use on personal devices/networks.

**Q: Is OpenAI or Claude more secure?**
A: Both use HTTPS. Claude requires the "dangerous" header as an extra security reminder, but both are equally secure in transmission.

**Q: Should I use the extension on a shared computer?**
A: No. Only use on personal devices where you control access.

**Q: What's the worst that could happen?**
A: Without spending limits: Large API bills. With spending limits: Maximum of your limit (e.g., $10).

**Q: Can I audit the code?**
A: Yes! All code is in this repository. Review before using.

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. Email: [your-email@example.com] (or create a private security advisory on GitHub)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We'll respond within 48 hours and work on a fix.

---

**Last Updated**: January 2025

**Remember**: The best security is awareness. Understand the risks, take precautions, and use spending limits. This extension is a productivity tool for personal use with acceptable risk when used responsibly.
