// assets/Script/Core/Utils/TimeUtils.ts

/**
 * 时间工具类
 */
export class TimeUtils {
    /**
     * 格式化时间为 HH:MM:SS
     */
    public static formatTime(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    /**
     * 格式化时间为 MM:SS.ms（用于倒计时显示）
     */
    public static formatTimeMs(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    }

    /**
     * 获取当前时间戳（毫秒）
     */
    public static now(): number {
        return Date.now();
    }

    /**
     * 获取当前时间戳（秒）
     */
    public static nowSeconds(): number {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * 延迟执行（Promise 版本）
     */
    public static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 毫秒转秒
     */
    public static msToSecond(ms: number): number {
        return ms / 1000;
    }

    /**
     * 秒转毫秒
     */
    public static secondToMs(second: number): number {
        return second * 1000;
    }

    /**
     * 每日零点时间戳
     */
    public static getTodayZero(timestamp?: number): number {
        const ts = timestamp || Date.now();
        const date = new Date(ts);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    /**
     * 判断是否是今天
     */
    public static isToday(timestamp: number): boolean {
        const today = new Date();
        const target = new Date(timestamp);
        return today.getFullYear() === target.getFullYear() &&
               today.getMonth() === target.getMonth() &&
               today.getDate() === target.getDate();
    }
}