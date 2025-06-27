/**
 * Karakeep Unarchived Bookmark Counter - All Lists Version
 * Updates bookmark counts for ALL lists to show only unarchived bookmarks
 */

console.log('[Karakeep Extension] Loading all-lists version...');

class KarakeepBookmarkCounter {
  constructor() {
    this.debugMode = true;
    this.listCounts = new Map(); // Cache for list counts
    this.lastUpdateTime = 0; // Track when we last updated
    this.updateCooldown = 10000; // Don't update more than once every 10 seconds
    this.init();
  }

  log(...args) {
    if (this.debugMode) {
      console.log('[Karakeep Extension]', ...args);
    }
  }

  init() {
    this.log('Initializing all-lists counter...');
    
    // Multiple initialization attempts to handle different loading states
    this.scheduleInitialUpdate();
    
    // Set up observer for page changes
    this.setupObserver();
  }

  scheduleInitialUpdate() {
    // Reduced number of attempts for faster loading
    const delays = [1000, 3000];
    
    delays.forEach(delay => {
      setTimeout(() => {
        this.log(`Attempting update after ${delay}ms...`);
        this.updateAllListCounts();
      }, delay);
    });

    // Also try when the window finishes loading
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        this.log('Window load event triggered, updating counts...');
        setTimeout(() => this.updateAllListCounts(), 500);
      });
    }

    // Try when DOM content is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.log('DOMContentLoaded event triggered, updating counts...');
        setTimeout(() => this.updateAllListCounts(), 500);
      });
    }
  }

  setupObserver() {
    let currentUrl = window.location.href;
    
    const observer = new MutationObserver((mutations) => {
      // Check for URL changes
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.log('URL changed to:', currentUrl);
        setTimeout(() => this.updateAllListCounts(), 1000);
      }
      
      // Also check for significant DOM changes that might indicate content loaded
      let significantChange = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if sidebar or main content was added
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.querySelector && (node.querySelector('aside') || node.querySelector('main') || node.matches && node.matches('aside, main'))) {
                significantChange = true;
              }
            }
          });
        }
      });
      
      if (significantChange) {
        this.log('Significant DOM change detected, updating counts...');
        setTimeout(() => this.updateAllListCounts(), 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.log('Observer set up for all lists');
  }

  async updateAllListCounts() {
    this.log('Starting to update all list counts (parallel)...');
    
    // Check cooldown to prevent too frequent updates
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateCooldown) {
      this.log(`Skipping update (cooldown: ${Math.round((this.updateCooldown - (now - this.lastUpdateTime)) / 1000)}s remaining)`);
      return;
    }
    
    try {
      // Check if the page is ready (sidebar exists)
      const sidebar = document.querySelector('aside');
      if (!sidebar) {
        this.log('Sidebar not found, page may not be ready yet');
        return;
      }

      // Find all list links in the sidebar
      const listLinks = this.findAllListLinks();
      this.log('Found list links:', listLinks.length);

      if (listLinks.length === 0) {
        this.log('No list links found, page may not be ready yet');
        return;
      }

      this.lastUpdateTime = now;

      // Update counts for all lists in parallel
      const updatePromises = listLinks.map(listInfo => this.updateListCount(listInfo));
      
      // Wait for all updates to complete
      const results = await Promise.allSettled(updatePromises);
      
      // Log results
      let successful = 0;
      let failed = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful++;
        } else {
          failed++;
          this.log(`Failed to update ${listLinks[index].name}:`, result.reason);
        }
      });

      this.log(`Finished updating all list counts: ${successful} successful, ${failed} failed`);
    } catch (error) {
      console.error('[Karakeep Extension] Error updating all counts:', error);
    }
  }

  findAllListLinks() {
    const sidebar = document.querySelector('aside');
    if (!sidebar) {
      this.log('Sidebar not found');
      return [];
    }

    const links = sidebar.querySelectorAll('a[href*="/lists/"]');
    const listLinks = [];

    links.forEach(link => {
      const href = link.getAttribute('href');
      const listId = href.split('/lists/')[1];
      const text = link.textContent.trim();
      
      // Find the count badge for this list
      const listItem = link.closest('li');
      const countBadge = listItem ? listItem.querySelector('div.inline-flex.items-center.rounded-full.border') : null;
      
      if (listId && countBadge) {
        listLinks.push({
          listId: listId,
          name: text,
          link: link,
          countBadge: countBadge,
          currentCount: parseInt(countBadge.textContent.trim()) || 0
        });
      }
    });

    return listLinks;
  }

  async updateListCount(listInfo) {
    this.log(`Updating count for list: ${listInfo.name} (ID: ${listInfo.listId})`);
    
    try {
      // Get the unarchived count for this list
      const unarchivedCount = await this.getUnarchivedCountForList(listInfo.listId);
      
      if (unarchivedCount !== null && unarchivedCount !== listInfo.currentCount) {
        listInfo.countBadge.textContent = unarchivedCount.toString();
        this.log(`Updated ${listInfo.name} from ${listInfo.currentCount} to ${unarchivedCount}`);
      } else {
        this.log(`No update needed for ${listInfo.name} (count: ${unarchivedCount})`);
      }
    } catch (error) {
      console.error(`[Karakeep Extension] Error updating ${listInfo.name}:`, error);
    }
  }

  async getUnarchivedCountForList(listId) {
    // Check if we're currently on this list page
    const currentListId = window.location.pathname.split('/lists/')[1];
    
    if (currentListId === listId) {
      // We're on this list page, count directly
      return this.countVisibleBookmarks();
    } else {
      // We need to fetch the list data
      return await this.fetchListBookmarkCount(listId);
    }
  }

  async fetchListBookmarkCount(listId) {
    try {
      this.log(`Fetching bookmark count for list ${listId}...`);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // Make a request to the list page to get bookmark data
      const response = await fetch(`/dashboard/lists/${listId}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.log(`Failed to fetch list ${listId}: ${response.status}`);
        return null;
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Count bookmarks in the fetched HTML
      const count = this.countBookmarksInDocument(doc);
      this.log(`Fetched count for list ${listId}: ${count}`);
      
      return count;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.log(`Request timeout for list ${listId}`);
      } else {
        this.log(`Error fetching list ${listId}:`, error);
      }
      // Fallback: return null to keep current count
      return null;
    }
  }

  countBookmarksInDocument(doc) {
    const main = doc.querySelector('main');
    if (!main) {
      return 0;
    }

    // Look for bookmark cards in the document
    const bookmarkCards = main.querySelectorAll('div.relative.flex.flex-col.overflow-hidden.rounded-lg.mb-4.border');
    let validBookmarks = 0;

    bookmarkCards.forEach((card) => {
      const text = card.textContent?.trim() || '';
      const hasExternalLink = card.querySelector('a[href^="http"]');
      
      if (hasExternalLink && text.length > 10 && text.length < 200) {
        // Check for archive indicators
        const textLower = text.toLowerCase();
        const classLower = card.className.toLowerCase();
        
        const isArchived = textLower.includes('archived') || 
                          classLower.includes('archived') ||
                          card.hasAttribute('data-archived');
        
        if (!isArchived) {
          validBookmarks++;
        }
      }
    });

    return validBookmarks;
  }

  countVisibleBookmarks() {
    this.log('Counting visible bookmarks on current page...');
    
    const main = document.querySelector('main');
    if (!main) {
      this.log('Main element not found');
      return null;
    }

    const bookmarkCards = main.querySelectorAll('div.relative.flex.flex-col.overflow-hidden.rounded-lg.mb-4.border');
    this.log('Found bookmark cards:', bookmarkCards.length);

    let validBookmarks = 0;

    bookmarkCards.forEach((card, i) => {
      const text = card.textContent?.trim() || '';
      const hasExternalLink = card.querySelector('a[href^="http"]');
      
      if (hasExternalLink && text.length > 10 && text.length < 200) {
        const textLower = text.toLowerCase();
        const classLower = card.className.toLowerCase();
        const computedStyle = window.getComputedStyle(card);
        
        const isArchived = textLower.includes('archived') || 
                          classLower.includes('archived') ||
                          computedStyle.opacity < 1 ||
                          computedStyle.display === 'none' ||
                          card.hasAttribute('data-archived');
        
        if (!isArchived) {
          validBookmarks++;
        }
      }
    });

    this.log(`Found ${validBookmarks} unarchived bookmarks on current page`);
    return validBookmarks;
  }
}

// Initialize the extension
const karakeepCounter = new KarakeepBookmarkCounter();

// Listen for messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'refreshCounts') {
      console.log('[Karakeep Extension] Manual refresh requested for all lists');
      karakeepCounter.updateAllListCounts();
      sendResponse({status: 'refreshed'});
    }
  });
}

// Make functions available for testing
window.karakeepExtension = {
  counter: karakeepCounter,
  updateAll: () => karakeepCounter.updateAllListCounts(),
  test: () => karakeepCounter.countVisibleBookmarks()
};

console.log('[Karakeep Extension] All-lists extension loaded and ready');
