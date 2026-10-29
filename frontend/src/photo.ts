// Dłuższy bok zdjęcia po zmniejszeniu. Tyle wystarcza AI do odczytania pisma, a zdjęcie
// z telefonu spada z kilku MB do kilkuset KB.
const LONG_EDGE = 1600

/** Zdjęcie zmniejszone i zapisane jako JPEG; przy okazji obrócone według danych z aparatu. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  )
  if (!blob) throw new Error('nie udało się zapisać zdjęcia')
  return blob
}

/** Plik jako base64 bez przedrostka „data:…;base64,”, w takiej postaci przyjmuje go backend. */
export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1]!)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
