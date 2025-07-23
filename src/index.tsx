import React from 'react';
import PluginStateDemo from './PluginStateDemo';

// Main entry point for ServiceExample_PluginState plugin
export default PluginStateDemo;

// Version information
export const version = '1.0.0';

// Plugin metadata
export const metadata = {
  name: 'ServiceExample_PluginState',
  description: 'Simple example demonstrating PluginState Service usage',
  version: '1.0.0',
  author: 'BrainDrive Team',
};

// For development mode, render the component if we're in a standalone environment
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Check if we're running in development mode (webpack dev server)
  const rootElement = document.getElementById('root');
  if (rootElement) {
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(rootElement);
      
      // Mock PluginState service for development
      let mockState: any = {};
      const mockCallbacks = {
        save: [] as ((state: any) => void)[],
        restore: [] as ((state: any) => void)[],
        clear: [] as (() => void)[]
      };

      let mockConfig: any = null;

      const mockServices = {
        pluginState: {
          configure: (config: any) => {
            console.log('Mock PluginState configure:', config);
            mockConfig = config;
          },
          getConfiguration: () => {
            console.log('Mock PluginState getConfiguration');
            return mockConfig;
          },
          saveState: async (state: any) => {
            console.log('Mock PluginState saveState:', state);
            mockState = { ...state };
            localStorage.setItem('mock-plugin-state', JSON.stringify(state));
            mockCallbacks.save.forEach(cb => cb(state));
          },
          getState: async () => {
            console.log('Mock PluginState getState');
            const saved = localStorage.getItem('mock-plugin-state');
            const state = saved ? JSON.parse(saved) : null;
            if (state) {
              mockCallbacks.restore.forEach(cb => cb(state));
            }
            return state;
          },
          clearState: async () => {
            console.log('Mock PluginState clearState');
            mockState = {};
            localStorage.removeItem('mock-plugin-state');
            mockCallbacks.clear.forEach(cb => cb());
          },
          validateState: (state: any) => {
            console.log('Mock PluginState validateState:', state);
            return true;
          },
          sanitizeState: (state: any) => {
            console.log('Mock PluginState sanitizeState:', state);
            return state;
          },
          onSave: (callback: (state: any) => void) => {
            mockCallbacks.save.push(callback);
            return () => {
              const index = mockCallbacks.save.indexOf(callback);
              if (index > -1) mockCallbacks.save.splice(index, 1);
            };
          },
          onRestore: (callback: (state: any) => void) => {
            mockCallbacks.restore.push(callback);
            return () => {
              const index = mockCallbacks.restore.indexOf(callback);
              if (index > -1) mockCallbacks.restore.splice(index, 1);
            };
          },
          onClear: (callback: () => void) => {
            mockCallbacks.clear.push(callback);
            return () => {
              const index = mockCallbacks.clear.indexOf(callback);
              if (index > -1) mockCallbacks.clear.splice(index, 1);
            };
          }
        }
      };

      // Render the plugin with mock PluginState service
      root.render(
        <React.StrictMode>
          <PluginStateDemo
            services={mockServices}
            title="PluginState Service Demo (Development)"
            description="Learn how to use the PluginState service bridge"
            config={{
              showDebugInfo: true,
              autoSave: true,
              validateState: true
            }}
          />
        </React.StrictMode>
      );
    }).catch(error => {
      console.error('Failed to load React DOM:', error);
    });
  }
}