/**
 * 物品配置数据接口
 * 对应 items.json 中的单条配置
 */
export interface ItemConfig {
    /** 唯一标识 */
    id: string;

    /** 显示名称（多语言 key） */
    name: string;

    /** 图标资源路径 */
    icon: string;

    /** 形状矩阵：true=占用, false=空 */
    shape: boolean[][];

    /** 是否允许旋转 */
    canRotate: boolean;

    /** 稀有度 */
    rarity: string;

    /** 塔防类型（空字符串表示非塔） */
    towerType: string;
}

/** 格子坐标 */
export interface GridCell {
    row: number;
    col: number;
}

/** 背包事件数据结构 */
export interface BackpackItemPlacedEvent {
    itemId: string;
    configId: string;
    occupiedCells: GridCell[];
    anchor: GridCell;
    rotation: number;
}

export interface BackpackItemRemovedEvent {
    itemId: string;
    occupiedCells: GridCell[];
}

export interface BackpackItemRotatedEvent {
    itemId: string;
    configId: string;
    oldCells: GridCell[];
    newCells: GridCell[];
    rotation: number;
}
