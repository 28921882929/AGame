// assets/Script/Core/Manager/StorageMgr.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";

/**
 * 预定义存储键
 */
export const StorageKeys = {
    AUDIO_BGM_MUTE: "audio_bgm_mute",
    AUDIO_SFX_MUTE: "audio_sfx_mute",
    AUDIO_BGM_VOLUME: "audio_bgm_volume",
    AUDIO_SFX_VOLUME: "audio_sfx_volume",
    LANGUAGE: "language",
};

/**
 * 本地存储管理器
 */
export class StorageMgr extends Singleton<StorageMgr> {
    private _cache: Map<string, any> = new Map();
    private _logger = Logger.instance;

    protected constructor() {
        super();
    }

    public set<T>(key: string, value: T): void {
        try {
            this._cache.set(key, value);
            const data = typeof value === "string" ? value : JSON.stringify(value);
            cc.sys.localStorage.setItem(key, data);
        } catch (e) {
            this._logger.error("StorageMgr", `Failed to set: ${key}`, e);
        }
    }

    public get<T>(key: string, defaultValue?: T): T {
        if (this._cache.has(key)) {
            return this._cache.get(key) as T;
        }

        try {
            const data = cc.sys.localStorage.getItem(key);
            if (data === null || data === "") {
                return defaultValue as T;
            }

            let value: any;
            try {
                value = JSON.parse(data);
            } catch {
                value = data;
            }

            this._cache.set(key, value);
            return value as T;
        } catch (e) {
            this._logger.error("StorageMgr", `Failed to get: ${key}`, e);
            return defaultValue as T;
        }
    }

    public remove(key: string): void {
        this._cache.delete(key);
        cc.sys.localStorage.removeItem(key);
    }

    public has(key: string): boolean {
        if (this._cache.has(key)) return true;
        const data = cc.sys.localStorage.getItem(key);
        return data !== null && data !== "";
    }

    public clear(): void {
        this._cache.clear();
        cc.sys.localStorage.clear();
    }

    public keys(): string[] {
        const result: string[] = [];
        // cc.sys.localStorage doesn't have .length/.key() like browser localStorage
        // We return cached keys instead
        return Array.from(this._cache.keys());
    }

    public setMultiple(data: Record<string, any>): void {
        for (const key in data) {
            this.set(key, data[key]);
        }
    }

    public getMultiple(keys: string[]): Record<string, any> {
        const result: Record<string, any> = {};
        keys.forEach(key => {
            result[key] = this.get(key);
        });
        return result;
    }

    public clearCache(): void {
        this._cache.clear();
    }

    public onDestroy(): void {
        this.clearCache();
    }
}