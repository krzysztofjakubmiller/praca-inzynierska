import type { Directive } from 'vue'

// Element jest od początku widoczny. Klasę `is-waiting` dostaje dopiero ze skryptu, a `is-seen`,
// gdy wjedzie na ekran, więc bez skryptu i przy ograniczonym ruchu nic się nie chowa.
// Jak wygląda oczekiwanie i wejście, ustala styl strony, która używa dyrektywy.

let observer: IntersectionObserver | undefined

function watch(element: HTMLElement) {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.replace('is-waiting', 'is-seen')
        observer?.unobserve(entry.target)
      }
    },
    { threshold: 0.15 },
  )
  observer.observe(element)
}

/** Wartość dyrektywy to opóźnienie wejścia w milisekundach, dostępne w CSS jako --reveal-delay. */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(element, binding) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.classList.add('is-waiting')
    if (binding.value) element.style.setProperty('--reveal-delay', `${binding.value}ms`)
    watch(element)
  },
  unmounted(element) {
    observer?.unobserve(element)
  },
}
