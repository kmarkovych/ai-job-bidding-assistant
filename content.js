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

    // Check if we're on an apply page
    const isApplyPage = window.location.pathname.includes('/apply/');
    console.log(`Page type: ${isApplyPage ? 'Apply Page' : 'Job Page'}`);

    if (isApplyPage) {
      // On apply page - try to retrieve stored job data
      chrome.storage.local.get(['lastJobData'], (result) => {
        if (result.lastJobData) {
          console.log('✅ Using stored job data from job page:', result.lastJobData);
          jobData = result.lastJobData;
          injectUI();
        } else {
          console.log('⚠️ No stored job data found, extracting from apply page...');
          jobData = extractJobData(platform);
          if (jobData) {
            console.log('✅ Job data extracted from apply page:', jobData);
          } else {
            console.warn('❌ Extraction failed, using minimal fallback...');
            jobData = createFallbackJobData(platform);
          }
          injectUI();
        }
      });
    } else {
      // On job page - extract and store data
      jobData = extractJobData(platform);

      if (jobData) {
        console.log('✅ Job data extracted from job page:', jobData);
        // Store job data for use on apply page
        chrome.storage.local.set({ lastJobData: jobData }, () => {
          console.log('💾 Job data stored for apply page');
        });
      } else {
        console.warn('❌ Extraction returned null, creating minimal fallback...');
        jobData = createFallbackJobData(platform);
      }

      // Always inject UI if we detected a platform
      console.log('Injecting UI...');
      injectUI();
    }
  }

  // Create fallback job data
  function createFallbackJobData(platform) {
    return {
      title: document.title || 'Job Posting',
      description: getPageText(),
      skills: [],
      budget: '',
      clientInfo: '',
      platform: platform,
      screeningQuestions: []
    };
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

  // Extract screening questions from job post
  function extractScreeningQuestions(platform) {
    console.log('🔍 Searching for screening questions...');
    const questions = [];

    if (platform === 'upwork') {
      // Try multiple selector strategies for Upwork screening questions
      const questionSelectors = [
        '[data-test="question"]',
        '[data-test="ScreeningQuestion"]',
        '[data-test*="question"]',
        '[data-test*="Question"]',
        '[data-test*="screening"]',
        '[data-test*="Screening"]',
        '.screening-question',
        '[class*="screening"]',
        '[class*="question"]'
      ];

      // Try each selector
      for (const selector of questionSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} questions with selector: ${selector}`);
            elements.forEach((el, index) => {
              const text = el.textContent.trim();
              // Only add if it contains a question mark and is substantial
              if (text.includes('?') && text.length > 10 && text.length < 500) {
                questions.push({
                  id: `q${index + 1}`,
                  text: text
                });
              }
            });
            if (questions.length > 0) break; // Stop if we found questions
          }
        } catch (e) {
          // Invalid selector, continue
        }
      }

      // Fallback: Look for text patterns that indicate questions
      if (questions.length === 0) {
        console.log('⚠️ Using heuristic approach to find questions...');
        const allElements = document.querySelectorAll('p, div, span, li, label');
        const questionPatterns = [
          /^(How|What|Why|When|Where|Which|Who|Can you|Could you|Do you|Have you|Are you|Will you|Would you)/i,
          /^Question \d+:/i,
          /^Q\d+:/i,
          /^\d+\.\s+(How|What|Why|When|Where)/i
        ];

        allElements.forEach((el, index) => {
          const text = el.textContent.trim();
          // Check if element text matches question patterns and contains '?'
          if (text.includes('?') && text.length > 15 && text.length < 500) {
            const matchesPattern = questionPatterns.some(pattern => pattern.test(text));
            if (matchesPattern) {
              // Avoid duplicates
              const isDuplicate = questions.some(q => q.text === text);
              if (!isDuplicate) {
                questions.push({
                  id: `q${questions.length + 1}`,
                  text: text
                });
              }
            }
          }
        });
      }
    } else if (platform === 'freelancer' || platform === 'fiverr') {
      // Similar approach for other platforms (can be enhanced later)
      const allElements = document.querySelectorAll('p, div, span, li, label');
      allElements.forEach((el, index) => {
        const text = el.textContent.trim();
        if (text.includes('?') && text.length > 15 && text.length < 500) {
          const startsWithQuestionWord = /^(How|What|Why|When|Where|Which|Who|Can you|Could you|Do you|Have you|Are you|Will you|Would you)/i.test(text);
          if (startsWithQuestionWord) {
            const isDuplicate = questions.some(q => q.text === text);
            if (!isDuplicate && questions.length < 10) { // Limit to 10 questions
              questions.push({
                id: `q${questions.length + 1}`,
                text: text
              });
            }
          }
        }
      });
    }

    if (questions.length > 0) {
      console.log(`✅ Found ${questions.length} screening questions:`);
      questions.forEach(q => console.log(`  - ${q.text}`));
    } else {
      console.log('ℹ️ No screening questions found');
    }

    return questions;
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
      platform: platform,
      screeningQuestions: []
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
        '.skills-list .air3-badge .air3-line-clamp',
        '.skills-list .air3-badge',
        '.skills-list a',
        '.air3-badge .air3-line-clamp',
        '.air3-badge',
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
      data.skills = skillsEls.map(el => el.textContent.trim()).filter(s => s.length > 0 && s.length < 100);

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

    // Extract screening questions
    data.screeningQuestions = extractScreeningQuestions(platform);

    // If title is missing, try to get it from page title or first h1
    if (!data.title) {
      console.log('⚠️ Title not found with selectors, trying fallback...');
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent.trim()) {
        data.title = h1.textContent.trim();
        console.log('✅ Got title from h1:', data.title.substring(0, 50));
      } else {
        // Use document title but clean it up
        data.title = document.title.split('-')[0].trim() || 'Job Posting';
        console.log('✅ Got title from document.title:', data.title.substring(0, 50));
      }
    }

    // Log extracted data summary
    console.log('📊 Extraction Results:');
    console.log(`  Title: ${data.title ? '✅ ' + data.title.substring(0, 50) : '❌ Not found'}`);
    console.log(`  Description: ${data.description ? '✅ ' + data.description.length + ' chars' : '❌ Not found'}`);
    console.log(`  Skills: ${data.skills.length > 0 ? '✅ ' + data.skills.length + ' skills' : '❌ Not found'}`);
    console.log(`  Budget: ${data.budget ? '✅ ' + data.budget : '❌ Not found'}`);
    console.log(`  Screening Questions: ${data.screeningQuestions.length > 0 ? '✅ ' + data.screeningQuestions.length + ' questions' : 'ℹ️ None found'}`);

    // Return data even if some fields are missing - we have at least description
    return data;
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
          <div class="ai-bid-job-summary" style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 8px;">📋 Job Summary</h3>

            <div style="margin-bottom: 12px;">
              <div style="font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 4px;">Title:</div>
              <div style="color: #1f2937; font-size: 15px; line-height: 1.5;">${jobData.title}</div>
            </div>

            ${jobData.description ? `
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 4px;">Description:</div>
                <div style="color: #4b5563; font-size: 13px; line-height: 1.6; max-height: 200px; overflow-y: auto; padding: 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; white-space: pre-wrap; word-wrap: break-word;">
                  ${jobData.description}
                </div>
              </div>
            ` : ''}

            ${jobData.budget ? `
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 4px;">💰 Budget:</div>
                <div style="color: #059669; font-size: 14px; font-weight: 500;">${jobData.budget}</div>
              </div>
            ` : ''}

            ${jobData.skills.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 6px;">🎯 Required Skills:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${jobData.skills.map(skill => `<span style="background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;">${skill}</span>`).join('')}
                </div>
              </div>
            ` : ''}

            ${jobData.clientInfo ? `
              <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 4px;">👤 Client Info:</div>
                <div style="color: #4b5563; font-size: 13px;">${jobData.clientInfo}</div>
              </div>
            ` : ''}

            ${jobData.screeningQuestions && jobData.screeningQuestions.length > 0 ? `
              <div style="margin-bottom: 0;">
                <div style="font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 4px;">❓ Screening Questions:</div>
                <div style="background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 6px; font-size: 13px; border: 1px solid #fcd34d;">
                  <strong>${jobData.screeningQuestions.length}</strong> question${jobData.screeningQuestions.length !== 1 ? 's' : ''} detected - AI will generate answers
                </div>
              </div>
            ` : ''}

            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 12px; color: #6b7280;">
                <strong>Platform:</strong> ${jobData.platform.charAt(0).toUpperCase() + jobData.platform.slice(1)}
              </div>
            </div>
          </div>

          <div class="ai-bid-loading" style="display: none;">
            <div class="ai-bid-spinner"></div>
            <p>Generating your proposal${jobData.screeningQuestions && jobData.screeningQuestions.length > 0 ? ' and answers' : ''}...</p>
          </div>

          <div class="ai-bid-proposal-container" style="display: none;">
            <h3>Generated Proposal</h3>
            <textarea class="ai-bid-proposal-text" rows="12"></textarea>
            <div class="ai-bid-actions">
              <button class="ai-bid-btn-primary ai-bid-copy-btn">Copy to Clipboard</button>
              <button class="ai-bid-btn-secondary ai-bid-regenerate-btn">Regenerate</button>
            </div>
          </div>

          <div class="ai-bid-screening-container" style="display: none;">
            <h3>Screening Questions & Answers</h3>
            <div class="ai-bid-screening-questions"></div>
            <div class="ai-bid-actions" style="margin-top: 16px;">
              <button class="ai-bid-btn-primary ai-bid-copy-all-answers-btn">Copy All Answers</button>
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
    proposalModal.querySelector('.ai-bid-copy-all-answers-btn').addEventListener('click', copyAllScreeningAnswers);

    // Close on outside click
    proposalModal.addEventListener('click', (e) => {
      if (e.target === proposalModal) {
        closeModal();
      }
    });

    // Show the modal immediately after creation
    proposalModal.style.display = 'flex';
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
    const screeningDiv = proposalModal.querySelector('.ai-bid-screening-container');
    const errorDiv = proposalModal.querySelector('.ai-bid-error');
    const initialDiv = proposalModal.querySelector('.ai-bid-initial');

    // Show loading
    loadingDiv.style.display = 'block';
    proposalDiv.style.display = 'none';
    screeningDiv.style.display = 'none';
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

        // Show screening answers if available
        if (response.data.hasScreeningQuestions && response.data.screeningAnswers && response.data.screeningAnswers.length > 0) {
          populateScreeningAnswers(response.data.screeningAnswers);
          screeningDiv.style.display = 'block';
        }
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

  // Populate screening questions with generated answers
  function populateScreeningAnswers(answers) {
    const container = proposalModal.querySelector('.ai-bid-screening-questions');
    container.innerHTML = '';

    jobData.screeningQuestions.forEach((question, index) => {
      const answer = answers[index] || 'No answer generated';

      const questionBlock = document.createElement('div');
      questionBlock.className = 'ai-bid-screening-item';
      questionBlock.style.cssText = 'margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;';

      questionBlock.innerHTML = `
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151; font-size: 14px;">Q${index + 1}: ${question.text}</strong>
        </div>
        <textarea
          class="ai-bid-screening-answer"
          data-question-id="${question.id}"
          rows="3"
          style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; font-family: inherit; resize: vertical; margin-bottom: 8px;"
        >${answer}</textarea>
        <button
          class="ai-bid-copy-answer-btn"
          data-index="${index}"
          style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; transition: background 0.2s;"
          onmouseover="this.style.background='#5568d3'"
          onmouseout="this.style.background='#667eea'"
        >Copy Answer</button>
      `;

      container.appendChild(questionBlock);
    });

    // Add event listeners for individual copy buttons
    container.querySelectorAll('.ai-bid-copy-answer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        copyScreeningAnswer(index);
      });
    });
  }

  // Copy individual screening answer
  async function copyScreeningAnswer(index) {
    const textareas = proposalModal.querySelectorAll('.ai-bid-screening-answer');
    const textarea = textareas[index];
    const btn = proposalModal.querySelectorAll('.ai-bid-copy-answer-btn')[index];

    if (!textarea || !btn) return;

    try {
      await navigator.clipboard.writeText(textarea.value);

      // Visual feedback
      const originalText = btn.textContent;
      const originalBg = btn.style.background;
      btn.textContent = 'Copied!';
      btn.style.background = '#10b981';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  }

  // Copy all screening answers
  async function copyAllScreeningAnswers() {
    const textareas = proposalModal.querySelectorAll('.ai-bid-screening-answer');
    const copyBtn = proposalModal.querySelector('.ai-bid-copy-all-answers-btn');

    if (textareas.length === 0) return;

    try {
      // Build text with all Q&A pairs
      let allText = '';
      jobData.screeningQuestions.forEach((question, index) => {
        const answer = textareas[index].value;
        allText += `Q${index + 1}: ${question.text}\n\nA: ${answer}\n\n${'='.repeat(50)}\n\n`;
      });

      await navigator.clipboard.writeText(allText.trim());

      // Visual feedback
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'All Copied!';
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

  // Debugging tool: Check current jobData
  window.checkJobData = function() {
    console.log('='.repeat(60));
    console.log('📦 CURRENT JOB DATA');
    console.log('='.repeat(60));
    if (jobData) {
      console.log('Title:', jobData.title || '❌ EMPTY');
      console.log('Description length:', jobData.description ? jobData.description.length + ' chars' : '❌ EMPTY');
      console.log('Skills:', jobData.skills && jobData.skills.length > 0 ? jobData.skills : '❌ EMPTY');
      console.log('Budget:', jobData.budget || '❌ EMPTY');
      console.log('Client Info:', jobData.clientInfo || '❌ EMPTY');
      console.log('Screening Questions:', jobData.screeningQuestions && jobData.screeningQuestions.length > 0 ? jobData.screeningQuestions.length : '❌ EMPTY');
      console.log('Platform:', jobData.platform);
      console.log('\nFull object:', jobData);
    } else {
      console.error('❌ jobData is null - extension not initialized properly');
    }
    console.log('='.repeat(60));
    return jobData;
  };

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
  console.log('  - checkJobData() - Show current extracted job data');
  console.log('  - testJobExtraction() - Run full extraction test');
  console.log('  - testSelector("your-selector") - Test a specific selector');

  // Initialize
  init();
})();
