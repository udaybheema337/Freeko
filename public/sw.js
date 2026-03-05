// This is a basic Service Worker to satisfy the PWA install requirement.
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
    // Leave this empty for now. It just needs to exist!
});