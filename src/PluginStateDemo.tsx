import React from 'react';
import './PluginStateDemo.css';
import { Services } from './types';

interface DemoData {
  userInput: string;
  counter: number;
  preferences: {
    autoSave: boolean;
    showDebugInfo: boolean;
  };
  timestamp: string;
}

interface PluginStateDemoProps {
  moduleId?: string;
  pluginId?: string;
  instanceId?: string;
  services: Services;
  title?: string;
  description?: string;
  config?: {
    showDebugInfo?: boolean;
    autoSave?: boolean;
    validateState?: boolean;
  };
}

interface ErrorInfo {
  type: 'service' | 'validation' | 'network' | 'unknown';
  message: string;
  details?: string;
  timestamp: string;
  operation?: string;
  stack?: string;
}

interface PluginStateDemoState {
  // Demo data that will be persisted
  demoData: DemoData;
  
  // UI state
  isLoading: boolean;
  error: string;
  errorInfo: ErrorInfo | null;
  isInitializing: boolean;
  
  // State management info
  isStateConfigured: boolean;
  lastSaveTime: string | null;
  lastRestoreTime: string | null;
  saveCount: number;
  restoreCount: number;
  
  // Debug info
  debugLogs: string[];
  
  // UI state
  activeTab: string;
  
  // Error handling demo
  showErrorDetails: boolean;
}

/**
 * PluginState Service Bridge Demo Component
 * 
 * This component demonstrates how to use the PluginState service bridge in BrainDrive plugins.
 * It shows configuration, state operations, validation, and error handling patterns.
 */
