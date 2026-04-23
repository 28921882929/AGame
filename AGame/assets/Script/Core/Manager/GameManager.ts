// assets/Script/Core/Manager/GameManager.ts

import { Singleton } from "../Base/Singleton";
import { StateMachine, IState } from "../State/StateMachine";
import { GameState, getGameStateName } from "../State/GameState";
import { Logger } from "../Utils/Logger";
import { EventCenter } from "./EventCenter";
import { TimerManager } from "./TimerManager";
import { StorageMgr } from "./StorageMgr";
import { ConfigMgr } from "./ConfigMgr";
import { ResourceManager } from "./ResourceManager";
import { PoolManager } from "./PoolManager";
import { AudioMgr } from "./AudioMgr";
import { UIManager } from "./UIManager";
import { I18nMgr, Language } from "./I18nMgr";

/**
 * 游戏管理器
 * 游戏入口，初始化所有Manager，管理游戏状态
 */
export class GameManager extends Singleton<GameManager> {
    /** 状态机 */
    private _stateMachine: StateMachine = new StateMachine();

    /** 当前状态 */
    public get currentState(): GameState {
        return (this._stateMachine.currentState?.name as GameState) || GameState.Launch;
    }

    /** 是否已初始化 */
    private _initialized: boolean = false;

    private _logger = Logger.instance;

    public constructor() {
        super();
        this._initStates();
    }

    /**
     * 初始化状态
     */
    private _initStates(): void {
        const states: IState[] = [
            {
                name: GameState.Launch,
                onEnter: () => this._logger.info("GameManager", "State: Launch"),
            },
            {
                name: GameState.Loading,
                onEnter: () => this._onLoadingEnter(),
            },
            {
                name: GameState.MainMenu,
                onEnter: () => this._onMainMenuEnter(),
            },
            {
                name: GameState.Playing,
                onEnter: () => this._onPlayingEnter(),
            },
            {
                name: GameState.Paused,
                onEnter: () => this._onPausedEnter(),
                onExit: () => this._onPausedExit(),
            },
            {
                name: GameState.GameOver,
                onEnter: () => this._onGameOverEnter(),
            },
        ];

        this._stateMachine.registerAll(states);
        this._stateMachine.onStateChange = (from, to) => {
            EventCenter.instance.emit("game:state_change", {
                from: from as GameState,
                to: to as GameState,
            });
        };
    }

    /**
     * 初始化游戏
     */
    public async init(canvas?: cc.Node): Promise<void> {
        if (this._initialized) {
            this._logger.warn("GameManager", "Already initialized");
            return;
        }

        this._logger.info("GameManager", "Initializing...");

        // 按顺序初始化各 Manager
        StorageMgr.instance;  // 初始化存储管理器
        EventCenter.instance;  // 初始化事件中心

        if (canvas) {
            UIManager.instance.init(canvas);
        }

        I18nMgr.instance.init();

        this._initialized = true;

        // 进入加载状态
        this.changeState(GameState.Loading);
    }

    /**
     * 加载状态处理
     */
    private async _onLoadingEnter(): Promise<void> {
        this._logger.info("GameManager", "Loading resources...");

        UIManager.instance.showLoading("加载中...");

        try {
            // 加载配置表
            await ConfigMgr.instance.loadAll();

            // 加载语言包
            // await this._loadLanguage();

            // 预加载资源
            // await ResourceManager.instance.preload(["UI/Common", "Audio/BGM"]);

            UIManager.instance.hideLoading();

            // 加载完成，进入主界面
            this.changeState(GameState.MainMenu);
        } catch (e) {
            this._logger.error("GameManager", "Loading failed", e);
            UIManager.instance.hideLoading();
            this.changeState(GameState.MainMenu);
        }
    }

    /**
     * 主界面状态处理
     */
    private _onMainMenuEnter(): void {
        this._logger.info("GameManager", "Entered MainMenu");

        // 播放BGM
        // AudioMgr.instance.playBGM("Audio/BGM/main");
    }

    /**
     * 游戏中状态处理
     */
    private _onPlayingEnter(): void {
        this._logger.info("GameManager", "Entered Playing");
    }

    /**
     * 暂停状态处理
     */
    private _onPausedEnter(): void {
        this._logger.info("GameManager", "Game Paused");
        TimerManager.instance.pauseAll();
        AudioMgr.instance.pauseBGM();
        cc.game.pause();
    }

    /**
     * 暂停退出处理
     */
    private _onPausedExit(): void {
        this._logger.info("GameManager", "Game Resumed");
        cc.game.resume();
        AudioMgr.instance.resumeBGM();
        TimerManager.instance.resumeAll();
    }

    /**
     * 游戏结束状态处理
     */
    private _onGameOverEnter(): void {
        this._logger.info("GameManager", "Game Over");
    }

    /**
     * 切换状态
     */
    public changeState(state: GameState): void {
        this._logger.debug("GameManager", `State change: ${getGameStateName(this.currentState)} -> ${getGameStateName(state)}`);
        this._stateMachine.change(state);
    }

    /**
     * 暂停游戏
     */
    public pause(): void {
        if (!this._stateMachine.is(GameState.Playing)) return;
        this.changeState(GameState.Paused);
        EventCenter.instance.emit("game:pause");
    }

    /**
     * 恢复游戏
     */
    public resume(): void {
        if (!this._stateMachine.is(GameState.Paused)) return;
        this.changeState(GameState.Playing);
        EventCenter.instance.emit("game:resume");
    }

    /**
     * 开始游戏
     */
    public startGame(): void {
        this.changeState(GameState.Playing);
    }

    /**
     * 游戏结束
     */
    public gameOver(): void {
        this.changeState(GameState.GameOver);
    }

    /**
     * 返回主菜单
     */
    public backToMain(): void {
        this.changeState(GameState.MainMenu);
    }

    /**
     * 退出游戏
     */
    public exit(): void {
        this._logger.info("GameManager", "Exiting game...");
        cc.game.end();
    }

    /**
     * 检查是否在某个状态
     */
    public isState(state: GameState): boolean {
        return this._stateMachine.is(state);
    }

    /**
     * 销毁时清理
     */
    public onDestroy(): void {
        StorageMgr.destroy();
        EventCenter.destroy();
        TimerManager.destroy();
        PoolManager.destroy();
        ConfigMgr.destroy();
        I18nMgr.destroy();
        AudioMgr.destroy();
        ResourceManager.destroy();
        UIManager.destroy();

        this._initialized = false;
        this._logger.info("GameManager", "Destroyed");
    }
}
