# Karakeep Unarchived Bookmark Counter

A Chrome extension that modifies the bookmark counts in Karakeep to show only unarchived bookmarks instead of the total bookmark count.

## Features

- Automatically updates bookmark counts in the Karakeep sidebar
- Shows only unarchived bookmarks in the count
- Works with dynamic content updates
- Includes a popup interface for manual refresh

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select this extension folder
4. The extension will be installed and active

## Usage

1. Navigate to https://karakeep.yourdomain.com
2. Log in to your account
3. The extension will automatically update the bookmark counts in the sidebar
4. Click the extension icon to access the popup and manually refresh counts if needed

## How it Works

The extension:

1. Monitors the Karakeep page for bookmark-related elements
2. Identifies bookmark count displays in the sidebar
3. Counts unarchived bookmarks on the current page
4. Updates the displayed counts to reflect only unarchived items
5. Continues to monitor for changes and updates counts dynamically

## Files

- `manifest.json` - Extension configuration
- `content.js` - Main logic for counting and updating bookmarks
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality
- `README.md` - This documentation

## Development

To modify the extension:

1. Make changes to the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes on the Karakeep site

## Troubleshooting

If the counts aren't updating:

1. Refresh the Karakeep page
2. Click the extension icon and use the "Refresh Counts" button
3. Check the browser console for any error messages
4. Ensure you're on the correct Karakeep domain

## Version History

- v1.0 - Initial release with basic unarchived bookmark counting
