import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Kolor tła wariantu także pod stroną i w pasku przeglądarki na telefonie. Bez tego przy
 * przeciągnięciu strony poza krawędź wyłaziłoby jasne tło aplikacji.
 */
export function usePageGround(color: string) {
  const meta = () => document.querySelector('meta[name="theme-color"]')
  let before: string | null = null

  onMounted(() => {
    before = meta()?.getAttribute('content') ?? null
    document.body.style.background = color
    meta()?.setAttribute('content', color)
  })

  onBeforeUnmount(() => {
    document.body.style.background = ''
    if (before) meta()?.setAttribute('content', before)
  })
}
