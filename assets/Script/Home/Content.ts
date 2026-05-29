import { _decorator, Button, Component, director, Event, Label, Node, Tween, tween, Vec3 } from 'cc';
import { Api, MineWorkItem } from '../Config/Api';
import { AudioManager } from '../Manager/AudioManager';
import { formatAmount } from '../Utils/Format';
import { PlantItem } from './PlantItem';
import { WorkerItem } from './WorkerItem';
const { ccclass, property } = _decorator;

const TAB_PLANT = 0;
const TAB_WORKER = 1;
const LIST_OFFSET_X = 690;
const MINE_WORK_CYCLE_INTERVAL = 3;

@ccclass('Content')
export class Content extends Component {
    static instance: Content | null = null;

    @property(Label)
    balanceLabel: Label = null!;

    @property(Label)
    balanceWaterLabel: Label = null!;

    @property(Node)
    plantListNode: Node = null!;

    @property(Node)
    plantListContentNode: Node = null!;

    @property(Node)
    workerListNode: Node = null!;

    @property(Node)
    workerListContentNode: Node = null!;

    @property(Button)
    tab1Button: Button = null!;

    @property(Button)
    tab2Button: Button = null!;

    currentTabIndex = TAB_PLANT;
    private isMineSoundLoopRunning = false;
    private isDestroyed = false;

    onLoad() {
        this.isDestroyed = false;
        Content.instance = this;
    }

    onDestroy() {
        this.isDestroyed = true;
        if (Content.instance === this) {
            Content.instance = null;
        }
        this.stopMineSoundLoops();
        if (this.plantListNode?.isValid) Tween.stopAllByTarget(this.plantListNode);
        if (this.workerListNode?.isValid) Tween.stopAllByTarget(this.workerListNode);
    }

    start() {
        this.switchTab(TAB_PLANT, false);
        this.refreshBalance();
        this.refreshMineWorks();
        this.preloadRecordScene();
    }

    onTabClick(_event: Event, customEventData: string) {
        this.switchTab(Number(customEventData));
    }

    goRecordScene() {
        this.stopMineSoundLoops();
        director.loadScene('Record');
    }

    goLogScene() {
        this.goRecordScene();
    }

    switchTab(tabIndex: number, useTween = true) {
        if (tabIndex !== TAB_PLANT && tabIndex !== TAB_WORKER) return;

        this.currentTabIndex = tabIndex;

        if (tabIndex === TAB_PLANT) {
            this.setTabInteractable(false, true);
            this.moveListTo(this.plantListNode, 0, useTween);
            this.moveListTo(this.workerListNode, LIST_OFFSET_X, useTween);
            return;
        }

        this.setTabInteractable(true, false);
        this.moveListTo(this.plantListNode, -LIST_OFFSET_X, useTween);
        this.moveListTo(this.workerListNode, 0, useTween);
        this.fetchWorkerShopList();
    }

    private setTabInteractable(tab1Interactable: boolean, tab2Interactable: boolean) {
        if (this.tab1Button) {
            this.tab1Button.interactable = tab1Interactable;
        }

        if (this.tab2Button) {
            this.tab2Button.interactable = tab2Interactable;
        }
    }

    async refreshBalance() {
        try {
            const data = await Api.userMy() as { balance_xz?: string | number; balance_spring_water?: string | number };
            if (this.isDestroyed || !this.node?.isValid) return;
            if (this.balanceLabel) {
                this.balanceLabel.string = formatAmount(data.balance_xz);
            }
            if (this.balanceWaterLabel) {
                this.balanceWaterLabel.string = formatAmount(data.balance_spring_water);
            }
        } catch (error) {
            console.error('[Content] 获取用户信息失败:', error);
        }
    }

    async refreshMineWorks() {
        try {
            const data = await Api.mineWorks();
            if (this.isDestroyed || !this.node?.isValid) return;
            for (const item of data.list) {
                this.renderPlantItem(item);
            }
            this.updateMineSoundLoops(data.list);
        } catch (error) {
            console.error('[Content] 获取矿场列表失败:', error);
        }
    }

    private renderPlantItem(item: MineWorkItem) {
        const itemNode = this.plantListContentNode?.getChildByName(`plantItem${item.mine_level}`);
        const plantItem = itemNode?.getComponent(PlantItem);
        if (!plantItem) return;

        plantItem.renderWorkInfo(item);
    }

    private updateMineSoundLoops(list: MineWorkItem[]) {
        const hasWorkingMiner = list.some((item) => {
            return item.workers?.some((worker) => Number(worker.status) === 1) ?? false;
        });

        if (hasWorkingMiner) {
            this.startMineSoundLoops();
            return;
        }

        this.stopMineSoundLoops();
    }

    private startMineSoundLoops() {
        if (this.isMineSoundLoopRunning) return;

        this.isMineSoundLoopRunning = true;
        this.schedule(this.playMineWorkCycle, MINE_WORK_CYCLE_INTERVAL);
    }

    private stopMineSoundLoops() {
        this.isMineSoundLoopRunning = false;
        this.unschedule(this.playMineWorkCycle);
        this.unschedule(this.playMineTokenReward);
    }

    private playMineWorkCycle = () => {
        if (this.isDestroyed || !this.isMineSoundLoopRunning) return;

        const workDuration = AudioManager.instance?.playWorkOnce() ?? 0.25;
        this.unschedule(this.playMineTokenReward);
        this.scheduleOnce(this.playMineTokenReward, workDuration);
    };

    private playMineTokenReward = () => {
        if (this.isDestroyed || !this.isMineSoundLoopRunning) return;

        this.playWorkingMinerTokenEffects();
        AudioManager.instance?.playCoinOnce();
    };

    private playWorkingMinerTokenEffects() {
        if (!this.plantListContentNode?.isValid) return;

        for (const child of this.plantListContentNode.children) {
            child.getComponent(PlantItem)?.playWorkingMinerTokenEffects();
        }
    }

    private async fetchWorkerShopList() {
        try {
            const data = await Api.minerList();
            if (this.isDestroyed || !this.node?.isValid) return;
            for (const item of data.list) {
                this.renderWorkerShopItem(item.miner_id, item.cycle, item.price);
            }
        } catch (error) {
            console.error('[Content] 获取矿工商店列表失败:', error);
        }
    }

    private renderWorkerShopItem(minerId: number, cycle: number | string, price: number | string) {
        const itemNode = this.workerListContentNode?.getChildByName(`workerItem${minerId}`);
        const workerItem = itemNode?.getComponent(WorkerItem);
        if (!workerItem) return;

        workerItem.renderShopInfo(minerId, cycle, price);
    }

    private preloadRecordScene() {
        director.preloadScene('Record', (error) => {
            if (error) {
                console.warn('[Content] 预加载 Record 场景失败:', error);
            }
        });
    }

    private moveListTo(target: Node | null, targetX: number, useTween: boolean) {
        if (!target) return;
        if (target.position.x === targetX) return;

        const nextPosition = new Vec3(targetX, target.position.y, target.position.z);
        Tween.stopAllByTarget(target);

        if (!useTween) {
            target.setPosition(nextPosition);
            return;
        }

        tween(target)
            .to(0.25, { position: nextPosition })
            .start();
    }

    update(deltaTime: number) {
        
    }
}

