// Popup script for AI Job Bidding Assistant

document.addEventListener('DOMContentLoaded', async () => {
  // Load settings and update UI
  await loadSettings();

  // Setup event listeners
  setupEventListeners();

  // Load stats
  loadStats();
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'apiKey',
      'aiProvider',
      'tone',
      'proposalLength'
    ]);

    // Update API status
    const apiStatusEl = document.getElementById('apiStatus');
    if (settings.apiKey) {
      apiStatusEl.textContent = 'Active';
      apiStatusEl.classList.remove('inactive');
      apiStatusEl.classList.add('active');
    } else {
      apiStatusEl.textContent = 'Not Configured';
      apiStatusEl.classList.remove('active');
      apiStatusEl.classList.add('inactive');
    }

    // Update AI provider
    const aiProviderEl = document.getElementById('aiProvider');
    const providerMap = {
      'openai': 'OpenAI',
      'claude': 'Claude AI'
    };
    aiProviderEl.textContent = providerMap[settings.aiProvider] || 'Not set';

    // Update tone
    const toneEl = document.getElementById('proposalTone');
    const toneMap = {
      'professional': 'Professional',
      'friendly': 'Friendly',
      'enthusiastic': 'Enthusiastic',
      'formal': 'Formal'
    };
    toneEl.textContent = toneMap[settings.tone] || 'Professional';

  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function setupEventListeners() {
  // Settings button
  document.getElementById('openOptionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Test API button
  document.getElementById('testApiBtn').addEventListener('click', testApiConnection);

  // How to use link
  document.getElementById('howToUseLink').addEventListener('click', (e) => {
    e.preventDefault();
    showHowToUse();
  });

  // Support link
  document.getElementById('supportLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/kmarkovych/ai-job-bidding-assistant/issues'
    });
  });
}

async function testApiConnection() {
  const testBtn = document.getElementById('testApiBtn');
  const originalText = testBtn.innerHTML;

  try {
    testBtn.innerHTML = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Testing...';
    testBtn.disabled = true;

    console.log('Testing API connection...');

    const settings = await chrome.storage.sync.get(['apiKey', 'aiProvider', 'openaiModel', 'claudeModel']);

    if (!settings.apiKey) {
      throw new Error('API key not configured. Please add your API key in Settings.');
    }

    if (!settings.aiProvider) {
      throw new Error('AI provider not selected. Please choose a provider in Settings.');
    }

    console.log(`Testing ${settings.aiProvider} API...`);

    // Test with a simple request
    const testJobData = {
      title: 'Test API Connection',
      description: 'This is a test to verify the API connection is working.',
      skills: ['Testing'],
      budget: '$100',
      platform: 'test'
    };

    const response = await chrome.runtime.sendMessage({
      action: 'generateProposal',
      data: testJobData
    });

    console.log('API test response:', response);

    if (response.success) {
      const provider = settings.aiProvider === 'openai' ? 'OpenAI' : 'Claude';
      const model = settings.aiProvider === 'openai' ?
        (settings.openaiModel || 'gpt-4') :
        (settings.claudeModel || 'claude-3-5-sonnet-20241022');

      alert(`✅ API connection successful!\n\nProvider: ${provider}\nModel: ${model}\n\nYour configuration is working correctly.`);
    } else {
      throw new Error(response.error);
    }

  } catch (error) {
    console.error('API test failed:', error);

    let errorMessage = `API test failed: ${error.message}`;

    // Add helpful hints based on error type
    if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
      errorMessage += '\n\n💡 Troubleshooting tips:\n' +
        '• Check your internet connection\n' +
        '• Reload the extension (chrome://extensions)\n' +
        '• Check browser console for details (F12)';
    } else if (error.message.includes('Invalid API key')) {
      errorMessage += '\n\n💡 Please verify:\n' +
        '• Your API key is correct\n' +
        '• No extra spaces in the key\n' +
        '• The key is active on your account';
    } else if (error.message.includes('Rate limit') || error.message.includes('insufficient credits')) {
      errorMessage += '\n\n💡 Please check:\n' +
        '• Your API account has credits\n' +
        '• You haven\'t exceeded rate limits';
    }

    alert(errorMessage);
  } finally {
    testBtn.innerHTML = originalText;
    testBtn.disabled = false;
  }
}

async function loadStats() {
  try {
    const stats = await chrome.storage.local.get(['proposalCount', 'lastGenerated']);

    // Update proposal count
    document.getElementById('proposalCount').textContent = stats.proposalCount || 0;

    // Update last generated
    const lastGeneratedEl = document.getElementById('lastGenerated');
    if (stats.lastGenerated) {
      const date = new Date(stats.lastGenerated);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        lastGeneratedEl.textContent = 'Just now';
      } else if (diffMins < 60) {
        lastGeneratedEl.textContent = `${diffMins} min ago`;
      } else if (diffHours < 24) {
        lastGeneratedEl.textContent = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else {
        lastGeneratedEl.textContent = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      }
    } else {
      lastGeneratedEl.textContent = 'Never';
    }

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function showHowToUse() {
  const message = `How to Use AI Job Bidding Assistant:

1. Configure Your API Key:
   - Click the Settings button
   - Choose your AI provider (OpenAI or Claude)
   - Enter your API key
   - Save settings

2. Navigate to a Job Post:
   - Visit Upwork, Freelancer, or Fiverr
   - Open a job posting you want to bid on

3. Generate Proposal:
   - Click the "Generate Proposal" floating button
   - Review the AI-generated proposal
   - Edit if needed
   - Copy to clipboard

4. Submit Your Bid:
   - Paste the proposal into the job application
   - Add your pricing
   - Submit!

Tips:
- Customize your profile in Settings for better proposals
- Save templates for common project types
- Always review and personalize AI-generated content`;

  alert(message);
}
