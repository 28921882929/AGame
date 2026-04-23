// assets/Script/Core/Base/PanelBase.ts

import { UIBase, UILayer } from "./UIBase";

/**
 * 弹窗基类
 * 继承 UIBase，增加遮罩和动画
 */
export class PanelBase extends UIBase {
    /** 弹窗层级 */
    public layer: UILayer = UILayer.Popup;

    /** 是否显示遮罩 */
    public showMask: boolean = true;

    /** 点击遮罩关闭 */
    public closeOnClickMask: boolean = true;

    /** 遮罩节点 */
    public maskNode: cc.Node | null = null;

    /** 内容节点（用于动画） */
    protected contentNode: cc.Node | null = null;

    /**
     * 初始化遮罩
     */
    protected initMask(): void {
        if (!this.showMask) return;

        // 查找遮罩节点
        this.maskNode = this.node.getChildByName("mask");
        if (this.maskNode && this.closeOnClickMask) {
            this.maskNode.on(cc.Node.EventType.TOUCH_END, this._onMaskClick, this);
        }
    }

    /**
     * 遮罩点击处理
     */
    private _onMaskClick(): void {
        if (this.closeOnClickMask) {
            this.close();
        }
    }

    /**
     * 打开时调用
     */
    public onOpen(data?: any): void {
        this.initMask();

        // 查找内容节点
        this.contentNode = this.node.getChildByName("content");
        if (!this.contentNode) {
            this.contentNode = this.node;
        }

        // 初始状态
        this.node.opacity = 255;
        if (this.contentNode) {
            this.contentNode.scale = 0.8;
        }
    }

    /**
     * 显示动画（缩放）
     */
    public async playOpenAnim(): Promise<void> {
        this._isPlayingAnim = true;

        return new Promise<void>((resolve) => {
            if (this.contentNode) {
                cc.tween(this.contentNode)
                    .to(0.2, { scale: 1 }, { easing: "backOut" })
                    .call(() => {
                        this._isPlayingAnim = false;
                        resolve();
                    })
                    .start();
            } else {
                this._isPlayingAnim = false;
                resolve();
            }
        });
    }

    /**
     * 关闭动画（缩放）
     */
    public async playCloseAnim(): Promise<void> {
        this._isPlayingAnim = true;

        return new Promise<void>((resolve) => {
            if (this.contentNode) {
                cc.tween(this.contentNode)
                    .to(0.15, { scale: 0.8 }, { easing: "backIn" })
                    .call(() => {
                        this._isPlayingAnim = false;
                        resolve();
                    })
                    .start();
            } else {
                this._isPlayingAnim = false;
                resolve();
            }
        });
    }

    /**
     * 关闭时调用
     */
    public onClose(): void {
        if (this.maskNode) {
            this.maskNode.off(cc.Node.EventType.TOUCH_END, this._onMaskClick, this);
        }
    }
}
