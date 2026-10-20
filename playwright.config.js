import { defineConfig } from '@playwright/test';
const windows = process.platform === 'win32';
export default defineConfig({
 testDir:'./tests', workers:2,
 use:{baseURL:'http://127.0.0.1:5173', ...(windows?{channel:'chrome'}:{}), launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}},
 webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:1060}}},...[360,390,430].map(width=>({name:`mobile-${width}`,use:{viewport:{width,height:844},isMobile:true,hasTouch:true}}))]
});
