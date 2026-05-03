import { BackpackItem } from "./BackpackItem";
import { GridCell } from "../Config/ItemConfig";

/**
 * 背包数据模型
 * 管理 6×6 网格状态和物品放置/移除/旋转
 * 不包含任何 UI 逻辑
 */
export class BackpackModel {
    /** 网格行数 */
    public static readonly ROWS = 6;

    /** 网格列数 */
    public static readonly COLS = 6;

    /** 6×6 网格，存储 itemId 或 null */
    private _grid: (string | null)[][];

    /** 物品实例映射：itemId → BackpackItem */
    private _items: Map<string, BackpackItem>;

    constructor() {
        this._grid = [];
        for (let r = 0; r < BackpackModel.ROWS; r++) {
            const row: (string | null)[] = [];
            for (let c = 0; c < BackpackModel.COLS; c++) {
                row.push(null);
            }
            this._grid.push(row);
        }

        this._items = new Map<string, BackpackItem>();
    }

    /**
     * 检测物品是否可以放置在指定锚点位置
     */
    public canPlace(item: BackpackItem, anchorRow: number, anchorCol: number): boolean {
        if (item == null) return false;

        const cells = item.getOccupiedCells();

        for (let i = 0; i < cells.length; i++) {
            const r = anchorRow + cells[i].row;
            const c = anchorCol + cells[i].col;

            if (r < 0 || r >= BackpackModel.ROWS || c < 0 || c >= BackpackModel.COLS) {
                return false;
            }

            const existingId = this._grid[r][c];
            if (existingId !== null && existingId !== item.id) {
                return false;
            }
        }

        return true;
    }

    /**
     * 放置物品到指定位置
     * 如果物品已在背包中，先自动移除旧位置
     */
    public placeItem(item: BackpackItem, anchorRow: number, anchorCol: number): boolean {
        if (!this.canPlace(item, anchorRow, anchorCol)) {
            return false;
        }

        // 如果物品已在背包中，先移除旧位置
        if (this._items.has(item.id)) {
            this._clearItemFromGrid(item.id);
        }

        // 更新物品位置
        item.anchorRow = anchorRow;
        item.anchorCol = anchorCol;

        // 写入网格
        const cells = item.getOccupiedCells();
        for (let i = 0; i < cells.length; i++) {
            const r = anchorRow + cells[i].row;
            const c = anchorCol + cells[i].col;
            this._grid[r][c] = item.id;
        }

        this._items.set(item.id, item);
        return true;
    }

    /**
     * 从背包中移除物品
     */
    public removeItem(itemId: string): void {
        if (!this._items.has(itemId)) {
            cc.warn(`[BackpackModel] 移除不存在的物品: ${itemId}`);
            return;
        }

        this._clearItemFromGrid(itemId);
        this._items.delete(itemId);
    }

    /**
     * 顺时针旋转物品 90°
     * 旋转后检测碰撞，失败则回滚并返回 false
     */
    public rotateItem(itemId: string): boolean {
        const item = this._items.get(itemId);
        if (item == null) {
            cc.warn(`[BackpackModel] 旋转不存在的物品: ${itemId}`);
            return false;
        }

        if (!item.canRotate) {
            return false;
        }

        const oldRotation = item.rotation;
        const newRotation = (oldRotation + 90) % 360;

        // 暂存旧占用格子用于回滚
        const oldCells = item.getOccupiedCells();

        // 尝试新旋转
        item.rotation = newRotation;
        const newCells = item.getOccupiedCells();

        // 检查新位置是否可行
        if (!this.canPlace(item, item.anchorRow, item.anchorCol)) {
            item.rotation = oldRotation;
            return false;
        }

        // 更新网格：清除旧位置，写入新位置
        this._clearItemCells(oldCells, item.anchorRow, item.anchorCol);

        for (let i = 0; i < newCells.length; i++) {
            const r = item.anchorRow + newCells[i].row;
            const c = item.anchorCol + newCells[i].col;
            this._grid[r][c] = item.id;
        }

        return true;
    }

    /**
     * 获取指定格子上的物品
     */
    public getItemAt(row: number, col: number): BackpackItem | null {
        if (row < 0 || row >= BackpackModel.ROWS || col < 0 || col >= BackpackModel.COLS) {
            return null;
        }

        const itemId = this._grid[row][col];
        if (itemId == null) return null;

        return this._items.get(itemId) || null;
    }

    /**
     * 获取背包中所有物品
     */
    public getAllItems(): BackpackItem[] {
        const items: BackpackItem[] = [];
        this._items.forEach((item) => {
            items.push(item);
        });
        return items;
    }

    /**
     * 获取网格引用（只读，用于 UI 渲染）
     */
    public get grid(): readonly (string | null)[][] {
        return this._grid;
    }

    /**
     * 数据一致性校验
     */
    public validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 1. 检查每个物品的占用格子是否与 _grid 一致
        this._items.forEach((item, itemId) => {
            const cells = item.getOccupiedCells();
            for (let i = 0; i < cells.length; i++) {
                const r = item.anchorRow + cells[i].row;
                const c = item.anchorCol + cells[i].col;
                if (r < 0 || r >= BackpackModel.ROWS || c < 0 || c >= BackpackModel.COLS) {
                    errors.push(`物品 ${itemId} 格子越界: [${r}][${c}]`);
                } else if (this._grid[r][c] !== itemId) {
                    errors.push(`物品 ${itemId} 期望 grid[${r}][${c}] = ${itemId}, 实际 = ${this._grid[r][c]}`);
                }
            }
        });

        // 2. 检查 _grid 中引用的 itemId 是否存在于 _items
        for (let r = 0; r < BackpackModel.ROWS; r++) {
            for (let c = 0; c < BackpackModel.COLS; c++) {
                const itemId = this._grid[r][c];
                if (itemId != null && !this._items.has(itemId)) {
                    errors.push(`grid[${r}][${c}] 引用了不存在的物品: ${itemId}`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * 从网格中清除指定物品的所有占用
     */
    private _clearItemFromGrid(itemId: string): void {
        const item = this._items.get(itemId);
        if (item == null) return;

        const cells = item.getOccupiedCells();
        this._clearItemCells(cells, item.anchorRow, item.anchorCol);
    }

    /**
     * 清除指定相对格子数组在绝对坐标上的占用
     */
    private _clearItemCells(cells: GridCell[], anchorRow: number, anchorCol: number): void {
        for (let i = 0; i < cells.length; i++) {
            const r = anchorRow + cells[i].row;
            const c = anchorCol + cells[i].col;
            if (r >= 0 && r < BackpackModel.ROWS && c >= 0 && c < BackpackModel.COLS) {
                this._grid[r][c] = null;
            }
        }
    }
}
