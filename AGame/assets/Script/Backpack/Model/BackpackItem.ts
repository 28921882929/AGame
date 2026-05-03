import { ItemConfig, GridCell } from "../Config/ItemConfig";

/**
 * 背包物品数据类
 * 纯数据，不包含任何 UI 逻辑
 */
export class BackpackItem {
    /** 实例唯一 ID */
    public readonly id: string;

    /** 配置表 ID */
    public readonly configId: string;

    /** 左上角锚点行 */
    public anchorRow: number = 0;

    /** 左上角锚点列 */
    public anchorCol: number = 0;

    /** 旋转角度 (0 | 90 | 180 | 270) */
    public rotation: number = 0;

    /** 原始形状矩阵（来自配置） */
    private _baseShape: boolean[][];

    /** 是否允许旋转 */
    public readonly canRotate: boolean;

    constructor(id: string, config: ItemConfig) {
        this.id = id;
        this.configId = config.id;
        this.canRotate = config.canRotate;

        // 深拷贝形状矩阵，防止修改配置数据
        this._baseShape = [];
        for (let r = 0; r < config.shape.length; r++) {
            const row: boolean[] = [];
            for (let c = 0; c < config.shape[r].length; c++) {
                row.push(config.shape[r][c]);
            }
            this._baseShape.push(row);
        }
    }

    /**
     * 获取当前旋转后的形状矩阵
     */
    public get shape(): boolean[][] {
        return this._getRotatedShape(this.rotation);
    }

    /**
     * 获取该物品占用的所有格子（相对锚点的坐标）
     */
    public getOccupiedCells(): GridCell[] {
        const cells: GridCell[] = [];
        const shape = this.shape;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    cells.push({ row: r, col: c });
                }
            }
        }

        return cells;
    }

    /**
     * 获取旋转后的新形状（不修改自身）
     */
    public getRotatedShape(rotation: number): boolean[][] {
        return this._getRotatedShape(rotation);
    }

    /**
     * 计算旋转后的形状矩阵
     * 算法：先转置矩阵，再水平翻转
     * 每次 90° 旋转 = 一次转置 + 翻转
     */
    private _getRotatedShape(rotation: number): boolean[][] {
        const steps = ((rotation % 360) + 360) % 360 / 90;
        let result = this._baseShape;

        for (let i = 0; i < steps; i++) {
            result = this._rotate90(result);
        }

        return result;
    }

    /**
     * 顺时针旋转 90°
     */
    private _rotate90(matrix: boolean[][]): boolean[][] {
        if (matrix.length === 0) return [];

        const rows = matrix.length;
        const cols = matrix[0].length;
        const result: boolean[][] = [];

        for (let c = 0; c < cols; c++) {
            const newRow: boolean[] = [];
            for (let r = rows - 1; r >= 0; r--) {
                newRow.push(matrix[r][c]);
            }
            result.push(newRow);
        }

        return result;
    }
}
