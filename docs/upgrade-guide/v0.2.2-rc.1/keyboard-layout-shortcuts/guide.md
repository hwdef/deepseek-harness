---
kind: upgrade-guide
description: "Keyboard shortcuts match the character the active layout produces instead of the physical key position."
---

# Keyboard shortcuts follow the active keyboard layout

English | [中文](guide.zh.md)

## Change

Configurable commands now match the character the active keyboard layout produced, not the physical key position. Bindings stay declared, stored, and displayed as US-layout codes, so `⌘N` still reads as N and pressing `⌘` with the key that types `n` runs it on Dvorak, Colemak, AZERTY, German, and every other Latin layout. US QWERTY behavior is unchanged.

Three observable effects follow. A key that types a bound character from another position now triggers that command, and the old position no longer does; saved custom bindings keep their stored code, so a binding recorded under a non-QWERTY layout now names the character of that code; presses that produce no mapped character keep matching by physical code, including dead keys, input-method composition, non-Latin layouts, Numpad keys, and fixed sequences such as the composer's `/` and `@`.

## Migration

1. Open Settings → General → Keyboard shortcuts on any device using a non-US layout and review custom bindings whose meaning changed.
2. Re-record each affected action, then confirm it by pressing its displayed combination with the key that types those characters.
3. Check commands whose character needs `Shift` on your layout, such as `/` on German or `,` in Dvorak: record them with the modifier you actually press, or press the combination and verify the recorded row.
