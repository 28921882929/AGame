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
