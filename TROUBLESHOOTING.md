# Troubleshooting Guide

This guide helps you resolve common issues with the AI Job Bidding Assistant Chrome extension.

## Table of Contents
- [API Connection Issues](#api-connection-issues)
- [Extension Not Working](#extension-not-working)
- [Proposal Generation Failures](#proposal-generation-failures)
- [UI/Display Issues](#uidisplay-issues)
- [Debugging Tips](#debugging-tips)

---

## API Connection Issues

### Error: "Failed to fetch" or "Network error"

**Symptoms**: When testing API connection, you get "Failed to fetch" error.

**Causes & Solutions**:

1. **Missing Host Permissions** (Most Common)
   - **Problem**: Extension lacks permission to access AI APIs
   - **Solution**:
     - Go to `chrome://extensions/`
     - Find "AI Job Bidding Assistant"
     - Click "Details"
     - Scroll to "Permissions"
     - Verify it has access to `api.openai.com` and `api.anthropic.com`
     - If not, the manifest needs updating (reload the extension)

2. **Extension Not Reloaded**
   - **Problem**: Changes not applied after updating files
   - **Solution**:
     - Go to `chrome://extensions/`
     - Click the refresh icon on your extension
     - Try the test again

3. **Internet Connection**
   - **Problem**: No internet or firewall blocking requests
   - **Solution**:
     - Check your internet connection
     - Try accessing https://api.openai.com in a new tab
     - Check if corporate firewall is blocking API access
     - Try on a different network

4. **Browser Issues**
   - **Problem**: Chrome blocking requests
   - **Solution**:
     - Clear browser cache: Settings → Privacy → Clear browsing data
     - Disable other extensions that might interfere
     - Try in Incognito mode
     - Update Chrome to latest version

### Error: "Invalid API key"

**Symptoms**: API test returns 401 Unauthorized or "Invalid API key" error.

**Causes & Solutions**:

1. **Wrong API Key**
   - **Check**: Copy the key directly from the API provider
   - **OpenAI**: https://platform.openai.com/api-keys
   - **Claude**: https://console.anthropic.com/settings/keys
   - **Important**: Make sure you copy the ENTIRE key

2. **Extra Spaces**
   - **Problem**: Accidental spaces before/after the key
   - **Solution**:
     - Open Settings
     - Delete the API key
     - Paste it fresh
     - Make sure no spaces at start/end

3. **Expired or Revoked Key**
   - **Check**: Log into your API provider dashboard
   - **Verify**: Key is still active and not deleted
   - **Solution**: Generate a new key if needed

4. **Wrong Provider Selected**
   - **Problem**: Using OpenAI key with Claude provider (or vice versa)
   - **Solution**: Match the provider to your API key

### Error: "CORS requests must set 'anthropic-dangerous-direct-browser-access' header"

**Symptoms**: Claude API returns authentication_error with CORS message.

**This is FIXED in the latest version!**

**Explanation**:
- Anthropic requires a special header for browser-based requests
- This is a security measure to prevent accidental API key exposure
- The header name includes "dangerous" as a warning that API keys in browsers can be exposed

**Solution**:
1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click the refresh icon on your extension
   - This ensures the latest code with the header is loaded

2. **If still not working**:
   - Check that [background.js](background.js:134) includes:
     ```javascript
     'anthropic-dangerous-direct-browser-access': 'true'
     ```
   - This header is now included in all Claude API calls

**Security Note**: This extension stores API keys locally in Chrome's encrypted storage. However, be aware that browser extensions are less secure than server-side applications. Only use API keys you're comfortable having in a browser extension, and consider using keys with spending limits.

### Error: "Rate limit exceeded" or "Insufficient credits"

**Symptoms**: API returns 429 error or mentions rate limits/credits.

**Causes & Solutions**:

1. **No Credits Left**
   - **OpenAI**: Check https://platform.openai.com/account/billing
   - **Claude**: Check https://console.anthropic.com/settings/billing
   - **Solution**: Add credits to your account

2. **Free Tier Limits**
   - **Problem**: Exceeded free tier limits
   - **Solution**: Upgrade to paid plan or wait for limit reset

3. **Too Many Requests**
   - **Problem**: Sending requests too quickly
   - **Solution**: Wait a few minutes and try again

---

## Extension Not Working

### Button Not Appearing on Job Pages

**Symptoms**: No "Generate Proposal" button shows up on Upwork/Freelancer/Fiverr.

**Causes & Solutions**:

1. **Wrong Page**
   - **Check**: You're on an actual job posting page, not the job list
   - **Supported URLs**:
     - Upwork: `/jobs/*` or `/*/apply/*`
     - Freelancer: `/projects/*`
     - Fiverr: `/*/requests/*`

2. **Extension Not Loaded**
   - **Solution**:
     - Go to `chrome://extensions/`
     - Check if extension is enabled
     - Check for any errors in red text
     - Click refresh icon to reload

3. **Content Script Not Injecting**
   - **Check Console**:
     - Press F12 on the job page
     - Look for extension messages or errors
     - Should see "AI Job Bidding Assistant loaded"
   - **Solution**: Refresh the page

4. **Platform Detection Failed**
   - **Problem**: Site structure changed
   - **Check Console**: Look for "Platform not detected" message
   - **Temporary Fix**: Try refreshing or opening a different job post

### Popup Not Opening

**Symptoms**: Clicking extension icon does nothing.

**Causes & Solutions**:

1. **Missing Icon Files**
   - **Check**: Extension loaded without errors?
   - **Solution**: Create icon files (see icons/README.md)
   - Chrome will still work with placeholder icons

2. **Popup HTML Error**
   - **Check**: Right-click extension icon → Inspect popup
   - **Look for**: JavaScript errors in console
   - **Solution**: Check popup.js for errors

---

## Proposal Generation Failures

### Modal Opens But Nothing Happens

**Symptoms**: Modal shows but hangs on "Generating..." forever.

**Causes & Solutions**:

1. **API Call Failing Silently**
   - **Check Console**:
     - Open job page
     - Press F12
     - Click "Generate Proposal"
     - Look for error messages
   - **Common**: See "Failed to fetch" → See [API Connection Issues](#api-connection-issues)

2. **Job Data Extraction Failed**
   - **Problem**: Extension couldn't extract job information
   - **Check Console**: Look for extracted job data
   - **Workaround**: Try a different job post

3. **API Timeout**
   - **Problem**: API taking too long
   - **Solution**:
     - Wait 30-60 seconds
     - Try again
     - Consider using faster model (GPT-3.5 instead of GPT-4)

### Proposal Is Generic or Low Quality

**Symptoms**: Generated proposal doesn't match the job well.

**Causes & Solutions**:

1. **Missing Profile Information**
   - **Solution**:
     - Go to Settings
     - Fill out "Your Skills", "Your Experience", "Specialization"
     - Save and try again

2. **Wrong Tone Selected**
   - **Check**: Settings → Proposal Settings → Tone
   - **Try**: Different tones for different project types

3. **Job Data Not Extracted Properly**
   - **Problem**: Site structure changed
   - **Check Console**: See what data was extracted
   - **Temporary**: Manually edit the proposal

---

## UI/Display Issues

### Modal Appears Behind Other Elements

**Solution**:
- This is a CSS z-index issue
- The modal should have z-index: 1000000
- Check if page has elements with higher z-index

### Styles Not Loading

**Symptoms**: Button or modal looks unstyled.

**Causes & Solutions**:

1. **CSS File Not Loading**
   - **Check**: `chrome://extensions/` for errors
   - **Solution**: Reload extension

2. **Page CSS Conflicts**
   - **Problem**: Site's CSS overriding extension styles
   - **Temporary**: Extension CSS uses !important flags
   - **Report**: If persistent, report the site

### Button Overlaps Site Content

**Solution**:
- Button is positioned bottom-right by default
- If it overlaps, manually move it
- Future: Add drag-and-drop positioning

---

## Debugging Tips

### Enable Detailed Logging

**Browser Console** (F12 on job page):
- See: Content script logs
- See: Job data extraction
- See: UI injection status

**Extension Background Console**:
1. Go to `chrome://extensions/`
2. Find your extension
3. Click "Service worker" (or "background page")
4. New console opens with background script logs
5. See: API calls, responses, errors

**Popup Console**:
1. Right-click extension icon
2. Click "Inspect popup"
3. Console opens
4. See: Settings loading, test results

### Check Network Requests

**View API Calls**:
1. Open background script console (see above)
2. Go to "Network" tab
3. Click "Test API Connection"
4. See: Actual HTTP requests to OpenAI/Claude
5. Check: Headers, payload, response

### Verify Extension Permissions

**Check Permissions**:
```
1. chrome://extensions/
2. Click "Details" on your extension
3. Scroll to "Permissions"
4. Should have:
   - Read and change data on api.openai.com
   - Read and change data on api.anthropic.com
   - Storage
   - Active tab
```

### Test in Isolation

**Disable Other Extensions**:
1. Go to `chrome://extensions/`
2. Disable all other extensions
3. Test your AI extension
4. If it works, re-enable others one by one to find conflicts

### Check Extension Files

**Verify Files Loaded**:
1. `chrome://extensions/`
2. Click "Details"
3. Click "View in Chrome Web Store" → "Inspect views background.html"
4. Go to "Sources" tab
5. Verify all files present:
   - manifest.json
   - background.js
   - content.js
   - popup.js, options.js
   - All HTML and CSS files

---

## Common Error Messages Reference

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| `Failed to fetch` | Network/permission issue | Reload extension, check internet |
| `Invalid API key` | Wrong key or format | Re-enter key, check provider match |
| `Rate limit exceeded` | Too many requests | Wait, check API credits |
| `Model not found` | No access to model | Change model or upgrade API plan |
| `API key not configured` | No key saved | Add key in Settings |
| `Platform not detected` | Wrong page or site changed | Try different job post, check console |
| `Network error` | Connection problem | Check internet, firewall, permissions |

---

## Still Having Issues?

### Collect Debug Information

Before reporting an issue, gather:

1. **Extension Version**: Check manifest.json
2. **Browser**: Chrome version (chrome://version)
3. **Error Message**: Exact text from alert/console
4. **Console Logs**: Screenshots of browser console (F12)
5. **Steps to Reproduce**: What you did before error
6. **Platform**: Which site (Upwork/Freelancer/Fiverr)
7. **API Provider**: OpenAI or Claude

### Get Help

1. **Check README.md**: Full documentation
2. **Check QUICKSTART.md**: Setup guide
3. **Check Console**: Most errors show details there
4. **GitHub Issues**: Report bugs with debug info
5. **Community**: Check existing issues for solutions

---

## Quick Fixes Checklist

When something goes wrong, try these in order:

- [ ] Refresh the page
- [ ] Reload the extension (chrome://extensions → refresh icon)
- [ ] Check internet connection
- [ ] Check API key is correct
- [ ] Check API account has credits
- [ ] Clear browser cache
- [ ] Check browser console for errors (F12)
- [ ] Try in incognito mode
- [ ] Disable other extensions
- [ ] Restart Chrome
- [ ] Re-install extension

---

**Last Updated**: January 2025
**Extension Version**: 1.0.0

For additional help, see [README.md](README.md) or create an issue on GitHub.
