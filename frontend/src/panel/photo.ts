import { ref } from 'vue'

// Zdjęcie strony zbioru jest tylko w pamięci przeglądarki: nie trafia na serwer i znika
// po odświeżeniu strony. Zostaje na ekranie przy kolejnych zadaniach, dopóki go nie zmienisz.
export const pagePhoto = ref<string | null>(null)

export function choosePhoto(file: File | undefined) {
  if (pagePhoto.value) URL.revokeObjectURL(pagePhoto.value)
  pagePhoto.value = file ? URL.createObjectURL(file) : null
}
