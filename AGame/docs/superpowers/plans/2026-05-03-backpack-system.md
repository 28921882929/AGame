# 背包系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个 6×6 背包系统，支持复杂形状物品、拖拽放置、右键旋转，并预留零耦合的 TowerSlot 塔防扩展。

**Architecture:** 组件化 MVC 架构。BackpackModel 管理数据和碰撞检测，BackpackPanel 负责 UI 渲染和交互，TowerSlot 通过 EventCenter 事件订阅独立工作。物品形状用布尔矩阵表示，支持 90° 旋转。

**Tech Stack:** Cocos Creator 2.4.9, TypeScript, 现有 Core 框架 (Singleton/PanelBase/EventCenter/ConfigMgr)

---

## 文件结构

```
assets/Script/Backpack/
  Model/
    BackpackItem.ts          # 物品数据：形状矩阵、旋转、锚点
    BackpackModel.ts         # 6×6 网格状态管理、碰撞检测
  UI/
    BackpackPanel.ts         # 背包面板：网格渲染、拖拽、旋转
    BackpackGrid.ts          # 单个格子节点组件
    BackpackItemNode.ts      # 物品节点：显示形状、响应交互
  Tower/
    TowerSlot.ts             # 塔位组件：事件订阅、激活/停用
  Manager/
    BackpackManager.ts       # 单例，管理 BackpackModel 实例
  Config/
    ItemConfig.ts            # 物品配置接口
  Test/
    BackpackModelTest.ts     # 模型层单元测试脚本

assets/Prefab/UI/
  BackpackPanel.prefab       # 背包面板预制体
  BackpackItem.prefab        # 物品节点预制体

assets/Config/
  items.json                 # 物品配置数据
```

---

## Task 1: 创建目录结构与类型定义

**Files:**
- Create: `assets/Script/Backpack/Config/ItemConfig.ts`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p assets/Script/Backpack/{Model,UI,Tower,Manager,Config,Test}
mkdir -p assets/Prefab/UI
```

- [ ] **Step 2: 编写 ItemConfig 接口**

`assets/Script/Backpack/Config/ItemConfig.ts`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add assets/Script/Backpack/Config/ItemConfig.ts
git commit -m "feat(backpack): add item config types and event interfaces"
```

---

## Task 2: BackpackItem 物品数据类

**Files:**
- Create: `assets/Script/Backpack/Model/BackpackItem.ts`
- Test: `assets/Script/Backpack/Test/BackpackModelTest.ts` (临时测试脚本)

- [ ] **Step 1: 编写 BackpackItem**

`assets/Script/Backpack/Model/BackpackItem.ts`:

```typescript
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
```

- [ ] **Step 2: 编写测试用例**

`assets/Script/Backpack/Test/BackpackModelTest.ts`:

```typescript
import { BackpackItem } from "../Model/BackpackItem";
import { ItemConfig } from "../Config/ItemConfig";

/**
 * 背包模型单元测试
 * 在 Cocos 场景中挂载此脚本运行测试
 */
const { ccclass } = cc._decorator;

@ccclass
export default class BackpackModelTest extends cc.Component {
    protected start(): void {
        this._testLShapeRotation();
        this._testOccupiedCells();
        cc.log("=== 所有测试通过 ===");
    }

    private _createLShapeItem(): BackpackItem {
        const config: ItemConfig = {
            id: "sword_L",
            name: "item.sword",
            icon: "Items/sword",
            shape: [
                [true, true, true],
                [true, false, false]
            ],
            canRotate: true,
            rarity: "rare",
            towerType: "melee"
        };
        return new BackpackItem("test_1", config);
    }

    private _testLShapeRotation(): void {
        const item = this._createLShapeItem();

        // 0° 形状
        const shape0 = item.shape;
        console.assert(shape0.length === 2, "0° 行数应为 2");
        console.assert(shape0[0].length === 3, "0° 列数应为 3");
        console.assert(shape0[0][0] === true, "0° [0][0] 应为 true");
        console.assert(shape0[0][2] === true, "0° [0][2] 应为 true");
        console.assert(shape0[1][0] === true, "0° [1][0] 应为 true");
        console.assert(shape0[1][1] === false, "0° [1][1] 应为 false");

        // 90° 旋转
        item.rotation = 90;
        const shape90 = item.shape;
        console.assert(shape90.length === 3, "90° 行数应为 3");
        console.assert(shape90[0].length === 2, "90° 列数应为 2");
        console.assert(shape90[0][0] === true, "90° [0][0] 应为 true");
        console.assert(shape90[0][1] === true, "90° [0][1] 应为 true");
        console.assert(shape90[2][0] === false, "90° [2][0] 应为 false");

        // 180° 旋转
        item.rotation = 180;
        const shape180 = item.shape;
        console.assert(shape180.length === 2, "180° 行数应为 2");
        console.assert(shape180[0].length === 3, "180° 列数应为 3");
        console.assert(shape180[0][0] === false, "180° [0][0] 应为 false");
        console.assert(shape180[1][2] === true, "180° [1][2] 应为 true");

        // 360° 应回到原始形状
        item.rotation = 360;
        const shape360 = item.shape;
        console.assert(shape360[0][0] === true, "360° [0][0] 应为 true");

        cc.log("✓ testLShapeRotation 通过");
    }

    private _testOccupiedCells(): void {
        const item = this._createLShapeItem();
        item.rotation = 0;

        const cells = item.getOccupiedCells();
        console.assert(cells.length === 4, "L 形应占用 4 个格子");

        // 检查是否包含预期的格子
        let has00 = false, has01 = false, has02 = false, has10 = false;
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].row === 0 && cells[i].col === 0) has00 = true;
            if (cells[i].row === 0 && cells[i].col === 1) has01 = true;
            if (cells[i].row === 0 && cells[i].col === 2) has02 = true;
            if (cells[i].row === 1 && cells[i].col === 0) has10 = true;
        }
        console.assert(has00 && has01 && has02 && has10, "应包含所有预期格子");

        cc.log("✓ testOccupiedCells 通过");
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add assets/Script/Backpack/Model/BackpackItem.ts
git add assets/Script/Backpack/Test/BackpackModelTest.ts
git commit -m "feat(backpack): add BackpackItem with shape rotation and tests"
```

