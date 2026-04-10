try { require('@sentry/electron/renderer').init(); } catch {}

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  proxyStart: (port) => ipcRenderer.invoke('proxy-start', port),
  proxyStop: () => ipcRenderer.invoke('proxy-stop'),
  proxyStatus: () => ipcRenderer.invoke('proxy-status'),
  onProxyRequest: (cb) => ipcRenderer.on('proxy-request', (_, data) => cb(data)),
  onProxyResponse: (cb) => ipcRenderer.on('proxy-response', (_, data) => cb(data)),
  aiflowAnalyze: (data) => ipcRenderer.invoke('aiflow-analyze', data),
  onAiflowProgress: (cb) => ipcRenderer.on('aiflow-progress', (_, data) => cb(data)),
  offAiflowProgress: () => ipcRenderer.removeAllListeners('aiflow-progress'),
  aiflowChat: (data) => ipcRenderer.invoke('aiflow-chat', data),
  onAiflowChatChunk: (cb) => ipcRenderer.on('aiflow-chat-chunk', (_, data) => cb(data)),
  offAiflowChatChunk: () => ipcRenderer.removeAllListeners('aiflow-chat-chunk'),
  exportCaptures: (data) => ipcRenderer.invoke('capture-export', data),
  importCaptures: () => ipcRenderer.invoke('capture-import'),
  offProxy: () => {
    ipcRenderer.removeAllListeners('proxy-request');
    ipcRenderer.removeAllListeners('proxy-response');
  },
});
