// Options page script for AI Job Bidding Assistant

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

// Load saved settings
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'aiProvider',
      'apiKey',
      'openaiModel',
      'claudeModel',
      'tone',
      'proposalLength',
      'proposalTemplate',
      'userProfile'
    ]);

    // AI Provider settings
    if (settings.aiProvider) {
      document.getElementById('aiProvider').value = settings.aiProvider;
      toggleModelFields(settings.aiProvider);
    }

    if (settings.apiKey) {
      document.getElementById('apiKey').value = settings.apiKey;
    }

    if (settings.openaiModel) {
      document.getElementById('openaiModel').value = settings.openaiModel;
    }

    if (settings.claudeModel) {
      document.getElementById('claudeModel').value = settings.claudeModel;
    }

    // Proposal settings
    if (settings.tone) {
      const toneRadio = document.getElementById(`tone${capitalize(settings.tone)}`);
      if (toneRadio) toneRadio.checked = true;
    }

    if (settings.proposalLength) {
      const lengthRadio = document.getElementById(`length${capitalize(settings.proposalLength)}`);
      if (lengthRadio) lengthRadio.checked = true;
    }

    if (settings.proposalTemplate) {
      document.getElementById('proposalTemplate').value = settings.proposalTemplate;
    }

    // User profile
    if (settings.userProfile) {
      if (settings.userProfile.name) {
        document.getElementById('userName').value = settings.userProfile.name;
      }
      if (settings.userProfile.businessDomains) {
        document.getElementById('businessDomains').value = settings.userProfile.businessDomains;
      }
      if (settings.userProfile.skills) {
        document.getElementById('userSkills').value = settings.userProfile.skills;
      }
      if (settings.userProfile.experience) {
        document.getElementById('userExperience').value = settings.userProfile.experience;
      }
      if (settings.userProfile.specialization) {
        document.getElementById('userSpecialization').value = settings.userProfile.specialization;
      }
    }

  } catch (error) {
    console.error('Error loading settings:', error);
    showAlert('Error loading settings', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  // AI provider change
  document.getElementById('aiProvider').addEventListener('change', (e) => {
    toggleModelFields(e.target.value);
  });

  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
}

// Toggle model fields based on provider
function toggleModelFields(provider) {
  const openaiGroup = document.getElementById('openaiModelGroup');
  const claudeGroup = document.getElementById('claudeModelGroup');

  if (provider === 'openai') {
    openaiGroup.style.display = 'block';
    claudeGroup.style.display = 'none';
  } else if (provider === 'claude') {
    openaiGroup.style.display = 'none';
    claudeGroup.style.display = 'block';
  }
}

// Save settings
async function saveSettings() {
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.textContent;

  try {
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    // Get values
    const aiProvider = document.getElementById('aiProvider').value;
    const apiKey = document.getElementById('apiKey').value.trim();
    const openaiModel = document.getElementById('openaiModel').value;
    const claudeModel = document.getElementById('claudeModel').value;
    const tone = document.querySelector('input[name="tone"]:checked').value;
    const proposalLength = document.querySelector('input[name="proposalLength"]:checked').value;
    const proposalTemplate = document.getElementById('proposalTemplate').value.trim();

    const userName = document.getElementById('userName').value.trim();
    const businessDomains = document.getElementById('businessDomains').value.trim();
    const userSkills = document.getElementById('userSkills').value.trim();
    const userExperience = document.getElementById('userExperience').value.trim();
    const userSpecialization = document.getElementById('userSpecialization').value.trim();

    // Validate
    if (!apiKey) {
      throw new Error('API key is required');
    }

    // Save to storage
    await chrome.storage.sync.set({
      aiProvider,
      apiKey,
      openaiModel,
      claudeModel,
      tone,
      proposalLength,
      proposalTemplate,
      userProfile: {
        name: userName,
        businessDomains: businessDomains,
        skills: userSkills,
        experience: userExperience,
        specialization: userSpecialization
      }
    });

    showAlert('Settings saved successfully!', 'success');

  } catch (error) {
    console.error('Error saving settings:', error);
    showAlert(error.message || 'Error saving settings', 'error');
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.sync.clear();

    // Set defaults
    await chrome.storage.sync.set({
      aiProvider: 'openai',
      tone: 'professional',
      proposalLength: 'medium',
      openaiModel: 'gpt-4',
      claudeModel: 'claude-3-5-sonnet-20241022'
    });

    // Reload the page to show defaults
    location.reload();

  } catch (error) {
    console.error('Error resetting settings:', error);
    showAlert('Error resetting settings', 'error');
  }
}

// Show alert message
function showAlert(message, type) {
  const alertBox = document.getElementById('alertBox');
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
  alertBox.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 5000);

  // Scroll to top to show alert
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Capitalize first letter
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