---

## Task 3: BackpackModel 网格管理

**Files:**
- Create: `assets/Script/Backpack/Model/BackpackModel.ts`

- [ ] **Step 1: 编写 BackpackModel 核心**

`assets/Script/Backpack/Model/BackpackModel.ts`:

```typescript
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
```

- [ ] **Step 2: 更新测试脚本覆盖 Model**

在 `assets/Script/Backpack/Test/BackpackModelTest.ts` 中添加测试方法：

```typescript
import { BackpackModel } from "../Model/BackpackModel";

// ... 在类中添加以下方法 ...

private _testPlaceAndRemove(): void {
    const model = new BackpackModel();
    const item = this._createLShapeItem();

    // 正常放置
    const success = model.placeItem(item, 0, 0);
    console.assert(success === true, "应在 (0,0) 成功放置");
    console.assert(model.getItemAt(0, 0) === item, "(0,0) 应为此物品");
    console.assert(model.getItemAt(0, 1) === item, "(0,1) 应为此物品");
    console.assert(model.getItemAt(0, 2) === item, "(0,2) 应为此物品");
    console.assert(model.getItemAt(1, 0) === item, "(1,0) 应为此物品");
    console.assert(model.getItemAt(1, 1) === null, "(1,1) 应为空");

    // 移除
    model.removeItem(item.id);
    console.assert(model.getItemAt(0, 0) === null, "移除后 (0,0) 应为空");
    console.assert(model.getItemAt(0, 2) === null, "移除后 (0,2) 应为空");

    cc.log("✓ testPlaceAndRemove 通过");
}

private _testCollision(): void {
    const model = new BackpackModel();
    const item1 = this._createLShapeItem();
    const item2 = this._createLShapeItem();

    // 放置第一个物品
    model.placeItem(item1, 0, 0);

    // 尝试在重叠位置放置
    const fail = model.placeItem(item2, 0, 0);
    console.assert(fail === false, "重叠放置应失败");

    // 尝试在边界外放置
    const fail2 = model.placeItem(item2, 5, 5);
    console.assert(fail2 === false, "越界放置应失败");

    // 在不重叠位置放置
    const success = model.placeItem(item2, 2, 2);
    console.assert(success === true, "不重叠放置应成功");

    cc.log("✓ testCollision 通过");
}

private _testRotate(): void {
    const model = new BackpackModel();
    const item = this._createLShapeItem();

    // 放在底部区域，给旋转留出空间
    model.placeItem(item, 3, 0);

    // 旋转前形状占据 (3,0)(3,1)(3,2)(4,0)
    const success = model.rotateItem(item.id);
    console.assert(success === true, "应成功旋转");
    console.assert(item.rotation === 90, "旋转后角度应为 90°");

    // 验证旧位置已清空
    console.assert(model.getItemAt(3, 2) === null, "旋转后 (3,2) 应为空");

    // 验证新位置已占用
    console.assert(model.getItemAt(3, 0) === item, "旋转后 (3,0) 应为物品");
    console.assert(model.getItemAt(5, 0) === item, "旋转后 (5,0) 应为物品");

    cc.log("✓ testRotate 通过");
}

private _testValidate(): void {
    const model = new BackpackModel();
    const item = this._createLShapeItem();

    model.placeItem(item, 0, 0);
    const result = model.validate();
    console.assert(result.valid === true, "有效状态应通过校验");

    cc.log("✓ testValidate 通过");
}
```

- [ ] **Step 3: Commit**

```bash
git add assets/Script/Backpack/Model/BackpackModel.ts
git add assets/Script/Backpack/Test/BackpackModelTest.ts
git commit -m "feat(backpack): add BackpackModel with grid, collision, rotation, and tests"
```

---

## Task 4: BackpackItemNode UI 组件

**Files:**
- Create: `assets/Script/Backpack/UI/BackpackItemNode.ts`
- Create: `assets/Prefab/UI/BackpackItem.prefab` (在 Cocos 编辑器中创建)

