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
  let proposalResult;
  if (provider === 'openai') {
    proposalResult = await generateWithOpenAI(jobData, settings);
  } else if (provider === 'claude') {
    proposalResult = await generateWithClaude(jobData, settings);
  } else {
    throw new Error('Unsupported AI provider');
  }

  // Generate screening answers if questions exist
  let screeningAnswers = [];
  if (jobData.screeningQuestions && jobData.screeningQuestions.length > 0) {
    try {
      console.log(`Generating answers for ${jobData.screeningQuestions.length} screening questions...`);
      screeningAnswers = await generateScreeningAnswers(jobData.screeningQuestions, jobData, settings);
    } catch (error) {
      console.error('Error generating screening answers:', error);
      // Continue even if screening answers fail - we still have the proposal
    }
  }

  // Return both proposal and screening answers
  return {
    ...proposalResult,
    screeningAnswers: screeningAnswers,
    hasScreeningQuestions: jobData.screeningQuestions && jobData.screeningQuestions.length > 0
  };
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
- Do NOT include pricing/rates in the proposal text (that's handled separately)

CRITICAL OUTPUT RULES:
- Output ONLY the proposal text itself
- Do NOT include any introductory phrases like "Here's a proposal..." or "Here is..."
- Do NOT include any meta-commentary about the proposal
- Do NOT include phrases like "Subject:", "Dear Client:", or similar prefixes
- Start directly with the greeting (e.g., "Hi there!")
- End directly with the sign-off or call-to-action
- The output should be ready to copy-paste directly into Upwork without any editing`;

  return prompt;
}

// Build job-specific prompt
function buildJobPrompt(jobData, settings) {
  let prompt = `Generate a proposal for this job posting. Output ONLY the proposal text with no introductory comments:\n\n`;

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

  prompt += `IMPORTANT: Write the proposal in the SAME LANGUAGE as the job posting above. If the job is in Spanish, write in Spanish. If in German, write in German, etc. Match the language of the job description exactly.

Write the proposal text only. Do not include any meta-commentary, subject lines, or introductory phrases. Start directly with the greeting.`;

  return prompt;
}

// Generate answers for screening questions
async function generateScreeningAnswers(questions, jobData, settings) {
  console.log('Generating answers for screening questions...');

  const provider = settings.aiProvider || 'openai';

  // Build prompt for screening questions
  const systemPrompt = buildScreeningSystemPrompt(settings);
  const questionsPrompt = buildScreeningQuestionsPrompt(questions, jobData);

  if (provider === 'openai') {
    return await generateScreeningWithOpenAI(questionsPrompt, systemPrompt, settings);
  } else if (provider === 'claude') {
    return await generateScreeningWithClaude(questionsPrompt, systemPrompt, settings);
  } else {
    throw new Error('Unsupported AI provider');
  }
}

// Build system prompt for screening questions
function buildScreeningSystemPrompt(settings) {
  const profile = settings.userProfile || {};
  const tone = settings.tone || 'professional';

  let prompt = `You are answering screening questions for a freelance job application.

Tone: ${tone}
Answer Length: 2-4 sentences per question (concise and direct)

`;

  if (profile.name) {
    prompt += `Freelancer's Name: ${profile.name}\n`;
  }

  if (profile.businessDomains) {
    prompt += `Business Domains: ${profile.businessDomains}\n`;
  }

  if (profile.skills) {
    prompt += `Skills: ${profile.skills}\n`;
  }

  if (profile.experience) {
    prompt += `Experience: ${profile.experience}\n`;
  }

  if (profile.specialization) {
    prompt += `Specialization: ${profile.specialization}\n`;
  }

  prompt += `\nGuidelines:
- Provide direct, honest, and specific answers
- Reference relevant experience when applicable
- Keep answers concise (2-4 sentences)
- Be professional and confident
- Don't make up experience you don't have
- Match the specified tone`;

  return prompt;
}

// Build questions prompt
function buildScreeningQuestionsPrompt(questions, jobData) {
  let prompt = `Job Context:\n`;
  prompt += `Title: ${jobData.title}\n`;

  if (jobData.description) {
    prompt += `Description: ${jobData.description.substring(0, 500)}...\n`;
  }

  prompt += `\nScreening Questions:\n\n`;

  questions.forEach((q, index) => {
    prompt += `${index + 1}. ${q.text}\n`;
  });

  prompt += `\nProvide answers in this exact format:
ANSWER_1: [your answer here]
ANSWER_2: [your answer here]
etc.

CRITICAL RULES:
- Write answers in the SAME LANGUAGE as the questions above (match the language exactly)
- Each answer should be 2-4 sentences
- Do NOT include meta-commentary or introductory phrases
- Do NOT say things like "Here's my answer:" or "My response is:"
- Output ONLY the direct answer text
- The answer should start directly with the response content`;

  return prompt;
}

// Generate screening answers with OpenAI
async function generateScreeningWithOpenAI(questionsPrompt, systemPrompt, settings) {
  try {
    const model = settings.openaiModel || 'gpt-4';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: questionsPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const answersText = data.choices[0].message.content;

    // Parse answers
    const answers = parseAnswers(answersText);

    console.log('Screening answers generated successfully');
    return answers;
  } catch (error) {
    console.error('Error generating screening answers:', error);
    throw error;
  }
}

// Generate screening answers with Claude
async function generateScreeningWithClaude(questionsPrompt, systemPrompt, settings) {
  try {
    const model = settings.claudeModel || 'claude-3-5-sonnet-20241022';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: questionsPrompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const answersText = data.content[0].text;

    // Parse answers
    const answers = parseAnswers(answersText);

    console.log('Screening answers generated successfully');
    return answers;
  } catch (error) {
    console.error('Error generating screening answers:', error);
    throw error;
  }
}

// Parse answers from AI response
function parseAnswers(text) {
  const answers = [];
  const lines = text.split('\n');

  let currentAnswer = '';
  for (const line of lines) {
    const match = line.match(/^ANSWER_\d+:\s*(.+)/);
    if (match) {
      if (currentAnswer) {
        answers.push(currentAnswer.trim());
      }
      currentAnswer = match[1];
    } else if (currentAnswer && line.trim()) {
      currentAnswer += ' ' + line.trim();
    }
  }

  // Add the last answer
  if (currentAnswer) {
    answers.push(currentAnswer.trim());
  }

  return answers;
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
