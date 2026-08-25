const CACHE_NAME = 'bondok-cache-v1.0';

// الملفات الأساسية للتخزين المؤقت للتشغيل السريع
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './images/logopondok.png',
  './images/default.jpg'
];

// التثبيت والتخطي الفوري للانتظار
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// تفعيل وتحديث الكاش وحذف الإصدارات القديمة فوراً
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية جلب البيانات: Network-First لملفات الكود والبيانات مع Fallback للكاش لضمان السرعة والتحديث الفوري
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // استثناء روابط جوجل شيت حتى يتم جلب الأسعار اللحظية دائماً
  if (requestUrl.hostname.includes('docs.google.com') || requestUrl.hostname.includes('googleusercontent.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // لباقي ملفات الموقع: محاولة الجلب من الشبكة أولاً لتحديث الواجهة فور رفع التعديلات
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // إذا انقطع الإنترنت، يتم فتح النسخة المخزنة
        return caches.match(event.request);
      })
  );
});