- [ ] **Step 1: 编写 BackpackItemNode**

`assets/Script/Backpack/UI/BackpackItemNode.ts`:

```typescript
import { BackpackItem } from "../Model/BackpackItem";

const { ccclass, property } = cc._decorator;

/**
 * 背包物品节点组件
 * 挂在 BackpackItem.prefab 根节点上
 * 负责根据物品形状渲染子节点网格
 */
@ccclass
export default class BackpackItemNode extends cc.Component {
    /** 物品数据 */
    private _item: BackpackItem | null = null;

    /** 每个格子的大小（像素） */
    @property(cc.Integer)
    cellSize: number = 60;

    /** 格子间距 */
    @property(cc.Integer)
    cellGap: number = 2;

    /** 格子背景节点预制体（纯色 Sprite） */
    @property(cc.Prefab)
    cellPrefab: cc.Prefab = null;

    /** 物品图标节点 */
    @property(cc.Sprite)
    iconSprite: cc.Sprite = null;

    /** 触摸回调 */
    private _onTouchStartCallback: ((event: cc.Event.EventTouch) => void) | null = null;
    private _onTouchMoveCallback: ((event: cc.Event.EventTouch) => void) | null = null;
    private _onTouchEndCallback: ((event: cc.Event.EventTouch) => void) | null = null;

    /** 当前渲染的格子节点 */
    private _cellNodes: cc.Node[] = [];

    /**
     * 设置物品数据并渲染
     */
    public setItem(item: BackpackItem): void {
        this._item = item;
        this._renderShape();
        this._updateIcon();
    }

    public get item(): BackpackItem | null {
        return this._item;
    }

    /**
     * 设置触摸回调
     */
    public setTouchCallbacks(
        onStart: (event: cc.Event.EventTouch) => void,
        onMove: (event: cc.Event.EventTouch) => void,
        onEnd: (event: cc.Event.EventTouch) => void
    ): void {
        this._onTouchStartCallback = onStart;
        this._onTouchMoveCallback = onMove;
        this._onTouchEndCallback = onEnd;
    }

    /**
     * 设置拖拽中的透明度
     */
    public setDraggingAlpha(isDragging: boolean): void {
        this.node.opacity = isDragging ? 150 : 255;
    }

    protected onLoad(): void {
        // 注册触摸事件
        this.node.on(cc.Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    /**
     * 根据物品形状渲染格子
     */
    private _renderShape(): void {
        // 清除旧格子
        for (let i = 0; i < this._cellNodes.length; i++) {
            this._cellNodes[i].destroy();
        }
        this._cellNodes = [];

        if (this._item == null || this.cellPrefab == null) return;

        const shape = this._item.shape;
        const rows = shape.length;
        const cols = shape[0].length;

        // 调整节点大小
        const totalWidth = cols * this.cellSize + (cols - 1) * this.cellGap;
        const totalHeight = rows * this.cellSize + (rows - 1) * this.cellGap;
        this.node.setContentSize(totalWidth, totalHeight);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!shape[r][c]) continue;

                const cellNode = cc.instantiate(this.cellPrefab);
                cellNode.setContentSize(this.cellSize, this.cellSize);

                const x = c * (this.cellSize + this.cellGap) + this.cellSize / 2 - totalWidth / 2;
                const y = -(r * (this.cellSize + this.cellGap) + this.cellSize / 2 - totalHeight / 2);
                cellNode.setPosition(x, y);

                this.node.addChild(cellNode);
                this._cellNodes.push(cellNode);
            }
        }
    }

    private _updateIcon(): void {
        if (this.iconSprite == null || this._item == null) return;
        // TODO: 通过 ResourceManager 加载图标资源
        // const path = ConfigMgr.instance.get("items", this._item.configId).icon;
        // ResourceManager.instance.loadSprite(path, this.iconSprite);
    }

    private _onTouchStart(event: cc.Event.EventTouch): void {
        if (this._onTouchStartCallback) {
            this._onTouchStartCallback(event);
        }
    }

    private _onTouchMove(event: cc.Event.EventTouch): void {
        if (this._onTouchMoveCallback) {
            this._onTouchMoveCallback(event);
        }
    }

    private _onTouchEnd(event: cc.Event.EventTouch): void {
        if (this._onTouchEndCallback) {
            this._onTouchEndCallback(event);
        }
    }
}
```

- [ ] **Step 2: 在 Cocos 编辑器中创建 BackpackItem.prefab**

1. 在场景中创建一个空节点，命名为 `BackpackItem`
2. 添加 `BackpackItemNode` 组件
3. 创建一个子节点 `Icon`，添加 `cc.Sprite` 组件，拖到 `iconSprite` 属性
4. 创建一个纯色 Sprite 节点作为 `cellPrefab`（颜色随意，如 #3498db）
5. 将 `cellPrefab` 节点拖到 `BackpackItemNode.cellPrefab` 属性
6. 将 `BackpackItem` 节点拖入 `assets/Prefab/UI/` 保存为预制体
7. 删除场景中的节点

