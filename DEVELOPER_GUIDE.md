# ServiceExample_PluginState - Developer Guide

## 📚 Complete Guide to BrainDrive PluginState Service Bridge

This guide provides comprehensive documentation for developers learning to use BrainDrive's PluginState Service Bridge. The ServiceExample_PluginState plugin serves as a working demonstration of all key concepts and patterns for persistent state management.

## 🎯 Learning Objectives

After studying this plugin and guide, you will understand:

1. **PluginState Service Bridge Architecture** - How BrainDrive's state persistence system works
2. **State Configuration Patterns** - Proper ways to configure state schemas and validation
3. **State Lifecycle Management** - Save, restore, and clear operations with error handling
4. **Validation and Sanitization** - Ensuring state integrity and security
5. **Best Practices** - Production-ready patterns for state management
6. **Common Pitfalls** - What to avoid and how to debug state issues

## 🏗️ Architecture Overview

### PluginState Service Bridge Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your Plugin   │    │  PluginState    │    │  PageContext    │
│                 │    │    Service      │    │    Service      │
│ 1. Configure    │───▶│ 2. Validate     │───▶│ 3. Store        │
│    Schema       │    │    & Process    │    │    in Session   │
│                 │    │                 │    │                 │
│ 4. Get          │◀───│ 5. Retrieve     │◀───│ 6. Load from    │
│    State        │    │    & Restore    │    │    Session      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

1. **PluginState Service Bridge** - Provided by BrainDrive through `props.services.pluginState`
2. **State Configuration** - Schema definition and validation rules
3. **State Operations** - Save, restore, and clear functionality
4. **Lifecycle Hooks** - Callbacks for state events (save, restore, clear)

## 🔧 Implementation Guide

### Step 1: Service Integration

```typescript
// In your component constructor (from PluginStateDemo.tsx)
constructor(props: PluginStateDemoProps) {
  super(props);
  
  this.state = {
    demoData: {
      userInput: '',
      counter: 0,
      preferences: {
        autoSave: true,
        showDebugInfo: true
      },
      timestamp: new Date().toISOString()
    },
    isLoading: false,
    error: '',
    errorInfo: null,
    isInitializing: true,
    isStateConfigured: false,
    // ... other state properties
  };
}

// In componentDidMount (from PluginStateDemo.tsx)
async componentDidMount() {
  try {
    this.addDebugLog('Starting component initialization...');
    await this.configurePluginState();
    await this.restoreState();
    this.setState({ isInitializing: false });
    this.addDebugLog('Component initialized successfully');
  } catch (error) {
    this.handleError(error, 'componentDidMount');
    this.setState({ isInitializing: false });
  }
}
```

### Step 2: State Configuration

```typescript
// Configure the PluginState service (from PluginStateDemo.tsx)
private async configurePluginState(): Promise<void> {
  const { services } = this.props;
  
  try {
    // Validate service availability
    if (!services) {
      throw new Error('Services object not provided to component');
    }

    if (!services.pluginState) {
      throw new Error('PluginState service not available in services object');
    }

    this.addDebugLog('Configuring PluginState service...');

    // Configure the plugin state service with validation schema
    services.pluginState.configure({
      pluginId: 'ServiceExample_PluginState',
      stateStrategy: 'session',
      preserveKeys: ['demoData', 'saveCount', 'restoreCount'],
      stateSchema: {
        demoData: {
          type: 'object',
          required: false,
          default: {
            userInput: '',
            counter: 0,
            preferences: {
              autoSave: true,
              showDebugInfo: true
            },
            timestamp: new Date().toISOString()
          }
        },
        saveCount: { type: 'number', required: false, default: 0 },
        restoreCount: { type: 'number', required: false, default: 0 }
      },
      maxStateSize: 10240 // 10KB limit
    });

    this.addDebugLog('Service configuration applied successfully');
    this.setState({ isStateConfigured: true });

  } catch (error) {
    this.addDebugLog('Failed to configure PluginState service');
    throw error;
  }
}
```

