import { expect, it } from 'vitest'
import { usLayoutCode } from '../src/binding.ts'

it.each([
  ['US letter', 'KeyN', 'n', 'KeyN'],
  ['US shift letter', 'KeyN', 'N', 'KeyN'],
  ['US punctuation', 'Slash', '/', 'Slash'],
  ['US shift punctuation', 'Comma', '<', 'Comma'],
  ['Dvorak letter', 'KeyL', 'n', 'KeyN'],
  ['Dvorak displaced letter', 'KeyN', 'b', 'KeyB'],
  ['Dvorak punctuation', 'KeyW', ',', 'Comma'],
  ['Dvorak shift punctuation', 'KeyW', '<', 'Comma'],
  ['AZERTY letter', 'KeyQ', 'a', 'KeyA'],
  ['AZERTY digit row', 'KeyA', '&', 'Digit7'],
  ['shifted digit', 'KeyX', '!', 'Digit1'],
])('maps the %s press to its declaring code', (_label, code, key, expected) => {
  expect(usLayoutCode(code, key)).toBe(expected)
})

it.each([
  ['non-Latin character', 'KeyN', 'т'],
  ['accented character', 'KeyE', 'é'],
  ['dead key', 'KeyN', 'Dead'],
  ['named key', 'ArrowUp', 'ArrowUp'],
  ['space', 'Space', ' '],
])('keeps the physical code for a %s', (_label, code, key) => {
  expect(usLayoutCode(code, key)).toBe(code)
})

it.each([
  ['Numpad1', '1'],
  ['NumpadAdd', '+'],
])('keeps %s out of the main-row mapping', (code, key) => {
  expect(usLayoutCode(code, key)).toBe(code)
})
