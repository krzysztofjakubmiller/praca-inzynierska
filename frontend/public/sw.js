// Chrome na Androidzie proponuje instalację dopiero, gdy service worker obsługuje fetch.
// Nic nie jest cache'owane. API i inne domeny przeglądarka obsługuje sama, bez udziału workera,
// żeby nie wpływał na strumieniowane odpowiedzi Dyżurnego ani na logowanie Google.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  event.respondWith(fetch(event.request))
})
