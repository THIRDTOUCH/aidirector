/**
 * ============================================================
 * AI 导演台 · Director Console - Service Worker
 * 功能：离线缓存 + 快速启动 + 后台同步
 * 版本：1.0.0
 * ============================================================
 */

const CACHE_VERSION = 'director-console-v1-0-0';
const RUNTIME_CACHE = 'director-console-runtime-v1';
const OFFLINE_URL = './index.html';

// ============ 核心资源（应用外壳）============
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './version.json',
  // 核心 JS
  './js/core/app.js',
  './js/core/ai-core.js',
  './js/core/app-error.js',
  './js/core/app-mobile.js',
  './js/core/app-prompt.js',
  './js/core/app-secure.js',
  // 集成模块
  './js/integrations/app-llm.js',
  './js/integrations/app-comfyui.js',
  // 业务模块
  './js/modules/project-manager.js',
  './js/modules/character-lib.js',
  './js/modules/scene-lib.js',
  './js/modules/storyboard.js',
  './js/modules/timeline.js',
  './js/modules/ai-pipeline.js',
  './js/modules/exporter.js',
  './js/modules/script-parser.js',
  './js/modules/ffmpeg-exporter.js',
  './js/modules/workflow-init.js'
];

// ============ 图标资源
const ICON_ASSETS = [
  './icons/icon-72.svg',
  './icons/icon-96.svg',
  './icons/icon-128.svg',
  './icons/icon-144.svg',
  './icons/icon-152.svg',
  './icons/icon-192.svg',
  './icons/icon-384.svg',
  './icons/icon-512.svg'
];

// 合并
const PRECACHE_URLS = [...APP_SHELL, ...ICON_ASSETS];

/**
 * 安装阶段：预缓存应用外壳
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW] 预缓存应用外壳资源');
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('[SW] 部分资源缓存失败，逐个尝试:', err);
          return Promise.all(
            PRECACHE_URLS.map((url) =>
              cache.add(url).catch((e) => {
                console.warn('[SW] 跳过缓存失败的资源:', url);
              })
            )
          );
        });
      })
      .then(() => {
        console.log('[SW] 安装完成，强制激活');
        return self.skipWaiting();
      })
  );
});

/**
 * 激活阶段：清理旧缓存 + 接管所有页面
 */
self.addEventListener('activate', (event) => {
  const VALID_CACHES = [CACHE_VERSION, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (VALID_CACHES.indexOf(cacheName) === -1) {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] 激活完成，接管页面控制');
        return self.clients.claim();
      })
  );
});

/**
 * 资源请求拦截
 *  - 导航请求：网络优先，失败回退到缓存的离线页面
 *  - 同源静态资源：缓存优先，失败走网络
 *  - 其他请求：网络优先，失败使用缓存
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 导航请求（页面加载）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // 同源资源：缓存优先策略
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            if (request.destination === 'image') {
              return new Response('', { status: 408, statusText: 'Offline' });
            }
            return new Response('离线模式 - 请检查网络', { status: 408, statusText: 'Offline' });
          });
      })
    );
    return;
  }

  // 跨源请求（如字体、CDN 等）：stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

/**
 * 消息处理：接受来自页面的指令
 */
self.addEventListener('message', (event) => {
  const data = event.data;

  if (!data || !data.type) return;

  switch (data.type) {
    case 'SKIP_WAITING':
      console.log('[SW] 收到更新指令，立即激活新版本');
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.source.postMessage({
        type: 'VERSION',
        version: CACHE_VERSION,
        timestamp: new Date().toISOString()
      });
      break;

    case 'CLEAR_CACHE':
      caches.keys().then((names) => {
        return Promise.all(names.map((n) => caches.delete(n)));
      }).then(() => {
        event.source.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;

    case 'PRECACHE':
      caches.open(CACHE_VERSION).then((cache) => {
        return cache.addAll(data.urls || PRECACHE_URLS);
      }).then(() => {
        event.source.postMessage({ type: 'PRECACHE_DONE' });
      }).catch((err) => {
        event.source.postMessage({ type: 'PRECACHE_ERROR', error: String(err) });
      });
      break;
  }
});

/**
 * 后台同步（如果用户设备支持）
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] 后台同步触发:', event.tag);

  if (event.tag === 'sync-project-data') {
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('[SW] 项目数据同步完成（本地存储已自动处理）');
        return true;
      })
    );
  }
});

/**
 * 推送通知支持（如果需要将来扩展）
 */
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'AI 导演台';
    const options = {
      body: data.body || '',
      icon: './icons/icon-192.svg',
      badge: './icons/icon-72.svg',
      data: data.data || {},
      requireInteraction: data.requireInteraction || false
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url || './index.html';
  event.waitUntil(clients.openWindow(url));
});

console.log('[SW] Service Worker 脚本已加载，等待注册...');
