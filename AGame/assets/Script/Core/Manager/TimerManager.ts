// assets/Script/Core/Manager/TimerManager.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";

export interface TimerHandle {
    id: number;
    key: string;
}

interface TimerItem {
    id: number;
    key: string;
    callback: Function;
    interval: number;
    elapsed: number;
    isPaused: boolean;
    isOnce: boolean;
    isFrameUpdate: boolean;
}

/**
 * 定时器管理器
 */
export class TimerManager extends Singleton<TimerManager> {
    private _timers: Map<number, TimerItem> = new Map();
    private _nextId: number = 1;
    private _isPaused: boolean = false;
    private _logger = Logger.instance;
    private _updateHandler: Function = null;

    protected constructor() {
        super();
        this._startUpdate();
    }

    private _startUpdate(): void {
        this._updateHandler = (dt: number) => this._update(dt);
        cc.director.on(cc.Director.EVENT_AFTER_UPDATE, this._updateHandler);
    }

    private _update(dt: number): void {
        if (this._isPaused) return;
        const dtMs = dt * 1000;

        this._timers.forEach((timer, id) => {
            if (timer.isPaused) return;

            if (timer.isFrameUpdate) {
                try {
                    timer.callback(dt);
                } catch (e) {
                    this._logger.error("TimerManager", `Callback error: ${id}`, e);
                }
            } else {
                timer.elapsed += dtMs;
                if (timer.elapsed >= timer.interval) {
                    try {
                        timer.callback();
                    } catch (e) {
                        this._logger.error("TimerManager", `Callback error: ${id}`, e);
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

    public delay(delayMs: number, callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        this._timers.set(id, {
            id, key: key || "", callback,
            interval: delayMs, elapsed: 0,
            isPaused: false, isOnce: true, isFrameUpdate: false,
        });
        return { id, key: key || "" };
    }

    public interval(intervalMs: number, callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        this._timers.set(id, {
            id, key: key || "", callback,
            interval: intervalMs, elapsed: 0,
            isPaused: false, isOnce: false, isFrameUpdate: false,
        });
        return { id, key: key || "" };
    }

    public frame(callback: Function, key?: string): TimerHandle {
        const id = this._nextId++;
        this._timers.set(id, {
            id, key: key || "", callback,
            interval: 0, elapsed: 0,
            isPaused: false, isOnce: false, isFrameUpdate: true,
        });
        return { id, key: key || "" };
    }

    public fixedFrame(fps: number, callback: Function, key?: string): TimerHandle {
        return this.interval(1000 / fps, callback, key);
    }

    public cancel(handle: TimerHandle): void {
        this._timers.delete(handle.id);
    }

    public cancelByKey(key: string): void {
        if (!key) return;
        const toDelete: number[] = [];
        this._timers.forEach((timer, id) => {
            if (timer.key === key) toDelete.push(id);
        });
        toDelete.forEach(id => this._timers.delete(id));
    }

    public pause(handle: TimerHandle): void {
        const timer = this._timers.get(handle.id);
        if (timer) timer.isPaused = true;
    }

    public resume(handle: TimerHandle): void {
        const timer = this._timers.get(handle.id);
        if (timer) timer.isPaused = false;
    }

    public pauseAll(): void {
        this._isPaused = true;
        this._timers.forEach(timer => timer.isPaused = true);
    }

    public resumeAll(): void {
        this._isPaused = false;
        this._timers.forEach(timer => timer.isPaused = false);
    }

    public clearAll(): void {
        this._timers.clear();
    }

    public getActiveCount(): number {
        let count = 0;
        this._timers.forEach(timer => {
            if (!timer.isPaused) count++;
        });
        return count;
    }

    public getTotalCount(): number {
        return this._timers.size;
    }

    public onDestroy(): void {
        if (this._updateHandler) {
            cc.director.off(cc.Director.EVENT_AFTER_UPDATE, this._updateHandler);
        }
        this.clearAll();
    }
}