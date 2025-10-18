// Background service worker for AI Job Bidding Assistant

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateProposal') {
    handleGenerateProposal(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(null, (settings) => {
      sendResponse({ success: true, data: settings });
    });
    return true;
  }
});

// Handle proposal generation with AI
async function handleGenerateProposal(jobData) {
  // Get settings from storage
  const settings = await chrome.storage.sync.get([
    'aiProvider',
    'apiKey',
    'userProfile',
    'proposalTemplate',
    'tone',
    'proposalLength'
  ]);

  if (!settings.apiKey) {
    throw new Error('API key not configured. Please set it in the extension options.');
  }

  const provider = settings.aiProvider || 'openai';

  // Generate proposal based on provider
  if (provider === 'openai') {
    return await generateWithOpenAI(jobData, settings);
  } else if (provider === 'claude') {
    return await generateWithClaude(jobData, settings);
  } else {
    throw new Error('Unsupported AI provider');
  }
}

// Generate proposal using OpenAI API
async function generateWithOpenAI(jobData, settings) {
  const systemPrompt = buildSystemPrompt(settings);
  const userPrompt = buildJobPrompt(jobData, settings);

  try {
    console.log('Making OpenAI API request...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.openaiModel || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: getMaxTokens(settings.proposalLength)
      })
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'OpenAI API request failed';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || errorMessage;
        console.error('OpenAI API error:', error);
      } catch (e) {
        console.error('Could not parse error response');
      }

      // Provide helpful error messages
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded or insufficient credits. Please check your OpenAI account.');
      } else if (response.status === 404) {
        throw new Error('Model not found. You may not have access to this model.');
      } else {
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
    }

    const data = await response.json();

    // Update statistics
    await updateStats();

    console.log('OpenAI proposal generated successfully');
    return {
      proposal: data.choices[0].message.content,
      provider: 'openai',
      model: settings.openaiModel || 'gpt-4'
    };
  } catch (error) {
    console.error('OpenAI API error:', error);

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Could not connect to OpenAI API. Check your internet connection and extension permissions.');
    }

    throw error;
  }
}

// Generate proposal using Claude API
async function generateWithClaude(jobData, settings) {
  const systemPrompt = buildSystemPrompt(settings);
  const userPrompt = buildJobPrompt(jobData, settings);

  try {
    console.log('Making Claude API request...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: settings.claudeModel || 'claude-3-5-sonnet-20241022',
        max_tokens: getMaxTokens(settings.proposalLength),
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'Claude API request failed';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.message || errorMessage;
        console.error('Claude API error:', error);
      } catch (e) {
        console.error('Could not parse error response');
      }

      // Provide helpful error messages
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Claude API key in settings.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please check your Claude account usage.');
      } else if (response.status === 404) {
        throw new Error('Model not found. You may not have access to this Claude model.');
      } else {
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
    }

    const data = await response.json();

    // Update statistics
    await updateStats();

    console.log('Claude proposal generated successfully');
    return {
      proposal: data.content[0].text,
      provider: 'claude',
      model: settings.claudeModel || 'claude-3-5-sonnet-20241022'
    };
  } catch (error) {
    console.error('Claude API error:', error);

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Could not connect to Claude API. Check your internet connection and extension permissions.');
    }

    throw error;
  }
}

// Build system prompt for AI
function buildSystemPrompt(settings) {
  const profile = settings.userProfile || {};
  const tone = settings.tone || 'professional';
  const template = settings.proposalTemplate || '';

  let prompt = `You are a professional freelance proposal writer. Your job is to create compelling, personalized job proposals that help freelancers win projects.

Tone: ${tone}
Length: ${settings.proposalLength || 'medium'} (short: 100-150 words, medium: 150-250 words, long: 250-400 words)

`;

  if (profile.name) {
    prompt += `Freelancer's Name: ${profile.name}\n`;
  }

  if (profile.businessDomains) {
    prompt += `Business Domains: ${profile.businessDomains}\n`;
  }

  if (profile.skills) {
    prompt += `Freelancer's Skills: ${profile.skills}\n`;
  }

  if (profile.experience) {
    prompt += `Freelancer's Experience: ${profile.experience}\n`;
  }

  if (profile.specialization) {
    prompt += `Specialization: ${profile.specialization}\n`;
  }

  if (template) {
    prompt += `\nTemplate to follow (adapt as needed):\n${template}\n`;
  }

  prompt += `\nGuidelines:
- Start with a personalized greeting that shows you read the job post
- Highlight relevant experience and skills that match the job requirements
- Be specific about how you can solve their problem
- Include a brief call-to-action
- Sound confident but not arrogant
- Avoid generic phrases like "I am writing to apply" or "I am the best"
- Keep it concise and scannable
- Do NOT include pricing/rates in the proposal text (that's handled separately)`;

  return prompt;
}

// Build job-specific prompt
function buildJobPrompt(jobData, settings) {
  let prompt = `Write a compelling proposal for this job posting:\n\n`;

  prompt += `Job Title: ${jobData.title}\n\n`;

  if (jobData.description) {
    prompt += `Job Description:\n${jobData.description}\n\n`;
  }

  if (jobData.skills && jobData.skills.length > 0) {
    prompt += `Required Skills: ${jobData.skills.join(', ')}\n\n`;
  }

  if (jobData.budget) {
    prompt += `Budget: ${jobData.budget}\n\n`;
  }

  if (jobData.clientInfo) {
    prompt += `Client Info: ${jobData.clientInfo}\n\n`;
  }

  prompt += `Create a proposal that demonstrates understanding of the project and explains why the freelancer is a great fit.`;

  return prompt;
}

// Get max tokens based on length preference
function getMaxTokens(length) {
  const tokenMap = {
    'short': 300,
    'medium': 500,
    'long': 800
  };
  return tokenMap[length] || 500;
}

// Update usage statistics
async function updateStats() {
  const stats = await chrome.storage.local.get(['proposalCount', 'lastGenerated']);

  await chrome.storage.local.set({
    proposalCount: (stats.proposalCount || 0) + 1,
    lastGenerated: new Date().toISOString()
  });
}

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      aiProvider: 'openai',
      tone: 'professional',
      proposalLength: 'medium',
      openaiModel: 'gpt-4',
      claudeModel: 'claude-3-5-sonnet-20241022'
    });

    // Initialize stats
    chrome.storage.local.set({
      proposalCount: 0,
      lastGenerated: null
    });

    // Open options page
    chrome.runtime.openOptionsPage();
  }
});