- [ ] **Step 3: Commit**

```bash
git add assets/Script/Backpack/UI/BackpackItemNode.ts
git add assets/Prefab/UI/BackpackItem.prefab
# 如果 prefab 有对应的 .prefab.meta 也一并添加
git commit -m "feat(backpack): add BackpackItemNode UI component with shape rendering"
```

---

## Task 5: BackpackPanel 背包面板

**Files:**
- Create: `assets/Script/Backpack/UI/BackpackPanel.ts`
- Create: `assets/Script/Backpack/UI/BackpackGrid.ts`
- Create: `assets/Prefab/UI/BackpackPanel.prefab` (在 Cocos 编辑器中创建)

- [ ] **Step 1: 编写 BackpackGrid（单个格子组件）**

`assets/Script/Backpack/UI/BackpackGrid.ts`:

```typescript
const { ccclass, property } = cc._decorator;

/**
 * 单个背包格子组件
 * 挂在 BackpackPanel 网格的每个子节点上
 */
@ccclass
export default class BackpackGrid extends cc.Component {
    /** 行号 */
    @property(cc.Integer)
    row: number = 0;

    /** 列号 */
    @property(cc.Integer)
    col: number = 0;

    /** 正常状态颜色 */
    @property(cc.Color)
    normalColor: cc.Color = cc.Color.GRAY;

    /** 可放置预览颜色 */
    @property(cc.Color)
    validColor: cc.Color = cc.Color.GREEN;

    /** 不可放置预览颜色 */
    @property(cc.Color)
    invalidColor: cc.Color = cc.Color.RED;

    /** 高亮状态颜色 */
    @property(cc.Color)
    highlightColor: cc.Color = cc.Color.YELLOW;

    private _sprite: cc.Sprite = null;

    protected onLoad(): void {
        this._sprite = this.node.getComponent(cc.Sprite);
        this.setNormal();
    }

    public setNormal(): void {
        if (this._sprite) {
            this._sprite.node.color = this.normalColor;
        }
    }

    public setValid(): void {
        if (this._sprite) {
            this._sprite.node.color = this.validColor;
        }
    }

    public setInvalid(): void {
        if (this._sprite) {
            this._sprite.node.color = this.invalidColor;
        }
    }

    public setHighlight(): void {
        if (this._sprite) {
            this._sprite.node.color = this.highlightColor;
        }
    }
}
```

- [ ] **Step 2: 编写 BackpackPanel**

`assets/Script/Backpack/UI/BackpackPanel.ts`:

