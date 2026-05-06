// assets/Script/Core/Manager/ResourceManager.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";

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

                // 增加引用计数（按目录统一计数）
                const cacheKey = `${bundleName}:${path}`;
                this._addRef(cacheKey);

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
            let failed = 0;
            const total = paths.length;
            const failedPaths: string[] = [];

            if (total === 0) {
                resolve();
                return;
            }

            paths.forEach(path => {
                this.load(path, undefined, bundleName)
                    .then(() => {
                        loaded++;
                        this._loadingProgress = (loaded + failed) / total;
                        if (loaded + failed === total) {
                            this._loadingProgress = 1;
                            if (failed > 0) {
                                reject(new Error(`Preload failed for ${failed} resource(s): ${failedPaths.join(", ")}`));
                            } else {
                                resolve();
                            }
                        }
                    })
                    .catch(err => {
                        this._logger.error("ResourceManager", `Preload failed: ${path}`, err);
                        failed++;
                        failedPaths.push(path);
                        this._loadingProgress = (loaded + failed) / total;
                        if (loaded + failed === total) {
                            this._loadingProgress = 1;
                            reject(new Error(`Preload failed for ${failed} resource(s): ${failedPaths.join(", ")}`));
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