import { _decorator, Component, director, Node, ProgressBar } from 'cc';
import { AudioManager } from '../Manager/AudioManager';
import { AppBridge } from '../Utils/AppBridge';
const { ccclass, property } = _decorator;

const SCENE_NAME = 'Home';
const MAX_PRELOAD_PROGRESS = 0.96;
const PROGRESS_LERP_SPEED = 8;
const PROGRESS_ICON_TRAVEL_X = 570;

@ccclass('Loading')
export class Loading extends Component {
    @property(Node)
    progressBarNode: Node | null = null;

    @property(Node)
    progressIconNode: Node | null = null;

    private progressBar: ProgressBar | null = null;
    private targetProgress = 0;
    private initPromise: Promise<any> | null = null;
    private progressIconStartX = 0;

    onLoad() {
        this.progressBar = this.progressBarNode?.getComponent(ProgressBar) ?? null;
        if (this.progressBar) {
            this.progressBar.progress = 0;
        }
        const barNode = this.progressBar?.barSprite?.node ?? null;
        this.progressIconStartX = barNode?.position.x ?? this.progressIconNode?.position.x ?? 0;
        this.updateProgressVisual(0);
        this.initPromise = AppBridge.init();
        void AudioManager.instance?.preloadAudioAssets();
    }

    async start() {
        await this.initPromise;

        AppBridge.postMessage('onLoading', '')

        director.preloadScene(
            SCENE_NAME,
            (completedCount: number, totalCount: number) => {
                if (totalCount <= 0) return;
                const rawProgress = Math.min(MAX_PRELOAD_PROGRESS, completedCount / totalCount);
                this.targetProgress = Math.max(this.targetProgress, rawProgress);
            },
            (error) => {
                if (error) {
                    console.error(`[Loading] 预加载 ${SCENE_NAME} 场景失败:`, error);
                }
                this.updateProgressVisual(1);
                director.loadScene(SCENE_NAME);
            },
        );

    }

    update(dt: number) {
        if (!this.progressBar) return;
        const current = this.progressBar.progress;
        const next = current + (this.targetProgress - current) * Math.min(1, dt * PROGRESS_LERP_SPEED);
        this.updateProgressVisual(Math.max(current, next));
    }

    private updateProgressVisual(progress: number) {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        if (this.progressBar) {
            this.progressBar.progress = clampedProgress;
        }
        if (this.progressIconNode) {
            const pos = this.progressIconNode.position;
            this.progressIconNode.setPosition(
                this.progressIconStartX + PROGRESS_ICON_TRAVEL_X * clampedProgress,
                pos.y,
                pos.z,
            );
        }
    }
}

