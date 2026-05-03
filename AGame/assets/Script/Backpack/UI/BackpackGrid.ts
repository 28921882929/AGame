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
