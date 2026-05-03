# 背包系统架构设计文档

**日期**: 2026-05-03
**范围**: 背包网格管理 + 物品系统 + TowerSlot 塔防扩展预留
**引擎**: Cocos Creator 2.4.9

---

## 1. 设计目标

为类似《背包乱斗》的游戏构建一个可扩展的背包系统：

- 6×6 网格，支持复杂形状物品（L/T/Z 形等）
- 物品支持 90° 旋转
- 拖拽放置 + 实时碰撞预览
- 零耦合的塔防扩展（背包格子即塔位）
- 不与堆叠机制

---

## 2. 架构总览

### 2.1 模块分层

```
┌─────────────────────────────────────────┐
│  BackpackManager (Singleton)            │
│  管理所有 BackpackModel 实例              │
├─────────────────────────────────────────┤
│  BackpackModel      │  BackpackItem      │
│  网格/碰撞/旋转      │  物品数据           │
├─────────────────────────────────────────┤
│  BackpackPanel (extends PanelBase)      │
│  网格渲染/拖拽/预览/旋转交互              │
├─────────────────────────────────────────┤
│  TowerSlot (cc.Component, 挂在格子上)   │
│  通过 EventCenter 订阅背包事件            │
└─────────────────────────────────────────┘
```

### 2.2 设计原则

1. **Model 无 UI 依赖**：BackpackModel 只处理数据逻辑，可被单元测试覆盖
2. **Panel 只负责渲染和交互**：任何游戏逻辑都委托给 Model
3. **TowerSlot 与背包零耦合**：TowerSlot 不引用任何背包类，只监听 EventCenter 事件
4. **物品形状用布尔矩阵表示**：支持任意复杂形状和旋转

---

## 3. 核心类设计

### 3.1 BackpackItem（物品数据）

```typescript
class BackpackItem {
    /** 实例唯一 ID */
    id: string;

    /** 配置表 ID */
    configId: string;

    /** 左上角锚点行 */
    anchorRow: number;

    /** 左上角锚点列 */
    anchorCol: number;

    /** 旋转角度 (0 | 90 | 180 | 270) */
    rotation: number = 0;

    /** 原始形状矩阵（来自配置） */
    private _baseShape: boolean[][];

    /** 获取旋转后的当前形状 */
    get shape(): boolean[][];

    /** 获取该物品占用的所有格子（相对坐标） */
    getOccupiedCells(): { row: number; col: number }[];

    /** 获取旋转后的新形状（不修改自身） */
    getRotatedShape(rotation: number): boolean[][];
}
```

### 3.2 BackpackModel（数据核心）

```typescript
class BackpackModel {
    /** 6×6 网格，存储 itemId 或 null */
    private _grid: (string | null)[][];

    /** 物品实例映射 */
    private _items: Map<string, BackpackItem>;

    /**
     * 检测物品是否可以放置在指定位置
     * 检查边界和与其他物品的重叠
     */
    canPlace(item: BackpackItem, row: number, col: number): boolean;

    /**
     * 放置物品到指定位置
     * 如果物品已在背包中，先自动移除旧位置
     * 返回是否成功
     */
    placeItem(item: BackpackItem, row: number, col: number): boolean;

    /** 从背包中移除物品 */
    removeItem(itemId: string): void;

    /**
     * 顺时针旋转物品 90°
     * 旋转后检测碰撞，失败则回滚并返回 false
     */
    rotateItem(itemId: string): boolean;

    /** 获取指定格子上的物品 */
    getItemAt(row: number, col: number): BackpackItem | null;

    /** 获取背包中所有物品 */
    getAllItems(): BackpackItem[];

    /** 数据一致性校验 */
    validate(): { valid: boolean; errors: string[] };

    /** 自动修复不一致（开发调试用） */
    repair(): void;
}
```

### 3.3 碰撞检测算法

```typescript
// canPlace 伪代码（不使用 for...of）
function canPlace(item: BackpackItem, row: number, col: number): boolean {
    const cells = item.getOccupiedCells();
    for (let i = 0; i < cells.length; i++) {
        const r = row + cells[i].row;
        const c = col + cells[i].col;
        if (r < 0 || r >= 6 || c < 0 || c >= 6) {
            return false;                    // 超出边界
        }
        if (this._grid[r][c] !== null && this._grid[r][c] !== item.id) {
            return false;                    // 被其他物品占用
        }
    }
    return true;
}
```

---

## 4. UI 交互设计

### 4.1 交互状态机

```
Idle（空闲）
  ↓ 鼠标按下物品
Dragging（拖拽中）
  - 显示半透明物品跟随鼠标
  - 网格显示可放置/不可放置高亮
  ↓ 鼠标松开
┌──────────────┬──────────────┐
│  放置失败     │  放置成功     │
│  弹回原位     │  更新位置     │
│  红色闪烁     │  发出事件     │
└──────────────┴──────────────┘

Idle（空闲）
  ↓ 右键点击物品
Rotating（旋转中）
  - 尝试顺时针旋转 90°
  - 成功：更新形状并发出事件
  - 失败：抖动提示，保持原角度
```

