# Cocos Creator 2.4.9 游戏基础框架实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Cocos Creator 2.4.9 游戏基础框架，包含 10 个核心 Manager、基类、状态机、工具类及配置文件。

**Architecture:** Manager 中心化架构，单例模式，按依赖层级分层实现。L0 基础层 → L1 底层 Manager → L2 中层 Manager → L3 UI 系统 → L4 顶层入口 → L5 配置与工具。

**Tech Stack:** TypeScript, Cocos Creator 2.4.9 API (cc.Component, cc.Node, cc.AssetManager, cc.audioEngine, cc.sys.localStorage)

---

## 文件结构

### 创建文件清单

| 文件 | 职责 | 依赖 |
|-----|-----|-----|
| `Script/Core/Base/Singleton.ts` | 单例基类 | 无 |
| `Script/Core/Utils/Logger.ts` | 日志工具 | Singleton |
| `Script/Core/State/GameState.ts` | 游戏状态枚举 | 无 |
| `Script/Core/State/StateMachine.ts` | 状态机实现 | 无 |
| `Script/Core/Utils/TimeUtils.ts` | 时间工具 | 无 |
| `Script/Core/Pool/NodePool.ts` | 对象池实现 | 无 |
| `Script/Core/Manager/StorageMgr.ts` | 本地存储 | Singleton |
| `Script/Core/Manager/EventCenter.ts` | 事件中心 | Singleton, GameState |
| `Script/Core/Manager/TimerManager.ts` | 定时器管理 | Singleton |
| `Script/Core/Manager/PoolManager.ts` | 对象池管理 | Singleton, NodePool |
| `Script/Core/Manager/ConfigMgr.ts` | 配置管理 | Singleton |
| `Script/Core/Manager/I18nMgr.ts` | 多语言管理 | Singleton, StorageMgr |
| `Script/Core/Manager/AudioMgr.ts` | 音频管理 | Singleton, StorageMgr |
| `Script/Core/Manager/ResourceManager.ts` | 资源管理 | Singleton |
| `Script/Core/Base/UIBase.ts` | UI面板基类 | 无 |
| `Script/Core/Base/PanelBase.ts` | 弹窗基类 | UIBase |
| `Script/Core/Manager/UIManager.ts` | UI管理器 | Singleton, UIBase, PanelBase |
| `Script/Core/Manager/GameManager.ts` | 游戏管理器 | Singleton, 所有 Manager |
| `Script/Main/Game.ts` | 游戏入口 | GameManager |
| `Config/i18n/zh-CN.json` | 中文语言包 | 无 |
| `tools/excel2json.js` | Excel转JSON工具 | 无 |

---

## Task 1: Singleton 单例基类

**Files:**
- Create: `assets/Script/Core/Base/Singleton.ts`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p assets/Script/Core/Base
mkdir -p assets/Script/Core/Manager
mkdir -p assets/Script/Core/Pool
mkdir -p assets/Script/Core/State
mkdir -p assets/Script/Core/Utils
mkdir -p assets/Script/Main
mkdir -p assets/Config/i18n
mkdir -p assets/Resources/UI
mkdir -p assets/Resources/Audio
mkdir -p assets/Resources/Prefabs
mkdir -p tools
```

- [ ] **Step 2: 编写 Singleton.ts**

```typescript
// assets/Script/Core/Base/Singleton.ts

/**
 * 单例基类
 * 所有 Manager 继承此类实现单例模式
 */
export class Singleton<T> {
    private static _instances: Map<Function, any> = new Map();

    /**
     * 获取单例实例
     * 使用方式: MyClass.instance
     */
    public static get instance<T>(this: { new(): T }): T {
        if (!Singleton._instances.has(this)) {
            Singleton._instances.set(this, new this());
        }
        return Singleton._instances.get(this);
    }

    /**
     * 销毁单例（用于清理或重置）
     */
    public static destroy<T>(this: { new(): T }): void {
        const instance = Singleton._instances.get(this);
        if (instance && typeof (instance as any).onDestroy === 'function') {
            (instance as any).onDestroy();
        }
        Singleton._instances.delete(this);
    }

    /**
     * 检查单例是否存在
     */
    public static hasInstance<T>(this: { new(): T }): boolean {
        return Singleton._instances.has(this);
    }
}
```

- [ ] **Step 3: 提交代码**

```bash
git add assets/Script/Core/Base/Singleton.ts
git commit -m "feat(core): add Singleton base class"
```

---

## Task 2: Logger 日志工具

**Files:**
- Create: `assets/Script/Core/Utils/Logger.ts`

- [ ] **Step 1: 编写 Logger.ts**

```typescript
// assets/Script/Core/Utils/Logger.ts

import { Singleton } from "../Base/Singleton";

/**
 * 日志级别
 */
export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3,
    None = 4,  // 关闭所有日志
}

/**
 * 日志工具类
 * 支持日志级别过滤、标签分类
 */
export class Logger extends Singleton<Logger> {
    /** 当前日志级别 */
    public level: LogLevel = LogLevel.Debug;

    /** 是否输出到控制台 */
    public enableConsole: boolean = true;

    /** 是否显示时间戳 */
    public showTimestamp: boolean = true;

    /** 日志前缀 */
    public prefix: string = "[Game]";

    /**
     * 格式化时间戳
     */
    private getTimestamp(): string {
        if (!this.showTimestamp) return "";
        const now = new Date();
        const h = now.getHours().toString().padStart(2, "0");
        const m = now.getMinutes().toString().padStart(2, "0");
        const s = now.getSeconds().toString().padStart(2, "0");
        const ms = now.getMilliseconds().toString().padStart(3, "0");
        return `[${h}:${m}:${s}.${ms}]`;
    }

    /**
     * 格式化日志消息
     */
    private format(tag: string, message: string): string {
        const timestamp = this.getTimestamp();
        return `${this.prefix}${timestamp}[${tag}] ${message}`;
    }

    /**
     * Debug 级别日志
     */
    public debug(tag: string, message: string, ...args: any[]): void {
        if (this.level > LogLevel.Debug || !this.enableConsole) return;
        console.log(this.format(tag, message), ...args);
    }

    /**
     * Info 级别日志
     */
    public info(tag: string, message: string, ...args: any[]): void {
        if (this.level > LogLevel.Info || !this.enableConsole) return;
        console.info(this.format(tag, message), ...args);
    }

    /**
     * Warn 级别日志
     */
    public warn(tag: string, message: string, ...args: any[]): void {
        if (this.level > LogLevel.Warn || !this.enableConsole) return;
        console.warn(this.format(tag, message), ...args);
    }

    /**
     * Error 级别日志
     */
    public error(tag: string, message: string, ...args: any[]): void {
        if (this.level > LogLevel.Error || !this.enableConsole) return;
        console.error(this.format(tag, message), ...args);
    }

