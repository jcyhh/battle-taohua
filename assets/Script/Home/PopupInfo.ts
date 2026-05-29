import { _decorator, Component, director, Label, Node } from 'cc';
import { Popup } from '../Common/Popup';
import { MineWorkerItem } from '../Config/Api';
import { t } from '../Config/I18n';
import { formatAmount } from '../Utils/Format';
import { Content } from './Content';
const { ccclass, property } = _decorator;

const STATUS_TEXT: Record<number, string> = {
    0: '休息中',
    1: '工作中',
    2: '待喝水',
};

@ccclass('PopupInfo')
export class PopupInfo extends Component {
    static instance: PopupInfo | null = null;

    @property(Label)
    nameNode: Label = null!;

    @property(Label)
    statusNode: Label = null!;

    @property(Label)
    releaseNode: Label = null!;

    @property(Label)
    daysNode: Label = null!;

    @property(Label)
    timeNode: Label = null!;

    private popup: Popup | null = null;
    private targetTimeMs = 0;
    private isDestroyed = false;

    static open(data: MineWorkerItem) {
        this.ensureInstance()?.openInfo(data);
    }

    onLoad() {
        this.isDestroyed = false;
        PopupInfo.instance = this;
        this.popup = this.getComponent(Popup);
    }

    onDisable() {
        this.unschedule(this.updateCountdown);
    }

    onDestroy() {
        this.isDestroyed = true;
        this.unschedule(this.updateCountdown);
        if (PopupInfo.instance === this) {
            PopupInfo.instance = null;
        }
    }

    openInfo(data: MineWorkerItem) {
        this.popup = this.popup ?? this.getComponent(Popup);
        this.unschedule(this.updateCountdown);

        if (this.nameNode) {
            this.nameNode.string = data.miner_name ? t(data.miner_name) : '';
        }

        if (this.statusNode) {
            const statusText = STATUS_TEXT[Number(data.status)] ?? '';
            this.statusNode.string = statusText ? t(statusText) : '';
        }

        if (this.releaseNode) {
            this.releaseNode.string = `${formatAmount(data.total_yield ?? 0)}/${formatAmount(data.count_yield ?? 0)}`;
        }

        if (this.daysNode) {
            this.daysNode.string = `${formatAmount(data.work_day ?? 0)}/${formatAmount(data.cycle ?? 0)}`;
        }

        if (Number(data.status) === 2) {
            if (this.timeNode) {
                this.timeNode.string = '--';
            }
            this.popup?.open();
            return;
        }

        this.targetTimeMs = this.parseShanghaiTime(data.next_work_time);
        this.updateCountdown();
        this.schedule(this.updateCountdown, 1);
        this.popup?.open();
    }

    private updateCountdown = () => {
        if (this.isDestroyed || !this.node?.isValid) return;
        const remainMs = this.targetTimeMs - Date.now();
        if (remainMs <= 0) {
            if (this.timeNode) {
                this.timeNode.string = '00:00:00';
            }
            this.unschedule(this.updateCountdown);
            this.popup?.close({ silent: true });
            Content.instance?.refreshMineWorks();
            return;
        }

        if (this.timeNode) {
            this.timeNode.string = this.formatCountdown(Math.ceil(remainMs / 1000));
        }
    }

    private parseShanghaiTime(value?: string): number {
        if (!value) return 0;
        return new Date(`${value.replace(' ', 'T')}+08:00`).getTime();
    }

    private formatCountdown(totalSeconds: number): string {
        const seconds = Math.max(0, totalSeconds);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainSeconds = seconds % 60;
        return `${this.padTime(hours)}:${this.padTime(minutes)}:${this.padTime(remainSeconds)}`;
    }

    private padTime(value: number): string {
        return value < 10 ? `0${value}` : String(value);
    }

    private static ensureInstance(): PopupInfo | null {
        if (this.instance?.isValid) return this.instance;

        const scene = director.getScene();
        const popupNode = scene ? this.findNodeByName(scene, 'PopupInfo') ?? this.findNodeByName(scene, 'popupInfo') : null;
        const popup = popupNode?.getComponent(PopupInfo) ?? null;
        if (!popup) return null;

        this.instance = popup;
        return popup;
    }

    private static findNodeByName(root: Node, name: string): Node | null {
        if (root.name === name) return root;

        for (const child of root.children) {
            const result = this.findNodeByName(child, name);
            if (result) return result;
        }

        return null;
    }
}

