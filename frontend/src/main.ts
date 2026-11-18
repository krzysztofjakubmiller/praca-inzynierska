import '@fontsource-variable/mona-sans/wdth.css'
import './assets/base.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')

// Tylko w buildzie produkcyjnym, żeby przy npm run dev nie zostawał zarejestrowany worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
