import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'xhs-radar 赛道爆款雷达',
  short_name: 'xhs-radar',
  version: '0.1.0',
  description: '在小红书任意赛道发现爆款笔记并 AI 辅助选题',
  icons: {
    '16': 'public/icon_16.png',
    '48': 'public/icon_48.png',
    '128': 'public/icon_128.png',
  },
  action: {
    default_popup: 'public/popup.html',
    default_title: '打开 xhs-radar',
    default_icon: {
      '16': 'public/icon_16.png',
      '48': 'public/icon_48.png',
      '128': 'public/icon_128.png',
    },
  },
  background: {
    service_worker: 'src/shell/service_worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['*://*.xiaohongshu.com/*'],
      js: ['src/shell/content_scripts/xhs_interceptor.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'tabs', 'scripting', 'activeTab', 'cookies'],
  host_permissions: ['*://*.xiaohongshu.com/*', 'https://api.deepseek.com/*'],
  web_accessible_resources: [
    {
      resources: ['interceptor_main.js'],
      matches: ['*://*.xiaohongshu.com/*'],
    },
  ],
});
