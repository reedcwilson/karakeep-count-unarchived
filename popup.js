document.addEventListener('DOMContentLoaded', function() {
  const refreshBtn = document.getElementById('refreshBtn');
  
  refreshBtn.addEventListener('click', function() {
    // Send message to content script to refresh counts
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'refreshCounts'}, function(response) {
        if (chrome.runtime.lastError) {
          console.log('Extension not active on this page');
        } else {
          console.log('Counts refreshed');
        }
      });
    });
    
    // Visual feedback
    refreshBtn.textContent = 'Refreshed!';
    setTimeout(() => {
      refreshBtn.textContent = 'Refresh Counts';
    }, 1000);
  });
});