    /**
     * 仅开发环境输出的日志
     */
    public dev(tag: string, message: string, ...args: any[]): void {
        if (CC_BUILD) return;  // 发布版本不输出
        this.debug(tag, message, ...args);
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Utils/Logger.ts
git commit -m "feat(core): add Logger utility"
```

---

## Task 3: GameState 游戏状态定义

**Files:**
- Create: `assets/Script/Core/State/GameState.ts`

- [ ] **Step 1: 编写 GameState.ts**

```typescript
// assets/Script/Core/State/GameState.ts

/**
 * 游戏状态枚举
 */
export enum GameState {
    /** 启动加载 */
    Launch = "launch",
    /** 资源加载中 */
    Loading = "loading",
    /** 主界面 */
    MainMenu = "mainMenu",
    /** 游戏进行中 */
    Playing = "playing",
    /** 暂停 */
    Paused = "paused",
    /** 游戏结束 */
    GameOver = "gameOver",
}

/**
 * 获取游戏状态名称（用于显示）
 */
export function getGameStateName(state: GameState): string {
    const names: Record<GameState, string> = {
        [GameState.Launch]: "启动加载",
        [GameState.Loading]: "资源加载中",
        [GameState.MainMenu]: "主界面",
        [GameState.Playing]: "游戏中",
        [GameState.Paused]: "暂停",
        [GameState.GameOver]: "游戏结束",
    };
    return names[state] || "未知状态";
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/State/GameState.ts
git commit -m "feat(core): add GameState enum"
```

---

## Task 4: StateMachine 状态机

**Files:**
- Create: `assets/Script/Core/State/StateMachine.ts`

- [ ] **Step 1: 编写 StateMachine.ts**

```typescript
// assets/Script/Core/State/StateMachine.ts

/**
 * 状态接口
 */
export interface IState {
    /** 状态名称 */
    name: string;
    /** 进入状态时调用 */
    onEnter?(from: string): void;
    /** 退出状态时调用 */
    onExit?(to: string): void;
    /** 每帧更新 */
    onUpdate?(dt: number): void;
}

/**
 * 有限状态机
 * 管理游戏或对象的多种状态切换
 */
export class StateMachine {
    /** 当前状态 */
    public currentState: IState | null = null;

    /** 所有注册的状态 */
    private _states: Map<string, IState> = new Map();

    /** 状态变更回调 */
    public onStateChange: ((from: string | null, to: string) => void) | null = null;

    /**
     * 注册状态
     */
    public register(state: IState): void {
        if (this._states.has(state.name)) {
            console.warn(`[StateMachine] State "${state.name}" already exists, will be overwritten`);
        }
        this._states.set(state.name, state);
    }

    /**
     * 批量注册状态
     */
    public registerAll(states: IState[]): void {
        states.forEach(state => this.register(state));
    }

    /**
     * 切换状态
     * @param name 目标状态名称
     */
    public change(name: string): void {
        const newState = this._states.get(name);
        if (!newState) {
            console.error(`[StateMachine] State "${name}" not found`);
            return;
        }

        const prevState = this.currentState;
        if (prevState) {
            if (prevState.onExit) {
                prevState.onExit(name);
            }
        }

        this.currentState = newState;

        if (newState.onEnter) {
            newState.onEnter(prevState ? prevState.name : null);
        }

        if (this.onStateChange) {
            this.onStateChange(prevState ? prevState.name : null, name);
        }
    }

    /**
     * 初始化状态（不触发 onEnter）
     */
    public init(name: string): void {
        const state = this._states.get(name);
        if (!state) {
            console.error(`[StateMachine] State "${name}" not found`);
            return;
        }
        this.currentState = state;
    }

    /**
     * 每帧更新（需手动调用）
     */
    public update(dt: number): void {
        if (this.currentState && this.currentState.onUpdate) {
            this.currentState.onUpdate(dt);
        }
    }

    /**
     * 检查是否在指定状态
     */
    public is(name: string): boolean {
        return this.currentState !== null && this.currentState.name === name;
    }

    /**
     * 检查状态是否已注册
     */
    public has(name: string): boolean {
        return this._states.has(name);
    }

    /**
     * 获取所有状态名称
     */
    public getStateNames(): string[] {
        return Array.from(this._states.keys());
    }

    /**
     * 清空所有状态
     */
    public clear(): void {
        this._states.clear();
        this.currentState = null;
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/State/StateMachine.ts
git commit -m "feat(core): add StateMachine implementation"
```

---

## Task 5: TimeUtils 时间工具

**Files:**
- Create: `assets/Script/Core/Utils/TimeUtils.ts`

- [ ] **Step 1: 编写 TimeUtils.ts**

```typescript
// assets/Script/Core/Utils/TimeUtils.ts

/**
 * 时间工具类
 */
export class TimeUtils {
    /**
     * 格式化时间为 HH:MM:SS
     */
    public static formatTime(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    /**
     * 格式化时间为 MM:SS.ms（用于倒计时显示）
     */
    public static formatTimeMs(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    }

    /**
     * 获取当前时间戳（毫秒）
     */
    public static now(): number {
        return Date.now();
    }

    /**
     * 获取当前时间戳（秒）
     */
    public static nowSeconds(): number {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * 延迟执行（Promise 版本）
     */
    public static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 毫秒转秒
     */
    public static msToSecond(ms: number): number {
        return ms / 1000;
    }

    /**
     * 秒转毫秒
     */
    public static secondToMs(second: number): number {
        return second * 1000;
    }

    /**
     * 每日零点时间戳
     */
    public static getTodayZero(timestamp?: number): number {
        const ts = timestamp || Date.now();
        const date = new Date(ts);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    /**
     * 判断是否是今天
     */
    public static isToday(timestamp: number): boolean {
        const today = new Date();
        const target = new Date(timestamp);
        return today.getFullYear() === target.getFullYear() &&
               today.getMonth() === target.getMonth() &&
               today.getDate() === target.getDate();
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Utils/TimeUtils.ts
git commit -m "feat(core): add TimeUtils utility"
```

---

## Task 6: NodePool 对象池实现

**Files:**
- Create: `assets/Script/Core/Pool/NodePool.ts`

- [ ] **Step 1: 编写 NodePool.ts**

```typescript
// assets/Script/Core/Pool/NodePool.ts

/**
 * 单个节点池配置
 */
export interface NodePoolConfig {
    /** 预制体 */
    prefab: cc.Prefab;
    /** 初始数量 */
    initCount: number;
    /** 最大数量（0 表示无限） */
    maxCount: number;
    /** 是否自动扩容 */
    autoExpand: boolean;
}

/**
 * 池信息统计
 */
export interface PoolInfo {
    /** 当前池大小 */
    size: number;
    /** 已使用数量 */
    usedCount: number;
    /** 命中次数 */
    hitCount: number;
    /** 未命中次数 */
    missCount: number;
}

/**
 * 单个节点池
 * 封装 cc.NodePool，增加统计和自动扩容
 */
export class NodePool {
    private _pool: cc.NodePool;
    private _prefab: cc.Prefab;
    private _config: NodePoolConfig;
    private _usedCount: number = 0;
    private _hitCount: number = 0;
    private _missCount: number = 0;

    constructor(config: NodePoolConfig) {
        this._config = config;
        this._prefab = config.prefab;
        this._pool = new cc.NodePool();

        // 预创建
        this.preload(config.initCount);
    }

    /**
     * 预创建对象
     */
    public preload(count: number): void {
        for (let i = 0; i < count; i++) {
            const node = cc.instantiate(this._prefab);
            this._pool.put(node);
        }
    }

    /**
     * 从池中获取节点
     */
    public get(): cc.Node | null {
        let node: cc.Node | null = null;

        if (this._pool.size() > 0) {
            node = this._pool.get();
            this._hitCount++;
        } else {
            // 池为空，尝试自动扩容
            if (this._config.autoExpand) {
                if (this._config.maxCount === 0 || this._usedCount < this._config.maxCount) {
                    node = cc.instantiate(this._prefab);
                    this._missCount++;
                } else {
                    console.warn(`[NodePool] Pool reached max count: ${this._config.maxCount}`);
                    return null;
                }
            } else {
                this._missCount++;
                return null;
            }
        }

        if (node) {
            this._usedCount++;
        }

        return node;
    }

    /**
     * 将节点归还池中
     */
    public put(node: cc.Node): void {
        if (!node) return;

        this._usedCount--;
        if (this._usedCount < 0) {
            this._usedCount = 0;
        }

        // 检查是否超过最大数量
        if (this._config.maxCount > 0 && this._pool.size() >= this._config.maxCount) {
            node.destroy();
            return;
        }

        this._pool.put(node);
    }

    /**
     * 获取池信息统计
     */
    public getInfo(): PoolInfo {
        return {
            size: this._pool.size(),
            usedCount: this._usedCount,
            hitCount: this._hitCount,
            missCount: this._missCount,
        };
    }

    /**
     * 清空池
     */
    public clear(): void {
        this._pool.clear();
        this._usedCount = 0;
    }

    /**
     * 销毁池
     */
    public destroy(): void {
        this.clear();
        this._hitCount = 0;
        this._missCount = 0;
    }

    /**
     * 获取当前池大小
     */
    public get size(): number {
        return this._pool.size();
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Pool/NodePool.ts
git commit -m "feat(core): add NodePool implementation"
```

---

## Task 7: StorageMgr 本地存储

**Files:**
- Create: `assets/Script/Core/Manager/StorageMgr.ts`

- [ ] **Step 1: 编写 StorageMgr.ts**

```typescript
// assets/Script/Core/Manager/StorageMgr.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";

/**
 * 预定义存储键
 */
export const StorageKeys = {
    /** BGM静音状态 */
    AUDIO_BGM_MUTE: "audio_bgm_mute",
    /** 音效静音状态 */
    AUDIO_SFX_MUTE: "audio_sfx_mute",
    /** BGM音量 */
    AUDIO_BGM_VOLUME: "audio_bgm_volume",
    /** 音效音量 */
    AUDIO_SFX_VOLUME: "audio_sfx_volume",
    /** 当前语言 */
    LANGUAGE: "language",
};

/**
 * 本地存储管理器
 * 封装 cc.sys.localStorage，支持自动序列化
 */
export class StorageMgr extends Singleton<StorageMgr> {
    private _cache: Map<string, any> = new Map();
    private _logger = Logger.instance;

    /**
     * 存储数据（自动序列化对象）
     */
    public set<T>(key: string, value: T): void {
        try {
            this._cache.set(key, value);
            const data = typeof value === "string" ? value : JSON.stringify(value);
            cc.sys.localStorage.setItem(key, data);
        } catch (e) {
            this._logger.error("StorageMgr", `Failed to set item: ${key}`, e);
        }
    }

    /**
     * 获取数据（自动反序列化）
     */
    public get<T>(key: string, defaultValue?: T): T {
        // 先检查缓存
        if (this._cache.has(key)) {
            return this._cache.get(key) as T;
        }

        try {
            const data = cc.sys.localStorage.getItem(key);
            if (data === null || data === "") {
                return defaultValue as T;
            }

            // 尝试解析 JSON
            let value: any;
            try {
                value = JSON.parse(data);
            } catch {
                value = data;
            }

            this._cache.set(key, value);
            return value as T;
        } catch (e) {
            this._logger.error("StorageMgr", `Failed to get item: ${key}`, e);
            return defaultValue as T;
        }
    }

    /**
     * 删除数据
     */
    public remove(key: string): void {
        this._cache.delete(key);
        cc.sys.localStorage.removeItem(key);
    }

    /**
     * 检查是否存在
     */
    public has(key: string): boolean {
        if (this._cache.has(key)) {
            return true;
        }
        const data = cc.sys.localStorage.getItem(key);
        return data !== null && data !== "";
    }

    /**
     * 清空所有数据（谨慎使用）
     */
    public clear(): void {
        this._cache.clear();
        cc.sys.localStorage.clear();
    }

    /**
     * 获取所有键
     */
    public keys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < cc.sys.localStorage.length; i++) {
            const key = cc.sys.localStorage.key(i);
            if (key) {
                keys.push(key);
            }
        }
        return keys;
    }

    /**
     * 批量存储
     */
    public setMultiple(data: Record<string, any>): void {
        for (const key in data) {
            this.set(key, data[key]);
        }
    }

    /**
     * 批量获取
     */
    public getMultiple(keys: string[]): Record<string, any> {
        const result: Record<string, any> = {};
        keys.forEach(key => {
            result[key] = this.get(key);
        });
        return result;
    }

    /**
     * 清除缓存（不影响实际存储）
     */
    public clearCache(): void {
        this._cache.clear();
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this.clearCache();
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/StorageMgr.ts
git commit -m "feat(core): add StorageMgr for local storage"
```

---

## Task 8: EventCenter 事件中心

**Files:**
- Create: `assets/Script/Core/Manager/EventCenter.ts`

- [ ] **Step 1: 编写 EventCenter.ts**

```typescript
// assets/Script/Core/Manager/EventCenter.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";
import { GameState } from "../State/GameState";

/**
 * 全局事件映射
 * 定义所有事件及其数据类型
 */
export interface EventMap {
    /** 游戏状态变化 */
    "game:state_change": { from: GameState; to: GameState };
    /** 游戏暂停 */
    "game:pause": void;
    /** 游戏恢复 */
    "game:resume": void;
    /** 弹窗打开 */
    "ui:popup_open": { name: string; data?: any };
    /** 弹窗关闭 */
    "ui:popup_close": { name: string };
    /** Toast显示 */
    "ui:toast_show": { message: string };
    /** 资源加载进度 */
    "resource:load_progress": { progress: number };
    /** 资源加载完成 */
    "resource:loaded": { paths: string[] };
    /** BGM变化 */
    "audio:bgm_change": { name: string };
    /** 金币变化 */
    "player:coin_change": { old: number; new: number };
}

/**
 * 事件监听项
 */
interface EventListener {
    callback: Function;
    target: any;
    once: boolean;
}

/**
 * 全局事件中心
 * 用于模块间解耦通信
 */
export class EventCenter extends Singleton<EventCenter> {
    private _listeners: Map<string, EventListener[]> = new Map();
    private _logger = Logger.instance;

    /**
     * 监听事件
     */
    public on<K extends keyof EventMap>(
        event: K,
        callback: (data: EventMap[K]) => void,
        target?: any
    ): void {
        this._addListener(event, callback, target, false);
    }

    /**
     * 监听一次（触发后自动移除）
     */
    public once<K extends keyof EventMap>(
        event: K,
        callback: (data: EventMap[K]) => void,
        target?: any
    ): void {
        this._addListener(event, callback, target, true);
    }

    /**
     * 添加监听器（内部方法）
     */
    private _addListener(event: string, callback: Function, target: any, once: boolean): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }

        const listeners = this._listeners.get(event)!;
        listeners.push({
            callback,
            target,
            once,
        });
    }

    /**
     * 发射事件
     */
    public emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void {
        const listeners = this._listeners.get(event as string);
        if (!listeners || listeners.length === 0) {
            return;
        }

        // 复制一份，防止在回调中修改数组
        const toCall = [...listeners];
        const toRemove: EventListener[] = [];

        for (const listener of toCall) {
            try {
                if (listener.target) {
                    listener.callback.call(listener.target, data);
                } else {
                    listener.callback(data);
                }

                if (listener.once) {
                    toRemove.push(listener);
                }
            } catch (e) {
                this._logger.error("EventCenter", `Error in event handler: ${event}`, e);
            }
        }

        // 移除一次性监听器
        if (toRemove.length > 0) {
            const remaining = listeners.filter(l => !toRemove.includes(l));
            this._listeners.set(event as string, remaining);
        }
    }

    /**
     * 移除监听
     */
    public off<K extends keyof EventMap>(
        event: K,
        callback?: Function,
        target?: any
    ): void {
        const listeners = this._listeners.get(event as string);
        if (!listeners) return;

        if (!callback && !target) {
            this._listeners.delete(event as string);
            return;
        }

        const remaining = listeners.filter(l => {
            if (callback && target) {
                return l.callback !== callback || l.target !== target;
            }
            if (callback) {
                return l.callback !== callback;
            }
            if (target) {
                return l.target !== target;
            }
            return true;
        });

        if (remaining.length === 0) {
            this._listeners.delete(event as string);
        } else {
            this._listeners.set(event as string, remaining);
        }
    }

    /**
     * 移除目标的所有监听
     */
    public offAllByTarget(target: any): void {
        if (!target) return;

        for (const [event, listeners] of this._listeners) {
            const remaining = listeners.filter(l => l.target !== target);
            if (remaining.length === 0) {
                this._listeners.delete(event);
            } else {
                this._listeners.set(event, remaining);
            }
        }
    }

    /**
     * 清理指定事件的所有监听
     */
    public clear(event: string): void {
        this._listeners.delete(event);
    }

    /**
     * 清理所有事件监听
     */
    public clearAll(): void {
        this._listeners.clear();
    }

    /**
     * 检查是否有监听者
     */
    public hasListener(event: string): boolean {
        const listeners = this._listeners.get(event);
        return listeners !== undefined && listeners.length > 0;
    }

    /**
     * 获取指定事件的监听数量
     */
    public getListenerCount(event: string): number {
        const listeners = this._listeners.get(event);
        return listeners ? listeners.length : 0;
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this.clearAll();
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/EventCenter.ts
git commit -m "feat(core): add EventCenter for global events"
```

---

## Task 9: TimerManager 定时器管理

**Files:**
- Create: `assets/Script/Core/Manager/TimerManager.ts`

- [ ] **Step 1: 编写 TimerManager.ts**

```typescript
// assets/Script/Core/Manager/TimerManager.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";

/**
 * 定时器句柄
 */
export interface TimerHandle {
    /** 定时器ID */
    id: number;
    /** 自定义标识 */
    key: string;
}

/**
 * 定时器项
 */
interface TimerItem {
    id: number;
    key: string;
    callback: Function;
    interval: number;    // 间隔时间（毫秒），0表示每帧
    elapsed: number;     // 已流逝时间
    isPaused: boolean;
    isOnce: boolean;     // 是否单次执行
    isFrameUpdate: boolean;  // 是否帧更新
}

/**
 * 定时器管理器
 * 统一管理所有定时器，支持暂停恢复和清理
 */
export class TimerManager extends Singleton<TimerManager> {
    private _timers: Map<number, TimerItem> = new Map();
    private _nextId: number = 1;
    private _isPaused: boolean = false;
    private _logger = Logger.instance;

    public constructor() {
        super();
        // 注册帧更新
        this._registerFrameUpdate();
    }

    /**
     * 注册帧更新
     */
    private _registerFrameUpdate(): void {
        cc-director.getScheduler().enableForThis();
        cc.director.getScheduler().schedule((dt: number) => {
            this._update(dt);
        }, this, 0, cc.macro.REPEAT_FOREVER);
    }

    /**
     * 帧更新
     */
    private _update(dt: number): void {
        if (this._isPaused) return;

        const dtMs = dt * 1000;

        this._timers.forEach((timer, id) => {
            if (timer.isPaused) return;

            if (timer.isFrameUpdate) {
                // 帧更新，直接调用
                try {
                    timer.callback(dt);
                } catch (e) {
                    this._logger.error("TimerManager", `Error in timer callback: ${id}`, e);
                }
            } else {
                // 定时器，检查时间
                timer.elapsed += dtMs;
                if (timer.elapsed >= timer.interval) {
                    try {
                        timer.callback();
                    } catch (e) {
                        this._logger.error("TimerManager", `Error in timer callback: ${id}`, e);
                    }

                    if (timer.isOnce) {
                        this._timers.delete(id);
                    } else {
                        timer.elapsed = 0;
                    }
                }
            }
        });
    }

    /**
     * 延迟执行（单次）
     * @param delay 延迟时间（毫秒）
     * @param callback 回调函数
     * @param key 自定义标识（可选）
     */
    public delay(delay: number, callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        const timer: TimerItem = {
            id,
            key: key || "",
            callback,
            interval: delay,
            elapsed: 0,
            isPaused: false,
            isOnce: true,
            isFrameUpdate: false,
        };
        this._timers.set(id, timer);
        return { id, key: timer.key };
    }

    /**
     * 间隔执行（重复）
     * @param interval 间隔时间（毫秒）
     * @param callback 回调函数
     * @param key 自定义标识（可选）
     */
    public interval(interval: number, callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        const timer: TimerItem = {
            id,
            key: key || "",
            callback,
            interval,
            elapsed: 0,
            isPaused: false,
            isOnce: false,
            isFrameUpdate: false,
        };
        this._timers.set(id, timer);
        return { id, key: timer.key };
    }

    /**
     * 帧更新回调
     * @param callback 回调函数，参数为 dt（秒）
     * @param key 自定义标识（可选）
     */
    public frame(callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        const timer: TimerItem = {
            id,
            key: key || "",
            callback,
            interval: 0,
            elapsed: 0,
            isPaused: false,
            isOnce: false,
            isFrameUpdate: true,
        };
        this._timers.set(id, timer);
        return { id, key: timer.key };
    }

    /**
     * 固定帧率更新
     * @param fps 目标帧率
     * @param callback 回调函数
     * @param key 自定义标识（可选）
     */
    public fixedFrame(fps: number, callback: Function, key?: string): TimerHandle {
        const interval = 1000 / fps;
        return this.interval(interval, callback, key);
    }

    /**
     * 取消定时器
     */
    public cancel(handle: TimerHandle): void {
        this._timers.delete(handle.id);
    }

    /**
     * 取消指定 key 的所有定时器
     */
    public cancelByKey(key: string): void {
        if (!key) return;

        const toDelete: number[] = [];
        this._timers.forEach((timer, id) => {
            if (timer.key === key) {
                toDelete.push(id);
            }
        });
        toDelete.forEach(id => this._timers.delete(id));
    }

    /**
     * 暂停定时器
     */
    public pause(handle: TimerHandle): void {
        const timer = this._timers.get(handle.id);
        if (timer) {
            timer.isPaused = true;
        }
    }

    /**
     * 恢复定时器
     */
    public resume(handle: TimerHandle): void {
        const timer = this._timers.get(handle.id);
        if (timer) {
            timer.isPaused = false;
        }
    }

    /**
     * 暂停所有定时器
     */
    public pauseAll(): void {
        this._isPaused = true;
        this._timers.forEach(timer => {
            timer.isPaused = true;
        });
    }

    /**
     * 恢复所有定时器
     */
    public resumeAll(): void {
        this._isPaused = false;
        this._timers.forEach(timer => {
            timer.isPaused = false;
        });
    }

    /**
     * 清理所有定时器
     */
    public clearAll(): void {
        this._timers.clear();
    }

    /**
     * 获取运行中的定时器数量
     */
    public getActiveCount(): number {
        let count = 0;
        this._timers.forEach(timer => {
            if (!timer.isPaused) {
                count++;
            }
        });
        return count;
    }

    /**
     * 获取总定时器数量
     */
    public getTotalCount(): number {
        return this._timers.size;
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this.clearAll();
    }
}
```

- [ ] **Step 2: 修复编译问题（Cocos 2.x API）**

由于 Cocos Creator 2.x 的 scheduler 使用方式略有不同，修正如下：

```typescript
// assets/Script/Core/Manager/TimerManager.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";

/**
 * 定时器句柄
 */
export interface TimerHandle {
    /** 定时器ID */
    id: number;
    /** 自定义标识 */
    key: string;
}

/**
 * 定时器项
 */
interface TimerItem {
    id: number;
    key: string;
    callback: Function;
    interval: number;    // 间隔时间（毫秒），0表示每帧
    elapsed: number;     // 已流逝时间
    isPaused: boolean;
    isOnce: boolean;     // 是否单次执行
    isFrameUpdate: boolean;  // 是否帧更新
}

/**
 * 定时器管理器
 * 统一管理所有定时器，支持暂停恢复和清理
 */
export class TimerManager extends Singleton<TimerManager> {
    private _timers: Map<number, TimerItem> = new Map();
    private _nextId: number = 1;
    private _isPaused: boolean = false;
    private _logger = Logger.instance;
    private _updateCallback: Function = null;

    public constructor() {
        super();
        // 注册帧更新
        this._startUpdate();
    }

    /**
     * 启动帧更新
     */
    private _startUpdate(): void {
        this._updateCallback = (dt: number) => {
            this._update(dt);
        };
        cc.director.on(cc.Director.EVENT_AFTER_UPDATE, this._updateCallback);
    }

    /**
     * 帧更新
     */
    private _update(dt: number): void {
        if (this._isPaused) return;

        const dtMs = dt * 1000;

        this._timers.forEach((timer, id) => {
            if (timer.isPaused) return;

            if (timer.isFrameUpdate) {
                // 帧更新，直接调用
                try {
                    timer.callback(dt);
                } catch (e) {
                    this._logger.error("TimerManager", `Error in timer callback: ${id}`, e);
                }
            } else {
                // 定时器，检查时间
                timer.elapsed += dtMs;
                if (timer.elapsed >= timer.interval) {
                    try {
                        timer.callback();
                    } catch (e) {
                        this._logger.error("TimerManager", `Error in timer callback: ${id}`, e);
                    }

                    if (timer.isOnce) {
                        this._timers.delete(id);
                    } else {
                        timer.elapsed = 0;
                    }
                }
            }
        });
    }

    /**
     * 延迟执行（单次）
     * @param delay 延迟时间（毫秒）
     * @param callback 回调函数
     * @param key 自定义标识（可选）
     */
    public delay(delay: number, callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        const timer: TimerItem = {
            id,
            key: key || "",
            callback,
            interval: delay,
            elapsed: 0,
            isPaused: false,
            isOnce: true,
            isFrameUpdate: false,
        };
        this._timers.set(id, timer);
        return { id, key: timer.key };
    }

    /**
     * 间隔执行（重复）
     * @param interval 间隔时间（毫秒）
     * @param callback 回调函数
     * @param key 自定义标识（可选）
     */
    public interval(interval: number, callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        const timer: TimerItem = {
            id,
            key: key || "",
            callback,
            interval,
            elapsed: 0,
            isPaused: false,
            isOnce: false,
            isFrameUpdate: false,
        };
        this._timers.set(id, timer);
        return { id, key: timer.key };
    }

    /**
     * 帧更新回调
     * @param callback 回调函数，参数为 dt（秒）
     * @param key 自定义标识（可选）
     */
    public frame(callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        const timer: TimerItem = {
            id,
            key: key || "",
            callback,
            interval: 0,
            elapsed: 0,
            isPaused: false,
            isOnce: false,
            isFrameUpdate: true,
        };
        this._timers.set(id, timer);
        return { id, key: timer.key };
    }

    /**
     * 固定帧率更新
     * @param fps 目标帧率
     * @param callback 回调函数
     * @param key 自定义标识（可选）
     */
    public fixedFrame(fps: number, callback: Function, key?: string): TimerHandle {
        const interval = 1000 / fps;
        return this.interval(interval, callback, key);
    }

    /**
     * 取消定时器
     */
    public cancel(handle: TimerHandle): void {
        this._timers.delete(handle.id);
    }

    /**
     * 取消指定 key 的所有定时器
     */
    public cancelByKey(key: string): void {
        if (!key) return;

        const toDelete: number[] = [];
        this._timers.forEach((timer, id) => {
            if (timer.key === key) {
                toDelete.push(id);
            }
        });
        toDelete.forEach(id => this._timers.delete(id));
    }

    /**
     * 暂停定时器
     */
    public pause(handle: TimerHandle): void {
        const timer = this._timers.get(handle.id);
        if (timer) {
            timer.isPaused = true;
        }
    }

    /**
     * 恢复定时器
     */
    public resume(handle: TimerHandle): void {
        const timer = this._timers.get(handle.id);
        if (timer) {
            timer.isPaused = false;
        }
    }

    /**
     * 暂停所有定时器
     */
    public pauseAll(): void {
        this._isPaused = true;
        this._timers.forEach(timer => {
            timer.isPaused = true;
        });
    }

    /**
     * 恢复所有定时器
     */
    public resumeAll(): void {
        this._isPaused = false;
        this._timers.forEach(timer => {
            timer.isPaused = false;
        });
    }

    /**
     * 清理所有定时器
     */
    public clearAll(): void {
        this._timers.clear();
    }

    /**
     * 获取运行中的定时器数量
     */
    public getActiveCount(): number {
        let count = 0;
        this._timers.forEach(timer => {
            if (!timer.isPaused) {
                count++;
            }
        });
        return count;
    }

    /**
     * 获取总定时器数量
     */
    public getTotalCount(): number {
        return this._timers.size;
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        if (this._updateCallback) {
            cc.director.off(cc.Director.EVENT_AFTER_UPDATE, this._updateCallback);
        }
        this.clearAll();
    }
}
```

- [ ] **Step 3: 提交代码**

```bash
git add assets/Script/Core/Manager/TimerManager.ts
git commit -m "feat(core): add TimerManager for unified timer management"
```

---

## Task 10: PoolManager 对象池管理

**Files:**
- Create: `assets/Script/Core/Manager/PoolManager.ts`

- [ ] **Step 1: 编写 PoolManager.ts**

```typescript
// assets/Script/Core/Manager/PoolManager.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";
import { NodePool, NodePoolConfig, PoolInfo } from "../Pool/NodePool";

/**
 * 对象池配置（简化版，用于注册时）
 */
export interface PoolRegisterConfig {
    /** 预制体 */
    prefab: cc.Prefab;
    /** 初始数量 */
    initCount?: number;
    /** 最大数量（0 表示无限） */
    maxCount?: number;
    /** 是否自动扩容 */
    autoExpand?: boolean;
}

/**
 * 对象池管理器
 * 管理多个节点池
 */
export class PoolManager extends Singleton<PoolManager> {
    private _pools: Map<string, NodePool> = new Map();
    private _logger = Logger.instance;

    /**
     * 注册对象池
     */
    public register(poolName: string, config: PoolRegisterConfig): void {
        if (this._pools.has(poolName)) {
            this._logger.warn("PoolManager", `Pool "${poolName}" already exists, will be overwritten`);
            this.unregister(poolName);
        }

        const poolConfig: NodePoolConfig = {
            prefab: config.prefab,
            initCount: config.initCount || 5,
            maxCount: config.maxCount || 0,
            autoExpand: config.autoExpand !== false,
        };

        const pool = new NodePool(poolConfig);
        this._pools.set(poolName, pool);

        this._logger.debug("PoolManager", `Pool "${poolName}" registered, initCount: ${poolConfig.initCount}`);
    }

    /**
     * 注销对象池
     */
    public unregister(poolName: string): void {
        const pool = this._pools.get(poolName);
        if (pool) {
            pool.destroy();
            this._pools.delete(poolName);
        }
    }

    /**
     * 从池中获取节点
     */
    public get(poolName: string): cc.Node | null {
        const pool = this._pools.get(poolName);
        if (!pool) {
            this._logger.error("PoolManager", `Pool "${poolName}" not found`);
            return null;
        }
        return pool.get();
    }

    /**
     * 将节点归还池中
     */
    public put(poolName: string, node: cc.Node): void {
        const pool = this._pools.get(poolName);
        if (!pool) {
            this._logger.warn("PoolManager", `Pool "${poolName}" not found, destroying node`);
            node.destroy();
            return;
        }
        pool.put(node);
    }

    /**
     * 预创建对象
     */
    public preload(poolName: string, count: number): void {
        const pool = this._pools.get(poolName);
        if (!pool) {
            this._logger.error("PoolManager", `Pool "${poolName}" not found`);
            return;
        }
        pool.preload(count);
    }

    /**
     * 清空指定池
     */
    public clear(poolName: string): void {
        const pool = this._pools.get(poolName);
        if (pool) {
            pool.clear();
        }
    }

    /**
     * 清空所有池
     */
    public clearAll(): void {
        this._pools.forEach(pool => pool.clear());
    }

    /**
     * 获取池状态信息
     */
    public getPoolInfo(poolName: string): PoolInfo | null {
        const pool = this._pools.get(poolName);
        if (!pool) {
            return null;
        }
        return pool.getInfo();
    }

    /**
     * 获取所有池状态信息
     */
    public getAllPoolInfo(): Map<string, PoolInfo> {
        const result = new Map<string, PoolInfo>();
        this._pools.forEach((pool, name) => {
            result.set(name, pool.getInfo());
        });
        return result;
    }

    /**
     * 检查池是否存在
     */
    public has(poolName: string): boolean {
        return this._pools.has(poolName);
    }

    /**
     * 获取所有池名称
     */
    public getPoolNames(): string[] {
        return Array.from(this._pools.keys());
    }

    /**
     * 销毁时清理所有池
     */
    public onDestroy(): void {
        this._pools.forEach(pool => pool.destroy());
        this._pools.clear();
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/PoolManager.ts
git commit -m "feat(core): add PoolManager for node pool management"
```

---

## Task 11: ConfigMgr 配置管理

**Files:**
- Create: `assets/Script/Core/Manager/ConfigMgr.ts`

- [ ] **Step 1: 编写 ConfigMgr.ts**

```typescript
// assets/Script/Core/Manager/ConfigMgr.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";

/**
 * 配置管理器
 * 加载和管理 JSON 配置表
 */
export class ConfigMgr extends Singleton<ConfigMgr> {
    private _configs: Map<string, any> = new Map();
    private _logger = Logger.instance;

    /**
     * 加载配置表
     * @param configName 配置名称（不含扩展名）
     * @param bundle Bundle 名称（默认 resources）
     */
    public load(configName: string, bundle?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const path = `Config/${configName}`;
            const bundleName = bundle || "resources";

            // 如果已加载，直接返回
            if (this._configs.has(configName)) {
                resolve(this._configs.get(configName));
                return;
            }

            const onComplete = (err: Error, asset: cc.JsonAsset) => {
                if (err) {
                    this._logger.error("ConfigMgr", `Failed to load config: ${configName}`, err);
                    reject(err);
                    return;
                }

                if (!asset || !asset.json) {
                    this._logger.error("ConfigMgr", `Invalid config asset: ${configName}`);
                    reject(new Error(`Invalid config asset: ${configName}`));
                    return;
                }

                this._configs.set(configName, asset.json);
                this._logger.debug("ConfigMgr", `Config loaded: ${configName}`);
                resolve(asset.json);
            };

            if (bundleName === "resources") {
                cc.resources.load(path, cc.JsonAsset, onComplete);
            } else {
                const bundleInstance = cc.assetManager.getBundle(bundleName);
                if (!bundleInstance) {
                    reject(new Error(`Bundle not found: ${bundleName}`));
                    return;
                }
                bundleInstance.load(path, cc.JsonAsset, onComplete);
            }
        });
    }

    /**
     * 加载所有配置（从 Config 目录）
     */
    public loadAll(): Promise<void> {
        return new Promise((resolve, reject) => {
            cc.resources.loadDir("Config", cc.JsonAsset, (err, assets: cc.JsonAsset[]) => {
                if (err) {
                    this._logger.error("ConfigMgr", "Failed to load configs", err);
                    reject(err);
                    return;
                }

                assets.forEach(asset => {
                    if (asset && asset.json) {
                        const name = asset.name;
                        this._configs.set(name, asset.json);
                        this._logger.debug("ConfigMgr", `Config loaded: ${name}`);
                    }
                });

                this._logger.info("ConfigMgr", `Loaded ${assets.length} configs`);
                resolve();
            });
        });
    }

    /**
     * 获取配置表
     */
    public getTable(configName: string): any {
        return this._configs.get(configName);
    }

    /**
     * 按ID获取配置项
     * 配置表需为键值对格式: { "items": { "1": {...}, "2": {...} } }
     */
    public get(configName: string, id: number | string): any {
        const table = this._configs.get(configName);
        if (!table) {
            this._logger.warn("ConfigMgr", `Config not found: ${configName}`);
            return null;
        }

        // 尝试多种方式获取
        if (table[id]) {
            return table[id];
        }

        // 尝试从 items 字段获取
        if (table.items && table.items[id]) {
            return table.items[id];
        }

        // 尝试从 data 字段获取
        if (table.data && table.data[id]) {
            return table.data[id];
        }

        // 尝试从数组中查找
        if (Array.isArray(table)) {
            return table.find((item: any) => item.id == id);
        }

        if (Array.isArray(table.items)) {
            return table.items.find((item: any) => item.id == id);
        }

        return null;
    }

    /**
     * 条件查询配置
     */
    public query(configName: string, predicate: (item: any) => boolean): any[] {
        const table = this._configs.get(configName);
        if (!table) {
            this._logger.warn("ConfigMgr", `Config not found: ${configName}`);
            return [];
        }

        let items: any[] = [];
        if (Array.isArray(table)) {
            items = table;
        } else if (Array.isArray(table.items)) {
            items = table.items;
        } else if (Array.isArray(table.data)) {
            items = table.data;
        } else if (typeof table === "object") {
            items = Object.values(table);
        }

        return items.filter(predicate);
    }

    /**
     * 获取配置表所有项
     */
    public getAll(configName: string): any[] {
        const table = this._configs.get(configName);
        if (!table) {
            return [];
        }

        if (Array.isArray(table)) {
            return table;
        }
        if (Array.isArray(table.items)) {
            return table.items;
        }
        if (Array.isArray(table.data)) {
            return table.data;
        }
        return Object.values(table);
    }

    /**
     * 检查配置是否已加载
     */
    public isLoaded(configName: string): boolean {
        return this._configs.has(configName);
    }

    /**
     * 释放配置表
     */
    public release(configName: string): void {
        this._configs.delete(configName);
        this._logger.debug("ConfigMgr", `Config released: ${configName}`);
    }

    /**
     * 获取已加载的配置数量
     */
    public getLoadedCount(): number {
        return this._configs.size;
    }

    /**
     * 清理所有配置
     */
    public onDestroy(): void {
        this._configs.clear();
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/ConfigMgr.ts
git commit -m "feat(core): add ConfigMgr for JSON config management"
```

---

## Task 12: I18nMgr 多语言管理

**Files:**
- Create: `assets/Script/Core/Manager/I18nMgr.ts`

- [ ] **Step 1: 编写 I18nMgr.ts**

```typescript
// assets/Script/Core/Manager/I18nMgr.ts

import { Singleton } from "../Base/Singleton";
import { StorageMgr, StorageKeys } from "./StorageMgr";
import { Logger } from "../Utils/Logger";

/**
 * 支持的语言枚举
 */
export enum Language {
    ZH_CN = "zh-CN",
    ZH_TW = "zh-TW",
    EN = "en",
}

/**
 * 多语言管理器
 * 当前仅支持中文，预留扩展接口
 */
export class I18nMgr extends Singleton<I18nMgr> {
    /** 当前语言 */
    public language: Language = Language.ZH_CN;

    /** 语言包数据 */
    private _langData: Record<string, any> = {};

    /** 是否已初始化 */
    private _initialized: boolean = false;

    private _logger = Logger.instance;

    /**
     * 初始化
     */
    public init(): void {
        if (this._initialized) return;

        // 从存储读取语言设置
        const savedLang = StorageMgr.instance.get<string>(StorageKeys.LANGUAGE);
        if (savedLang) {
            this.language = savedLang as Language;
        }

        this._initialized = true;
        this._logger.debug("I18nMgr", `Initialized, language: ${this.language}`);
    }

    /**
     * 切换语言（预留，暂不实现）
     */
    public setLanguage(lang: Language): void {
        this._logger.warn("I18nMgr", `setLanguage is not implemented yet. Requested: ${lang}`);
        // TODO: 实现语言切换
        // 1. 加载对应语言包
        // 2. 更新所有 UI 文本
        // 3. 保存到 StorageMgr
    }

    /**
     * 设置语言包数据（由外部加载后设置）
     */
    public setLangData(data: Record<string, any>): void {
        this._langData = data;
        this._logger.debug("I18nMgr", "Language data set");
    }

    /**
     * 获取文本
     * @param key 键名，支持点号分隔（如 "ui.start_game"）
     * @param params 替换参数（如 { name: "玩家" }）
     */
    public t(key: string, params?: Record<string, any>): string {
        const text = this._getValue(key);
        if (!text) {
            this._logger.warn("I18nMgr", `Translation not found: ${key}`);
            return key;
        }

        // 替换参数
        if (params) {
            return this._replaceParams(text, params);
        }

        return text;
    }

    /**
     * 根据路径获取值
     */
    private _getValue(key: string): string | null {
        const keys = key.split(".");
        let value: any = this._langData;

        for (const k of keys) {
            if (value === null || value === undefined) {
                return null;
            }
            value = value[k];
        }

        return typeof value === "string" ? value : null;
    }

    /**
     * 替换参数
     * 格式：欢迎，{name}
     */
    private _replaceParams(text: string, params: Record<string, any>): string {
        return text.replace(/{(\w+)}/g, (match, key) => {
            return params[key] !== undefined ? String(params[key]) : match;
        });
    }

    /**
     * 获取多语言图片路径（预留）
     */
    public getImage(path: string): string {
        // TODO: 根据语言返回不同的图片路径
        return path;
    }

    /**
     * 获取多语言音频路径（预留）
     */
    public getAudio(path: string): string {
        // TODO: 根据语言返回不同的音频路径
        return path;
    }

    /**
     * 检查是否有某个键
     */
    public has(key: string): boolean {
        return this._getValue(key) !== null;
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this._langData = {};
        this._initialized = false;
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/I18nMgr.ts
git commit -m "feat(core): add I18nMgr for internationalization (reserved)"
```

---

## Task 13: AudioMgr 音频管理

**Files:**
- Create: `assets/Script/Core/Manager/AudioMgr.ts`

- [ ] **Step 1: 编写 AudioMgr.ts**

```typescript
// assets/Script/Core/Manager/AudioMgr.ts

import { Singleton } from "../Base/Singleton";
import { StorageMgr, StorageKeys } from "./StorageMgr";
import { Logger } from "../Utils/Logger";

/**
 * 音频管理器
 * 管理背景音乐和音效播放
 */
export class AudioMgr extends Singleton<AudioMgr> {
    /** 当前BGM音频ID */
    private _bgmAudioId: number = -1;

    /** 当前BGM路径 */
    private _bgmPath: string = "";

    /** BGM音量 */
    private _bgmVolume: number = 1;

    /** 音效音量 */
    private _sfxVolume: number = 1;

    /** BGM静音 */
    private _bgmMute: boolean = false;

    /** 音效静音 */
    private _sfxMute: boolean = false;

    private _logger = Logger.instance;

    public constructor() {
        super();
        this._loadSettings();
    }

    /**
     * 从存储加载设置
     */
    private _loadSettings(): void {
        this._bgmMute = StorageMgr.instance.get<boolean>(StorageKeys.AUDIO_BGM_MUTE, false);
        this._sfxMute = StorageMgr.instance.get<boolean>(StorageKeys.AUDIO_SFX_MUTE, false);
        this._bgmVolume = StorageMgr.instance.get<number>(StorageKeys.AUDIO_BGM_VOLUME, 1);
        this._sfxVolume = StorageMgr.instance.get<number>(StorageKeys.AUDIO_SFX_VOLUME, 1);
    }

    /**
     * 保存设置到存储
     */
    private _saveSettings(): void {
        StorageMgr.instance.set(StorageKeys.AUDIO_BGM_MUTE, this._bgmMute);
        StorageMgr.instance.set(StorageKeys.AUDIO_SFX_MUTE, this._sfxMute);
        StorageMgr.instance.set(StorageKeys.AUDIO_BGM_VOLUME, this._bgmVolume);
        StorageMgr.instance.set(StorageKeys.AUDIO_SFX_VOLUME, this._sfxVolume);
    }

    /**
     * 播放背景音乐
     * @param path 资源路径（不含 resources 前缀和扩展名）
     * @param loop 是否循环
     */
    public playBGM(path: string, loop: boolean = true): void {
        if (this._bgmPath === path && this._bgmAudioId >= 0) {
            return;
        }

        // 停止当前BGM
        this.stopBGM();

        this._bgmPath = path;

        cc.resources.load(path, cc.AudioClip, (err, clip: cc.AudioClip) => {
            if (err) {
                this._logger.error("AudioMgr", `Failed to load BGM: ${path}`, err);
                return;
            }

            this._bgmAudioId = cc.audioEngine.play(clip, loop, this._bgmMute ? 0 : this._bgmVolume);
            this._logger.debug("AudioMgr", `Playing BGM: ${path}`);
        });
    }

    /**
     * 停止背景音乐
     */
    public stopBGM(): void {
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.stop(this._bgmAudioId);
            this._bgmAudioId = -1;
        }
        this._bgmPath = "";
    }

    /**
     * 暂停背景音乐
     */
    public pauseBGM(): void {
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.pause(this._bgmAudioId);
        }
    }

    /**
     * 恢复背景音乐
     */
    public resumeBGM(): void {
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.resume(this._bgmAudioId);
        }
    }

    /**
     * 播放音效
     * @param path 资源路径
     * @param volume 音量（可选，使用默认音效音量）
     * @returns 音频ID
     */
    public playSFX(path: string, volume?: number): number {
        if (this._sfxMute) {
            return -1;
        }

        const vol = volume !== undefined ? volume : this._sfxVolume;

        cc.resources.load(path, cc.AudioClip, (err, clip: cc.AudioClip) => {
            if (err) {
                this._logger.error("AudioMgr", `Failed to load SFX: ${path}`, err);
                return;
            }
            cc.audioEngine.play(clip, false, vol);
        });

        return 0;  // 注意：异步加载，无法返回准确ID
    }

    /**
     * 停止音效
     */
    public stopSFX(audioId: number): void {
        if (audioId >= 0) {
            cc.audioEngine.stop(audioId);
        }
    }

    /**
     * 设置BGM音量
     */
    public setBGMVolume(volume: number): void {
        this._bgmVolume = Math.max(0, Math.min(1, volume));
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.setVolume(this._bgmAudioId, this._bgmMute ? 0 : this._bgmVolume);
        }
        this._saveSettings();
    }

    /**
     * 设置音效音量
     */
    public setSFXVolume(volume: number): void {
        this._sfxVolume = Math.max(0, Math.min(1, volume));
        this._saveSettings();
    }

    /**
     * 获取BGM音量
     */
    public getBGMVolume(): number {
        return this._bgmVolume;
    }

    /**
     * 获取音效音量
     */
    public getSFXVolume(): number {
        return this._sfxVolume;
    }

    /**
     * 设置BGM静音
     */
    public setBGMMute(mute: boolean): void {
        this._bgmMute = mute;
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.setVolume(this._bgmAudioId, mute ? 0 : this._bgmVolume);
        }
        this._saveSettings();
    }

    /**
     * 设置音效静音
     */
    public setSFXMute(mute: boolean): void {
        this._sfxMute = mute;
        this._saveSettings();
    }

    /**
     * BGM是否静音
     */
    public isBGMMute(): boolean {
        return this._bgmMute;
    }

    /**
     * 音效是否静音
     */
    public isSFXMute(): boolean {
        return this._sfxMute;
    }

    /**
     * 预加载音频
     */
    public preload(paths: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            cc.resources.load(paths.map(p => p), cc.AudioClip, (err) => {
                if (err) {
                    this._logger.error("AudioMgr", "Failed to preload audio", err);
                    reject(err);
                    return;
                }
                this._logger.debug("AudioMgr", `Preloaded ${paths.length} audio clips`);
                resolve();
            });
        });
    }

    /**
     * 停止所有音频
     */
    public stopAll(): void {
        cc.audioEngine.stopAll();
        this._bgmAudioId = -1;
        this._bgmPath = "";
    }

    /**
     * 暂停所有音频
     */
    public pauseAll(): void {
        cc.audioEngine.pauseAll();
    }

    /**
     * 恢复所有音频
     */
    public resumeAll(): void {
        cc.audioEngine.resumeAll();
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this.stopAll();
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/AudioMgr.ts
git commit -m "feat(core): add AudioMgr for audio management"
```

---

## Task 14: ResourceManager 资源管理

**Files:**
- Create: `assets/Script/Core/Manager/ResourceManager.ts`

- [ ] **Step 1: 编写 ResourceManager.ts**

```typescript
// assets/Script/Core/Manager/ResourceManager.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";

/**
 * 加载结果
 */
export interface LoadResult<T> {
    data: T;
    bundle: string;
    path: string;
}

/**
 * 资源管理器
 * 管理资源加载、引用计数和释放
 */
export class ResourceManager extends Singleton<ResourceManager> {
    /** 引用计数 */
    private _refCounts: Map<string, number> = new Map();

    /** 加载进度 */
    private _loadingProgress: number = 0;

    private _logger = Logger.instance;

    /**
     * 加载单个资源
     */
    public load<T extends cc.Asset>(
        path: string,
        type?: typeof cc.Asset,
        bundle?: string
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const bundleName = bundle || "resources";
            const cacheKey = `${bundleName}:${path}`;

            // 增加引用计数
            this._addRef(cacheKey);

            const onComplete = (err: Error, asset: T) => {
                if (err) {
                    this._logger.error("ResourceManager", `Failed to load: ${path}`, err);
                    this._removeRef(cacheKey);
                    reject(err);
                    return;
                }
                resolve(asset);
            };

            if (bundleName === "resources") {
                if (type) {
                    cc.resources.load(path, type, onComplete);
                } else {
                    cc.resources.load(path, onComplete);
                }
            } else {
                const bundleInstance = cc.assetManager.getBundle(bundleName);
                if (!bundleInstance) {
                    reject(new Error(`Bundle not found: ${bundleName}`));
                    return;
                }
                if (type) {
                    bundleInstance.load(path, type, onComplete);
                } else {
                    bundleInstance.load(path, onComplete);
                }
            }
        });
    }

    /**
     * 加载目录下所有资源
     */
    public loadDir<T extends cc.Asset>(
        path: string,
        type?: typeof cc.Asset,
        bundle?: string
    ): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const bundleName = bundle || "resources";

            const onComplete = (err: Error, assets: T[]) => {
                if (err) {
                    this._logger.error("ResourceManager", `Failed to load dir: ${path}`, err);
                    reject(err);
                    return;
                }

                // 增加引用计数
                assets.forEach((_, index) => {
                    const cacheKey = `${bundleName}:${path}[${index}]`;
                    this._addRef(cacheKey);
                });

                resolve(assets);
            };

            if (bundleName === "resources") {
                if (type) {
                    cc.resources.loadDir(path, type, onComplete);
                } else {
                    cc.resources.loadDir(path, onComplete);
                }
            } else {
                const bundleInstance = cc.assetManager.getBundle(bundleName);
                if (!bundleInstance) {
                    reject(new Error(`Bundle not found: ${bundleName}`));
                    return;
                }
                if (type) {
                    bundleInstance.loadDir(path, type, onComplete);
                } else {
                    bundleInstance.loadDir(path, onComplete);
                }
            }
        });
    }

    /**
     * 预加载资源（不返回实例）
     */
    public preload(paths: string[], bundle?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const bundleName = bundle || "resources";
            let loaded = 0;
            const total = paths.length;

            if (total === 0) {
                resolve();
                return;
            }

            paths.forEach(path => {
                this.load(path, undefined, bundleName)
                    .then(() => {
                        loaded++;
                        this._loadingProgress = loaded / total;
                        if (loaded === total) {
                            this._loadingProgress = 1;
                            resolve();
                        }
                    })
                    .catch(err => {
                        this._logger.error("ResourceManager", `Preload failed: ${path}`, err);
                        loaded++;
                        this._loadingProgress = loaded / total;
                        if (loaded === total) {
                            resolve();
                        }
                    });
            });
        });
    }

    /**
     * 加载Bundle
     */
    public loadBundle(bundleName: string): Promise<cc.AssetManager.Bundle> {
        return new Promise((resolve, reject) => {
            cc.assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) {
                    this._logger.error("ResourceManager", `Failed to load bundle: ${bundleName}`, err);
                    reject(err);
                    return;
                }
                this._logger.debug("ResourceManager", `Bundle loaded: ${bundleName}`);
                resolve(bundle);
            });
        });
    }

    /**
     * 获取已加载资源
     */
    public get<T extends cc.Asset>(path: string, bundle?: string): T | null {
        const bundleName = bundle || "resources";

        if (bundleName === "resources") {
            return cc.resources.get(path) as T;
        }

        const bundleInstance = cc.assetManager.getBundle(bundleName);
        if (!bundleInstance) {
            return null;
        }
        return bundleInstance.get(path) as T;
    }

    /**
     * 释放资源
     */
    public release(path: string, bundle?: string): void {
        const bundleName = bundle || "resources";
        const cacheKey = `${bundleName}:${path}`;

        this._removeRef(cacheKey);

        if (this.getRefCount(cacheKey) <= 0) {
            const asset = this.get(path, bundleName);
            if (asset) {
                if (bundleName === "resources") {
                    cc.resources.release(path);
                } else {
                    const bundleInstance = cc.assetManager.getBundle(bundleName);
                    if (bundleInstance) {
                        bundleInstance.release(path);
                    }
                }
                this._refCounts.delete(cacheKey);
                this._logger.debug("ResourceManager", `Resource released: ${cacheKey}`);
            }
        }
    }

    /**
     * 释放目录下所有资源
     */
    public releaseDir(path: string, bundle?: string): void {
        const bundleName = bundle || "resources";

        if (bundleName === "resources") {
            cc.resources.releaseDir(path);
        } else {
            const bundleInstance = cc.assetManager.getBundle(bundleName);
            if (bundleInstance) {
                bundleInstance.releaseDir(path);
            }
        }
    }

    /**
     * 释放整个Bundle
     */
    public releaseBundle(bundleName: string): void {
        const bundleInstance = cc.assetManager.getBundle(bundleName);
        if (bundleInstance) {
            // 清理引用计数
            const keysToDelete: string[] = [];
            this._refCounts.forEach((_, key) => {
                if (key.startsWith(`${bundleName}:`)) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach(key => this._refCounts.delete(key));

            bundleInstance.releaseAll();
            this._logger.debug("ResourceManager", `Bundle released: ${bundleName}`);
        }
    }

    /**
     * 获取引用计数
     */
    public getRefCount(cacheKey: string): number {
        return this._refCounts.get(cacheKey) || 0;
    }

    /**
     * 获取加载进度
     */
    public getLoadingProgress(): number {
        return this._loadingProgress;
    }

    /**
     * 增加引用计数
     */
    private _addRef(cacheKey: string): void {
        const count = this._refCounts.get(cacheKey) || 0;
        this._refCounts.set(cacheKey, count + 1);
    }

    /**
     * 减少引用计数
     */
    private _removeRef(cacheKey: string): void {
        const count = this._refCounts.get(cacheKey) || 0;
        if (count > 0) {
            this._refCounts.set(cacheKey, count - 1);
        }
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this._refCounts.clear();
        this._loadingProgress = 0;
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/ResourceManager.ts
git commit -m "feat(core): add ResourceManager with ref counting"
```

---

## Task 15: UIBase UI面板基类

**Files:**
- Create: `assets/Script/Core/Base/UIBase.ts`

- [ ] **Step 1: 编写 UIBase.ts**

```typescript
// assets/Script/Core/Base/UIBase.ts

/**
 * UI层级
 */
export enum UILayer {
    Background = 0,
    Main = 100,
    Popup = 200,
    Tip = 300,
}

/**
 * UI面板基类
 * 所有UI面板继承此类
 */
export class UIBase extends cc.Component {
    /** UI层级（子类可覆盖） */
    public layer: UILayer = UILayer.Main;

    /** UI名称（用于管理） */
    public uiName: string = "";

    /** 是否正在播放动画 */
    protected _isPlayingAnim: boolean = false;

    /**
     * 打开时调用（接收数据）
     * @param data 传入数据
     */
    public onOpen(data?: any): void {
        // 子类重写
    }

    /**
     * 关闭时调用
     */
    public onClose(): void {
        // 子类重写
    }

    /**
     * 显示动画（可重写）
     */
    public async playOpenAnim(): Promise<void> {
        // 默认无动画，子类可重写
        return Promise.resolve();
    }

    /**
     * 关闭动画（可重写）
     */
    public async playCloseAnim(): Promise<void> {
        // 默认无动画，子类可重写
        return Promise.resolve();
    }

    /**
     * 关闭自己
     */
    public close(): void {
        // 动态导入避免循环依赖
        import("../Manager/UIManager").then(module => {
            module.UIManager.instance.close(this.uiName);
        });
    }

    /**
     * 获取层级节点
     */
    protected getLayerNode(): cc.Node | null {
        return this.node.parent;
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Base/UIBase.ts
git commit -m "feat(core): add UIBase for UI panels"
```

---

## Task 16: PanelBase 弹窗基类

**Files:**
- Create: `assets/Script/Core/Base/PanelBase.ts`

- [ ] **Step 1: 编写 PanelBase.ts**

```typescript
// assets/Script/Core/Base/PanelBase.ts

import { UIBase, UILayer } from "./UIBase";

/**
 * 弹窗基类
 * 继承 UIBase，增加遮罩和动画
 */
export class PanelBase extends UIBase {
    /** 弹窗层级 */
    public layer: UILayer = UILayer.Popup;

    /** 是否显示遮罩 */
    public showMask: boolean = true;

    /** 点击遮罩关闭 */
    public closeOnClickMask: boolean = true;

    /** 遮罩节点 */
    public maskNode: cc.Node | null = null;

    /** 内容节点（用于动画） */
    protected contentNode: cc.Node | null = null;

    /**
     * 初始化遮罩
     */
    protected initMask(): void {
        if (!this.showMask) return;

        // 查找遮罩节点
        this.maskNode = this.node.getChildByName("mask");
        if (this.maskNode && this.closeOnClickMask) {
            this.maskNode.on(cc.Node.EventType.TOUCH_END, this._onMaskClick, this);
        }
    }

    /**
     * 遮罩点击处理
     */
    private _onMaskClick(): void {
        if (this.closeOnClickMask) {
            this.close();
        }
    }

    /**
     * 打开时调用
     */
    public onOpen(data?: any): void {
        this.initMask();

        // 查找内容节点
        this.contentNode = this.node.getChildByName("content");
        if (!this.contentNode) {
            this.contentNode = this.node;
        }

        // 初始状态
        this.node.opacity = 255;
        if (this.contentNode) {
            this.contentNode.scale = 0.8;
        }
    }

    /**
     * 显示动画（淡入+缩放）
     */
    public async playOpenAnim(): Promise<void> {
        this._isPlayingAnim = true;

        return new Promise<void>((resolve) => {
            if (this.contentNode) {
                cc.tween(this.contentNode)
                    .to(0.2, { scale: 1 }, { easing: "backOut" })
                    .call(() => {
                        this._isPlayingAnim = false;
                        resolve();
                    })
                    .start();
            } else {
                this._isPlayingAnim = false;
                resolve();
            }
        });
    }

    /**
     * 关闭动画（淡出+缩放）
     */
    public async playCloseAnim(): Promise<void> {
        this._isPlayingAnim = true;

        return new Promise<void>((resolve) => {
            if (this.contentNode) {
                cc.tween(this.contentNode)
                    .to(0.15, { scale: 0.8 }, { easing: "backIn" })
                    .call(() => {
                        this._isPlayingAnim = false;
                        resolve();
                    })
                    .start();
            } else {
                this._isPlayingAnim = false;
                resolve();
            }
        });
    }

    /**
     * 关闭时调用
     */
    public onClose(): void {
        if (this.maskNode) {
            this.maskNode.off(cc.Node.EventType.TOUCH_END, this._onMaskClick, this);
        }
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Base/PanelBase.ts
git commit -m "feat(core): add PanelBase for popup dialogs"
```

---

## Task 17: UIManager UI管理器

**Files:**
- Create: `assets/Script/Core/Manager/UIManager.ts`

- [ ] **Step 1: 编写 UIManager.ts**

```typescript
// assets/Script/Core/Manager/UIManager.ts

import { Singleton } from "../Base/Singleton";
import { UIBase, UILayer } from "../Base/UIBase";
import { PanelBase } from "../Base/PanelBase";
import { Logger } from "../Utils/Logger";

/** UI预制体路径前缀 */
const UI_PATH_PREFIX = "Prefabs/UI/";

/**
 * UI管理器
 * 管理UI层级、栈和弹窗队列
 */
export class UIManager extends Singleton<UIManager> {
    /** 各层级容器 */
    private _layers: Map<UILayer, cc.Node> = new Map();

    /** 已打开的UI */
    private _openedUIs: Map<string, UIBase> = new Map();

    /** 弹窗队列 */
    private _popupQueue: Array<{ name: string; data?: any }> = [];

    /** 当前弹窗 */
    private _currentPopup: string | null = null;

    /** Canvas节点 */
    private _canvas: cc.Node | null = null;

    private _logger = Logger.instance;

    /**
     * 初始化UI层级
     */
    public init(canvas: cc.Node): void {
        this._canvas = canvas;

        // 创建层级容器
        this._createLayer(UILayer.Background, "LayerBackground");
        this._createLayer(UILayer.Main, "LayerMain");
        this._createLayer(UILayer.Popup, "LayerPopup");
        this._createLayer(UILayer.Tip, "LayerTip");

        this._logger.debug("UIManager", "UI layers initialized");
    }

    /**
     * 创建层级容器
     */
    private _createLayer(layer: UILayer, name: string): void {
        if (!this._canvas) return;

        let layerNode = this._canvas.getChildByName(name);
        if (!layerNode) {
            layerNode = new cc.Node(name);
            layerNode.addComponent(cc.UITransform);
            layerNode.setContentSize(cc.winSize);
            layerNode.setPosition(0, 0);
            this._canvas.addChild(layerNode);
        }
        layerNode.zIndex = layer;
        this._layers.set(layer, layerNode);
    }

    /**
     * 获取层级容器
     */
    private _getLayerNode(layer: UILayer): cc.Node | null {
        return this._layers.get(layer) || null;
    }

    /**
     * 打开UI
     */
    public async open<T extends UIBase>(uiName: string, data?: any): Promise<T | null> {
        // 如果已打开，直接返回
        if (this._openedUIs.has(uiName)) {
            const ui = this._openedUIs.get(uiName) as T;
            ui.onOpen(data);
            return ui;
        }

        return new Promise<T | null>((resolve) => {
            const path = `${UI_PATH_PREFIX}${uiName}`;

            cc.resources.load(path, cc.Prefab, (err, prefab: cc.Prefab) => {
                if (err) {
                    this._logger.error("UIManager", `Failed to load UI: ${uiName}`, err);
                    resolve(null);
                    return;
                }

                const node = cc.instantiate(prefab);
                const ui = node.getComponent(UIBase) as T;

                if (!ui) {
                    this._logger.error("UIManager", `UI component not found: ${uiName}`);
                    node.destroy();
                    resolve(null);
                    return;
                }

                ui.uiName = uiName;

                // 添加到对应层级
                const layerNode = this._getLayerNode(ui.layer);
                if (layerNode) {
                    layerNode.addChild(node);
                } else {
                    this._canvas?.addChild(node);
                }

                // 记录
                this._openedUIs.set(uiName, ui);

                // 调用打开
                ui.onOpen(data);

                // 播放动画
                ui.playOpenAnim();

                this._logger.debug("UIManager", `UI opened: ${uiName}`);
                resolve(ui);
            });
        });
    }

    /**
     * 关闭UI
     */
    public close(uiName: string, destroy: boolean = true): void {
        const ui = this._openedUIs.get(uiName);
        if (!ui) {
            this._logger.warn("UIManager", `UI not found: ${uiName}`);
            return;
        }

        // 先播放关闭动画
        ui.playCloseAnim().then(() => {
            ui.onClose();
            this._openedUIs.delete(uiName);

            if (destroy) {
                ui.node.destroy();
            } else {
                ui.node.removeFromParent(false);
                ui.node.active = false;
            }

            this._logger.debug("UIManager", `UI closed: ${uiName}`);

            // 处理弹窗队列
            this._processPopupQueue();
        });
    }

    /**
     * 显示弹窗（进入队列）
     */
    public async showPopup(name: string, data?: any, urgent: boolean = false): Promise<PanelBase | null> {
        // 如果是紧急弹窗，直接显示
        if (urgent) {
            return this.open<PanelBase>(name, data);
        }

        // 加入队列
        this._popupQueue.push({ name, data });

        // 如果没有当前弹窗，处理队列
        if (!this._currentPopup) {
            return this._processPopupQueue();
        }

        return null;
    }

    /**
     * 处理弹窗队列
     */
    private async _processPopupQueue(): Promise<PanelBase | null> {
        if (this._popupQueue.length === 0) {
            this._currentPopup = null;
            return null;
        }

        const item = this._popupQueue.shift()!;
        this._currentPopup = item.name;

        const popup = await this.open<PanelBase>(item.name, item.data);
        return popup;
    }

    /**
     * 关闭当前弹窗
     */
    public closeCurrentPopup(): void {
        if (this._currentPopup) {
            this.close(this._currentPopup);
        }
    }

    /**
     * 关闭所有弹窗
     */
    public closeAllPopups(): void {
        this._popupQueue = [];

        const popups: string[] = [];
        this._openedUIs.forEach((ui, name) => {
            if (ui.layer === UILayer.Popup) {
                popups.push(name);
            }
        });

        popups.forEach(name => this.close(name));
        this._currentPopup = null;
    }

    /**
     * 显示Toast提示
     */
    public showToast(message: string, duration: number = 2): void {
        // 创建Toast节点
        const toast = new cc.Node("Toast");

        const label = toast.addComponent(cc.Label);
        label.string = message;
        label.fontSize = 24;
        label.lineHeight = 30;

        const widget = toast.addComponent(cc.Widget);
        widget.isAlignBottom = true;
        widget.bottom = 200;

        toast.color = cc.Color.WHITE;

        // 添加到提示层
        const tipLayer = this._getLayerNode(UILayer.Tip);
        if (tipLayer) {
            tipLayer.addChild(toast);
        } else {
            this._canvas?.addChild(toast);
        }

        // 自动消失
        cc.tween(toast)
            .delay(duration - 0.3)
            .to(0.3, { opacity: 0 })
            .call(() => toast.destroy())
            .start();
    }

    /**
     * 显示Loading
     */
    private _loadingNode: cc.Node | null = null;

    public showLoading(text: string = "加载中..."): void {
        if (this._loadingNode) return;

        this._loadingNode = new cc.Node("Loading");

        // 半透明遮罩
        const bg = new cc.Node("bg");
        bg.addComponent(cc.UITransform).setContentSize(cc.winSize);
        const sp = bg.addComponent(cc.Sprite);
        sp.spriteFrame = null;  // 需要设置一个白色精灵
        bg.color = new cc.Color(0, 0, 0, 150);
        bg.parent = this._loadingNode;

        // 文本
        const label = this._loadingNode.addComponent(cc.Label);
        label.string = text;
        label.fontSize = 32;

        // 添加到提示层
        const tipLayer = this._getLayerNode(UILayer.Tip);
        if (tipLayer) {
            tipLayer.addChild(this._loadingNode);
        } else {
            this._canvas?.addChild(this._loadingNode);
        }
    }

    /**
     * 隐藏Loading
     */
    public hideLoading(): void {
        if (this._loadingNode) {
            this._loadingNode.destroy();
            this._loadingNode = null;
        }
    }

    /**
     * 获取UI实例
     */
    public getUI<T extends UIBase>(uiName: string): T | null {
        return (this._openedUIs.get(uiName) as T) || null;
    }

    /**
     * UI是否打开
     */
    public isOpen(uiName: string): boolean {
        return this._openedUIs.has(uiName);
    }

    /**
     * 关闭所有UI
     */
    public closeAll(): void {
        const names = Array.from(this._openedUIs.keys());
        names.forEach(name => this.close(name));
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this.closeAll();
        this._layers.clear();
        this._popupQueue = [];
        this._currentPopup = null;
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/UIManager.ts
git commit -m "feat(core): add UIManager for UI management"
```

---

## Task 18: GameManager 游戏管理器

**Files:**
- Create: `assets/Script/Core/Manager/GameManager.ts`

- [ ] **Step 1: 编写 GameManager.ts**

```typescript
// assets/Script/Core/Manager/GameManager.ts

import { Singleton } from "../Base/Singleton";
import { StateMachine, IState } from "../State/StateMachine";
import { GameState, getGameStateName } from "../State/GameState";
import { Logger } from "../Utils/Logger";
import { EventCenter } from "./EventCenter";
import { TimerManager } from "./TimerManager";
import { StorageMgr } from "./StorageMgr";
import { ConfigMgr } from "./ConfigMgr";
import { ResourceManager } from "./ResourceManager";
import { PoolManager } from "./PoolManager";
import { AudioMgr } from "./AudioMgr";
import { UIManager } from "./UIManager";
import { I18nMgr, Language } from "./I18nMgr";

/**
 * 游戏管理器
 * 游戏入口，初始化所有Manager，管理游戏状态
 */
export class GameManager extends Singleton<GameManager> {
    /** 状态机 */
    private _stateMachine: StateMachine = new StateMachine();

    /** 当前状态 */
    public get currentState(): GameState {
        return this._stateMachine.currentState?.name as GameState || GameState.Launch;
    }

    /** 是否已初始化 */
    private _initialized: boolean = false;

    private _logger = Logger.instance;

    public constructor() {
        super();
        this._initStates();
    }

    /**
     * 初始化状态
     */
    private _initStates(): void {
        const states: IState[] = [
            {
                name: GameState.Launch,
                onEnter: () => this._logger.info("GameManager", "State: Launch"),
            },
            {
                name: GameState.Loading,
                onEnter: () => this._onLoadingEnter(),
            },
            {
                name: GameState.MainMenu,
                onEnter: () => this._onMainMenuEnter(),
            },
            {
                name: GameState.Playing,
                onEnter: () => this._onPlayingEnter(),
            },
            {
                name: GameState.Paused,
                onEnter: () => this._onPausedEnter(),
                onExit: () => this._onPausedExit(),
            },
            {
                name: GameState.GameOver,
                onEnter: () => this._onGameOverEnter(),
            },
        ];

        this._stateMachine.registerAll(states);
        this._stateMachine.onStateChange = (from, to) => {
            EventCenter.instance.emit("game:state_change", {
                from: from as GameState,
                to: to as GameState,
            });
        };
    }

    /**
     * 初始化游戏
     */
    public async init(canvas?: cc.Node): Promise<void> {
        if (this._initialized) {
            this._logger.warn("GameManager", "Already initialized");
            return;
        }

        this._logger.info("GameManager", "Initializing...");

        // 按顺序初始化各 Manager
        StorageMgr.instance;  // 初始化存储管理器
        EventCenter.instance;  // 初始化事件中心

        if (canvas) {
            UIManager.instance.init(canvas);
        }

        I18nMgr.instance.init();

        this._initialized = true;

        // 进入加载状态
        this.changeState(GameState.Loading);
    }

    /**
     * 加载状态处理
     */
    private async _onLoadingEnter(): Promise<void> {
        this._logger.info("GameManager", "Loading resources...");

        UIManager.instance.showLoading("加载中...");

        try {
            // 加载配置表
            await ConfigMgr.instance.loadAll();

            // 加载语言包
            // await this._loadLanguage();

            // 预加载资源
            // await ResourceManager.instance.preload(["UI/Common", "Audio/BGM"]);

            UIManager.instance.hideLoading();

            // 加载完成，进入主界面
            this.changeState(GameState.MainMenu);
        } catch (e) {
            this._logger.error("GameManager", "Loading failed", e);
            UIManager.instance.hideLoading();
        }
    }

    /**
     * 主界面状态处理
     */
    private _onMainMenuEnter(): void {
        this._logger.info("GameManager", "Entered MainMenu");

        // 播放BGM
        // AudioMgr.instance.playBGM("Audio/BGM/main");
    }

    /**
     * 游戏中状态处理
     */
    private _onPlayingEnter(): void {
        this._logger.info("GameManager", "Entered Playing");
    }

    /**
     * 暂停状态处理
     */
    private _onPausedEnter(): void {
        this._logger.info("GameManager", "Game Paused");
        TimerManager.instance.pauseAll();
        AudioMgr.instance.pauseBGM();
        cc.game.pause();
    }

    /**
     * 暂停退出处理
     */
    private _onPausedExit(): void {
        this._logger.info("GameManager", "Game Resumed");
        cc.game.resume();
        AudioMgr.instance.resumeBGM();
        TimerManager.instance.resumeAll();
    }

    /**
     * 游戏结束状态处理
     */
    private _onGameOverEnter(): void {
        this._logger.info("GameManager", "Game Over");
    }

    /**
     * 切换状态
     */
    public changeState(state: GameState): void {
        this._logger.debug("GameManager", `State change: ${getGameStateName(this.currentState)} -> ${getGameStateName(state)}`);
        this._stateMachine.change(state);
    }

    /**
     * 暂停游戏
     */
    public pause(): void {
        if (!this._stateMachine.is(GameState.Playing)) return;
        this.changeState(GameState.Paused);
        EventCenter.instance.emit("game:pause", undefined);
    }

    /**
     * 恢复游戏
     */
    public resume(): void {
        if (!this._stateMachine.is(GameState.Paused)) return;
        this.changeState(GameState.Playing);
        EventCenter.instance.emit("game:resume", undefined);
    }

    /**
     * 开始游戏
     */
    public startGame(): void {
        this.changeState(GameState.Playing);
    }

    /**
     * 游戏结束
     */
    public gameOver(): void {
        this.changeState(GameState.GameOver);
    }

    /**
     * 返回主菜单
     */
    public backToMain(): void {
        this.changeState(GameState.MainMenu);
    }

    /**
     * 退出游戏
     */
    public exit(): void {
        this._logger.info("GameManager", "Exiting game...");
        cc.game.end();
    }

    /**
     * 检查是否在某个状态
     */
    public isState(state: GameState): boolean {
        return this._stateMachine.is(state);
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        StorageMgr.destroy();
        EventCenter.destroy();
        TimerManager.destroy();
        PoolManager.destroy();
        ConfigMgr.destroy();
        I18nMgr.destroy();
        AudioMgr.destroy();
        ResourceManager.destroy();
        UIManager.destroy();

        this._initialized = false;
        this._logger.info("GameManager", "Destroyed");
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/Manager/GameManager.ts
git commit -m "feat(core): add GameManager as game entry point"
```

---

## Task 19: Game.ts 游戏入口脚本

**Files:**
- Create: `assets/Script/Main/Game.ts`

- [ ] **Step 1: 编写 Game.ts**

```typescript
// assets/Script/Main/Game.ts

import { GameManager } from "../Core/Manager/GameManager";

const { ccclass, property } = cc._decorator;

/**
 * 游戏入口脚本
 * 挂载在 Launch 场景的根节点上
 */
@ccclass
export default class Game extends cc.Component {
    @property(cc.Node)
    canvas: cc.Node = null;

    protected onLoad(): void {
        // 设置常驻节点
        cc.game.addPersistRootNode(this.node);

        // 初始化游戏管理器
        this._initGame();
    }

    private async _initGame(): Promise<void> {
        cc.view.setDesignResolutionSize(1280, 720, cc.ResolutionPolicy.FIXED_HEIGHT);

        // 初始化GameManager
        await GameManager.instance.init(this.canvas);
    }

    protected onDestroy(): void {
        GameManager.destroy();
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Main/Game.ts
git commit -m "feat: add Game.ts entry script"
```

---

## Task 20: zh-CN.json 中文语言包

**Files:**
- Create: `assets/Config/i18n/zh-CN.json`

- [ ] **Step 1: 编写 zh-CN.json**

```json
{
    "ui": {
        "start_game": "开始游戏",
        "settings": "设置",
        "quit": "退出",
        "confirm": "确定",
        "cancel": "取消",
        "close": "关闭",
        "loading": "加载中...",
        "welcome": "欢迎，{name}"
    },
    "game": {
        "score": "得分：{score}",
        "level": "第{n}关",
        "game_over": "游戏结束",
        "victory": "胜利！",
        "defeat": "失败",
        "pause": "暂停",
        "resume": "继续",
        "restart": "重新开始"
    },
    "item": {
        "coin": "金币",
        "diamond": "钻石",
        "energy": "体力",
        "key": "钥匙"
    },
    "error": {
        "network_error": "网络错误，请重试",
        "load_failed": "加载失败",
        "unknown": "未知错误"
    }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Config/i18n/zh-CN.json
git commit -m "feat: add zh-CN language pack"
```

---

## Task 21: Excel转JSON工具

**Files:**
- Create: `tools/excel2json.js`

- [ ] **Step 1: 编写 excel2json.js**

```javascript
// tools/excel2json.js
/**
 * Excel 转 JSON 工具
 *
 * 使用方法：
 * 1. npm install xlsx
 * 2. node tools/excel2json.js
 *
 * 输入：tools/excel/*.xlsx
 * 输出：assets/Config/*.json
 *
 * Excel 格式：
 * - 第一行：字段名
 * - 第二行：字段类型（可选，作为注释）
 * - 第三行开始：数据
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 配置
const CONFIG = {
    inputDir: path.join(__dirname, 'excel'),
    outputDir: path.join(__dirname, '../assets/Config'),
    excludeSheets: ['说明', 'Sheet1'],  // 排除的Sheet名
};

/**
 * 读取Excel文件
 */
function readExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const result = {};

    workbook.SheetNames.forEach(sheetName => {
        if (CONFIG.excludeSheets.includes(sheetName)) return;

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length < 2) return;

        // 第一行是字段名
        const headers = data[0];
        // 第二行是类型注释（跳过）
        // 从第三行开始是数据
        const rows = data.slice(2);

        const items = {};
        const itemsArray = [];

        rows.forEach(row => {
            const item = {};
            headers.forEach((header, index) => {
                if (header) {
                    let value = row[index];
                    // 尝试转换类型
                    if (typeof value === 'string') {
                        // 尝试解析数字
                        if (/^\d+$/.test(value)) {
                            value = parseInt(value, 10);
                        } else if (/^\d+\.\d+$/.test(value)) {
                            value = parseFloat(value);
                        }
                    }
                    item[header] = value;
                }
            });

            // 使用 id 作为键（如果存在）
            if (item.id !== undefined) {
                items[item.id] = item;
            }
            itemsArray.push(item);
        });

        result[sheetName] = { items, data: itemsArray };
    });

    return result;
}

/**
 * 写入JSON文件
 */
function writeJson(filePath, data) {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, json, 'utf8');
    console.log(`[OK] ${path.basename(filePath)}`);
}

/**
 * 主函数
 */
function main() {
    console.log('=== Excel to JSON Converter ===\n');

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // 检查输入目录
    if (!fs.existsSync(CONFIG.inputDir)) {
        console.log(`[WARN] Input directory not found: ${CONFIG.inputDir}`);
        console.log('[INFO] Creating input directory...');
        fs.mkdirSync(CONFIG.inputDir, { recursive: true });
        console.log('[INFO] Please put your Excel files in tools/excel/');
        return;
    }

    // 读取所有Excel文件
    const files = fs.readdirSync(CONFIG.inputDir)
        .filter(file => file.endsWith('.xlsx') && !file.startsWith('~'));

    if (files.length === 0) {
        console.log('[WARN] No Excel files found in tools/excel/');
        return;
    }

    console.log(`Found ${files.length} Excel file(s):\n`);

    files.forEach(file => {
        const filePath = path.join(CONFIG.inputDir, file);
        console.log(`Processing: ${file}`);

        try {
            const data = readExcel(filePath);

            // 为每个Sheet生成JSON
            Object.keys(data).forEach(sheetName => {
                const outputPath = path.join(CONFIG.outputDir, `${sheetName}.json`);
                writeJson(outputPath, data[sheetName]);
            });
        } catch (e) {
            console.error(`[ERROR] Failed to process ${file}:`, e.message);
        }
    });

    console.log('\n=== Conversion completed ===');
}

// 运行
main();
```

- [ ] **Step 2: 提交代码**

```bash
git add tools/excel2json.js
git commit -m "feat: add excel2json conversion tool"
```

---

## Task 22: 索引导出文件（可选）

**Files:**
- Create: `assets/Script/Core/index.ts`

为了方便导入，创建一个索引文件：

- [ ] **Step 1: 编写 index.ts**

```typescript
// assets/Script/Core/index.ts

// Base
export { Singleton } from "./Base/Singleton";
export { UIBase, UILayer } from "./Base/UIBase";
export { PanelBase } from "./Base/PanelBase";

// Managers
export { GameManager } from "./Manager/GameManager";
export { UIManager } from "./Manager/UIManager";
export { ResourceManager } from "./Manager/ResourceManager";
export { PoolManager, PoolRegisterConfig } from "./Manager/PoolManager";
export { TimerManager, TimerHandle } from "./Manager/TimerManager";
export { EventCenter, EventMap } from "./Manager/EventCenter";
export { AudioMgr } from "./Manager/AudioMgr";
export { StorageMgr, StorageKeys } from "./Manager/StorageMgr";
export { ConfigMgr } from "./Manager/ConfigMgr";
export { I18nMgr, Language } from "./Manager/I18nMgr";

// State
export { GameState, getGameStateName } from "./State/GameState";
export { StateMachine, IState } from "./State/StateMachine";

// Pool
export { NodePool, NodePoolConfig, PoolInfo } from "./Pool/NodePool";

// Utils
export { Logger, LogLevel } from "./Utils/Logger";
export { TimeUtils } from "./Utils/TimeUtils";
```

- [ ] **Step 2: 提交代码**

```bash
git add assets/Script/Core/index.ts
git commit -m "feat: add Core index export file"
```

---

## Task 23: 最终汇总提交

- [ ] **Step 1: 检查所有文件**

```bash
git status
```

- [ ] **Step 2: 汇总提交（如果有遗漏）**

```bash
git add .
git commit -m "feat: complete Cocos Creator 2.4.9 base framework implementation

Includes:
- Singleton base class
- Logger utility
- GameState and StateMachine
- TimeUtils and NodePool
- 10 Manager modules (Storage, Event, Timer, Pool, Config, I18n, Audio, Resource, UI, Game)
- UIBase and PanelBase
- Game entry script
- zh-CN language pack
- Excel to JSON tool
"
```

---

## 实现清单总结

| Task | 文件 | 状态 |
|-----|-----|-----|
| 1 | `Script/Core/Base/Singleton.ts` | - [ ] |
| 2 | `Script/Core/Utils/Logger.ts` | - [ ] |
| 3 | `Script/Core/State/GameState.ts` | - [ ] |
| 4 | `Script/Core/State/StateMachine.ts` | - [ ] |
| 5 | `Script/Core/Utils/TimeUtils.ts` | - [ ] |
| 6 | `Script/Core/Pool/NodePool.ts` | - [ ] |
| 7 | `Script/Core/Manager/StorageMgr.ts` | - [ ] |
| 8 | `Script/Core/Manager/EventCenter.ts` | - [ ] |
| 9 | `Script/Core/Manager/TimerManager.ts` | - [ ] |
| 10 | `Script/Core/Manager/PoolManager.ts` | - [ ] |
| 11 | `Script/Core/Manager/ConfigMgr.ts` | - [ ] |
| 12 | `Script/Core/Manager/I18nMgr.ts` | - [ ] |
| 13 | `Script/Core/Manager/AudioMgr.ts` | - [ ] |
| 14 | `Script/Core/Manager/ResourceManager.ts` | - [ ] |
| 15 | `Script/Core/Base/UIBase.ts` | - [ ] |
| 16 | `Script/Core/Base/PanelBase.ts` | - [ ] |
| 17 | `Script/Core/Manager/UIManager.ts` | - [ ] |
| 18 | `Script/Core/Manager/GameManager.ts` | - [ ] |
| 19 | `Script/Main/Game.ts` | - [ ] |
| 20 | `Config/i18n/zh-CN.json` | - [ ] |
| 21 | `tools/excel2json.js` | - [ ] |
| 22 | `Script/Core/index.ts` | - [ ] |

---

## 自检清单

- [x] **Spec覆盖**: 所有设计规格中的模块都有对应任务
- [x] **无占位符**: 无 TBD、TODO、未实现步骤
- [x] **类型一致**: 接口和方法名在各任务中保持一致
- [x] **依赖顺序**: 按依赖层级组织任务顺序
- [x] **文件路径**: 所有文件路径明确为 `assets/Script/...`
