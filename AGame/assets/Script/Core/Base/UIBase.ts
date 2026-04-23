// assets/Script/Core/Base/UIBase.ts

/**
 * UI层级
 */
export enum UILayer {
    Background = 0,
    Main = 100,
    Popup = 200,
    Tip = 300,
}

/**
 * UI面板基类
 * 所有UI面板继承此类
 */
export class UIBase extends cc.Component {
    /** UI层级（子类可覆盖） */
    public layer: UILayer = UILayer.Main;

    /** UI名称（用于管理） */
    public uiName: string = "";

    /** 是否正在播放动画 */
    protected _isPlayingAnim: boolean = false;

    /**
     * 打开时调用（接收数据）
     * @param data 传入数据
     */
    public onOpen(data?: any): void {
        // 子类重写
    }

    /**
     * 关闭时调用
     */
    public onClose(): void {
        // 子类重写
    }

    /**
     * 显示动画（可重写）
     */
    public async playOpenAnim(): Promise<void> {
        // 默认无动画，子类可重写
        return Promise.resolve();
    }

    /**
     * 关闭动画（可重写）
     */
    public async playCloseAnim(): Promise<void> {
        // 默认无动画，子类可重写
        return Promise.resolve();
    }

    /**
     * 关闭自己
     */
    public close(): void {
        if (!this.uiName) {
            console.warn("[UIBase] Cannot close UI with empty uiName");
            return;
        }
        import("../Manager/UIManager").then(module => {
            module.UIManager.instance.close(this.uiName);
        }).catch(err => {
            console.error("[UIBase] Failed to close UI:", err);
        });
    }

    /**
     * 获取层级节点
     */
    protected getLayerNode(): cc.Node | null {
        return this.node.parent;
    }
}
