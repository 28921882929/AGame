// assets/Script/Core/Base/Singleton.ts

/**
 * 单例基类
 * 所有 Manager 继承此类实现单例模式
 */
export class Singleton<T> {
    private static _instances: Map<Function, any> = new Map();

    /**
     * 获取单例实例
     * 使用方式: MyClass.instance
     */
    public static get instance<T>(this: { new(): T }): T {
        if (!Singleton._instances.has(this)) {
            Singleton._instances.set(this, new this());
        }
        return Singleton._instances.get(this);
    }

    /**
     * 销毁单例（用于清理或重置）
     */
    public static destroy<T>(this: { new(): T }): void {
        const instance = Singleton._instances.get(this);
        if (instance && typeof (instance as any).onDestroy === 'function') {
            (instance as any).onDestroy();
        }
        Singleton._instances.delete(this);
    }

    /**
     * 检查单例是否存在
     */
    public static hasInstance<T>(this: { new(): T }): boolean {
        return Singleton._instances.has(this);
    }
}
