// assets/Script/Core/State/GameState.ts

/**
 * 游戏状态枚举
 */
export enum GameState {
    /** 启动加载 */
    Launch = "launch",
    /** 资源加载中 */
    Loading = "loading",
    /** 主界面 */
    MainMenu = "mainMenu",
    /** 游戏进行中 */
    Playing = "playing",
    /** 暂停 */
    Paused = "paused",
    /** 游戏结束 */
    GameOver = "gameOver",
}

/**
 * 获取游戏状态名称（用于显示）
 */
export function getGameStateName(state: GameState): string {
    const names: Record<GameState, string> = {
        [GameState.Launch]: "启动加载",
        [GameState.Loading]: "资源加载中",
        [GameState.MainMenu]: "主界面",
        [GameState.Playing]: "游戏中",
        [GameState.Paused]: "暂停",
        [GameState.GameOver]: "游戏结束",
    };
    return names[state] || "未知状态";
}