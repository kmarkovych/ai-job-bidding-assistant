// Content script for AI Job Bidding Assistant
// Runs on job posting pages to extract data and inject UI

(function() {
  'use strict';

  let jobData = null;
  let proposalModal = null;

  // Initialize the extension on page load
  function init() {
    console.log('AI Job Bidding Assistant loaded');

    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    // Detect the platform and extract job data
    const platform = detectPlatform();

    if (!platform) {
      console.log('Platform not detected or not supported');
      console.log('Current URL:', window.location.href);
      return;
    }

    console.log(`Platform detected: ${platform}`);

    // Extract job data based on platform
    jobData = extractJobData(platform);

    if (jobData && jobData.title) {
      console.log('Job data extracted successfully:', jobData);
    } else {
      console.warn('Could not extract job data with selectors, using fallback...');

      // Fallback: Create basic job data from page content
      jobData = {
        title: document.title || 'Job Posting',
        description: getPageText(),
        skills: [],
        budget: '',
        clientInfo: '',
        platform: platform
      };

      console.log('Using fallback job data:', jobData);
    }

    // Always inject UI if we detected a platform
    console.log('Injecting UI...');
    injectUI();
  }

  // Helper function to get page text content
  function getPageText() {
    // Try to get main content
    const mainContent = document.querySelector('main, article, [role="main"], .job-description, [data-test="Description"]');
    if (mainContent) {
      return mainContent.innerText.substring(0, 2000);
    }

    // Fallback to body
    return document.body.innerText.substring(0, 2000);
  }

  // Detect which platform we're on
  function detectPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes('upwork.com')) {
      return 'upwork';
    } else if (hostname.includes('freelancer.com')) {
      return 'freelancer';
    } else if (hostname.includes('fiverr.com')) {
      return 'fiverr';
    }

    return null;
  }

  // Helper: Try multiple selectors and return first match
  function trySelectors(selectors) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          console.log(`✅ Selector worked: ${selector}`);
          return element;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    console.log(`❌ None of these selectors worked:`, selectors);
    return null;
  }

  // Helper: Try multiple selectors for element list
  function trySelectorsAll(selectorArrays) {
    for (const selector of selectorArrays) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`✅ Selector worked (found ${elements.length}): ${selector}`);
          return Array.from(elements);
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    console.log(`❌ None of these selectors found elements:`, selectorArrays);
    return [];
  }

  // Helper: Find largest text block (for description)
  function findLargestTextBlock() {
    const candidates = document.querySelectorAll('div, section, article, p');
    let largest = null;
    let maxLength = 0;

    candidates.forEach(el => {
      const text = el.textContent.trim();
      // Must be substantial text and not contain navigation/header content
      if (text.length > maxLength && text.length > 200 && text.length < 10000) {
        // Check if it's likely a description (contains common words)
        if (text.toLowerCase().includes('experience') ||
            text.toLowerCase().includes('looking for') ||
            text.toLowerCase().includes('project') ||
            text.toLowerCase().includes('requirements')) {
          maxLength = text.length;
          largest = el;
        }
      }
    });

    if (largest) {
      console.log(`✅ Found description by heuristic (${maxLength} chars)`);
    }
    return largest;
  }

  // Helper: Extract budget by searching for dollar patterns
  function findBudgetByPattern() {
    const text = document.body.innerText;
    const patterns = [
      /\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?/g, // $100 or $100-$500
      /Budget:\s*\$[\d,]+/gi,
      /Fixed price:\s*\$[\d,]+/gi,
      /Hourly rate:\s*\$[\d,]+/gi
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`✅ Found budget by pattern: ${matches[0]}`);
        return matches[0];
      }
    }
    return '';
  }

  // Extract job data from the page
  function extractJobData(platform) {
    console.log(`🔍 Extracting job data for platform: ${platform}`);

    const data = {
      title: '',
      description: '',
      skills: [],
      budget: '',
      clientInfo: '',
      platform: platform
    };

    if (platform === 'upwork') {
      // Upwork title - try multiple modern selectors
      const titleSelectors = [
        'h2[data-test="job-title"]',
        'h4[data-test="job-title"]',
        'h2[class*="job-title"]',
        'h4[class*="job-title"]',
        'h1[class*="JobDetail"]',
        'h2[class*="JobDetail"]',
        '[data-test="UpCJobTitle"]',
        'h2.job-tile-title',
        'h4.job-tile-title',
        'h1',
        'h2'
      ];
      const titleEl = trySelectors(titleSelectors);
      data.title = titleEl ? titleEl.textContent.trim() : '';

      // Upwork description - try multiple approaches
      const descSelectors = [
        '[data-test="Description"]',
        '[data-test="JobDescription"]',
        '[data-test="job-description"]',
        '[data-test="UpCLineClamp JobDescription"]',
        'div[class*="description"]',
        'section[class*="description"]',
        '.job-description',
        '.break'
      ];
      let descEl = trySelectors(descSelectors);

      // If no description found by selectors, try heuristic
      if (!descEl || !descEl.textContent.trim()) {
        console.log('⚠️ Description selectors failed, trying heuristic...');
        descEl = findLargestTextBlock();
      }

      data.description = descEl ? descEl.textContent.trim() : '';

      // Upwork skills - try multiple patterns
      const skillsSelectors = [
        '[data-test="skills"] a',
        '[data-test="token"]',
        '[data-test="Tokens"] [data-test="token"]',
        '.air3-token',
        '.air3-token-label',
        '.up-skill-badge',
        '[role="button"][class*="token"]',
        'span[class*="skill"]',
        '.skill-badge'
      ];
      const skillsEls = trySelectorsAll(skillsSelectors);
      data.skills = skillsEls.map(el => el.textContent.trim()).filter(s => s.length > 0);

      // Upwork budget - try multiple patterns
      const budgetSelectors = [
        '[data-test="budget"]',
        '[data-test="is-fixed-price"]',
        '[data-test="BudgetAmount"]',
        '[data-test="weekly-max-price"]',
        '.contract-amount',
        '.js-budget',
        '[class*="budget"]',
        '[class*="Budget"]'
      ];
      const budgetEl = trySelectors(budgetSelectors);
      data.budget = budgetEl ? budgetEl.textContent.trim() : '';

      // If no budget found, try pattern matching
      if (!data.budget) {
        console.log('⚠️ Budget selectors failed, trying pattern matching...');
        data.budget = findBudgetByPattern();
      }

      // Extract client info
      const clientSelectors = [
        '[data-test="client-info"]',
        '[data-test="ClientInfo"]',
        '.client-info',
        '[class*="client-info"]',
        '[class*="ClientInfo"]'
      ];
      const clientEl = trySelectors(clientSelectors);
      if (clientEl) {
        data.clientInfo = clientEl.textContent.trim();
      }

    } else if (platform === 'freelancer') {
      // Freelancer-specific selectors with fallbacks
      const titleSelectors = [
        'h1[class*="PageProjectViewLogout-title"]',
        'h1[class*="project-title"]',
        'h1.project-title',
        'h1'
      ];
      const titleEl = trySelectors(titleSelectors);
      data.title = titleEl ? titleEl.textContent.trim() : '';

      const descSelectors = [
        '[class*="PageProjectViewLogout-description"]',
        '.project-description',
        '.description',
        'div[class*="description"]'
      ];
      let descEl = trySelectors(descSelectors);
      if (!descEl) {
        descEl = findLargestTextBlock();
      }
      data.description = descEl ? descEl.textContent.trim() : '';

      const skillsSelectors = [
        '[class*="PageProjectViewLogout-tag"]',
        '.project-skills a',
        '[class*="Tag"]',
        '.tag',
        '[class*="skill"]'
      ];
      const skillsEls = trySelectorsAll(skillsSelectors);
      data.skills = skillsEls.map(el => el.textContent.trim()).filter(s => s.length > 0);

      const budgetSelectors = [
        '[class*="PageProjectViewLogout-header-budget"]',
        '.project-budget',
        '[class*="budget"]'
      ];
      const budgetEl = trySelectors(budgetSelectors);
      data.budget = budgetEl ? budgetEl.textContent.trim() : findBudgetByPattern();

    } else if (platform === 'fiverr') {
      // Fiverr-specific selectors with fallbacks
      const titleSelectors = [
        '.brief-title',
        '[class*="brief-title"]',
        'h1',
        'h2'
      ];
      const titleEl = trySelectors(titleSelectors);
      data.title = titleEl ? titleEl.textContent.trim() : '';

      const descSelectors = [
        '.brief-description',
        '[class*="brief-description"]',
        '.description',
        '[class*="description"]'
      ];
      let descEl = trySelectors(descSelectors);
      if (!descEl) {
        descEl = findLargestTextBlock();
      }
      data.description = descEl ? descEl.textContent.trim() : '';

      const budgetSelectors = [
        '.brief-budget',
        '[class*="budget"]'
      ];
      const budgetEl = trySelectors(budgetSelectors);
      data.budget = budgetEl ? budgetEl.textContent.trim() : findBudgetByPattern();
    }

    // Log extracted data summary
    console.log('📊 Extraction Results:');
    console.log(`  Title: ${data.title ? '✅ ' + data.title.substring(0, 50) : '❌ Not found'}`);
    console.log(`  Description: ${data.description ? '✅ ' + data.description.length + ' chars' : '❌ Not found'}`);
    console.log(`  Skills: ${data.skills.length > 0 ? '✅ ' + data.skills.length + ' skills' : '❌ Not found'}`);
    console.log(`  Budget: ${data.budget ? '✅ ' + data.budget : '❌ Not found'}`);

    return data.title ? data : null;
  }

  // Inject the floating button and UI
  function injectUI() {
    // Create floating button
    const floatingButton = document.createElement('div');
    floatingButton.id = 'ai-bid-assistant-button';
    floatingButton.innerHTML = `
      <div class="ai-bid-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Generate Proposal</span>
      </div>
    `;

    floatingButton.addEventListener('click', openProposalModal);
    document.body.appendChild(floatingButton);
  }

  // Open the proposal generation modal
  function openProposalModal() {
    if (proposalModal) {
      proposalModal.style.display = 'flex';
      return;
    }

    // Create modal
    proposalModal = document.createElement('div');
    proposalModal.id = 'ai-bid-assistant-modal';
    proposalModal.innerHTML = `
      <div class="ai-bid-modal-content">
        <div class="ai-bid-modal-header">
          <h2>AI Proposal Generator</h2>
          <button class="ai-bid-close-btn">&times;</button>
        </div>

        <div class="ai-bid-modal-body">
          <div class="ai-bid-job-summary">
            <h3>Job Summary</h3>
            <p><strong>Title:</strong> ${jobData.title}</p>
            ${jobData.budget ? `<p><strong>Budget:</strong> ${jobData.budget}</p>` : ''}
            ${jobData.skills.length > 0 ? `<p><strong>Skills:</strong> ${jobData.skills.join(', ')}</p>` : ''}
          </div>

          <div class="ai-bid-loading" style="display: none;">
            <div class="ai-bid-spinner"></div>
            <p>Generating your proposal...</p>
          </div>

          <div class="ai-bid-proposal-container" style="display: none;">
            <h3>Generated Proposal</h3>
            <textarea class="ai-bid-proposal-text" rows="12"></textarea>
            <div class="ai-bid-actions">
              <button class="ai-bid-btn-primary ai-bid-copy-btn">Copy to Clipboard</button>
              <button class="ai-bid-btn-secondary ai-bid-regenerate-btn">Regenerate</button>
            </div>
          </div>

          <div class="ai-bid-error" style="display: none;">
            <p class="ai-bid-error-text"></p>
            <button class="ai-bid-btn-secondary ai-bid-retry-btn">Try Again</button>
          </div>

          <div class="ai-bid-initial">
            <button class="ai-bid-btn-primary ai-bid-generate-btn">Generate Proposal with AI</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(proposalModal);

    // Event listeners
    proposalModal.querySelector('.ai-bid-close-btn').addEventListener('click', closeModal);
    proposalModal.querySelector('.ai-bid-generate-btn').addEventListener('click', generateProposal);
    proposalModal.querySelector('.ai-bid-regenerate-btn').addEventListener('click', generateProposal);
    proposalModal.querySelector('.ai-bid-retry-btn').addEventListener('click', generateProposal);
    proposalModal.querySelector('.ai-bid-copy-btn').addEventListener('click', copyToClipboard);

    // Close on outside click
    proposalModal.addEventListener('click', (e) => {
      if (e.target === proposalModal) {
        closeModal();
      }
    });
  }

  function closeModal() {
    if (proposalModal) {
      proposalModal.style.display = 'none';
    }
  }

  // Generate proposal using AI
  async function generateProposal() {
    const loadingDiv = proposalModal.querySelector('.ai-bid-loading');
    const proposalDiv = proposalModal.querySelector('.ai-bid-proposal-container');
    const errorDiv = proposalModal.querySelector('.ai-bid-error');
    const initialDiv = proposalModal.querySelector('.ai-bid-initial');

    // Show loading
    loadingDiv.style.display = 'block';
    proposalDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    initialDiv.style.display = 'none';

    try {
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'generateProposal',
        data: jobData
      });

      if (response.success) {
        // Show proposal
        const textarea = proposalModal.querySelector('.ai-bid-proposal-text');
        textarea.value = response.data.proposal;

        loadingDiv.style.display = 'none';
        proposalDiv.style.display = 'block';
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error generating proposal:', error);

      // Show error
      const errorText = proposalModal.querySelector('.ai-bid-error-text');
      errorText.textContent = error.message || 'Failed to generate proposal. Please check your API key and try again.';

      loadingDiv.style.display = 'none';
      errorDiv.style.display = 'block';
    }
  }

  // Copy proposal to clipboard
  async function copyToClipboard() {
    const textarea = proposalModal.querySelector('.ai-bid-proposal-text');
    const copyBtn = proposalModal.querySelector('.ai-bid-copy-btn');

    try {
      await navigator.clipboard.writeText(textarea.value);

      // Visual feedback
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.style.backgroundColor = '#10b981';

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  }

  // Debugging tool: expose function to test selectors
  window.testJobExtraction = function() {
    console.log('='.repeat(60));
    console.log('🧪 TESTING JOB DATA EXTRACTION');
    console.log('='.repeat(60));

    const platform = detectPlatform();
    console.log(`\n📍 Platform: ${platform || 'NOT DETECTED'}`);
    console.log(`📍 URL: ${window.location.href}\n`);

    if (!platform) {
      console.error('❌ Platform not detected. Make sure you\'re on a job page.');
      return;
    }

    console.log('🔍 Starting extraction...\n');
    const data = extractJobData(platform);

    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL RESULTS:');
    console.log('='.repeat(60));
    console.log('Title:', data?.title || '❌ NOT FOUND');
    console.log('Description:', data?.description ? `✅ ${data.description.length} chars` : '❌ NOT FOUND');
    console.log('Skills:', data?.skills.length > 0 ? `✅ ${data.skills.join(', ')}` : '❌ NOT FOUND');
    console.log('Budget:', data?.budget || '❌ NOT FOUND');
    console.log('Client Info:', data?.clientInfo || '❌ NOT FOUND');
    console.log('='.repeat(60));

    console.log('\n💡 TIP: Look above for ✅ and ❌ to see which selectors worked');
    console.log('💡 If extraction failed, the logs show which selectors were tried\n');

    return data;
  };

  // Also expose helper for manual selector testing
  window.testSelector = function(selector) {
    console.log(`\n🧪 Testing selector: ${selector}`);
    try {
      const elements = document.querySelectorAll(selector);
      console.log(`Found ${elements.length} element(s)`);

      if (elements.length > 0) {
        elements.forEach((el, i) => {
          const text = el.textContent.trim();
          console.log(`  [${i}]: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        });
      } else {
        console.log('❌ No elements found');
      }
      return elements;
    } catch (e) {
      console.error('❌ Invalid selector:', e.message);
      return null;
    }
  };

  console.log('💡 Debug tools available:');
  console.log('  - testJobExtraction() - Run full extraction test');
  console.log('  - testSelector("your-selector") - Test a specific selector');

  // Initialize
  init();
})();
