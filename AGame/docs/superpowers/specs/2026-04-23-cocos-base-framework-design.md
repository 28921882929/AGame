# Cocos Creator 2.4.9 游戏基础框架设计

日期：2026-04-23
版本：v1.0

## 一、概述

为 Cocos Creator 2.4.9 项目构建通用型游戏基础框架，支持纯单机游戏，预留扩展接口。

### 核心需求

| 模块 | 方案 |
|-----|-----|
| 网络支持 | 纯单机（无需） |
| 数据存储 | 简单存档（localStorage） |
| UI管理 | 完整UI框架（栈管理、弹窗、动画） |
| 资源管理 | Bundle分包方案 |
| 音频管理 | 基础音效（BGM + SFX） |
| 配置表 | Excel转JSON |
| 事件系统 | 自定义事件中心 |
| 对象池 | 增强型对象池 |
| 定时器 | 自定义定时器管理 |
| 多语言 | 预留接口（当前仅中文） |
| 游戏状态 | 状态机模式 |

### 架构方案

采用 **Manager中心化架构**，职责清晰、易扩展、符合 Cocos 开发习惯。

---

## 二、目录结构

```
assets/
├── Script/                  # 所有代码脚本
│   ├── Main/                # 游戏主入口
│   │   └── Game.ts
│   │
│   ├── Core/                # 核心框架
│   │   ├── Manager/         # 管理器模块
│   │   │   ├── GameManager.ts
│   │   │   ├── UIManager.ts
│   │   │   ├── ResourceManager.ts
│   │   │   ├── PoolManager.ts
│   │   │   ├── TimerManager.ts
│   │   │   ├── EventCenter.ts
│   │   │   ├── AudioMgr.ts
│   │   │   ├── StorageMgr.ts
│   │   │   ├── ConfigMgr.ts
│   │   │   └── I18nMgr.ts
│   │   │
│   │   ├── Base/            # 基类定义
│   │   │   ├── Singleton.ts
│   │   │   ├── UIBase.ts
│   │   │   └── PanelBase.ts
│   │   │
│   │   ├── Pool/            # 对象池相关
│   │   │   └── NodePool.ts
│   │   │
│   │   ├── State/           # 状态机
│   │   │   ├── StateMachine.ts
│   │   │   └── GameState.ts
│   │   │
│   │   └── Utils/           # 工具类
│   │       ├── Logger.ts
│   │       └── TimeUtils.ts
│   │
│   └── Game/                # 游戏业务逻辑（预留）
│       ├── Data/
│       ├── View/
│       └── Controller/
│
├── Config/                  # 配置表（Excel转JSON）
│   ├── *.json
│   └── i18n/
│       └── zh-CN.json
│
├── Resources/               # 动态资源目录
│   ├── UI/
│   ├── Audio/
│   └── Prefabs/
│
└── Scenes/                  # 场景文件
    └── Launch.scene
```

---

## 三、GameManager（游戏入口与状态机）

### 职责

- 游戏启动入口，初始化所有 Manager
- 管理游戏流程状态机
- 提供全局访问入口，协调各 Manager

### 状态定义

```typescript
enum GameState {
    Launch,      // 启动加载
    Loading,     // 资源加载中
    MainMenu,    // 主界面
    Playing,     // 游戏进行中
    Paused,      // 暂停
    GameOver,    // 游戏结束
}
```

### 核心接口

```typescript
class GameManager extends Singleton<GameManager> {
    static instance: GameManager;

    currentState: GameState;

    init(): void;
    changeState(state: GameState): void;
    pause(): void;
    resume(): void;
    exit(): void;
}
```

### 初始化流程

```
Launch.scene → Game.ts.onStart()
    ↓
GameManager.init()
    ↓
按顺序初始化各 Manager：
    StorageMgr → ConfigMgr → ResourceManager → PoolManager →
    TimerManager → EventCenter → AudioMgr → UIManager
    ↓
加载必要资源（显示进度）
    ↓
切换状态 → MainMenu
```

---

## 四、UIManager（UI框架）

### 职责

- 管理UI层级（背景层、主界面层、弹窗层、提示层）
- UI栈管理（打开、关闭、返回）
- 弹窗系统（队列、遮罩管理）
- UI打开/关闭动画支持
- UI预制体自动加载和资源释放

### 层级设计

```
Canvas (UI根节点)
├── LayerBackground (zIndex=0)   # 背景层
├── LayerMain (zIndex=100)       # 主界面层
├── LayerPopup (zIndex=200)      # 弹窗层
├── LayerTip (zIndex=300)        # 提示层
└── LayerMask (zIndex=250)       # 遮罩层
```

### 核心接口

