/** Physical-key protocol shared by browser commands and desktop adapters; no DOM or runtime state. */
import type { Branded } from '@deepseek-ai/dsh-brand'

/** Stable command identity owned by the registering feature. */
export type ShortcutCommandId = Branded<'ShortcutCommandId'>
/** Operating system of the device receiving input. */
export type ShortcutPlatform = 'macos' | 'windows' | 'linux'
/** Application shell selecting the default bindings. */
export type ShortcutRuntime = 'desktop' | 'web'
/** Runtime and operating system selecting one explicit default and preference profile. */
export type ShortcutProfile = `${ShortcutRuntime}:${ShortcutPlatform}`
/** Logical primary expands to Meta on macOS and Control elsewhere. */
export type ShortcutModifier = 'primary' | 'control' | 'alt' | 'shift' | 'meta'
/** One or two distinct physical keys held together, plus an exact set of modifiers. */
export interface ShortcutBinding {
  readonly code: string
  readonly secondCode?: string
  readonly modifiers: readonly ShortcutModifier[]
}
/** Normalized modifier order is also the keycap order. */
export interface NormalizedBinding {
  readonly code: string
  readonly secondCode?: string
  readonly modifiers: readonly ('control' | 'alt' | 'shift' | 'meta')[]
}

/** Unmodified and shifted characters a US layout produces for every printable code a binding may name. */
const usLayoutCharacters: Readonly<Record<string, readonly string[]>> = {
  Backquote: ['`', '~'], Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
  Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'], Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
  Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'], Digit5: ['5', '%'],
  Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'],
}
const codeByCharacter = new Map<string, string>([
  ...Object.entries(usLayoutCharacters).flatMap(([code, characters]) =>
    characters.map((character): [string, string] => [character, code])),
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').flatMap((letter): [string, string][] =>
    [[letter, `Key${letter}`], [letter.toLowerCase(), `Key${letter}`]]),
])
/** Keycap and ARIA names; printable codes display the character they type on a US layout. */
const keyNames: Readonly<Record<string, string>> = {
  ...Object.fromEntries(Object.entries(usLayoutCharacters).map(([code, [character]]) => [code, character])),
  Enter: 'Enter', Escape: 'Esc', Space: 'Space', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
}
const modifierOrder = ['control', 'alt', 'shift', 'meta'] as const

/**
 * Resolve the US-layout code for the character a press produced, so declared bindings follow the active layout.
 * @param code - physical code reported by the keyboard event or the Desktop input bridge.
 * @param key - character or named key the press produced under the active layout.
 * @returns the code declaring that character, or the physical code when the press produced no mapped character.
 */
export function usLayoutCode(code: string, key: string): string {
  if (code.startsWith('Numpad')) return code
  return codeByCharacter.get(key) ?? code
}

/**
 * Expand logical modifiers, deduplicate, and validate the physical code.
 * @param binding - declared binding.
 * @param platform - receiving device platform.
 * @returns canonical binding; unsupported codes throw during registration.
 */
export function normalizeBinding(binding: ShortcutBinding, platform: ShortcutPlatform): NormalizedBinding {
  const codes: [string, ...string[]] = [binding.code, ...binding.secondCode === undefined ? [] : [binding.secondCode]]
  codes.sort()
  for (const code of codes) {
    if (!/^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-9]|2[0-4]))$/u.test(code)
      && !Object.hasOwn(keyNames, code)) throw new Error(`Unsupported shortcut code: ${code}`)
  }
  if (codes.length === 2 && codes[0] === codes[1]) throw new Error('Shortcut keys must be distinct')
  const modifiers = new Set(binding.modifiers.map(value => value === 'primary'
    ? platform === 'macos' ? 'meta' : 'control' : value))
  return { code: codes[0], ...(codes[1] === undefined ? {} : { secondCode: codes[1] }),
    modifiers: modifierOrder.filter(value => modifiers.has(value)) }
}

/**
 * Produce an exact-match index from a normalized binding.
 * @param binding - normalized physical key and modifiers.
 * @returns stable index used for both matching and conflict checks.
 */
export function bindingKey(binding: NormalizedBinding): string {
  const codes = binding.secondCode === undefined ? [binding.code] : [binding.code, binding.secondCode].sort()
  return [...binding.modifiers, ...codes].join('+')
}

/**
 * Format keycaps and ARIA; Windows separates modifiers with plus signs, while chord keys remain adjacent.
 * @param binding - normalized binding, or null for an unbound command.
 * @param platform - receiving device platform.
 * @returns visible keycaps; two-key chords omit ARIA shortcuts, which only support one non-modifier key.
 */
export function presentBinding(binding: NormalizedBinding | null, platform: ShortcutPlatform): {
  keys: readonly string[]
  aria: string | undefined
} {
  if (binding === null) return { keys: [], aria: undefined }
  const key = keyNames[binding.code] ?? binding.code.replace(/^(Key|Digit)/u, '')
  const symbols = platform === 'macos'
    ? { control: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' }
    : { control: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Meta' }
  const ariaNames = { control: 'Control', alt: 'Alt', shift: 'Shift', meta: 'Meta' }
  const ariaKey = binding.code === 'Space' ? 'Space' : binding.code === 'Escape' ? 'Escape'
    : binding.code.startsWith('Arrow') ? binding.code : key
  const second = binding.secondCode === undefined ? []
    : [keyNames[binding.secondCode] ?? binding.secondCode.replace(/^(Key|Digit)/u, '')]
  const keys = [...binding.modifiers.map(value => symbols[value]), key]
  return { keys: [...platform === 'windows' ? keys.flatMap((label, index) => index === 0 ? [label] : ['+', label]) : keys, ...second],
    aria: binding.secondCode === undefined ? [...binding.modifiers.map(value => ariaNames[value]), ariaKey].join('+') : undefined }
}

/**
 * Check Web combinations: Windows and macOS also admit any three or four modifiers; Linux retains the limited set.
 * @param binding - normalized candidate.
 * @param platform - receiving device platform.
 * @returns whether this combination is admitted; admission does not guarantee browser or system delivery.
 */
export function isWebBindingAllowed(binding: NormalizedBinding, platform: ShortcutPlatform): boolean {
  if (binding.secondCode !== undefined) return false
  if (platform === 'windows' || platform === 'macos') {
    if (binding.modifiers.length >= 3) return true
    const primary = platform === 'macos' ? 'meta' : 'control'
    if (binding.modifiers.length === 1
      && ((['Comma', 'Backslash'].includes(binding.code) && binding.modifiers[0] === primary)
        || (binding.code === 'Backquote' && binding.modifiers[0] === 'control'))) return true
    if (binding.modifiers.length === 2 && binding.modifiers.includes(primary)
      && (binding.modifiers.includes('alt') || binding.modifiers.includes('shift'))) return true
  }
  return [
    { code: 'Slash', modifiers: ['primary'] as const },
    { code: 'Comma', modifiers: ['primary', 'shift'] as const },
    { code: 'Period', modifiers: ['primary', 'shift'] as const },
  ].some(candidate => bindingKey(binding) === bindingKey(normalizeBinding(candidate, platform)))
}
