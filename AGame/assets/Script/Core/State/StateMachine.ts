// assets/Script/Core/State/StateMachine.ts

/**
 * 状态接口
 */
export interface IState {
    /** 状态名称 */
    name: string;
    /** 进入状态时调用 */
    onEnter?(from: string | null): void | Promise<void>;
    /** 退出状态时调用 */
    onExit?(to: string): void | Promise<void>;
    /** 每帧更新 */
    onUpdate?(dt: number): void;
}

/**
 * 有限状态机
 * 管理游戏或对象的多种状态切换
 */
export class StateMachine {
    /** 当前状态 */
    private _currentState: IState | null = null;

    /** 获取当前状态 */
    public get currentState(): IState | null {
        return this._currentState;
    }

    /** 所有注册的状态 */
    private _states: Map<string, IState> = new Map();

    /** 状态变更回调 */
    public onStateChange: ((from: string | null, to: string) => void) | null = null;

    /**
     * 注册状态
     */
    public register(state: IState): void {
        if (this._states.has(state.name)) {
            console.warn(`[StateMachine] State "${state.name}" already exists, will be overwritten`);
        }
        this._states.set(state.name, state);
    }

    /**
     * 批量注册状态
     */
    public registerAll(states: IState[]): void {
        states.forEach(state => this.register(state));
    }

    /**
     * 切换状态
     */
    public async change(name: string): Promise<void> {
        const newState = this._states.get(name);
        if (!newState) {
            console.error(`[StateMachine] State "${name}" not found`);
            return;
        }

        const prevState = this._currentState;
        if (prevState && prevState.onExit) {
            await prevState.onExit(name);
        }

        this._currentState = newState;

        if (newState.onEnter) {
            await newState.onEnter(prevState ? prevState.name : null);
        }

        if (this.onStateChange) {
            this.onStateChange(prevState ? prevState.name : null, name);
        }
    }

    /**
     * 初始化状态（不触发 onEnter）
     */
    public init(name: string): void {
        const state = this._states.get(name);
        if (!state) {
            console.error(`[StateMachine] State "${name}" not found`);
            return;
        }
        this._currentState = state;
    }

    /**
     * 每帧更新（需手动调用）
     */
    public update(dt: number): void {
        if (this._currentState && this._currentState.onUpdate) {
            this._currentState.onUpdate(dt);
        }
    }

    /**
     * 检查是否在指定状态
     */
    public is(name: string): boolean {
        return this._currentState !== null && this._currentState.name === name;
    }

    /**
     * 检查状态是否已注册
     */
    public has(name: string): boolean {
        return this._states.has(name);
    }

    /**
     * 获取所有状态名称
     */
    public getStateNames(): string[] {
        return Array.from(this._states.keys());
    }

    /**
     * 清空所有状态
     */
    public clear(): void {
        this._states.clear();
        this._currentState = null;
    }
}