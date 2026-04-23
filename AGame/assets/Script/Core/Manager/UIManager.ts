// assets/Script/Core/Manager/UIManager.ts

import { Singleton } from "../Base/Singleton";
import { UIBase, UILayer } from "../Base/UIBase";
import { PanelBase } from "../Base/PanelBase";
import { Logger } from "../Utils/Logger";

/** UI预制体路径前缀 */
const UI_PATH_PREFIX = "Prefabs/UI/";

/**
 * UI管理器
 * 管理UI层级、栈和弹窗队列
 */
export class UIManager extends Singleton<UIManager> {
    /** 各层级容器 */
    private _layers: Map<UILayer, cc.Node> = new Map();

    /** 已打开的UI */
    private _openedUIs: Map<string, UIBase> = new Map();

    /** 弹窗队列 */
    private _popupQueue: Array<{ name: string; data?: any }> = [];

    /** 当前弹窗 */
    private _currentPopup: string | null = null;

    /** Canvas节点 */
    private _canvas: cc.Node | null = null;

    private _logger = Logger.instance;

    /**
     * 初始化UI层级
     */
    public init(canvas: cc.Node): void {
        this._canvas = canvas;

        // 创建层级容器
        this._createLayer(UILayer.Background, "LayerBackground");
        this._createLayer(UILayer.Main, "LayerMain");
        this._createLayer(UILayer.Popup, "LayerPopup");
        this._createLayer(UILayer.Tip, "LayerTip");

        this._logger.debug("UIManager", "UI layers initialized");
    }

    /**
     * 创建层级容器
     */
    private _createLayer(layer: UILayer, name: string): void {
        if (!this._canvas) return;

        let layerNode = this._canvas.getChildByName(name);
        if (!layerNode) {
            layerNode = new cc.Node(name);
            layerNode.addComponent(cc.UITransform);
            layerNode.setContentSize(cc.winSize);
            layerNode.setPosition(0, 0);
            this._canvas.addChild(layerNode);
        }
        layerNode.zIndex = layer;
        this._layers.set(layer, layerNode);
    }

    /**
     * 获取层级容器
     */
    private _getLayerNode(layer: UILayer): cc.Node | null {
        return this._layers.get(layer) || null;
    }

    /**
     * 打开UI
     */
    public async open<T extends UIBase>(uiName: string, data?: any): Promise<T | null> {
        // 如果已打开，直接返回
        if (this._openedUIs.has(uiName)) {
            const ui = this._openedUIs.get(uiName) as T;
            ui.onOpen(data);
            return ui;
        }

        return new Promise<T | null>((resolve) => {
            const path = `${UI_PATH_PREFIX}${uiName}`;

            cc.resources.load(path, cc.Prefab, async (err, prefab: cc.Prefab) => {
                if (err) {
                    this._logger.error("UIManager", `Failed to load UI: ${uiName}`, err);
                    resolve(null);
                    return;
                }

                const node = cc.instantiate(prefab);
                const ui = node.getComponent(UIBase) as T;

                if (!ui) {
                    this._logger.error("UIManager", `UI component not found: ${uiName}`);
                    node.destroy();
                    resolve(null);
                    return;
                }

                ui.uiName = uiName;

                // 添加到对应层级
                const layerNode = this._getLayerNode(ui.layer);
                if (layerNode) {
                    layerNode.addChild(node);
                } else {
                    this._canvas?.addChild(node);
                }

                // 记录
                this._openedUIs.set(uiName, ui);

                // 调用打开
                ui.onOpen(data);

                // 播放动画
                await ui.playOpenAnim();

                this._logger.debug("UIManager", `UI opened: ${uiName}`);
                resolve(ui);
            });
        });
    }

    /**
     * 关闭UI
     */
    public close(uiName: string, destroy: boolean = true): void {
        const ui = this._openedUIs.get(uiName);
        if (!ui) {
            this._logger.warn("UIManager", `UI not found: ${uiName}`);
            return;
        }

        // 先播放关闭动画
        ui.playCloseAnim().then(() => {
            ui.onClose();
            this._openedUIs.delete(uiName);

            if (destroy) {
                ui.node.destroy();
            } else {
                ui.node.removeFromParent(false);
                ui.node.active = false;
            }

            this._logger.debug("UIManager", `UI closed: ${uiName}`);

            // 处理弹窗队列
            this._processPopupQueue();
        }).catch((err) => {
            this._logger.error("UIManager", `Close animation failed: ${uiName}`, err);
        });
    }

