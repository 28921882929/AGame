// assets/Script/Core/Manager/AudioMgr.ts

import { Singleton } from "../Base/Singleton";
import { StorageMgr, StorageKeys } from "./StorageMgr";
import { Logger } from "../Utils/Logger";

/**
 * 音频管理器
 * 管理背景音乐和音效播放
 */
export class AudioMgr extends Singleton<AudioMgr> {
    /** 当前BGM音频ID */
    private _bgmAudioId: number = -1;

    /** 当前BGM路径 */
    private _bgmPath: string = "";

    /** BGM音量 */
    private _bgmVolume: number = 1;

    /** 音效音量 */
    private _sfxVolume: number = 1;

    /** BGM静音 */
    private _bgmMute: boolean = false;

    /** 音效静音 */
    private _sfxMute: boolean = false;

    private _logger = Logger.instance;

    public constructor() {
        super();
        this._loadSettings();
    }

    /**
     * 从存储加载设置
     */
    private _loadSettings(): void {
        this._bgmMute = StorageMgr.instance.get<boolean>(StorageKeys.AUDIO_BGM_MUTE, false);
        this._sfxMute = StorageMgr.instance.get<boolean>(StorageKeys.AUDIO_SFX_MUTE, false);
        this._bgmVolume = StorageMgr.instance.get<number>(StorageKeys.AUDIO_BGM_VOLUME, 1);
        this._sfxVolume = StorageMgr.instance.get<number>(StorageKeys.AUDIO_SFX_VOLUME, 1);
    }

    /**
     * 保存设置到存储
     */
    private _saveSettings(): void {
        StorageMgr.instance.set(StorageKeys.AUDIO_BGM_MUTE, this._bgmMute);
        StorageMgr.instance.set(StorageKeys.AUDIO_SFX_MUTE, this._sfxMute);
        StorageMgr.instance.set(StorageKeys.AUDIO_BGM_VOLUME, this._bgmVolume);
        StorageMgr.instance.set(StorageKeys.AUDIO_SFX_VOLUME, this._sfxVolume);
    }

    /**
     * 播放背景音乐
     * @param path 资源路径（不含 resources 前缀和扩展名）
     * @param loop 是否循环
     */
    public playBGM(path: string, loop: boolean = true): void {
        if (this._bgmPath === path && this._bgmAudioId >= 0) {
            return;
        }

        // 停止当前BGM
        this.stopBGM();

        this._bgmPath = path;

        cc.resources.load(path, cc.AudioClip, (err, clip: cc.AudioClip) => {
            if (err) {
                this._logger.error("AudioMgr", `Failed to load BGM: ${path}`, err);
                return;
            }

            this._bgmAudioId = cc.audioEngine.play(clip, loop, this._bgmMute ? 0 : this._bgmVolume);
            this._logger.debug("AudioMgr", `Playing BGM: ${path}`);
        });
    }

    /**
     * 停止背景音乐
     */
    public stopBGM(): void {
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.stop(this._bgmAudioId);
            this._bgmAudioId = -1;
        }
        this._bgmPath = "";
    }

    /**
     * 暂停背景音乐
     */
    public pauseBGM(): void {
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.pause(this._bgmAudioId);
        }
    }

    /**
     * 恢复背景音乐
     */
    public resumeBGM(): void {
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.resume(this._bgmAudioId);
        }
    }

    /**
     * 播放音效
     * @param path 资源路径
     * @param volume 音量（可选，使用默认音效音量）
     * @returns 音频ID
     */
    public playSFX(path: string, volume?: number): number {
        if (this._sfxMute) {
            return -1;
        }

        const vol = volume !== undefined ? volume : this._sfxVolume;

        cc.resources.load(path, cc.AudioClip, (err, clip: cc.AudioClip) => {
            if (err) {
                this._logger.error("AudioMgr", `Failed to load SFX: ${path}`, err);
                return;
            }
            cc.audioEngine.play(clip, false, vol);
        });

        return 0;  // 注意：异步加载，无法返回准确ID
    }

    /**
     * 停止音效
     */
    public stopSFX(audioId: number): void {
        if (audioId >= 0) {
            cc.audioEngine.stop(audioId);
        }
    }

    /**
     * 设置BGM音量
     */
    public setBGMVolume(volume: number): void {
        this._bgmVolume = Math.max(0, Math.min(1, volume));
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.setVolume(this._bgmAudioId, this._bgmMute ? 0 : this._bgmVolume);
        }
        this._saveSettings();
    }

    /**
     * 设置音效音量
     */
    public setSFXVolume(volume: number): void {
        this._sfxVolume = Math.max(0, Math.min(1, volume));
        this._saveSettings();
    }

    /**
     * 获取BGM音量
     */
    public getBGMVolume(): number {
        return this._bgmVolume;
    }

    /**
     * 获取音效音量
     */
    public getSFXVolume(): number {
        return this._sfxVolume;
    }

    /**
     * 设置BGM静音
     */
    public setBGMMute(mute: boolean): void {
        this._bgmMute = mute;
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.setVolume(this._bgmAudioId, mute ? 0 : this._bgmVolume);
        }
        this._saveSettings();
    }

    /**
     * 设置音效静音
     */
    public setSFXMute(mute: boolean): void {
        this._sfxMute = mute;
        this._saveSettings();
    }

    /**
     * BGM是否静音
     */
    public isBGMMute(): boolean {
        return this._bgmMute;
    }

    /**
     * 音效是否静音
     */
    public isSFXMute(): boolean {
        return this._sfxMute;
    }

    /**
     * 预加载音频
     */
    public preload(paths: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            cc.resources.load(paths, cc.AudioClip, (err) => {
                if (err) {
                    this._logger.error("AudioMgr", "Failed to preload audio", err);
                    reject(err);
                    return;
                }
                this._logger.debug("AudioMgr", `Preloaded ${paths.length} audio clips`);
                resolve();
            });
        });
    }

    /**
     * 停止所有音频
     */
    public stopAll(): void {
        cc.audioEngine.stopAll();
        this._bgmAudioId = -1;
        this._bgmPath = "";
    }

    /**
     * 暂停所有音频
     */
    public pauseAll(): void {
        cc.audioEngine.pauseAll();
    }

    /**
     * 恢复所有音频
     */
    public resumeAll(): void {
        cc.audioEngine.resumeAll();
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        this.stopAll();
    }
}