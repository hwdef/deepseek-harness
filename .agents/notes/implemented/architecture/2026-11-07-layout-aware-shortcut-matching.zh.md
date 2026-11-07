# Agent Note: 快捷键按键盘布局匹配

Status: implemented

[English](2026-11-07-layout-aware-shortcut-matching.md) | 中文

## Problem

快捷键以 US 布局的 code 声明并按字母显示，匹配时比较的却是 `KeyboardEvent.code`。Dvorak 布局把 N 放在 QWERTY 的 L 位置，因此用户按打出 `n` 的那颗键时 `⌘N` 没有反应，而标着 B 的键却新建了会话。Colemak、AZERTY 和德语布局的字母与标点同样错位。

macOS 原生菜单快捷键和 Electron 自带的菜单 role 早已按产生的字符匹配，于是同一个窗口里复制跟随布局、新建会话却不跟随。桌面端的关闭页面甚至能由两颗键触发：原生加速键按字符匹配，命令按位置匹配。

## Decision

绑定仍以 US 布局的 code 声明、保存、显示并参与冲突校验。[绑定协议](../../../../packages/client/shortcuts/src/binding.ts)中的 `usLayoutCode(code, key)` 把一次按键折算为“当前布局打出的字符”所对应的 code，各适配器在分发和录制入口调用它。

- [DOM 适配器](../../../../packages/client/shortcuts/src/client/dom.ts)只折算可配置命令的分发手势，固定操作继续使用物理 code。
- [桌面端主进程](../../../../apps/desktop/src/keyboard.ts)在匹配前折算，使已接受键位集合、原生菜单判断、双键状态和下发渲染进程的数据共用同一个 code。
- [录制器](../../../../packages/client/ui-shortcuts/src/client/Editor.tsx)保存折算后的 code，因此录制结果与录制时的布局无关。

不产生映射字符的按键保留物理 code：死键、输入法组字、非拉丁布局、小键盘按键，以及不在 US 表中的字符。修饰键匹配不变，因此字符需要 `Shift` 的命令只有按下 `Shift` 时才匹配。

## Alternatives considered

**直接用 `KeyboardEvent.key` 匹配。** 非拉丁布局和输入法打不出拉丁字符，组字与 Option 组合会报告 `Dead`，已安装的绑定会在这些布局上整体失效。

**维护“布局到键位”的映射表。** 每种布局都要一项，无法表示用户自定义布局或运行时切换布局，还与平台已经报告的信息重复。

**字符与位置二者皆可匹配。** 一次按键同时带有两种身份，Dvorak 的物理 N 位置既产出 `b` 又对应 `KeyN`，会在 `⌘N` 与 `⌘B` 之间产生歧义，最终仍要补一条字符映射已经确定的优先级规则。

**让用户选择键盘布局。** 把本可推断的事实变成配置，只覆盖产品内置的布局，且仍需同一套映射代码。

## Consequences

已保存的绑定保留原有 code，因此在非 QWERTY 布局下录制的绑定现在表示该 code 的字符，可能需要重新录制。[升级指南](../../../../docs/upgrade-guide/v0.2.2-rc.1/keyboard-layout-shortcuts/guide.zh.md)说明读者可见的变化。

macOS Web 的 Option 组合仍报告死键，因此继续按物理 code 匹配；要覆盖它们需要 `navigator.keyboard.getLayoutMap()` 提供的布局映射。输入框的 `/` 和 `@` 等固定序列同样保持按位置匹配。

布局折算、分发和录制由[绑定规格测试](../../../../packages/client/shortcuts/tests/binding.spec.ts)、DOM 适配器与桌面键盘测试、录制器规格测试固定；偏好格式和冲突检测不携带布局状态。
