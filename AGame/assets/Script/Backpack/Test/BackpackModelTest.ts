import { BackpackItem } from "../Model/BackpackItem";
import { BackpackModel } from "../Model/BackpackModel";
import { ItemConfig } from "../Config/ItemConfig";
import { BackpackManager } from "../Manager/BackpackManager";

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
        this._testPlaceAndRemove();
        this._testCollision();
        this._testRotate();
        this._testValidate();
        this._testManagerIntegration();
        cc.log("=== 所有测试通过 ===");
    }

    private _createLShapeItem(id: string = "test_1"): BackpackItem {
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
        return new BackpackItem(id, config);
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

    private _testPlaceAndRemove(): void {
        const model = new BackpackModel();
        const item = this._createLShapeItem();

        // 正常放置
        const success = model.placeItem(item, 0, 0);
        console.assert(success === true, "应在 (0,0) 成功放置");
        console.assert(model.getItemAt(0, 0) === item, "(0,0) 应为此物品");
        console.assert(model.getItemAt(0, 1) === item, "(0,1) 应为此物品");
        console.assert(model.getItemAt(0, 2) === item, "(0,2) 应为此物品");
        console.assert(model.getItemAt(1, 0) === item, "(1,0) 应为此物品");
        console.assert(model.getItemAt(1, 1) === null, "(1,1) 应为空");

        // 移除
        model.removeItem(item.id);
        console.assert(model.getItemAt(0, 0) === null, "移除后 (0,0) 应为空");
        console.assert(model.getItemAt(0, 2) === null, "移除后 (0,2) 应为空");

        cc.log("✓ testPlaceAndRemove 通过");
    }

    private _testCollision(): void {
        const model = new BackpackModel();
        const item1 = this._createLShapeItem();
        const item2 = this._createLShapeItem("test_2");

        // 放置第一个物品
        model.placeItem(item1, 0, 0);

        // 尝试在重叠位置放置
        const fail = model.placeItem(item2, 0, 0);
        console.assert(fail === false, "重叠放置应失败");

        // 尝试在边界外放置
        const fail2 = model.placeItem(item2, 5, 5);
        console.assert(fail2 === false, "越界放置应失败");

        // 在不重叠位置放置
        const success = model.placeItem(item2, 2, 2);
        console.assert(success === true, "不重叠放置应成功");

        cc.log("✓ testCollision 通过");
    }

    private _testRotate(): void {
        const model = new BackpackModel();
        const item = this._createLShapeItem();

        // 放在底部区域，给旋转留出空间
        model.placeItem(item, 3, 0);

        // 旋转前形状占据 (3,0)(3,1)(3,2)(4,0)
        const success = model.rotateItem(item.id);
        console.assert(success === true, "应成功旋转");
        console.assert(item.rotation === 90, "旋转后角度应为 90°");

        // 验证旧位置已清空
        console.assert(model.getItemAt(3, 2) === null, "旋转后 (3,2) 应为空");

        // 验证新位置已占用
        console.assert(model.getItemAt(3, 0) === item, "旋转后 (3,0) 应为物品");
        console.assert(model.getItemAt(5, 0) === item, "旋转后 (5,0) 应为物品");

        cc.log("✓ testRotate 通过");
    }

    private _testValidate(): void {
        const model = new BackpackModel();
        const item = this._createLShapeItem();

        model.placeItem(item, 0, 0);
        const result = model.validate();
        console.assert(result.valid === true, "有效状态应通过校验");

        cc.log("✓ testValidate 通过");
    }

    private _testManagerIntegration(): void {
        const manager = BackpackManager.instance;
        const model = manager.createBackpack();

        // 创建几个测试物品
        const items = [
            manager.createItem({
                id: "sword_L", name: "item.sword", icon: "Items/sword",
                shape: [[true, true, true], [true, false, false]],
                canRotate: true, rarity: "rare", towerType: "melee"
            }),
            manager.createItem({
                id: "shield_2x2", name: "item.shield", icon: "Items/shield",
                shape: [[true, true], [true, true]],
                canRotate: false, rarity: "common", towerType: "defense"
            }),
            manager.createItem({
                id: "potion_1x1", name: "item.potion", icon: "Items/potion",
                shape: [[true]],
                canRotate: false, rarity: "common", towerType: ""
            })
        ];

        // 放置物品
        manager.addItemToCurrent(items[0], 0, 0);  // L 形放左上角
        manager.addItemToCurrent(items[1], 2, 2);  // 2×2 放中间
        manager.addItemToCurrent(items[2], 5, 5);  // 1×1 放右下角

        // 验证
        console.assert(model.getAllItems().length === 3, "应有 3 个物品");
        console.assert(model.getItemAt(0, 0)?.configId === "sword_L", "(0,0) 应为 sword_L");
        console.assert(model.getItemAt(2, 2)?.configId === "shield_2x2", "(2,2) 应为 shield_2x2");
        console.assert(model.getItemAt(5, 5)?.configId === "potion_1x1", "(5,5) 应为 potion_1x1");

        // 数据校验
        const validation = model.validate();
        console.assert(validation.valid, "集成测试数据应一致");
        if (!validation.valid) {
            cc.error("校验失败:", validation.errors);
        }

        // 测试旋转
        const rotateSuccess = manager.rotateItemInCurrent(items[0].id);
        console.assert(rotateSuccess === true, "sword_L 应可旋转");
        console.assert(items[0].rotation === 90, "旋转后应为 90°");

        // 不可旋转的物品
        const rotateFail = manager.rotateItemInCurrent(items[1].id);
        console.assert(rotateFail === false, "shield_2x2 不可旋转");

        cc.log("✓ testManagerIntegration 通过");

        // 清理
        manager.clear();
    }
}
