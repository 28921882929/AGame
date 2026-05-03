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
        const items = this._model.getAllItems();
        let item: BackpackItem | null = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].id === itemId) {
                item = items[i];
                break;
            }
        }
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

        this.gridContainer.removeAllChildren();
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
                const items = this._model.getAllItems();
                let item: BackpackItem | null = null;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].id === itemId) {
                        item = items[i];
                        break;
                    }
                }

                if (item != null && this._model.canPlace(item, gridPos.row, gridPos.col)) {
                    // 放置成功
                    const oldCells: { row: number; col: number }[] = [];
                    const oldOcc = item.getOccupiedCells();
                    for (let i = 0; i < oldOcc.length; i++) {
                        oldCells.push({
                            row: item.anchorRow + oldOcc[i].row,
                            col: item.anchorCol + oldOcc[i].col
                        });
                    }

                    this._model.placeItem(item, gridPos.row, gridPos.col);

                    // 发出事件
                    const newCells: { row: number; col: number }[] = [];
                    const newOcc = item.getOccupiedCells();
                    for (let i = 0; i < newOcc.length; i++) {
                        newCells.push({
                            row: item.anchorRow + newOcc[i].row,
                            col: item.anchorCol + newOcc[i].col
                        });
                    }

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
                    const items2 = this._model.getAllItems();
                    let item2: BackpackItem | null = null;
                    for (let i = 0; i < items2.length; i++) {
                        if (items2[i].id === itemId) {
                            item2 = items2[i];
                            break;
                        }
                    }
                    if (item2) {
                        this._updateItemPosition(item2);
                    }
                }
            } else {
                // 不在网格范围内，弹回原位
                const items = this._model.getAllItems();
                let item: BackpackItem | null = null;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].id === itemId) {
                        item = items[i];
                        break;
                    }
                }
                if (item) {
                    this._updateItemPosition(item);
                }
            }
        } else {
            // 没有拖拽，视为点击，可以触发选中效果
            // TODO: 物品选中/详情展示
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

        const items = this._model.getAllItems();
        let item: BackpackItem | null = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].id === this._draggingItemId) {
                item = items[i];
                break;
            }
        }
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