### Step 3: State Operations

#### Saving State

```typescript
// Save current state with validation (from PluginStateDemo.tsx)
private async saveState(): Promise<void> {
  const { services } = this.props;
  
  try {
    // Only clear errors if there are any
    if (this.state.error || this.state.errorInfo) {
      this.clearError();
    }
    this.setState({ isLoading: true });
    this.addDebugLog('Starting state save operation...');

    // Validate service availability
    if (!services?.pluginState) {
      throw new Error('PluginState service not available for save operation');
    }

    // Validate demo data before saving
    const validation = this.validateDemoData(this.state.demoData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Prepare state to save
    const stateToSave = {
      demoData: this.state.demoData,
      saveCount: this.state.saveCount + 1,
      restoreCount: this.state.restoreCount
    };

    // Check state size (demonstration of size validation)
    const stateSize = JSON.stringify(stateToSave).length;
    if (stateSize > 10240) { // 10KB limit
      throw new Error(`State size (${stateSize} bytes) exceeds maximum allowed size (10240 bytes)`);
    }

    this.addDebugLog(`Saving state (${stateSize} bytes)...`);

    // Attempt to save state
    await services.pluginState.saveState(stateToSave);
    
    // Update component state on successful save
    this.setState({
      isLoading: false,
      lastSaveTime: new Date().toLocaleTimeString(),
      saveCount: this.state.saveCount + 1
    });
    
    this.addDebugLog('State saved successfully');

  } catch (error) {
    this.handleError(error, 'saveState');
  }
}
```

#### Restoring State

```typescript
// Restore state from storage (from PluginStateDemo.tsx)
private async restoreState(): Promise<void> {
  const { services } = this.props;
  
  try {
    // Only clear errors if there are any
    if (this.state.error || this.state.errorInfo) {
      this.clearError();
    }
    this.setState({ isLoading: true });
    this.addDebugLog('Starting state restore operation...');

    // Validate service availability
    if (!services?.pluginState) {
      throw new Error('PluginState service not available for restore operation');
    }

    // Attempt to restore state (service handles initialization internally)
    const restoredState = await services.pluginState.getState();
    
    if (restoredState) {
      this.setState({
        demoData: restoredState.demoData || this.state.demoData,
        saveCount: restoredState.saveCount || 0,
        restoreCount: (restoredState.restoreCount || 0) + 1,
        lastRestoreTime: new Date().toLocaleTimeString(),
        isLoading: false
      });
      this.addDebugLog('State restored successfully');
    } else {
      this.setState({ isLoading: false });
      this.addDebugLog('No saved state found');
    }

  } catch (error) {
    this.handleError(error, 'restoreState');
  }
}
```

#### Clearing State

```typescript
// Clear saved state (from PluginStateDemo.tsx)
private async clearState(): Promise<void> {
  const { services } = this.props;
  
  try {
    // Only clear errors if there are any
    if (this.state.error || this.state.errorInfo) {
      this.clearError();
    }
    this.setState({ isLoading: true });
    this.addDebugLog('Starting state clear operation...');

    // Validate service availability
    if (!services?.pluginState) {
      throw new Error('PluginState service not available for clear operation');
    }

    // Attempt to clear state
    await services.pluginState.clearState();
    
    // Reset to default state on successful clear
    this.setState({
      demoData: {
        userInput: '',
        counter: 0,
        preferences: {
          autoSave: true,
          showDebugInfo: true
        },
        timestamp: new Date().toISOString()
      },
      saveCount: 0,
      restoreCount: 0,
      lastSaveTime: null,
      lastRestoreTime: null,
      isLoading: false
    });
    
    this.addDebugLog('State cleared successfully');

  } catch (error) {
    this.handleError(error, 'clearState');
  }
}
```

### Step 4: Lifecycle Hooks

