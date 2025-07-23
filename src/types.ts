// PluginState Service Interface
export interface PluginStateService {
  configure(config: PluginStateConfig): void;
  getConfiguration(): PluginStateConfig | null;
  saveState(state: any): Promise<void>;
  getState(): Promise<any>;
  clearState(): Promise<void>;
  validateState(state: any): boolean;
  sanitizeState(state: any): any;
  onSave(callback: (state: any) => void): () => void;
  onRestore(callback: (state: any) => void): () => void;
  onClear(callback: () => void): () => void;
}

// PluginState Configuration
export interface PluginStateConfig {
  pluginId: string;
  stateStrategy: 'session' | 'persistent';
  preserveKeys: string[];
  stateSchema?: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required: boolean;
      default?: any;
    };
  };
  maxStateSize?: number;
}

// Services interface - focused only on PluginState
export interface Services {
  pluginState: PluginStateService;
}

// Demo data structure
export interface DemoData {
  userInput: string;
  counter: number;
  preferences: {
    autoSave: boolean;
    showDebugInfo: boolean;
  };
  timestamp: string;
}

// Component props
export interface PluginStateDemoProps {
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

// Component state
export interface PluginStateDemoState {
  // Demo data that will be persisted
  demoData: DemoData;
  
  // UI state
  isLoading: boolean;
  error: string;
  isInitializing: boolean;
  
  // State management info
  isStateConfigured: boolean;
  lastSaveTime: string | null;
  lastRestoreTime: string | null;
  saveCount: number;
  restoreCount: number;
  
  // Debug info
  debugLogs: string[];
}