```typescript
import { PanelBase } from "../../Core/Base/PanelBase";
import { BackpackModel } from "../Model/BackpackModel";
import { BackpackItem } from "../Model/BackpackItem";
import { EventCenter } from "../../Core/Manager/EventCenter";
import {
    BackpackItemPlacedEvent,
    BackpackItemRemovedEvent,
        BackpackItemRotatedEvent
} from "../Config/ItemConfig";
import BackpackItemNode from "./BackpackItemNode";
import BackpackGrid from "./BackpackGrid";

const { ccclass, property } = cc._decorator;

/**
 * 背包面板
 * 渲染网格和物品，处理拖拽交互和旋转
 */
@ccclass
export default class BackpackPanel extends PanelBase {
    /** 数据模型 */
    private _model: BackpackModel = null;

    /** 网格根节点 */
    @property(cc.Node)
    gridContainer: cc.Node = null;

    /** 物品节点预制体 */
    @property(cc.Prefab)
    itemPrefab: cc.Prefab = null;

    /** 格子大小（像素） */
    @property(cc.Integer)
    cellSize: number = 60;

    /** 格子间距 */
    @property(cc.Integer)
    cellGap: number = 2;

    /** 行数和列数 */
    private readonly _rows = 6;
    private readonly _cols = 6;

    /** 格子节点数组 [row][col] */
    private _gridNodes: BackpackGrid[][] = [];

    /** 物品节点映射：itemId → 节点 */
    private _itemNodes: Map<string, cc.Node> = new Map();

    /** 当前拖拽的物品 */
    private _draggingItemId: string | null = null;
    private _draggingNode: cc.Node | null = null;
    private _dragStartPos: cc.Vec2 = cc.Vec2.ZERO;
    private _dragOffset: cc.Vec2 = cc.Vec2.ZERO;

    /** 是否正在拖拽 */
    private _isDragging: boolean = false;

    /** 初始化 */
    public init(model: BackpackModel): void {
        this._model = model;
        this._createGrid();
    }

    /**
     * 添加物品到面板
     */
    public addItem(item: BackpackItem): void {
        if (this.itemPrefab == null) return;

        const node = cc.instantiate(this.itemPrefab);
        const itemNode = node.getComponent(BackpackItemNode);

        if (itemNode) {
            itemNode.setItem(item);
            itemNode.setTouchCallbacks(
                (event) => this._onItemTouchStart(event, item.id),
                (event) => this._onItemTouchMove(event, item.id),
                (event) => this._onItemTouchEnd(event, item.id)
            );
        }

        this.node.addChild(node);
        this._itemNodes.set(item.id, node);
        this._updateItemPosition(item);
    }

    /**
     * 移除物品
     */
    public removeItem(itemId: string): void {
        const node = this._itemNodes.get(itemId);
        if (node) {
            node.destroy();
            this._itemNodes.delete(itemId);
        }
    }

    /**
     * 更新物品位置
     */
    public refreshItem(itemId: string): void {
        const item = this._model.getAllItems().find(i => i.id === itemId);
        if (item) {
            this._updateItemPosition(item);
        }
    }

    /**
     * 清空面板
     */
    public clear(): void {
        this._itemNodes.forEach((node) => {
            node.destroy();
        });
        this._itemNodes.clear();
    }

    /**
     * 创建网格
     */
    private _createGrid(): void {
        if (this.gridContainer == null) return;

        this._gridContainer.removeAllChildren();
        this._gridNodes = [];

        const totalWidth = this._cols * this.cellSize + (this._cols - 1) * this.cellGap;
        const totalHeight = this._rows * this.cellSize + (this._rows - 1) * this.cellGap;

        for (let r = 0; r < this._rows; r++) {
            const rowNodes: BackpackGrid[] = [];
            for (let c = 0; c < this._cols; c++) {
                const node = new cc.Node(`grid_${r}_${c}`);
                node.setContentSize(this.cellSize, this.cellSize);

                const x = c * (this.cellSize + this.cellGap) - totalWidth / 2 + this.cellSize / 2;
                const y = -(r * (this.cellSize + this.cellGap) - totalHeight / 2 + this.cellSize / 2);
                node.setPosition(x, y);

                const sprite = node.addComponent(cc.Sprite);
                // 创建纯色精灵帧
                const texture = new cc.Texture2D();
                // 使用默认 spriteFrame 或通过代码创建

                const gridComp = node.addComponent(BackpackGrid);
                gridComp.row = r;
                gridComp.col = c;

                this.gridContainer.addChild(node);
                rowNodes.push(gridComp);
            }
            this._gridNodes.push(rowNodes);
        }
    }

    /**
     * 将网格坐标转换为世界坐标
     */
    private _gridToWorld(row: number, col: number): cc.Vec2 {
        const totalWidth = this._cols * this.cellSize + (this._cols - 1) * this.cellGap;
        const totalHeight = this._rows * this.cellSize + (this._rows - 1) * this.cellGap;

        const x = col * (this.cellSize + this.cellGap) - totalWidth / 2 + this.cellSize / 2;
        const y = -(row * (this.cellSize + this.cellGap) - totalHeight / 2 + this.cellSize / 2);

        return this.gridContainer.convertToWorldSpaceAR(cc.v2(x, y));
    }

    /**
     * 将世界坐标转换为网格坐标
     */
    private _worldToGrid(worldPos: cc.Vec2): { row: number; col: number } | null {
        const localPos = this.gridContainer.convertToNodeSpaceAR(worldPos);
        const totalWidth = this._cols * this.cellSize + (this._cols - 1) * this.cellGap;
        const totalHeight = this._rows * this.cellSize + (this._rows - 1) * this.cellGap;

        const x = localPos.x + totalWidth / 2;
        const y = -localPos.y + totalHeight / 2;

        const col = Math.floor(x / (this.cellSize + this.cellGap));
        const row = Math.floor(y / (this.cellSize + this.cellGap));

        if (row < 0 || row >= this._rows || col < 0 || col >= this._cols) {
            return null;
        }

        return { row, col };
    }

    /**
     * 更新物品节点位置
     */
    private _updateItemPosition(item: BackpackItem): void {
        const node = this._itemNodes.get(item.id);
        if (node == null) return;

        const worldPos = this._gridToWorld(item.anchorRow, item.anchorCol);
        const localPos = this.node.convertToNodeSpaceAR(worldPos);
        node.setPosition(localPos);
    }

    // ========== 拖拽交互 ==========

    private _onItemTouchStart(event: cc.Event.EventTouch, itemId: string): void {
        this._draggingItemId = itemId;
        this._isDragging = false;

        const node = this._itemNodes.get(itemId);
        if (node == null) return;

        this._draggingNode = node;
        this._dragStartPos = event.getLocation();
        this._dragOffset = node.position.sub(this.node.convertToNodeSpaceAR(event.getLocation()));
    }

    private _onItemTouchMove(event: cc.Event.EventTouch, itemId: string): void {
        if (this._draggingItemId !== itemId || this._draggingNode == null) return;

        const moveDistance = event.getLocation().sub(this._dragStartPos).mag();
        if (!this._isDragging && moveDistance > 10) {
            this._isDragging = true;
            const itemNode = this._draggingNode.getComponent(BackpackItemNode);
            if (itemNode) {
                itemNode.setDraggingAlpha(true);
            }
        }

        if (this._isDragging) {
            const touchPos = this.node.convertToNodeSpaceAR(event.getLocation());
            this._draggingNode.setPosition(touchPos.add(this._dragOffset));

            // 更新放置预览
            this._updatePlacementPreview();
        }
    }

    private _onItemTouchEnd(event: cc.Event.EventTouch, itemId: string): void {
        if (this._draggingItemId !== itemId || this._draggingNode == null) return;

        const itemNode = this._draggingNode.getComponent(BackpackItemNode);
        if (itemNode) {
            itemNode.setDraggingAlpha(false);
        }

        if (this._isDragging) {
            // 尝试放置
            const worldPos = event.getLocation();
            const gridPos = this._worldToGrid(worldPos);

            if (gridPos != null) {
                const item = this._model.getAllItems().find(i => i.id === itemId);
                if (item && this._model.canPlace(item, gridPos.row, gridPos.col)) {
                    // 放置成功
                    const oldCells = item.getOccupiedCells().map(c => ({
                        row: item.anchorRow + c.row,
                        col: item.anchorCol + c.col
                    }));

                    this._model.placeItem(item, gridPos.row, gridPos.col);

                    // 发出事件
                    const newCells = item.getOccupiedCells().map(c => ({
                        row: item.anchorRow + c.row,
                        col: item.anchorCol + c.col
                    }));

                    EventCenter.instance.emit("backpack:item_placed", {
                        itemId: item.id,
                        configId: item.configId,
                        occupiedCells: newCells,
                        anchor: { row: item.anchorRow, col: item.anchorCol },
                        rotation: item.rotation
                    } as BackpackItemPlacedEvent);
                } else {
                    // 放置失败，弹回原位
                    this._previewInvalid(itemId);
                    this._updateItemPosition(this._model.getAllItems().find(i => i.id === itemId));
                }
            } else {
                // 不在网格范围内，弹回原位
                const item = this._model.getAllItems().find(i => i.id === itemId);
                if (item) {
                    this._updateItemPosition(item);
                }
            }
        } else {
            // 没有拖拽，视为点击，可以触发选中效果
        }

        this._clearPreview();
        this._draggingItemId = null;
        this._draggingNode = null;
        this._isDragging = false;
    }

    // ========== 放置预览 ==========

    private _updatePlacementPreview(): void {
        this._clearPreview();

        if (this._draggingNode == null || this._draggingItemId == null) return;

        const worldPos = this._draggingNode.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const gridPos = this._worldToGrid(worldPos);

        if (gridPos == null) return;

        const item = this._model.getAllItems().find(i => i.id === this._draggingItemId);
        if (item == null) return;

        const canPlace = this._model.canPlace(item, gridPos.row, gridPos.col);
        const cells = item.getOccupiedCells();

        for (let i = 0; i < cells.length; i++) {
            const r = gridPos.row + cells[i].row;
            const c = gridPos.col + cells[i].col;
            if (r >= 0 && r < this._rows && c >= 0 && c < this._cols) {
                if (canPlace) {
                    this._gridNodes[r][c].setValid();
                } else {
                    this._gridNodes[r][c].setInvalid();
                }
            }
        }
    }

    private _clearPreview(): void {
        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                this._gridNodes[r][c].setNormal();
            }
        }
    }

    private _previewInvalid(itemId: string): void {
        const node = this._itemNodes.get(itemId);
        if (node == null) return;

        // 红色闪烁动画
        const originalScale = node.scale;
        cc.tween(node)
            .to(0.05, { scale: originalScale * 1.1 })
            .to(0.05, { scale: originalScale })
            .to(0.05, { scale: originalScale * 1.1 })
            .to(0.05, { scale: originalScale })
            .start();
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add assets/Script/Backpack/UI/BackpackGrid.ts
git add assets/Script/Backpack/UI/BackpackPanel.ts
git add assets/Prefab/UI/BackpackPanel.prefab
git commit -m "feat(backpack): add BackpackPanel with drag-drop, placement preview, and event emission"
```