### 4.2 BackpackPanel 核心接口

```typescript
class BackpackPanel extends PanelBase {
    private _model: BackpackModel;
    private _gridNode: cc.Node;
    private _itemNodes: Map<string, cc.Node>;

    /** 初始化，绑定 Model */
    init(model: BackpackModel): void;

    /** 重绘整个网格 */
    refreshGrid(): void;

    /** 更新单个物品位置 */
    refreshItem(itemId: string): void;

    /** 拖拽事件处理 */
    private _onItemTouchStart(event: cc.Event.EventTouch, itemId: string): void;
    private _onItemTouchMove(event: cc.Event.EventTouch, itemId: string): void;
    private _onItemTouchEnd(event: cc.Event.EventTouch, itemId: string): void;

    /** 右键旋转 */
    private _onItemRightClick(itemId: string): void;

    /** 预览高亮 */
    private _showPlacementPreview(item: BackpackItem, row: number, col: number): void;
    private _clearPreview(): void;
    private _previewInvalid(item: BackpackItem): void;
}
```

### 4.3 交互细节

1. **拖拽吸附**：拖拽中物品中心点靠近某个格子时，自动吸附到该格子的预览位置
2. **预览实时更新**：每次移动都调用 `Model.canPlace()` 检测，绿色高亮表示可放，红色表示冲突
3. **放置失败动画**：松开鼠标时如果 `canPlace=false`，物品弹回原位 + 红色闪烁
4. **旋转保护**：右键旋转后如果新位置冲突，回滚到原旋转角度

---

## 5. TowerSlot 塔防扩展设计

### 5.1 零耦合原则

- TowerSlot **不引用** BackpackModel、BackpackPanel、BackpackItem
- TowerSlot **不感知** 背包系统的存在
- TowerSlot 只通过 **EventCenter** 接收事件
- TowerSlot 挂载在每个格子节点上，拥有独立的坐标 (row, col)

### 5.2 TowerSlot 类设计

```typescript
class TowerSlot extends cc.Component {
    @property row: number = 0;
    @property col: number = 0;

    private _towerData: TowerData | null = null;
    private _isActive: boolean = false;

    onLoad(): void {
        EventCenter.instance.on("backpack:item_placed", this._onItemPlaced, this);
        EventCenter.instance.on("backpack:item_removed", this._onItemRemoved, this);
        EventCenter.instance.on("backpack:item_rotated", this._onItemRotated, this);
    }

    onDestroy(): void {
        EventCenter.instance.off("backpack:item_placed", this._onItemPlaced, this);
        EventCenter.instance.off("backpack:item_removed", this._onItemRemoved, this);
        EventCenter.instance.off("backpack:item_rotated", this._onItemRotated, this);
    }

    private _onItemPlaced(data: BackpackItemPlacedEvent): void {
        const cells = data.occupiedCells;
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].row === this.row && cells[i].col === this.col) {
                this._activateTower(data.configId, data.rotation);
                return;
            }
        }
    }

    private _onItemRemoved(data: BackpackItemRemovedEvent): void {
        const cells = data.occupiedCells;
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].row === this.row && cells[i].col === this.col) {
                this._deactivateTower();
                return;
            }
        }
    }

    private _onItemRotated(data: BackpackItemRotatedEvent): void {
        // 检查旋转前后是否覆盖此格子
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
            this._deactivateTower();
        } else if (!wasInOld && isInNew) {
            this._activateTower(data.configId, data.rotation);
        } else if (isInNew) {
            this._updateTowerRotation(data.rotation);
        }
    }

    private _activateTower(configId: string, rotation: number): void {
        this._towerData = TowerConfig.get(configId);
        this._isActive = true;
        // TODO: 播放建造动画，初始化攻击范围显示
    }

    private _deactivateTower(): void {
        this._towerData = null;
        this._isActive = false;
        // TODO: 播放拆除动画，清理攻击范围显示
    }

    private _updateTowerRotation(rotation: number): void {
        // TODO: 更新塔的朝向
    }
}
```

### 5.3 事件数据结构

```typescript
interface BackpackItemPlacedEvent {
    itemId: string;
    configId: string;
    occupiedCells: GridCell[];
    anchor: GridCell;
    rotation: number;
}

interface BackpackItemRemovedEvent {
    itemId: string;
    occupiedCells: GridCell[];
}

interface BackpackItemRotatedEvent {
    itemId: string;
    configId: string;
    oldCells: GridCell[];
    newCells: GridCell[];
    rotation: number;
}

type GridCell = { row: number; col: number };
```

### 5.4 未来扩展预留

- **多物品合成**：相邻格子放置多个物品可合成高级塔，TowerSlot 监听相邻格子状态变化
- **Buff/Debuff 区域**：某些物品会影响周围格子的 TowerSlot（如"加攻速光环"）
- **动态格子效果**：某些背包格子本身带有特殊效果（冰冻、加速等）

---

## 6. 错误处理

### 6.1 边界情况

