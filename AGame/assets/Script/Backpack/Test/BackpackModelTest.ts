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
