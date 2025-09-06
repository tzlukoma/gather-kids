# Debug Panel

The Global Debug Panel is a comprehensive debugging tool that tracks data source usage and method calls across the entire gatherKids application. It's designed for developers to quickly understand which data sources are being used and what operations are being performed.

## Features

- **Global visibility**: Works on all routes without modification
- **Data source detection**: Tracks dbAdapter, IndexedDB, and Direct DB usage
- **Operation history**: Shows a rolling list of method calls with timestamps
- **Privacy-focused**: Only logs method names and URL paths (no payloads or sensitive data)
- **Client-only**: Zero server-side rendering impact
- **Zero performance impact**: Only active when debugging is enabled

## Getting Started

### Enable Debug Panel

The debug panel is off by default. To enable it:

1. **Via localStorage** (recommended):
   ```javascript
   localStorage.setItem('gk:debug-panel', '1');
   ```

2. **Via hotkey**:
   Press `Ctrl+Shift+D` to toggle the debug panel on/off

3. **Via browser console**:
   ```javascript
   // Enable
   localStorage['gk:debug-panel'] = '1';
   
   // Disable
   localStorage.removeItem('gk:debug-panel');
   ```

### Open Debug Panel

Once enabled, a "Debug Panel" button will appear in the bottom-left corner of the screen. Click it to open the debug dialog.

## UI Components

### Footer Icon
- Appears only when debug is enabled
- Located in bottom-left corner
- Click to open debug panel
- Keyboard accessible with proper ARIA labels

### Debug Dialog
- Matches Auth Debug Panel styling for consistency
- Modal dialog with backdrop
- Scrollable content for large operation lists
- Responsive design

## Data Sources Tracked

### 1. dbAdapter (DAL)
- All database adapter method calls
- Includes both Supabase and IndexedDB operations through the DAL
- Shows count of operations

### 2. IndexedDB
- Direct IndexedDB operations
- Database open/close operations
- Transaction creations
- Includes database names when available

### 3. Direct DB
- Direct Supabase REST API calls (not through DAL)
- Authentication requests
- Storage operations
- Categorized separately from DAL calls

## Operation History

The debug panel shows a chronological list of operations with:
- **Timestamp**: When the operation occurred
- **Operation name**: Method or API call name
- **Route**: Which page/route triggered the operation
- **Type badge**: Data source category

### Privacy Protection
- Only method names and URL paths are logged
- No request/response payloads
- No sensitive user data
- No authentication tokens or headers

## Debug Actions

### Clear History
Removes all logged operations and resets data source counters.

### Copy Debug Info
Copies a JSON summary to clipboard including:
- Current route
- Active data sources
- Event count
- Last 10 operations
- Timestamp

### Log to Console
Outputs the full operation history to browser console for detailed inspection.

## Development Usage

### Adding New Instrumentation

To add tracking for new data sources or operations:

1. Create a new instrument file in `src/lib/debug/`
2. Follow the existing patterns for safe patching
3. Add the installer to the patch manager
4. Update the debug panel content to display the new data

Example:
```typescript
// src/lib/debug/instrument-myapi.ts
export function instrumentMyAPI(): (() => void) | void {
  // Implementation here
}

// Add to debug-installer.ts
installDebugPatches([
  instrumentDAL,
  instrumentIndexedDB,
  instrumentFetch,
  instrumentMyAPI, // Add new instrumentation
]);
```

### Hotkey Customization

To change the debug toggle hotkey, modify the `handleKeyDown` function in `debug-installer.ts`:

```typescript
if (event.ctrlKey && event.shiftKey && event.key === 'D') {
  // Change key combination here
}
```

## Technical Implementation

### Architecture
- **Event Bus**: Custom events for loose coupling between components
- **Proxy Pattern**: Used for DAL instrumentation without modifying original code
- **Patch Manager**: Handles installation/removal of debug patches
- **Client-Only**: No SSR dependencies or server-side code

### Performance
- **Zero overhead**: When debug is disabled, only a single localStorage check occurs
- **Lazy loading**: Debug code is only executed when needed
- **Memory efficient**: Event history is limited to 100 items
- **Safe patching**: All instrumentation includes error handling

### Error Handling
- Instrumentation failures don't break app functionality
- All debug operations are wrapped in try-catch blocks
- Graceful degradation when APIs are unavailable

## Troubleshooting

### Debug Panel Not Appearing
1. Verify localStorage setting: `localStorage.getItem('gk:debug-panel')`
2. Check browser console for errors
3. Ensure you're not in production mode
4. Try the hotkey: `Ctrl+Shift+D`

### No Operations Showing
1. Navigate around the app to trigger operations
2. Check that data sources are being used
3. Verify instrumentation is installed (check console logs)

### Performance Issues
1. Clear operation history if it becomes too long
2. Disable debug panel when not needed
3. Check for memory leaks in browser dev tools

## Browser Support

The debug panel requires:
- Modern browser with ES6+ support
- localStorage API
- CustomEvent API
- Proxy API for DAL instrumentation

## Security Considerations

- Debug panel is automatically disabled in production builds
- No sensitive data is logged or transmitted
- Only method names and URL paths are captured
- All operations are client-side only

## FAQ

**Q: Will this impact production performance?**
A: No, the debug panel is disabled in production and has zero overhead when turned off.

**Q: Can I extend the debug panel for custom operations?**
A: Yes, follow the instrumentation patterns and add new installers to the patch manager.

**Q: How do I see debug information in production?**
A: The debug panel is intentionally disabled in production for security and performance.

**Q: Can I export debug data?**
A: Yes, use the "Copy Debug Info" button to get a JSON summary that can be saved or shared.