```typescript
// Set up lifecycle hooks with error handling (from PluginStateDemo.tsx)
try {
  const onSaveUnsubscribe = services.pluginState.onSave((state: any) => {
    try {
      this.addDebugLog(`State saved: ${JSON.stringify(state).substring(0, 100)}...`);
    } catch (error) {
      console.warn('Error in onSave callback:', error);
    }
  });

  const onRestoreUnsubscribe = services.pluginState.onRestore((state: any) => {
    try {
      this.addDebugLog(`State restored: ${JSON.stringify(state).substring(0, 100)}...`);
    } catch (error) {
      console.warn('Error in onRestore callback:', error);
    }
  });

  const onClearUnsubscribe = services.pluginState.onClear(() => {
    try {
      this.addDebugLog('State cleared');
    } catch (error) {
      console.warn('Error in onClear callback:', error);
    }
  });

  // Store unsubscribers for cleanup
  this.pluginStateUnsubscribers.push(onSaveUnsubscribe, onRestoreUnsubscribe, onClearUnsubscribe);
  this.addDebugLog('Lifecycle hooks registered successfully');

} catch (error) {
  console.warn('Failed to register some lifecycle hooks:', error);
  this.addDebugLog(`Warning: Some lifecycle hooks failed to register: ${error}`);
  // Don't throw here - partial configuration is acceptable
}
```

## 📋 State Configuration Schema

### Configuration Interface

```typescript
interface PluginStateConfig {
  /** Unique identifier for the plugin */
  pluginId: string;
  
  /** Strategy for state storage ('session' | 'persistent') */
  stateStrategy: 'session' | 'persistent';
  
  /** Keys to preserve during state operations */
  preserveKeys: string[];
  
  /** Schema definition for state validation */
  stateSchema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required: boolean;
      default?: any;
    };
  };
  
  /** Maximum size limit for state data (in bytes) */
  maxStateSize: number;
}
```

### Example Configuration

```typescript
// Complete configuration example
const stateConfig = {
  pluginId: 'ServiceExample_PluginState',
  stateStrategy: 'session',
  preserveKeys: ['demoData', 'saveCount', 'restoreCount'],
  stateSchema: {
    demoData: {
      type: 'object',
      required: false,
      default: {
        userInput: '',
        counter: 0,
        preferences: {
          autoSave: true,
          showDebugInfo: true
        },
        timestamp: new Date().toISOString()
      }
    },
    saveCount: { type: 'number', required: false, default: 0 },
    restoreCount: { type: 'number', required: false, default: 0 }
  },
  maxStateSize: 10240 // 10KB
};
```

## 🎨 UI Patterns

### Tabbed Interface

```typescript
// Tabbed interface for organized content (from PluginStateDemo.tsx)
const tabs = [
  { id: 'overview', label: '📊 Overview', icon: '📊' },
  { id: 'demo', label: '🎮 Interactive Demo', icon: '🎮' },
  { id: 'state', label: '📋 State Viewer', icon: '📋' },
  { id: 'debug', label: '🐛 Debug Logs', icon: '🐛' }
];

// Tab navigation
<div className="tab-navigation">
  {tabs.map(tab => (
    <button
      key={tab.id}
      className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
      onClick={() => this.handleTabChange(tab.id)}
      disabled={this.state.isLoading}
    >
      <span className="tab-icon">{tab.icon}</span>
      <span className="tab-label">{tab.label.replace(/^[^\s]+ /, '')}</span>
    </button>
  ))}
</div>
```

### State Operations UI

```typescript
// State operation buttons with tooltips (from PluginStateDemo.tsx)
<div className="state-operations">
  <button 
    onClick={() => this.saveState()} 
    disabled={this.state.isLoading}
    className="operation-button save-button"
    title="Manually save the current state to persistent storage"
  >
    💾 Save State
  </button>
  <button 
    onClick={() => this.restoreState()} 
    disabled={this.state.isLoading}
    className="operation-button restore-button"
    title="Load previously saved state from persistent storage"
  >
    📥 Restore State
  </button>
  <button 
    onClick={() => this.clearState()} 
    disabled={this.state.isLoading}
    className="operation-button clear-button"
    title="Remove all saved state data from persistent storage"
  >
    🗑️ Clear State
  </button>
</div>
```

