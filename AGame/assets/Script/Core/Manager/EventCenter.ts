// assets/Script/Core/Manager/EventCenter.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";
import { GameState } from "../State/GameState";
import { BackpackItemPlacedEvent, BackpackItemRemovedEvent, BackpackItemRotatedEvent } from "../../Backpack/Config/ItemConfig";

/**
 * 全局事件映射
 */
export interface EventMap {
    "game:state_change": { from: GameState; to: GameState };
    "game:pause": void;
    "game:resume": void;
    "ui:popup_open": { name: string; data?: any };
    "ui:popup_close": { name: string };
    "ui:toast_show": { message: string };
    "resource:load_progress": { progress: number };
    "resource:loaded": { paths: string[] };
    "audio:bgm_change": { name: string };
    "player:coin_change": { old: number; new: number };
    "backpack:item_placed": BackpackItemPlacedEvent;
    "backpack:item_removed": BackpackItemRemovedEvent;
    "backpack:item_rotated": BackpackItemRotatedEvent;
}

interface EventListener {
    callback: Function;
    target: any;
    once: boolean;
}

/**
 * 全局事件中心
 */
export class EventCenter extends Singleton<EventCenter> {
    private _listeners: Map<string, EventListener[]> = new Map();
    private _logger = Logger.instance;

    protected constructor() {
        super();
    }

    public on<K extends keyof EventMap>(
        event: K,
        callback: (data: EventMap[K]) => void,
        target?: any
    ): void {
        this._addListener(event as string, callback, target, false);
    }

    public once<K extends keyof EventMap>(
        event: K,
        callback: (data: EventMap[K]) => void,
        target?: any
    ): void {
        this._addListener(event as string, callback, target, true);
    }

    private _addListener(event: string, callback: Function, target: any, once: boolean): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event)!.push({ callback, target, once });
    }

    public emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void {
        const listeners = this._listeners.get(event as string);
        if (!listeners || listeners.length === 0) return;

        const toCall = [...listeners];
        const toRemove: EventListener[] = [];

        for (const listener of toCall) {
            try {
                if (listener.target) {
                    listener.callback.call(listener.target, data);
                } else {
                    listener.callback(data);
                }
                if (listener.once) toRemove.push(listener);
            } catch (e) {
                this._logger.error("EventCenter", `Error in handler: ${event}`, e);
            }
        }

        if (toRemove.length > 0) {
            const remaining = listeners.filter(l => !toRemove.includes(l));
            if (remaining.length === 0) {
                this._listeners.delete(event);
            } else {
                this._listeners.set(event, remaining);
            }
        }
    }

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
            if (callback && target) return l.callback !== callback || l.target !== target;
            if (callback) return l.callback !== callback;
            if (target) return l.target !== target;
            return true;
        });

        if (remaining.length === 0) {
            this._listeners.delete(event);
        } else {
            this._listeners.set(event, remaining);
        }
    }

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

    public clear(event: string): void {
        this._listeners.delete(event);
    }

    public clearAll(): void {
        this._listeners.clear();
    }

    public hasListener(event: string): boolean {
        const listeners = this._listeners.get(event);
        return listeners !== undefined && listeners.length > 0;
    }

    public onDestroy(): void {
        this.clearAll();
    }
}