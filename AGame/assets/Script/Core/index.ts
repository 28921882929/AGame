// assets/Script/Core/index.ts

// Base
export { Singleton } from "./Base/Singleton";
export { UIBase, UILayer } from "./Base/UIBase";
export { PanelBase } from "./Base/PanelBase";

// Managers
export { GameManager } from "./Manager/GameManager";
export { UIManager } from "./Manager/UIManager";
export { ResourceManager } from "./Manager/ResourceManager";
export { PoolManager, PoolRegisterConfig } from "./Manager/PoolManager";
export { TimerManager, TimerHandle } from "./Manager/TimerManager";
export { EventCenter, EventMap } from "./Manager/EventCenter";
export { AudioMgr } from "./Manager/AudioMgr";
export { StorageMgr, StorageKeys } from "./Manager/StorageMgr";
export { ConfigMgr } from "./Manager/ConfigMgr";
export { I18nMgr, Language } from "./Manager/I18nMgr";

// State
export { GameState, getGameStateName } from "./State/GameState";
export { StateMachine, IState } from "./State/StateMachine";

// Pool
export { NodePool, NodePoolConfig, PoolInfo } from "./Pool/NodePool";

// Utils
export { Logger, LogLevel } from "./Utils/Logger";
export { TimeUtils } from "./Utils/TimeUtils";