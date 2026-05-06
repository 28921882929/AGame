# 暂停/设置菜单设计文档

## 概述

为 AGame 添加一个**中央弹窗式暂停菜单（PauseMenu）**及其配套**设置面板（SettingsPanel）**。设计继承现有 `PanelBase` 架构，复用遮罩与缩放动画，与 `BackpackPanel` 风格统一，通过 `UIManager` 管理打开与关闭。

---

## 背景与上下文

- 项目使用 Cocos Creator + TypeScript。
- 已有 UI 架构：`UIBase` → `PanelBase`（遮罩 + 动画），`UIManager` 管理层级与弹窗队列。
- 已有 `BackpackPanel` 作为 `PanelBase` 的完整使用范例。
- 游戏当前缺少暂停入口和设置界面。

---

## 设计决策

### 布局方案选择

| 方案 | 说明 | 结果 |
|------|------|------|
| A. 全屏覆盖式 | 沉浸式黑底铺满屏幕 | 否决 — 过于沉重 |
| B. 侧边滑出式 | 从右侧滑入 | 否决 — 与现有弹窗风格不统一 |
| **C. 中央弹窗式** | 经典缩放弹窗 | **选中** — 与 PanelBase + BackpackPanel 风格一致，最轻量 |

### 原因

- `PanelBase` 已内置 `mask` + `content` 节点结构、`backOut` / `backIn` 缩放动画、遮罩点击关闭逻辑，无需额外开发。
- `UIManager.open("PauseMenu")` 可直接复用弹窗队列管理。
- 中央弹窗对玩家干扰最小，视觉上聚焦。

---

## 架构

```
UIManager (Popup Layer)
│
├─ PauseMenu (PanelBase)
│  ├─ mask (半透明遮罩，点击关闭)
│  └─ content (动画目标节点)
│     ├─ title (Label: "游戏已暂停")
│     ├─ btnResume → 关闭面板，恢复游戏
│     ├─ btnSettings → 打开 SettingsPanel
│     ├─ btnMainMenu → 二次确认后跳转主菜单场景
│     └─ btnQuit → 二次确认后退出游戏
│
└─ SettingsPanel (PanelBase)
   ├─ mask
   └─ content
      ├─ header (返回按钮 + "设置"标题)
      ├─ bgmVolume (Slider + Label)
      ├─ sfxVolume (Slider + Label)
      ├─ language (Dropdown)
      ├─ vibration (Toggle)
      └─ btnReset (恢复默认)
```

---

## 组件

### PauseMenu.ts

继承 `PanelBase`，挂在 `PauseMenu.prefab` 根节点上。

**Properties:**
| 属性 | 类型 | 说明 |
|------|------|------|
| `btnResume` | `cc.Node` | 继续游戏按钮 |
| `btnSettings` | `cc.Node` | 设置按钮 |
| `btnMainMenu` | `cc.Node` | 返回主菜单按钮 |
| `btnQuit` | `cc.Node` | 退出游戏按钮 |

**方法:**
| 方法 | 说明 |
|------|------|
| `onOpen()` | 暂停游戏时间（`cc.director.pause()`），绑定按钮事件 |
| `onClose()` | 恢复游戏时间（`cc.director.resume()`），清理事件 |
| `_onResume()` | 调用 `UIManager.close("PauseMenu")` |
| `_onSettings()` | 调用 `UIManager.open("SettingsPanel")` |
| `_onMainMenu()` | 弹出确认框，确认后 `cc.director.loadScene("MainMenu")` |
| `_onQuit()` | 弹出确认框，确认后 `cc.game.end()` |

### SettingsPanel.ts

继承 `PanelBase`。

**Properties:**
| 属性 | 类型 | 说明 |
|------|------|------|
| `sliderBgm` | `cc.Slider` | 背景音乐音量 |
| `sliderSfx` | `cc.Slider` | 音效音量 |
| `labelBgm` | `cc.Label` | 音量百分比显示 |
| `labelSfx` | `cc.Label` | 音量百分比显示 |
| `toggleVibration` | `cc.Toggle` | 震动反馈开关 |
| `btnReset` | `cc.Node` | 恢复默认 |

**方法:**
| 方法 | 说明 |
|------|------|
| `onOpen()` | 从 `StorageMgr` 读取当前设置值，初始化控件状态 |
| `_onBgmChanged()` | 更新音量 → `AudioMgr.setBgmVolume()` → `StorageMgr.save()` |
| `_onSfxChanged()` | 更新音量 → `AudioMgr.setSfxVolume()` → `StorageMgr.save()` |
| `_onVibrationChanged()` | 更新开关 → `StorageMgr.save()` |
| `_onReset()` | 恢复默认值并保存 |