```typescript
enum UILayer {
    Background = 0,
    Main = 100,
    Popup = 200,
    Tip = 300,
}

class UIManager extends Singleton<UIManager> {
    open<T extends UIBase>(uiName: string, data?: any): Promise<T>;
    close(uiName: string, destroy?: boolean): void;
    closeCurrentPopup(): void;
    closeAllPopups(): void;
    showToast(message: string, duration?: number): void;
    showLoading(text?: string): void;
    hideLoading(): void;
    getUI<T extends UIBase>(uiName: string): T;
    isOpen(uiName: string): boolean;
}
```

### 弹窗队列机制

- 同一时间只能显示一个弹窗
- 多个弹窗请求进入队列，依次显示
- 支持紧急弹窗（跳过队列直接显示）

---

## 五、ResourceManager（资源管理）

### 职责

- Bundle 分包加载策略
- 引用计数管理
- 资源预加载
- 自动释放（基于场景或引用计数）
- 资源依赖追踪

### Bundle 分包策略

```
resources/           # 主包（核心资源）
├── UI/              # UI通用资源
├── Audio/           # 音频资源
└── Prefabs/         # 通用预制体

bundle-main/         # 主界面分包
bundle-game/         # 游戏场景分包
bundle-config/       # 配置表分包
```

### 核心接口

```typescript
interface LoadResult<T> {
    data: T;
    bundle: string;
    path: string;
}

class ResourceManager extends Singleton<ResourceManager> {
    load<T>(path: string, bundle?: string): Promise<T>;
    loadDir(path: string, bundle?: string): Promise<T[]>;
    preload(paths: string[], bundle?: string): Promise<void>;
    loadBundle(bundleName: string): Promise<cc.AssetManager.Bundle>;
    get<T>(path: string, bundle?: string): T;
    release(path: string, bundle?: string): void;
    releaseDir(path: string, bundle?: string): void;
    releaseBundle(bundleName: string): void;
    getRefCount(path: string): number;
    getLoadingProgress(): number;
}
```

### 引用计数机制

- `load()` → 引用计数 +1
- `release()` → 引用计数 -1
- 计数归零 → 自动释放资源

---

## 六、PoolManager（对象池管理）

### 职责

- 多类型节点池管理
- 自动扩容机制
- 预创建对象
- 统计监控（池大小、命中/未命中次数）
- 统一清理接口

### 核心接口

```typescript
interface PoolConfig {
    prefab: cc.Prefab;
    initCount: number;
    maxCount: number;      // 0=无限
    autoExpand: boolean;
}

interface PoolInfo {
    size: number;
    usedCount: number;
    hitCount: number;
    missCount: number;
}

class PoolManager extends Singleton<PoolManager> {
    register(poolName: string, config: PoolConfig): void;
    get(poolName: string): cc.Node;
    put(poolName: string, node: cc.Node): void;
    preload(poolName: string, count: number): void;
    clear(poolName: string): void;
    clearAll(): void;
    getPoolInfo(poolName: string): PoolInfo;
    getAllPoolInfo(): Map<string, PoolInfo>;
}
```

### 自动扩容机制

```
池空时请求 get()
    ↓
autoExpand=true?
    ├─ 是 → 检查是否达到 maxCount
    │       ├─ 未达到 → 实例化新节点
    │       └─ 已达到 → 返回 null 或警告
    └─ 否 → 返回 null
```

---

## 七、TimerManager（定时器管理）

### 职责

- 统一管理所有定时器
- 暂停/恢复支持
- 清理追踪（防止泄漏）
- 游戏暂停时自动暂停所有定时器

### 核心接口

```typescript
interface TimerHandle {
    id: number;
    key: string;
}

class TimerManager extends Singleton<TimerManager> {
    delay(delay: number, callback: Function, key?: string): TimerHandle;
    interval(interval: number, callback: Function, key?: string): TimerHandle;
    frame(callback: Function, key?: string): TimerHandle;
    fixedFrame(fps: number, callback: Function, key?: string): TimerHandle;
    cancel(handle: TimerHandle): void;
    cancelByKey(key: string): void;
    pause(handle: TimerHandle): void;
    resume(handle: TimerHandle): void;
    pauseAll(): void;
    resumeAll(): void;
    clearAll(): void;
    getActiveCount(): number;
}
```

### 与游戏暂停联动

- `GameManager.pause()` → `TimerManager.pauseAll()`
- `GameManager.resume()` → `TimerManager.resumeAll()`
- 场景切换前 → `TimerManager.clearAll()` 防止内存泄漏

---

## 八、EventCenter（事件中心）

### 职责

- 全局事件广播
- 类型安全的事件定义
- 解耦模块间通信
- 事件清理追踪

### 核心接口

