self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data?.text() ?? '' }
  }

  const title = typeof payload.title === 'string' ? payload.title : 'VAULTEX'
  const body = typeof payload.body === 'string' ? payload.body : 'You have a new notification.'
  const options = {
    body,
    icon: '/icons/icon.svg',
    data: { url: typeof payload.url === 'string' ? payload.url : '/notifications' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = new URL(event.notification.data?.url ?? '/notifications', self.location.origin)
  if (target.origin !== self.location.origin) return

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (existing) {
        return existing.navigate(target.href).then(() => existing.focus())
      }
      return self.clients.openWindow(target.href)
    }),
  )
})
