// assets/Script/Main/Game.ts

import { GameManager } from "../Core/Manager/GameManager";

const { ccclass, property } = cc._decorator;

/**
 * 游戏入口脚本
 * 挂载在 Launch 场景的根节点上
 */
@ccclass
export default class Game extends cc.Component {
    @property(cc.Node)
    canvas: cc.Node = null;

    protected onLoad(): void {
        // 设置常驻节点
        cc.game.addPersistRootNode(this.node);

        // 初始化游戏管理器
        this._initGame();
    }

    private async _initGame(): Promise<void> {
        cc.view.setDesignResolutionSize(1280, 720, cc.ResolutionPolicy.FIXED_HEIGHT);

        // 初始化GameManager
        await GameManager.instance.init(this.canvas);
    }

    protected onDestroy(): void {
        GameManager.destroy();
    }
}