---

## 数据流

### 打开暂停菜单

```
玩家按下暂停键 / 点击暂停按钮
    → GameManager / 输入处理
    → UIManager.open("PauseMenu")
    → 加载 Prefab → 挂载到 Popup Layer
    → PauseMenu.onOpen()
    → cc.director.pause()  // 游戏逻辑暂停
    → 播放 openAnim (backOut 缩放)
```

### 关闭并恢复

```
点击"继续游戏" / 点击遮罩
    → PauseMenu._onResume()
    → UIManager.close("PauseMenu")
    → 播放 closeAnim (backIn 缩放)
    → PauseMenu.onClose()
    → cc.director.resume()  // 游戏逻辑恢复
```

### 设置变更

```
拖动音量滑块 / 切换开关
    → SettingsPanel._on*Changed()
    → AudioMgr.setVolume()  // 实时生效
    → StorageMgr.save("settings", {...})  // 持久化
```

---

## 事件

| 事件名 | 发射者 | 说明 |
|--------|--------|------|
| `game:paused` | PauseMenu | 游戏暂停时发射 |
| `game:resumed` | PauseMenu | 游戏恢复时发射 |
| `settings:changed` | SettingsPanel | 任意设置项变更时发射 |

---

## 错误处理

- **Prefab 加载失败**：`UIManager.open()` 返回 `null`，调用方静默处理，记录 error log。
- **场景切换失败**：`loadScene` 回调检查 `err`，失败时显示 Toast "切换失败"。
- **设置读写失败**：`StorageMgr` 内部 catch，失败时不阻断 UI，仅记录 warning log。

---

## 预制体结构

### PauseMenu.prefab

```
PauseMenu (Node)
├─ mask (Node)
│  └─ Sprite (全屏半透明黑色)
└─ content (Node) ← PanelBase 动画目标
   ├─ bg (Node)
   │  └─ Sprite (圆角矩形背景 #2a2a2a)
   ├─ title (Label)
   ├─ btnResume (Node)
   │  ├─ bg (Sprite)
   │  └─ label (Label: "继续游戏")
   ├─ btnSettings (Node)
   │  ├─ bg (Sprite)
   │  └─ label (Label: "设置")
   ├─ btnMainMenu (Node)
   │  ├─ bg (Sprite)
   │  └─ label (Label: "返回主菜单")
   └─ btnQuit (Node)
      ├─ bg (Sprite)
      └─ label (Label: "退出游戏")
```

### SettingsPanel.prefab

```
SettingsPanel (Node)
├─ mask (Node)
└─ content (Node)
   ├─ bg (Node)
   ├─ header (Node)
   │  ├─ btnBack (Node + Label "←")
   │  └─ title (Label "设置")
   ├─ rowBgm (Node)
   │  ├─ icon (Label "🔊")
   │  ├─ label (Label "背景音乐")
   │  ├─ slider (Slider)
   │  └─ value (Label "70%")
   ├─ rowSfx (Node)
   │  └─ ... (同上)
   ├─ rowLanguage (Node)
   │  ├─ label (Label "语言")
   │  └─ dropdown (Node + Label "简体中文 ▾")
   ├─ rowVibration (Node)
   │  ├─ label (Label "震动反馈")
   │  └─ toggle (Toggle)
   └─ btnReset (Node + Label "恢复默认设置")
```

---

## 测试策略

### 单元测试

- **PauseMenu**：模拟按钮点击，验证 `cc.director.pause/resume` 被正确调用。
- **SettingsPanel**：模拟滑块/开关变更，验证 `StorageMgr.save` 被调用且参数正确。

### 集成测试

- **打开/关闭流程**：`UIManager.open("PauseMenu")` → 验证节点挂载到 Popup Layer → 点击遮罩 → 验证节点销毁。
- **弹窗队列**：打开 PauseMenu → 点击设置 → 验证 SettingsPanel 在 PauseMenu 上方正常显示 → 关闭 SettingsPanel → PauseMenu 仍在。

---

## 依赖

- `PanelBase.ts`（遮罩、动画基类）
- `UIManager.ts`（UI 打开/关闭/队列）
- `AudioMgr.ts`（音量控制）
- `StorageMgr.ts`（设置持久化）
- `I18nMgr.ts`（语言切换）

---

## 范围外（YAGNI）

- 不实现主菜单场景（"返回主菜单"按钮预留，当前版本可先隐藏或显示 Toast）。
- 不实现画质/分辨率设置（当前项目未区分画质等级）。
- 不实现云存档同步（本地 `StorageMgr` 足够）。
