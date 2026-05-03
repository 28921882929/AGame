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
