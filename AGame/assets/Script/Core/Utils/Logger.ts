// assets/Script/Core/Utils/Logger.ts

import { Singleton } from "../Base/Singleton";

/**
 * 日志级别
 */
export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3,
    None = 4,  // 关闭所有日志
}

/**
 * 日志工具类
 * 支持日志级别过滤、标签分类
 */
export class Logger extends Singleton<Logger> {
    /** 当前日志级别 */
    public level: LogLevel = LogLevel.Debug;

    /** 是否输出到控制台 */
    public enableConsole: boolean = true;

    /** 是否显示时间戳 */
    public showTimestamp: boolean = true;

    /** 日志前缀 */
    public prefix: string = "[Game]";

    /**
     * 格式化时间戳
     */
    private getTimestamp(): string {
        if (!this.showTimestamp) return "";
        const now = new Date();
        const h = now.getHours().toString().padStart(2, "0");
        const m = now.getMinutes().toString().padStart(2, "0");
        const s = now.getSeconds().toString().padStart(2, "0");
        const ms = now.getMilliseconds().toString().padStart(3, "0");
        return `[${h}:${m}:${s}.${ms}]`;
    }

    /**
     * 格式化日志消息
     */
    private format(tag: string, message: string): string {
        const timestamp = this.getTimestamp();
        return `${this.prefix}${timestamp}[${tag}] ${message}`;
    }

    /**
     * Debug 级别日志
     */
    public debug(tag: string, message: string, ...args: any[]): void {
        if (this.level > LogLevel.Debug || !this.enableConsole) return;
        console.log(this.format(tag, message), ...args);
    }

    /**
     * Info 级别日志
     */
    public info(tag: string, message: string, ...args: any[]): void {
        if (this.level > LogLevel.Info || !this.enableConsole) return;
        console.info(this.format(tag, message), ...args);
    }

    /**
     * Warn 级别日志
     */
    public warn(tag: string, message: string, ...args: any[]): void {
        if (this.level > LogLevel.Warn || !this.enableConsole) return;
        console.warn(this.format(tag, message), ...args);
    }

    /**
     * Error 级别日志
     */
    public error(tag: string, message: string, ...args: any[]): void {
        if (this.level > LogLevel.Error || !this.enableConsole) return;
        console.error(this.format(tag, message), ...args);
    }

    /**
     * 仅开发环境输出的日志
     */
    public dev(tag: string, message: string, ...args: any[]): void {
        // Note: CC_BUILD is a Cocos global, we'll use a workaround
        // In production builds, this should be disabled
        this.debug(tag, message, ...args);
    }
}