```typescript
interface EventMap {
    "game:state_change": { from: GameState; to: GameState };
    "game:pause": void;
    "game:resume": void;
    "ui:popup_open": { name: string; data?: any };
    "ui:popup_close": { name: string };
    "resource:load_progress": { progress: number };
    "audio:bgm_change": { name: string };
    "player:coin_change": { old: number; new: number };
}

class EventCenter extends Singleton<EventCenter> {
    on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void, target?: any): void;
    once<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void, target?: any): void;
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
    off<K extends keyof EventMap>(event: K, callback?: Function, target?: any): void;
    offAllByTarget(target: any): void;
    clear(event: string): void;
    clearAll(): void;
    hasListener(event: string): boolean;
}
```

### 事件命名规范

```
格式: 模块:动作
示例:
    game:pause          - 游戏暂停
    game:state_change   - 状态切换
    ui:popup_open       - 弹窗打开
    resource:loaded     - 资源加载完成
    audio:bgm_change    - BGM切换
```

---

## 九、AudioMgr（音频管理）

### 职责

- 背景音乐管理
- 音效播放
- 音量控制
- 静音开关（持久化存储）

### 核心接口

```typescript
class AudioMgr extends Singleton<AudioMgr> {
    playBGM(path: string, loop?: boolean): void;
    stopBGM(): void;
    pauseBGM(): void;
    resumeBGM(): void;
    playSFX(path: string, volume?: number): number;
    stopSFX(audioId: number): void;
    setBGMVolume(volume: number): void;
    setSFXVolume(volume: number): void;
    getBGMVolume(): number;
    getSFXVolume(): number;
    setBGMMute(mute: boolean): void;
    setSFXMute(mute: boolean): void;
    isBGMMute(): boolean;
    isSFXMute(): boolean;
    preload(paths: string[]): Promise<void>;
}
```

### 静音状态持久化

- `setBGMMute(mute)` → `StorageMgr.set("audio_bgm_mute", mute)`
- 启动时从 StorageMgr 读取并恢复静音状态

---

## 十、StorageMgr（本地存储）

### 职责

- 封装 localStorage/cc.sys.localStorage
- 简单的键值存储
- 自动序列化/反序列化
- 数据缓存

### 核心接口

```typescript
class StorageMgr extends Singleton<StorageMgr> {
    set<T>(key: string, value: T): void;
    get<T>(key: string, defaultValue?: T): T;
    remove(key: string): void;
    has(key: string): boolean;
    clear(): void;
    keys(): string[];
    setMultiple(data: Record<string, any>): void;
    getMultiple(keys: string[]): Record<string, any>;
}
```

### 预定义存储键

```typescript
const StorageKeys = {
    AUDIO_BGM_MUTE: "audio_bgm_mute",
    AUDIO_SFX_MUTE: "audio_sfx_mute",
    AUDIO_BGM_VOLUME: "audio_bgm_volume",
    AUDIO_SFX_VOLUME: "audio_sfx_volume",
    LANGUAGE: "language",
};
```

---

## 十一、ConfigMgr（配置表管理）

### 职责

- Excel转JSON配置加载
- 配置表缓存
- 配置查询接口
- 预加载支持

### Excel转JSON方案

- 使用社区方案（如 excel2json）或自定义脚本
- 配置表放在 `Config/` 目录下

### 配置表结构约定

```json
// 键值对形式（便于查询）
{
    "items": {
        "1": { "id": 1, "name": "金币", "type": "coin", "value": 100 },
        "2": { "id": 2, "name": "钻石", "type": "diamond", "value": 10 }
    }
}
```

### 核心接口

```typescript
class ConfigMgr extends Singleton<ConfigMgr> {
    load(configName: string, bundle?: string): Promise<any>;
    loadAll(): Promise<void>;
    getTable(configName: string): any;
    get(configName: string, id: number | string): any;
    query(configName: string, predicate: (item: any) => boolean): any[];
    getAll(configName: string): any[];
    isLoaded(configName: string): boolean;
    release(configName: string): void;
}
```

---

## 十二、I18nMgr（多语言预留）

### 职责

- 多语言接口预留
- 当前仅支持中文
- 文本获取接口

### 核心接口

```typescript
enum Language {
    ZH_CN = "zh-CN",
    ZH_TW = "zh-TW",
    EN = "en",
}

class I18nMgr extends Singleton<I18nMgr> {
    language: Language;

    init(): void;
    setLanguage(lang: Language): void;  // 预留，暂不实现
    t(key: string, params?: Record<string, any>): string;
    getImage(path: string): string;     // 预留
    getAudio(path: string): string;     // 预留
}
```

### 语言包结构

