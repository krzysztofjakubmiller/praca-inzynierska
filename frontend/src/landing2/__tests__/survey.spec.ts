import { describe, it, expect } from 'vitest'

import { deviceKind } from '@/landing2/survey'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const ANDROID_PHONE =
  'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

describe('deviceKind', () => {
  it.each([
    ['iPhone', IPHONE, 5, 'telefon'],
    ['Android phone', ANDROID_PHONE, 5, 'telefon'],
    ['Android tablet', ANDROID_TABLET, 5, 'tablet'],
    ['iPad that reports itself as a Mac', MAC, 5, 'tablet'],
    ['Mac', MAC, 0, 'komputer'],
    ['Windows laptop with a touch screen', WINDOWS, 10, 'komputer'],
  ])('recognises %s', (_name, userAgent, touchPoints, kind) => {
    expect(deviceKind(userAgent, touchPoints)).toBe(kind)
  })
})