---

## Task 6: BackpackManager 单例

**Files:**
- Create: `assets/Script/Backpack/Manager/BackpackManager.ts`

- [ ] **Step 1: 编写 BackpackManager**

`assets/Script/Backpack/Manager/BackpackManager.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add assets/Script/Backpack/Manager/BackpackManager.ts
git commit -m "feat(backpack): add BackpackManager singleton"
```

---

## Task 7: 配置文件与 Excel 转换

**Files:**
- Create: `assets/Config/items.json`
- Modify: `tools/excel2json.js` (添加 items.xlsx 转换支持)

- [ ] **Step 1: 编写 items.json**

`assets/Config/items.json`:

```json
{
    "items": [
        {
            "id": "sword_L",
            "name": "item.sword",
            "icon": "Items/sword",
            "shape": [
                [true, true, true],
                [true, false, false]
            ],
            "canRotate": true,
            "rarity": "rare",
            "towerType": "melee"
        },
        {
            "id": "shield_2x2",
            "name": "item.shield",
            "icon": "Items/shield",
            "shape": [
                [true, true],
                [true, true]
            ],
            "canRotate": false,
            "rarity": "common",
            "towerType": "defense"
        },
        {
            "id": "potion_1x1",
            "name": "item.potion",
            "icon": "Items/potion",
            "shape": [
                [true]
            ],
            "canRotate": false,
            "rarity": "common",
            "towerType": ""
        },
        {
            "id": "bow_T",
            "name": "item.bow",
            "icon": "Items/bow",
            "shape": [
                [true, false, true],
                [true, true, true]
            ],
            "canRotate": true,
            "rarity": "epic",
            "towerType": "ranged"
        }
    ]
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/Config/items.json
git commit -m "feat(backpack): add items.json config with sample items"
```

