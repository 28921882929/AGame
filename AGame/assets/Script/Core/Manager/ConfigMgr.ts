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
            return table.find((item: any) => String(item.id) === String(id));
        }

        if (Array.isArray(table.items)) {
            return table.items.find((item: any) => String(item.id) === String(id));
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