| 场景 | 期望行为 | 处理位置 |
|------|----------|----------|
| 物品放置超出网格边界 | 返回 false，物品弹回原位 | BackpackModel.canPlace() |
| 物品放置与其他物品重叠 | 返回 false，显示红色冲突预览 | BackpackModel.canPlace() |
| 旋转后物品超出边界 | 返回 false，保持原角度 | BackpackModel.rotateItem() |
| 旋转后与其他物品重叠 | 返回 false，保持原角度 | BackpackModel.rotateItem() |
| 移除不存在的物品 | 静默忽略，输出 warning | BackpackModel.removeItem() |
| 重复放置同一物品 | 先自动移除旧位置，再放置到新位置 | BackpackModel.placeItem() |
| 配置表缺少物品形状数据 | 加载时报错，使用默认 1×1 形状 | ConfigMgr.loadAll() |
| 网格数据与物品列表不一致 | 提供 validate() 方法检测并修复 | BackpackModel.validate() |

### 6.2 防御性编程约定

1. **所有公共方法参数校验**：row/col 必须在 [0,5] 范围内，无效时抛出明确错误
2. **不可变操作**：canPlace、getRotatedShape 不修改任何状态
3. **原子性**：placeItem 和 rotateItem 要么完全成功，要么完全回滚
4. **日志追踪**：关键操作通过 Logger 输出 debug 信息

---

## 7. 测试策略

### 7.1 单元测试（BackpackModel）

- `canPlace` — 边界检测、重叠检测、空位检测
- `placeItem` — 成功放置、重复放置
- `removeItem` — 移除后格子释放
- `rotateItem` — 各种形状旋转（1×1、1×2、2×2、L 形、T 形、Z 形）
- `validate` — 一致性检测

### 7.2 集成测试（BackpackPanel + BackpackModel）

- 拖拽放置全流程
- 右键旋转反馈
- 预览高亮正确性
- 放置失败动画

### 7.3 扩展测试（TowerSlot）

- 事件订阅/取消订阅（无内存泄漏）
- 物品放置后 TowerSlot 激活
- 旋转后格子覆盖变化
- 物品移除后 TowerSlot 停用

---

## 8. 配置设计

### 8.1 物品配置表结构

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | string | 唯一标识 | "sword_L" |
| name | string | 显示名称（多语言 key） | "item.sword" |
| icon | string | 图标资源路径 | "Items/sword" |
| shape | string | 形状矩阵 JSON | "[[1,1,1],[1,0,0]]" |
| canRotate | boolean | 是否允许旋转 | true |
| rarity | string | 稀有度 | "rare" |
| towerType | string | 塔防类型（空=非塔） | "melee" |

### 8.2 JSON 示例

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
    }
  ]
}
```

### 8.3 加载流程

Excel 配置表 → `excel2json.js` 转换 → `assets/Config/items.json` → `ConfigMgr.loadAll()` 加载 → 运行时通过 `ConfigMgr.instance.get("items", "sword_L")` 访问

---

## 9. 项目文件结构

```
assets/
  Script/
    Backpack/
      Model/
        BackpackModel.ts
        BackpackItem.ts
      UI/
        BackpackPanel.ts
        BackpackGrid.ts
        BackpackItemNode.ts
      Tower/
        TowerSlot.ts
        TowerData.ts
      Manager/
        BackpackManager.ts
      Config/
        ItemConfig.ts
  Prefab/
    UI/
      BackpackPanel.prefab
      BackpackItem.prefab
  Config/
    items.json
  Resources/
    Items/

tools/
  excel2json.js
```

---

## 10. 代码风格约束

- **避免使用 `for...of`**，改用索引循环或 `forEach`
- 数组遍历：`arr.forEach((item, index) => { ... })` 或 `for (let i = 0; i < arr.length; i++)`
- Map 遍历：`map.forEach((value, key) => { ... })`
- Object 键遍历：`Object.keys(obj).forEach(key => { ... })`

---

## 11. 与现有架构集成

- `BackpackManager extends Singleton` — 沿用项目已有单例基类
- `BackpackPanel extends PanelBase` — 复用项目 UI 面板基类
- `EventCenter` — 使用现有事件中心进行模块通信
- `ConfigMgr` — 使用现有配置管理器加载 JSON
- `Logger` — 使用现有日志系统

---

## 12. 里程碑

1. **Phase 1**: BackpackModel + BackpackItem + 单元测试
2. **Phase 2**: BackpackPanel + 拖拽/旋转交互
3. **Phase 3**: 配置文件 + Excel 转换
4. **Phase 4**: TowerSlot + 事件集成

---

## 附录：形状旋转示例

### L 形物品

**原始 (0°)**
```
[1, 1, 1]
[1, 0, 0]
```

**旋转 90°**
```
[1, 1]
[0, 1]
[0, 1]
```

**旋转 180°**
```
[0, 0, 1]
[1, 1, 1]
```

**旋转 270°**
```
[1, 0]
[1, 0]
[1, 1]
```

旋转算法：矩阵转置后水平翻转。