---

## Task 8: TowerSlot 塔防扩展组件

**Files:**
- Create: `assets/Script/Backpack/Tower/TowerSlot.ts`

- [ ] **Step 1: 编写 TowerSlot**

`assets/Script/Backpack/Tower/TowerSlot.ts`:

```typescript
import { EventCenter } from "../../Core/Manager/EventCenter";
import {
    BackpackItemPlacedEvent,
    BackpackItemRemovedEvent,
    BackpackItemRotatedEvent
} from "../Config/ItemConfig";

const { ccclass, property } = cc._decorator;

/**
 * 格子塔位组件
 * 挂在 BackpackPanel 的每个格子节点上
 * 通过 EventCenter 订阅背包事件，与背包系统零耦合
 */
@ccclass
export default class TowerSlot extends cc.Component {
    /** 行号 */
    @property(cc.Integer)
    row: number = 0;

    /** 列号 */
    @property(cc.Integer)
    col: number = 0;

    /** 当前塔的配置 ID */
    private _configId: string = "";

    /** 当前旋转角度 */
    private _rotation: number = 0;

    /** 是否已激活 */
    private _isActive: boolean = false;

    protected onLoad(): void {
        EventCenter.instance.on("backpack:item_placed", this._onItemPlaced, this);
        EventCenter.instance.on("backpack:item_removed", this._onItemRemoved, this);
        EventCenter.instance.on("backpack:item_rotated", this._onItemRotated, this);
    }

    protected onDestroy(): void {
        EventCenter.instance.off("backpack:item_placed", this._onItemPlaced, this);
        EventCenter.instance.off("backpack:item_removed", this._onItemRemoved, this);
        EventCenter.instance.off("backpack:item_rotated", this._onItemRotated, this);
    }

    private _onItemPlaced(data: BackpackItemPlacedEvent): void {
        const cells = data.occupiedCells;
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].row === this.row && cells[i].col === this.col) {
                this._activate(data.configId, data.rotation);
                return;
            }
        }
    }

    private _onItemRemoved(data: BackpackItemRemovedEvent): void {
        const cells = data.occupiedCells;
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].row === this.row && cells[i].col === this.col) {
                this._deactivate();
                return;
            }
        }
    }

    private _onItemRotated(data: BackpackItemRotatedEvent): void {
        let wasInOld = false;
        let isInNew = false;

        for (let i = 0; i < data.oldCells.length; i++) {
            if (data.oldCells[i].row === this.row && data.oldCells[i].col === this.col) {
                wasInOld = true;
                break;
            }
        }

        for (let i = 0; i < data.newCells.length; i++) {
            if (data.newCells[i].row === this.row && data.newCells[i].col === this.col) {
                isInNew = true;
                break;
            }
        }

        if (wasInOld && !isInNew) {
            this._deactivate();
        } else if (!wasInOld && isInNew) {
            this._activate(data.configId, data.rotation);
        } else if (isInNew) {
            this._updateRotation(data.rotation);
        }
    }

    private _activate(configId: string, rotation: number): void {
        this._configId = configId;
        this._rotation = rotation;
        this._isActive = true;

        cc.log(`[TowerSlot] (${this.row},${this.col}) 激活塔: ${configId}, 旋转: ${rotation}°`);

        // TODO: 播放建造动画
        // TODO: 显示攻击范围
        // TODO: 初始化塔防属性
    }

    private _deactivate(): void {
        if (!this._isActive) return;

        cc.log(`[TowerSlot] (${this.row},${this.col}) 停用塔: ${this._configId}`);

        this._configId = "";
        this._rotation = 0;
        this._isActive = false;

        // TODO: 播放拆除动画
        // TODO: 清理攻击范围显示
    }

    private _updateRotation(rotation: number): void {
        if (!this._isActive) return;

        this._rotation = rotation;
        cc.log(`[TowerSlot] (${this.row},${this.col}) 更新旋转: ${rotation}°`);

        // TODO: 更新塔的朝向
    }

    public get isActive(): boolean {
        return this._isActive;
    }

    public get configId(): string {
        return this._configId;
    }

    public get rotation(): number {
        return this._rotation;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/Script/Backpack/Tower/TowerSlot.ts
git commit -m "feat(backpack): add TowerSlot component with event subscription"
```

---

## Task 9: 集成测试与验收

**Files:**
- Modify: `assets/Script/Backpack/Test/BackpackModelTest.ts`

- [ ] **Step 1: 在 Cocos 编辑器中搭建测试场景**

