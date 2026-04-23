// assets/Script/Core/Manager/PoolManager.ts

import { Singleton } from "../Base/Singleton";
import { Logger } from "../Utils/Logger";
import { NodePool, NodePoolConfig, PoolInfo } from "../Pool/NodePool";

export interface PoolRegisterConfig {
    prefab: cc.Prefab;
    initCount?: number;
    maxCount?: number;
    autoExpand?: boolean;
}

/**
 * 对象池管理器
 */
export class PoolManager extends Singleton<PoolManager> {
    private _pools: Map<string, NodePool> = new Map();
    private _logger = Logger.instance;

    protected constructor() {
        super();
    }

    public register(poolName: string, config: PoolRegisterConfig): void {
        if (this._pools.has(poolName)) {
            this._logger.warn("PoolManager", `Pool "${poolName}" exists, overwriting`);
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
        this._logger.debug("PoolManager", `Pool "${poolName}" registered`);
    }

    public unregister(poolName: string): void {
        const pool = this._pools.get(poolName);
        if (pool) {
            pool.destroy();
            this._pools.delete(poolName);
        }
    }

    public get(poolName: string): cc.Node | null {
        const pool = this._pools.get(poolName);
        if (!pool) {
            this._logger.error("PoolManager", `Pool "${poolName}" not found`);
            return null;
        }
        return pool.get();
    }

    public put(poolName: string, node: cc.Node): void {
        const pool = this._pools.get(poolName);
        if (!pool) {
            this._logger.warn("PoolManager", `Pool "${poolName}" not found, destroying node`);
            node.destroy();
            return;
        }
        pool.put(node);
    }

    public preload(poolName: string, count: number): void {
        const pool = this._pools.get(poolName);
        if (!pool) {
            this._logger.error("PoolManager", `Pool "${poolName}" not found`);
            return;
        }
        pool.preload(count);
    }

    public clear(poolName: string): void {
        const pool = this._pools.get(poolName);
        if (pool) pool.clear();
    }

    public clearAll(): void {
        this._pools.forEach(pool => pool.clear());
    }

    public getPoolInfo(poolName: string): PoolInfo | null {
        const pool = this._pools.get(poolName);
        return pool ? pool.getInfo() : null;
    }

    public getAllPoolInfo(): Map<string, PoolInfo> {
        const result = new Map<string, PoolInfo>();
        this._pools.forEach((pool, name) => result.set(name, pool.getInfo()));
        return result;
    }

    public has(poolName: string): boolean {
        return this._pools.has(poolName);
    }

    public getPoolNames(): string[] {
        return Array.from(this._pools.keys());
    }

    public onDestroy(): void {
        this._pools.forEach(pool => pool.destroy());
        this._pools.clear();
    }
}