### Auto-Save with Debouncing

```typescript
// Debounced auto-save implementation (from PluginStateDemo.tsx)
private updateDemoData = (updates: Partial<DemoData>) => {
  this.setState(prevState => ({
    demoData: {
      ...prevState.demoData,
      ...updates,
      timestamp: new Date().toISOString()
    }
  }), () => {
    // Auto-save if enabled (with debouncing)
    if (this.state.demoData.preferences.autoSave) {
      this.debouncedAutoSave();
    }
  });
};

/**
 * Debounced auto-save to prevent excessive saves
 */
private debouncedAutoSave = () => {
  // Clear existing timeout
  if (this.autoSaveTimeout) {
    clearTimeout(this.autoSaveTimeout);
  }

  // Set new timeout for auto-save
  this.autoSaveTimeout = setTimeout(() => {
    this.addDebugLog('Auto-saving after user input...');
    this.saveState();
  }, 1000); // Wait 1 second after last change
};
```

## 🚨 Error Handling

### Enhanced Error Types

```typescript
// Enhanced error information interface (from PluginStateDemo.tsx)
interface ErrorInfo {
  type: 'service' | 'validation' | 'network' | 'unknown';
  message: string;
  details?: string;
  timestamp: string;
  operation?: string;
  stack?: string;
}
```

### Comprehensive Error Handler

```typescript
// Enhanced error handling utility (from PluginStateDemo.tsx)
private handleError(error: any, operation: string): ErrorInfo {
  let errorType: ErrorInfo['type'] = 'unknown';
  let message = 'An unexpected error occurred';
  let details = '';
  let stack = '';

  // Categorize error types for better handling
  if (error instanceof Error) {
    message = error.message;
    stack = error.stack || '';
    
    // Categorize based on error message patterns
    if (message.includes('Service not available') || message.includes('not configured')) {
      errorType = 'service';
    } else if (message.includes('validation') || message.includes('invalid')) {
      errorType = 'validation';
    } else if (message.includes('network') || message.includes('fetch')) {
      errorType = 'network';
    }
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    message = error.message || error.toString();
    details = JSON.stringify(error, null, 2);
  }

  const errorInfo: ErrorInfo = {
    type: errorType,
    message,
    details,
    timestamp: new Date().toISOString(),
    operation,
    stack
  };

  // Log error for debugging
  console.error(`[PluginStateDemo] Error in ${operation}:`, error);
  this.addDebugLog(`ERROR in ${operation}: ${message}`);

  // Update state with error information
  this.setState({
    error: message,
    errorInfo,
    isLoading: false
  });

  return errorInfo;
}
```

### State Validation

