# Agent Note: Shortcut matching follows the keyboard layout

Status: implemented

English | [中文](2026-11-07-layout-aware-shortcut-matching.zh.md)

## Problem

Shortcuts were declared as US-layout codes and displayed by their letter, while matching compared `KeyboardEvent.code`. On a Dvorak machine N sits where QWERTY has L, so `⌘N` did nothing when the user pressed the key that types `n`, and the key labeled B created a session. Colemak, AZERTY, and German users met the same mismatch for letters and punctuation.

Native macOS menu accelerators and Electron's own menu roles already match the produced character, so one window followed the layout for Copy and not for New session. Desktop Close Page was reachable from two keys at once: its native accelerator matched the character while the command matched the position.

## Decision

Bindings stay declared, persisted, displayed, and conflict-checked as US-layout codes. `usLayoutCode(code, key)` in [the binding protocol](../../../../packages/client/shortcuts/src/binding.ts) maps a press to the code declaring the character the active layout produced; adapters call it at their dispatch and recording boundaries.

- The [DOM adapter](../../../../packages/client/shortcuts/src/client/dom.ts) maps only the configurable dispatch gesture, leaving fixed actions on the physical code.
- [Desktop main](../../../../apps/desktop/src/keyboard.ts) maps before matching, so the accepted key set, the native menu check, chord state, and the payload sent to the renderer share one code.
- The [recorder](../../../../packages/client/ui-shortcuts/src/client/Editor.tsx) stores the mapped code, so a recorded binding is independent of the layout active at recording time.

A press keeps its physical code when it produces no mapped character: dead keys, input-method composition, non-Latin layouts, Numpad keys, and characters absent from the US table. Modifier matching is unchanged, so a command whose character needs `Shift` matches only while `Shift` is pressed.

## Alternatives considered

**Match `KeyboardEvent.key` directly.** Non-Latin layouts and input methods produce no Latin character, and composition and Option combinations report `Dead`, so the installed bindings would stop working entirely on those layouts.

**Keep a per-layout table of code positions.** It needs one entry per layout, cannot represent user-defined layouts or a layout switched at runtime, and duplicates what the platform already reports.

**Accept either the character or the position.** A press carries both, so Dvorak's physical N position would match `⌘N` while producing `b` and matching `⌘B`; resolving that ambiguity reintroduces a priority rule the character mapping already settles.

**Let the user select a keyboard layout.** It turns an inferable fact into configuration, covers only the layouts the product ships, and still needs the same mapping code.

## Consequences

Saved bindings keep their stored code, so a binding recorded under a non-QWERTY layout now names that code's character and may need re-recording. [The upgrade guide](../../../../docs/upgrade-guide/v0.2.2-rc.1/keyboard-layout-shortcuts/guide.md) states the reader-visible change.

Option combinations on macOS Web still report a dead key and therefore keep physical-code matching; covering them needs a layout map from `navigator.keyboard.getLayoutMap()`. Fixed sequences such as the composer's `/` and `@` also remain positional.

Layout mapping, dispatch, and recording are pinned by the [binding specification tests](../../../../packages/client/shortcuts/tests/binding.spec.ts), the DOM adapter and Desktop keyboard suites, and the recorder specification; the preference format and conflict detection carry no layout state.
