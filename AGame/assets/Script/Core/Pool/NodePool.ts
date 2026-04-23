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