```
Config/i18n/
├── zh-CN.json        # 简体中文（当前）
├── zh-TW.json        # 繁体中文（预留）
└── en.json           # 英语（预留）

// zh-CN.json
{
    "ui": {
        "start_game": "开始游戏",
        "welcome": "欢迎，{name}"
    },
    "game": {
        "score": "得分：{score}"
    }
}
```

---

## 十三、Base基类与工具类

### Singleton（单例基类）

```typescript
class Singleton<T> {
    protected static _instances: Map<any, any> = new Map();

    static instance<T>(this: { new(): T }): T;
    static destroy<T>(this: { new(): T }): void;
}
```

### UIBase（UI面板基类）

```typescript
class UIBase extends cc.Component {
    layer: UILayer = UILayer.Main;
    uiName: string = "";

    onOpen(data?: any): void;
    onClose(): void;
    async playOpenAnim(): Promise<void>;
    async playCloseAnim(): Promise<void>;
    close(): void;
}
```

### PanelBase（弹窗基类）

```typescript
class PanelBase extends UIBase {
    layer = UILayer.Popup;
    showMask: boolean = true;
    closeOnClickMask: boolean = true;
    maskNode: cc.Node = null;

    // 默认淡入/淡出动画
    async playOpenAnim(): Promise<void>;
    async playCloseAnim(): Promise<void>;
}
```

### StateMachine（状态机）

```typescript
interface State {
    name: string;
    onEnter?(from: string): void;
    onExit?(to: string): void;
    onUpdate?(dt: number): void;
}

class StateMachine {
    currentState: State = null;
    states: Map<string, State> = new Map();

    register(state: State): void;
    change(name: string): void;
    update(dt: number): void;
    is(name: string): boolean;
}
```

### Logger（日志封装）

```typescript
enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3,
}

class Logger extends Singleton<Logger> {
    level: LogLevel = LogLevel.Debug;
    enableConsole: boolean = true;

    debug(tag: string, message: string, ...args: any[]): void;
    info(tag: string, message: string, ...args: any[]): void;
    warn(tag: string, message: string, ...args: any[]): void;
    error(tag: string, message: string, ...args: any[]): void;
    dev(tag: string, message: string, ...args: any[]): void;
}
```

---

## 十四、实现文件清单

| 文件路径 | 说明 |
|---------|-----|
| `Script/Main/Game.ts` | 游戏启动入口脚本 |
| `Script/Core/Base/Singleton.ts` | 单例基类 |
| `Script/Core/Base/UIBase.ts` | UI面板基类 |
| `Script/Core/Base/PanelBase.ts` | 弹窗基类 |
| `Script/Core/Manager/GameManager.ts` | 游戏管理器 |
| `Script/Core/Manager/UIManager.ts` | UI管理器 |
| `Script/Core/Manager/ResourceManager.ts` | 资源管理器 |
| `Script/Core/Manager/PoolManager.ts` | 对象池管理器 |
| `Script/Core/Manager/TimerManager.ts` | 定时器管理器 |
| `Script/Core/Manager/EventCenter.ts` | 事件中心 |
| `Script/Core/Manager/AudioMgr.ts` | 音频管理器 |
| `Script/Core/Manager/StorageMgr.ts` | 存储管理器 |
| `Script/Core/Manager/ConfigMgr.ts` | 配置管理器 |
| `Script/Core/Manager/I18nMgr.ts` | 多语言管理器 |
| `Script/Core/Pool/NodePool.ts` | 对象池实现 |
| `Script/Core/State/StateMachine.ts` | 状态机实现 |
| `Script/Core/State/GameState.ts` | 游戏状态定义 |
| `Script/Core/Utils/Logger.ts` | 日志工具 |
| `Script/Core/Utils/TimeUtils.ts` | 时间工具 |
| `Config/i18n/zh-CN.json` | 中文语言包 |
| `Scenes/Launch.scene` | 启动场景 |

---

## 十五、Excel转JSON工具

### 转换脚本（Node.js）

独立工具脚本，将 Excel 配置表转换为 JSON：

```javascript
// tools/excel2json.js
// 输入：Excel/*.xlsx
// 输出：Config/*.json
// 功能：读取 Excel，转换为 JSON，支持多 Sheet
```

### 使用方式

```bash
# 安装依赖
npm install xlsx

# 执行转换
node tools/excel2json.js
```

### Excel 配表规范

- 第一行为字段名
- 第二行为字段类型注释（可选）
- 后续行为数据
- 文件名对应 JSON 文件名

---

## 十六、后续扩展预留

以下功能已预留接口，后续可扩展：

1. **多语言**：I18nMgr 已预留切换接口和语言包结构
2. **网络支持**：可新增 NetworkManager 模块
3. **更复杂存储**：StorageMgr 可扩展加密、多存档位
4. **引导系统**：可新增 GuideManager 模块
5. **成就系统**：可新增 AchievementManager 模块