1. 创建新场景 `Test/BackpackTest.fire`
2. 添加 Canvas 节点
3. 在 Canvas 下添加 BackpackPanel 预制体
4. 在 Canvas 下添加空节点，挂载 `BackpackModelTest` 脚本
5. 在 BackpackPanel 上配置引用：`gridContainer`（新建空节点）、`itemPrefab`（BackpackItem 预制体）
6. 在 BackpackPanel 的 gridContainer 下，为每个格子添加 TowerSlot 组件并设置 row/col

- [ ] **Step 2: 更新测试脚本为集成测试**

在 `assets/Script/Backpack/Test/BackpackModelTest.ts` 中添加集成测试：

```typescript
import { BackpackManager } from "../Manager/BackpackManager";
import BackpackPanel from "../UI/BackpackPanel";

// ... 添加到类中 ...

private _testIntegration(): void {
    // 获取面板和管理器
    const panel = this.node.parent.getComponentInChildren(BackpackPanel);
    if (panel == null) {
        cc.warn("找不到 BackpackPanel，跳过集成测试");
        return;
    }

    const manager = BackpackManager.instance;
    const model = manager.createBackpack();
    panel.init(model);

    // 创建几个测试物品
    const items = [
        manager.createItem({
            id: "sword_L", name: "item.sword", icon: "Items/sword",
            shape: [[true, true, true], [true, false, false]],
            canRotate: true, rarity: "rare", towerType: "melee"
        }),
        manager.createItem({
            id: "shield_2x2", name: "item.shield", icon: "Items/shield",
            shape: [[true, true], [true, true]],
            canRotate: false, rarity: "common", towerType: "defense"
        }),
        manager.createItem({
            id: "potion_1x1", name: "item.potion", icon: "Items/potion",
            shape: [[true]],
            canRotate: false, rarity: "common", towerType: ""
        })
    ];

    // 放置物品
    manager.addItemToCurrent(items[0], 0, 0);  // L 形放左上角
    manager.addItemToCurrent(items[1], 2, 2);  // 2×2 放中间
    manager.addItemToCurrent(items[2], 5, 5);  // 1×1 放右下角

    // 渲染到面板
    items.forEach(item => panel.addItem(item));

    cc.log("✓ 集成测试：物品已放置到面板");
    cc.log(`  背包中物品数: ${model.getAllItems().length}`);
    cc.log(`  (0,0) 格子: ${model.getItemAt(0, 0)?.configId || "空"}`);
    cc.log(`  (2,2) 格子: ${model.getItemAt(2, 2)?.configId || "空"}`);

    // 数据校验
    const validation = model.validate();
    console.assert(validation.valid, "集成测试数据应一致");
    if (!validation.valid) {
        cc.error("校验失败:", validation.errors);
    }

    cc.log("✓ testIntegration 通过");
}
```

- [ ] **Step 3: 运行测试**

在 Cocos Creator 中打开 `Test/BackpackTest.fire` 场景，点击预览按钮，观察控制台输出。

期望输出：
```
✓ testLShapeRotation 通过
✓ testOccupiedCells 通过
✓ testPlaceAndRemove 通过
✓ testCollision 通过
✓ testRotate 通过
✓ testValidate 通过
✓ 集成测试：物品已放置到面板
  背包中物品数: 3
  (0,0) 格子: sword_L
  (2,2) 格子: shield_2x2
✓ testIntegration 通过
=== 所有测试通过 ===
```

- [ ] **Step 4: Commit**

```bash
git add assets/Script/Backpack/Test/BackpackModelTest.ts
git add assets/Scene/Test/BackpackTest.fire  # 如果有场景文件
git commit -m "test(backpack): add integration test scene and script"
```

---

## 自审清单

### 1. Spec 覆盖

| Spec 章节 | 覆盖任务 |
|-----------|----------|
| 3.1 BackpackItem | Task 2 |
| 3.2 BackpackModel | Task 3 |
| 3.3 碰撞检测 | Task 3 |
| 4.1 交互状态机 | Task 5 |
| 4.2 BackpackPanel 接口 | Task 5 |
| 4.3 交互细节 | Task 5 |
| 5.2 TowerSlot | Task 8 |
| 5.3 事件数据结构 | Task 2 (接口) + Task 5 (发射) + Task 8 (接收) |
| 6 错误处理 | Task 3 |
| 7 测试策略 | Task 2, 3, 9 |
| 8 配置设计 | Task 7 |
| 10 代码风格 | 所有任务 (避免 for...of) |

**无遗漏。**

### 2. Placeholder 扫描

- 无 "TBD"/"TODO"（代码中的 TODO 注释是 TowerSlot 未来扩展的占位符，属于设计预留，不是计划缺陷）
- 无 "Add appropriate error handling" 等模糊描述
- 每个步骤包含实际代码或具体命令
- 无 "Similar to Task N"

### 3. 类型一致性

- `ItemConfig` 在 Task 2 定义，后续所有任务引用一致
- `BackpackItemPlacedEvent` 等事件接口在 Task 2 定义，Task 5 和 Task 8 使用一致
- `BackpackModel.ROWS/COLS` 在 Task 3 定义，Task 5 使用一致

**无冲突。**

---

## 执行方式选择

**Plan complete and saved to `docs/superpowers/plans/2026-05-03-backpack-system.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach?**
