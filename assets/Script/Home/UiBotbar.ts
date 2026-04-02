import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

@ccclass('UiBotbar')
export class UiBotbar extends Component {
    private static hasPreloadedSubScenes = false;

    start() {
        this.preloadSubScenes();
    }

    goRecordScene() {
        director.loadScene('Record');
    }

    goRankScene() {
        director.loadScene('Rank');
    }

    goLogScene() {
        director.loadScene('Log');
    }

    private preloadSubScenes() {
        if (UiBotbar.hasPreloadedSubScenes) {
            return;
        }
        UiBotbar.hasPreloadedSubScenes = true;

        director.preloadScene('Record', (error) => {
            if (error) {
                console.warn('[UiBotbar] 预加载 Record 场景失败:', error);
            }
        });

        director.preloadScene('Rank', (error) => {
            if (error) {
                console.warn('[UiBotbar] 预加载 Rank 场景失败:', error);
            }
        });

        director.preloadScene('Log', (error) => {
            if (error) {
                console.warn('[UiBotbar] 预加载 Log 场景失败:', error);
            }
        });
    }
}

