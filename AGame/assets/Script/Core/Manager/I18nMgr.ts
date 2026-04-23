// assets/Script/Core/Manager/I18nMgr.ts

import { Singleton } from "../Base/Singleton";
import { StorageMgr, StorageKeys } from "./StorageMgr";
import { Logger } from "../Utils/Logger";

/**
 * 支持的语言枚举
 */
export enum Language {
    ZH_CN = "zh-CN",
    ZH_TW = "zh-TW",
    EN = "en",
}

/**
 * 多语言管理器
 * 当前仅支持中文，预留扩展接口
 */
export class I18nMgr extends Singleton<I18nMgr> {
    /** 当前语言 */
    public language: Language = Language.ZH_CN;

    /** 语言包数据 */
    private _langData: Record<string, any> = {};

    /** 是否已初始化 */
    private _initialized: boolean = false;

    private _logger = Logger.instance;

    /**
     * 初始化
     */
    public init(): void {
        if (this._initialized) return;

        // 从存储读取语言设置
        const savedLang = StorageMgr.instance.get<string>(StorageKeys.LANGUAGE);
        if (savedLang) {
            this.language = savedLang as Language;
        }

        this._initialized = true;
        this._logger.debug("I18nMgr", `Initialized, language: ${this.language}`);
    }

    /**
     * 切换语言（预留，暂不实现）
     */
    public setLanguage(lang: Language): void {
        this._logger.warn("I18nMgr", `setLanguage is not implemented yet. Requested: ${lang}`);
        // TODO: 实现语言切换
        // 1. 加载对应语言包
        // 2. 更新所有 UI 文本
        // 3. 保存到 StorageMgr
    }

    /**
     * 设置语言包数据（由外部加载后设置）
     */
    public setLangData(data: Record<string, any>): void {
        this._langData = data;
        this._logger.debug("I18nMgr", "Language data set");
    }

    /**
     * 获取文本
     * @param key 键名，支持点号分隔（如 "ui.start_game"）
     * @param params 替换参数（如 { name: "玩家" }）
     */
    public t(key: string, params?: Record<string, any>): string {
        const text = this._getValue(key);
        if (!text) {
            this._logger.warn("I18nMgr", `Translation not found: ${key}`);
            return key;
        }

        // 替换参数
        if (params) {
            return this._replaceParams(text, params);
        }

        return text;
    }

    /**
     * 根据路径获取值
     */
    private _getValue(key: string): string | null {
        const keys = key.split(".");
        let value: any = this._langData;

        for (const k of keys) {
            if (value === null || value === undefined) {
                return null;
            }
            value = value[k];
        }

        return typeof value === "string" ? value : null;
    }

    /**
     * 替换参数
     * 格式：欢迎，{name}
     */
    private _replaceParams(text: string, params: Record<string, any>): string {
        return text.replace(/{(\w+)}/g, (match, key) => {
            return params[key] !== undefined ? String(params[key]) : match;
        });
    }

    /**
     * 获取多语言图片路径（预留）
     */
    public getImage(path: string): string {
        // TODO: 根据语言返回不同的图片路径
        return path;
    }

    /**
     * 获取多语言音频路径（预留）
     */
    public getAudio(path: string): string {
        // TODO: 根据语言返回不同的音频路径
        return path;
    }

    /**
     * 检查是否有某个键
     */
    public has(key: string): boolean {
        return this._getValue(key) !== null;
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this._langData = {};
        this._initialized = false;
    }
}