```typescript
// Validate demo data before operations (from PluginStateDemo.tsx)
private validateDemoData(data: DemoData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Example validation rules
  if (data.userInput.length > 1000) {
    errors.push('User input exceeds maximum length of 1000 characters');
  }

  if (data.counter < -1000 || data.counter > 1000) {
    errors.push('Counter value must be between -1000 and 1000');
  }

  if (!data.timestamp || isNaN(Date.parse(data.timestamp))) {
    errors.push('Invalid timestamp format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Enhanced Error Display

```typescript
// Enhanced error state rendering (from PluginStateDemo.tsx)
private renderError(): JSX.Element {
  const { error, errorInfo, showErrorDetails } = this.state;

  return (
    <div className="plugin-state-demo-error">
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <h4>Error Occurred</h4>
        <p className="error-message">{error}</p>
        
        {errorInfo && (
          <div className="error-metadata">
            <div className="error-type">
              <strong>Type:</strong> {errorInfo.type}
            </div>
            <div className="error-operation">
              <strong>Operation:</strong> {errorInfo.operation}
            </div>
            <div className="error-timestamp">
              <strong>Time:</strong> {new Date(errorInfo.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        <div className="error-help">
          <h5>Troubleshooting Tips:</h5>
          <ul>
            {errorInfo?.type === 'service' && (
              <>
                <li>Ensure the PluginState service is properly initialized</li>
                <li>Check that the service bridge is correctly configured</li>
                <li>Verify the plugin is loaded in the correct context</li>
              </>
            )}
            {errorInfo?.type === 'validation' && (
              <>
                <li>Check that your data meets the schema requirements</li>
                <li>Ensure all required fields are present</li>
                <li>Verify data types match the expected schema</li>
              </>
            )}
            <li>Check the debug logs for more information</li>
            <li>Try refreshing the page if the error persists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

## 🔍 Debugging and Monitoring

### Educational Logging

The plugin includes comprehensive logging for learning purposes:

```typescript
// Debug logging system (from PluginStateDemo.tsx)
private addDebugLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;
  
  this.setState(prevState => ({
    debugLogs: [...prevState.debugLogs.slice(-19), logEntry] // Keep last 20 logs
  }));
}

// Usage examples
this.addDebugLog('Starting component initialization...');
this.addDebugLog('Service configuration applied successfully');
this.addDebugLog(`Saving state (${stateSize} bytes)...`);
this.addDebugLog('State saved successfully');
```

### State Monitoring

```typescript
// State viewer for debugging (from PluginStateDemo.tsx)
private renderStateTab(): JSX.Element {
  const { demoData, saveCount, restoreCount } = this.state;

  return (
    <div className="tab-panel">
      <h4>Current State</h4>
      <p>This shows the current state object that gets saved and restored:</p>
      
      <div className="state-viewer">
        <div className="state-section">
          <h5>Demo Data</h5>
          <pre className="state-display">
            {JSON.stringify(demoData, null, 2)}
          </pre>
        </div>

        <div className="state-info">
          <h5>State Information</h5>
          <ul>
            <li><strong>Size:</strong> {JSON.stringify({ demoData, saveCount, restoreCount }).length} characters</li>
            <li><strong>Last Updated:</strong> {demoData.timestamp}</li>
            <li><strong>Auto Save:</strong> {demoData.preferences.autoSave ? 'Enabled' : 'Disabled'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

## 🎯 Best Practices

### 1. Service Lifecycle Management

```typescript
// Always check service availability before use
if (!services?.pluginState) {
  throw new Error('PluginState service not available');
}

// Configure service once during component initialization
await this.configurePluginState();

// Clean up resources on unmount
componentWillUnmount() {
  // Clean up auto-save timeout
  if (this.autoSaveTimeout) {
    clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = null;
  }
  
  this.cleanupServices();
}
```

### 2. State Size Management

```typescript
// Always validate state size before saving
const stateSize = JSON.stringify(stateToSave).length;
if (stateSize > 10240) { // 10KB limit
  throw new Error(`State size (${stateSize} bytes) exceeds maximum allowed size`);
}
```

### 3. Data Validation

```typescript
// Validate data before state operations
const validation = this.validateDemoData(this.state.demoData);
if (!validation.isValid) {
  throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
}
```

### 4. Auto-Save Implementation

```typescript
// Use debouncing to prevent excessive saves
private debouncedAutoSave = () => {
  if (this.autoSaveTimeout) {
    clearTimeout(this.autoSaveTimeout);
  }
  
  this.autoSaveTimeout = setTimeout(() => {
    this.saveState();
  }, 1000); // Wait 1 second after last change
};
```

## ⚠️ Common Pitfalls

### 1. Not Handling Service Initialization

```typescript
// ❌ Wrong - assuming service is immediately available
componentDidMount() {
  this.props.services.pluginState.saveState(data); // May fail
}

// ✅ Correct - wait for service initialization
async componentDidMount() {
  try {
    await this.configurePluginState();
    await this.restoreState();
  } catch (error) {
    this.handleError(error, 'componentDidMount');
  }
}
```

### 2. Ignoring State Size Limits

```typescript
// ❌ Wrong - saving without size validation
await services.pluginState.saveState(largeState);

// ✅ Correct - validate size before saving
const stateSize = JSON.stringify(stateToSave).length;
if (stateSize > maxSize) {
  throw new Error(`State too large: ${stateSize} bytes`);
}
await services.pluginState.saveState(stateToSave);
```

### 3. Not Cleaning Up Resources

```typescript
// ❌ Wrong - forgetting to clean up timeouts
componentWillUnmount() {
  // Timeout continues running
}

// ✅ Correct - clean up all resources
componentWillUnmount() {
  if (this.autoSaveTimeout) {
    clearTimeout(this.autoSaveTimeout);
  }
  this.cleanupServices();
}
```

## 🧪 Testing Patterns

### 1. Component Testing

```typescript
// Test service integration
describe('PluginStateDemo', () => {
  it('should configure service on mount', async () => {
    const mockServices = {
      pluginState: {
        configure: jest.fn(),
        getState: jest.fn().mockResolvedValue(null)
      }
    };
    
    const component = mount(<PluginStateDemo services={mockServices} />);
    await component.instance().componentDidMount();
    
    expect(mockServices.pluginState.configure).toHaveBeenCalled();
  });
});
```

### 2. Error Handling Testing

```typescript
// Test error scenarios
it('should handle service unavailable error', async () => {
  const component = mount(<PluginStateDemo services={{}} />);
  
  await expect(component.instance().saveState()).rejects.toThrow(
    'PluginState service not available'
  );
});
```

## 📚 Plugin Structure

### File Organization

```
ServiceExample_PluginState/
├── package.json              # Dependencies and build scripts
├── webpack.config.js          # Module federation configuration
├── lifecycle_manager.py       # Plugin lifecycle management
├── DEVELOPER_GUIDE.md        # This comprehensive guide
├── src/
│   ├── index.tsx             # Plugin entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── PluginStateDemo.tsx   # Main demo component
│   └── PluginStateDemo.css   # Styling for the demo
└── screenshot/
    └── PluginStateDemoPage.png # Visual documentation
```

### Key Features

- **Tabbed Interface** - Organized content presentation
- **Real-time State Monitoring** - Live state viewer and debug logs
- **Comprehensive Error Handling** - Detailed error information and recovery
- **Auto-save with Debouncing** - Intelligent state persistence
- **Educational Logging** - Step-by-step operation tracking

## 🎓 Next Steps

After mastering this plugin, consider exploring:

1. **Advanced State Schemas** - Complex validation rules and nested objects
2. **Cross-Plugin State Sharing** - Sharing state between different plugins
3. **State Migration** - Handling schema changes across plugin versions
4. **Performance Optimization** - Efficient state serialization and compression
5. **Integration Testing** - Testing state persistence across page reloads

## 💡 Tips for Success

1. **Start Simple** - Begin with basic save/restore operations
2. **Validate Early** - Always validate data before state operations
3. **Handle Errors Gracefully** - Provide meaningful error messages
4. **Monitor State Size** - Keep state data within reasonable limits
5. **Use Debouncing** - Prevent excessive auto-save operations
6. **Test Edge Cases** - Handle service unavailability and network issues
7. **Document Your Schema** - Clearly define your state structure
8. **Clean Up Resources** - Always clean up timeouts and subscriptions

## 🔗 Related Resources

- [BrainDrive Plugin Development Guide](../../../docs/plugin-development.md)
- [Service Bridge Architecture](../../../docs/service-bridge.md)
- [State Management Best Practices](../../../docs/state-management.md)
- [Error Handling Patterns](../../../docs/error-handling.md)

---

**Happy Coding!** 🚀

This plugin demonstrates production-ready patterns for state management in BrainDrive plugins. Use it as a reference for implementing robust state persistence in your own plugins.