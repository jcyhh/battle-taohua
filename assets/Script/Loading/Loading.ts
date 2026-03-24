import { _decorator, Component, director, Node, ProgressBar } from 'cc';
const { ccclass, property } = _decorator;

const SCENE_NAME = 'Home';
const MAX_PRELOAD_PROGRESS = 0.96;
const PROGRESS_LERP_SPEED = 8;

@ccclass('Loading')
export class Loading extends Component {
    @property(Node)
    progressBarNode: Node | null = null;

    private progressBar: ProgressBar | null = null;
    private targetProgress = 0;

    onLoad() {
        this.progressBar = this.progressBarNode?.getComponent(ProgressBar) ?? null;
        if (this.progressBar) {
            this.progressBar.progress = 0;
        }
    }

    start() {
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
                if (this.progressBar) {
                    this.progressBar.progress = 1;
                }
                director.loadScene(SCENE_NAME);
            },
        );
    }

    update(dt: number) {
        if (!this.progressBar) return;
        const current = this.progressBar.progress;
        const next = current + (this.targetProgress - current) * Math.min(1, dt * PROGRESS_LERP_SPEED);
        this.progressBar.progress = Math.max(current, next);
    }
}