    /**
     * 显示弹窗（进入队列）
     */
    public async showPopup(name: string, data?: any, urgent: boolean = false): Promise<PanelBase | null> {
        // 如果是紧急弹窗，直接显示
        if (urgent) {
            return this.open<PanelBase>(name, data);
        }

        // 加入队列
        this._popupQueue.push({ name, data });

        // 如果没有当前弹窗，处理队列
        if (!this._currentPopup) {
            return this._processPopupQueue();
        }

        return null;
    }

    /**
     * 处理弹窗队列
     */
    private async _processPopupQueue(): Promise<PanelBase | null> {
        if (this._popupQueue.length === 0) {
            this._currentPopup = null;
            return null;
        }

        const item = this._popupQueue.shift()!;
        this._currentPopup = item.name;

        const popup = await this.open<PanelBase>(item.name, item.data);
        return popup;
    }

    /**
     * 关闭当前弹窗
     */
    public closeCurrentPopup(): void {
        if (this._currentPopup) {
            this.close(this._currentPopup);
        }
    }

    /**
     * 关闭所有弹窗
     */
    public closeAllPopups(): void {
        this._popupQueue = [];

        const popups: string[] = [];
        this._openedUIs.forEach((ui, name) => {
            if (ui.layer === UILayer.Popup) {
                popups.push(name);
            }
        });

        popups.forEach(name => this.close(name));
        this._currentPopup = null;
    }

    /**
     * 显示Toast提示
     */
    public showToast(message: string, duration: number = 2): void {
        // 创建Toast节点
        const toast = new cc.Node("Toast");

        const label = toast.addComponent(cc.Label);
        label.string = message;
        label.fontSize = 24;
        label.lineHeight = 30;

        const widget = toast.addComponent(cc.Widget);
        widget.isAlignBottom = true;
        widget.bottom = 200;

        toast.color = cc.Color.WHITE;

        // 添加到提示层
        const tipLayer = this._getLayerNode(UILayer.Tip);
        if (tipLayer) {
            tipLayer.addChild(toast);
        } else {
            this._canvas?.addChild(toast);
        }

        // 自动消失
        cc.tween(toast)
            .delay(duration - 0.3)
            .to(0.3, { opacity: 0 })
            .call(() => toast.destroy())
            .start();
    }

    /**
     * 显示Loading
     */
    private _loadingNode: cc.Node | null = null;

    public showLoading(text: string = "加载中..."): void {
        if (this._loadingNode) return;

        this._loadingNode = new cc.Node("Loading");

        // 半透明遮罩
        const bg = new cc.Node("bg");
        bg.addComponent(cc.UITransform).setContentSize(cc.winSize);
        const sp = bg.addComponent(cc.Sprite);
        sp.spriteFrame = null;  // 需要设置一个白色精灵
        bg.color = new cc.Color(0, 0, 0, 150);
        bg.parent = this._loadingNode;

        // 文本
        const label = this._loadingNode.addComponent(cc.Label);
        label.string = text;
        label.fontSize = 32;

        // 添加到提示层
        const tipLayer = this._getLayerNode(UILayer.Tip);
        if (tipLayer) {
            tipLayer.addChild(this._loadingNode);
        } else {
            this._canvas?.addChild(this._loadingNode);
        }
    }

    /**
     * 隐藏Loading
     */
    public hideLoading(): void {
        if (this._loadingNode) {
            this._loadingNode.destroy();
            this._loadingNode = null;
        }
    }

    /**
     * 获取UI实例
     */
    public getUI<T extends UIBase>(uiName: string): T | null {
        return (this._openedUIs.get(uiName) as T) || null;
    }

    /**
     * UI是否打开
     */
    public isOpen(uiName: string): boolean {
        return this._openedUIs.has(uiName);
    }

    /**
     * 关闭所有UI
     */
    public closeAll(): void {
        const names = Array.from(this._openedUIs.keys());
        names.forEach(name => this.close(name));
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this.closeAll();
        this._layers.clear();
        this._popupQueue = [];
        this._currentPopup = null;
    }
}