class PluginStateDemo extends React.Component<PluginStateDemoProps, PluginStateDemoState> {
  private pluginStateUnsubscribers: (() => void)[] = [];
  private autoSaveTimeout: NodeJS.Timeout | null = null;

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
      lastSaveTime: null,
      lastRestoreTime: null,
      saveCount: 0,
      restoreCount: 0,
      debugLogs: [],
      activeTab: 'overview',
      showErrorDetails: false
    };
  }

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

  componentWillUnmount() {
    // Clean up auto-save timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    
    this.cleanupServices();
  }

  private addDebugLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    
    this.setState(prevState => ({
      debugLogs: [...prevState.debugLogs.slice(-19), logEntry] // Keep last 20 logs
    }));
  }

  /**
   * Enhanced error handling utility
   * Demonstrates best practices for error categorization and logging
   */
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

  /**
   * Clear error state
   */
  private clearError = () => {
    this.setState({
      error: '',
      errorInfo: null,
      showErrorDetails: false
    });
    this.addDebugLog('Error cleared by user');
  };

  /**
   * Toggle error details visibility
   */
  private toggleErrorDetails = () => {
    this.setState(prevState => ({
      showErrorDetails: !prevState.showErrorDetails
    }));
  };

  /**
   * Validate demo data before operations
   */
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

  /**
   * Configure the PluginState service bridge with comprehensive error handling
   */
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

      // Configure the plugin state service with validation and error handling
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
        maxStateSize: 10240 // 10KB
      });

      this.addDebugLog('Service configuration applied successfully');

      // Set up lifecycle hooks with error handling
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

      this.setState({ isStateConfigured: true });
      this.addDebugLog('PluginState service configured successfully');

    } catch (error) {
      this.addDebugLog('Failed to configure PluginState service');
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Clean up services and listeners
   */
  private cleanupServices(): void {
    // Clean up plugin state listeners
    this.pluginStateUnsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('PluginStateDemo: Error cleaning up plugin state listener:', error);
      }
    });
    this.pluginStateUnsubscribers = [];

    this.addDebugLog('Services cleaned up');
  }

  /**
   * Save current state with validation and comprehensive error handling
   */
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

  /**
   * Restore state from storage with enhanced error handling
   */
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

      // Attempt to restore state (service will handle initialization internally)
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

  /**
   * Clear saved state with comprehensive error handling
   */
  private async clearState(): Promise<void> {
    const { services } = this.props;
    
    try {
      // Clear any previous errors
      this.clearError();
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

  /**
   * Update demo data with debounced auto-save
   */
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

  /**
   * Handle text input change
   */
  private handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.updateDemoData({ userInput: e.target.value });
  };

  /**
   * Increment counter
   */
  private incrementCounter = () => {
    this.updateDemoData({ counter: this.state.demoData.counter + 1 });
  };

  /**
   * Decrement counter
   */
  private decrementCounter = () => {
    this.updateDemoData({ counter: this.state.demoData.counter - 1 });
  };

  /**
   * Handle preference change
   */
  private handlePreferenceChange = (key: keyof DemoData['preferences'], value: boolean) => {
    this.updateDemoData({
      preferences: {
        ...this.state.demoData.preferences,
        [key]: value
      }
    });
  };

  /**
   * Handle tab change
   */
  private handleTabChange = (tabId: string) => {
    this.setState({ activeTab: tabId });
  };

  /**
   * Render loading state
   */
  private renderLoading(): JSX.Element {
    return (
      <div className="plugin-state-demo-loading">
        <div className="loading-spinner"></div>
        <p>Loading PluginState Demo...</p>
      </div>
    );
  }

  /**
   * Render enhanced error state with detailed information
   */
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

          <div className="error-actions">
            <button onClick={this.clearError} className="primary-button">
              Clear Error
            </button>
            {errorInfo && (
              <button
                onClick={this.toggleErrorDetails}
                className="secondary-button"
              >
                {showErrorDetails ? 'Hide Details' : 'Show Details'}
              </button>
            )}
          </div>

          {showErrorDetails && errorInfo && (
            <div className="error-details">
              {errorInfo.details && (
                <div className="error-section">
                  <h5>Details:</h5>
                  <pre className="error-details-content">{errorInfo.details}</pre>
                </div>
              )}
              {errorInfo.stack && (
                <div className="error-section">
                  <h5>Stack Trace:</h5>
                  <pre className="error-stack-trace">{errorInfo.stack}</pre>
                </div>
              )}
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
              {errorInfo?.type === 'network' && (
                <>
                  <li>Check your internet connection</li>
                  <li>Verify the service endpoints are accessible</li>
                  <li>Try the operation again after a moment</li>
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

  /**
   * Render main content with tabs
   */
  private renderContent(): JSX.Element {
    const { title = "PluginState Service Demo", description = "Learn how to use the PluginState service bridge" } = this.props;
    const { activeTab } = this.state;

    const tabs = [
      { id: 'overview', label: '📊 Overview', icon: '📊' },
      { id: 'demo', label: '🎮 Interactive Demo', icon: '🎮' },
      { id: 'state', label: '📋 State Viewer', icon: '📋' },
      { id: 'debug', label: '🐛 Debug Logs', icon: '🐛' }
    ];

    return (
      <div className="plugin-state-demo-content">
        <div className="plugin-header">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        {/* Tab Navigation */}
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

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && this.renderOverviewTab()}
          {activeTab === 'demo' && this.renderDemoTab()}
          {activeTab === 'state' && this.renderStateTab()}
          {activeTab === 'debug' && this.renderDebugTab()}
        </div>
      </div>
    );
  }

  /**
   * Render Overview tab
   */
  private renderOverviewTab(): JSX.Element {
    const { isStateConfigured, lastSaveTime, lastRestoreTime, saveCount, restoreCount } = this.state;

    return (
      <div className="tab-panel">
        <h4>State Management Status</h4>
        <div className="info-grid">
          <div className="info-item">
            <strong>State Configured:</strong> {isStateConfigured ? '✅ Yes' : '❌ No'}
          </div>
          <div className="info-item">
            <strong>Last Save:</strong> {lastSaveTime || 'Never'}
          </div>
          <div className="info-item">
            <strong>Last Restore:</strong> {lastRestoreTime || 'Never'}
          </div>
          <div className="info-item">
            <strong>Save Count:</strong> {saveCount}
          </div>
          <div className="info-item">
            <strong>Restore Count:</strong> {restoreCount}
          </div>
        </div>

        <div className="overview-description">
          <h5>About PluginState Service</h5>
          <p>
            The PluginState service bridge provides persistent state management for BrainDrive plugins.
            It automatically handles state persistence across page reloads and browser sessions.
          </p>
          <ul>
            <li><strong>Configuration:</strong> Set up state schema and validation rules</li>
            <li><strong>Persistence:</strong> Automatically saves and restores state</li>
            <li><strong>Validation:</strong> Ensures state integrity with custom validators</li>
            <li><strong>Lifecycle Hooks:</strong> React to save, restore, and clear events</li>
          </ul>
        </div>
      </div>
    );
  }

  /**
   * Render Interactive Demo tab
   */
  private renderDemoTab(): JSX.Element {
    const { demoData } = this.state;

    return (
      <div className="tab-panel">
        <h4>Interactive Demo</h4>
        <p>Changes to these controls are automatically saved when auto-save is enabled. Use the operation buttons to manually control state persistence:</p>
        
        {/* State Operation Buttons */}
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

        {this.state.isLoading && (
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <span>Processing operation...</span>
          </div>
        )}
        
        <div className="demo-grid">
          {/* Text Input */}
          <div className="demo-card">
            <h5>📝 Text Input</h5>
            <p>Type something and see it persist across reloads:</p>
            <input
              type="text"
              value={demoData.userInput}
              onChange={this.handleTextChange}
              placeholder="Type something..."
              className="demo-input"
            />
            <small>Current value: "{demoData.userInput || 'empty'}"</small>
          </div>

          {/* Counter */}
          <div className="demo-card">
            <h5>🔢 Counter</h5>
            <p>Increment or decrement the counter:</p>
            <div className="counter-display">
              <span className="counter-value">{demoData.counter}</span>
            </div>
            <div className="counter-controls">
              <button onClick={this.decrementCounter} className="counter-button">-</button>
              <button onClick={this.incrementCounter} className="counter-button">+</button>
            </div>
          </div>

          {/* Preferences */}
          <div className="demo-card">
            <h5>⚙️ Preferences</h5>
            <p>Toggle application preferences:</p>
            <div className="preferences-list">
              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={demoData.preferences.autoSave}
                  onChange={(e) => this.handlePreferenceChange('autoSave', e.target.checked)}
                />
                <span>Auto Save</span>
                <small>Automatically save changes</small>
              </label>
              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={demoData.preferences.showDebugInfo}
                  onChange={(e) => this.handlePreferenceChange('showDebugInfo', e.target.checked)}
                />
                <span>Show Debug Info</span>
                <small>Display debug logs tab</small>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render State Viewer tab
   */
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

          <div className="state-section">
            <h5>Metadata</h5>
            <pre className="state-display">
              {JSON.stringify({ saveCount, restoreCount }, null, 2)}
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

  /**
   * Render Debug Logs tab
   */
  private renderDebugTab(): JSX.Element {
    const { debugLogs, demoData } = this.state;

    if (!demoData.preferences.showDebugInfo) {
      return (
        <div className="tab-panel">
          <h4>Debug Logs</h4>
          <div className="debug-disabled">
            <p>Debug logging is currently disabled.</p>
            <p>Enable "Show Debug Info" in the Interactive Demo tab to see debug logs.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="tab-panel">
        <h4>Debug Logs</h4>
        <p>Real-time logs showing PluginState service operations:</p>
        
        <div className="debug-controls">
          <button
            onClick={() => this.setState({ debugLogs: [] })}
            className="clear-logs-button"
          >
            🗑️ Clear Logs
          </button>
          <span className="log-count">{debugLogs.length} entries</span>
        </div>

        <div className="debug-logs">
          {debugLogs.length === 0 ? (
            <div className="no-logs">
              <p>No debug logs yet...</p>
              <p>Interact with the demo to see logs appear here.</p>
            </div>
          ) : (
            <ol className="log-list">
              {debugLogs.map((log, index) => (
                <li key={index} className="log-entry">
                  {log}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  render(): JSX.Element {
    const { isInitializing, error } = this.state;

    return (
      <div className="plugin-state-demo">
        {isInitializing ? (
          this.renderLoading()
        ) : error ? (
          this.renderError()
        ) : (
          this.renderContent()
        )}
      </div>
    );
  }
}

export default PluginStateDemo;