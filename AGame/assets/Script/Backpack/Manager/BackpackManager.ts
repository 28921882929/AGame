import { Singleton } from "../../Core/Base/Singleton";
import { BackpackModel } from "../Model/BackpackModel";
import { BackpackItem } from "../Model/BackpackItem";
import { ItemConfig } from "../Config/ItemConfig";
import { Logger } from "../../Core/Utils/Logger";

/**
 * 背包管理器（单例）
 * 管理所有 BackpackModel 实例，对外提供统一接口
 */
export class BackpackManager extends Singleton<BackpackManager> {
    private _logger = Logger.instance;

    /** 当前激活的背包模型 */
    private _currentModel: BackpackModel | null = null;

    /** 物品实例计数器 */
    private _itemIdCounter: number = 0;

    public constructor() {
        super();
    }

    /**
     * 创建新背包
     */
    public createBackpack(): BackpackModel {
        this._currentModel = new BackpackModel();
        this._logger.info("BackpackManager", "创建新背包");
        return this._currentModel;
    }

    /**
     * 获取当前背包
     */
    public get currentModel(): BackpackModel | null {
        return this._currentModel;
    }

    /**
     * 创建物品实例
     */
    public createItem(config: ItemConfig): BackpackItem {
        this._itemIdCounter++;
        const itemId = `item_${this._itemIdCounter}`;
        return new BackpackItem(itemId, config);
    }

    /**
     * 将物品放入当前背包
     */
    public addItemToCurrent(item: BackpackItem, row: number, col: number): boolean {
        if (this._currentModel == null) {
            this._logger.warn("BackpackManager", "没有激活的背包");
            return false;
        }
        return this._currentModel.placeItem(item, row, col);
    }

    /**
     * 从当前背包移除物品
     */
    public removeItemFromCurrent(itemId: string): void {
        if (this._currentModel == null) return;
        this._currentModel.removeItem(itemId);
    }

    /**
     * 旋转当前背包中的物品
     */
    public rotateItemInCurrent(itemId: string): boolean {
        if (this._currentModel == null) return false;
        return this._currentModel.rotateItem(itemId);
    }

    /**
     * 清理
     */
    public clear(): void {
        this._currentModel = null;
        this._itemIdCounter = 0;
        this._logger.info("BackpackManager", "已清理");
    }
}
