import { _decorator, Component, director, Label, Node } from 'cc';
import { Popup } from '../Common/Popup';
import { Api, MineWorkItem } from '../Config/Api';
import { t } from '../Config/I18n';
import { formatAmount } from '../Utils/Format';
import { Content } from './Content';
import { MyWorkers } from './MyWorkers';
const { ccclass, property } = _decorator;

const WORKER_NAME_KEYS: Record<number, string> = {
    1: '白银矿工',
    2: '黄金矿工',
    3: '铂金矿工',
    4: '钻石矿工',
    5: '荣耀矿工',
    6: '王者矿工',
};

@ccclass('PopupPutIn')
export class PopupPutIn extends Component {
    static instance: PopupPutIn | null = null;

    @property(Label)
    nameLabel: Label = null!;

    @property(Label)
    tipsLabel: Label = null!;

    @property(Label)
    surLabel: Label = null!;

    private popup: Popup | null = null;
    private data: MineWorkItem | null = null;
    private isDestroyed = false;

    static open(data: MineWorkItem, availableAmount: number | string) {
        this.ensureInstance()?.openPutIn(data, availableAmount);
    }

    onLoad() {
        this.isDestroyed = false;
        PopupPutIn.instance = this;
        this.popup = this.getComponent(Popup);
    }

    onDestroy() {
        this.isDestroyed = true;
        if (PopupPutIn.instance === this) {
            PopupPutIn.instance = null;
        }
    }

    openPutIn(data: MineWorkItem, availableAmount: number | string) {
        this.popup = this.popup ?? this.getComponent(Popup);
        this.data = data;

        if (this.nameLabel) {
            this.nameLabel.string = data.mine_name ? t(data.mine_name) : '';
        }

        if (this.tipsLabel) {
            this.tipsLabel.string = t('矿厂可容纳数量（{activeCount}/10)', {
                activeCount: formatAmount(data.active_count ?? 0),
            });
        }

        if (this.surLabel) {
            const workerName = t(WORKER_NAME_KEYS[data.mine_level] ?? '矿工');
            this.surLabel.string = t('可用{workerName}: {amount}', {
                workerName,
                amount: formatAmount(availableAmount),
            });
        }

        this.popup?.open();
    }

    async putIn() {
        if (!this.data) return;

        try {
            const mineLevel = this.data.mine_level;
            await Api.minePut({ mine_level: mineLevel });
            if (this.isDestroyed || !this.node?.isValid) return;
            this.popup?.close();
            MyWorkers.instance?.refresh(mineLevel);
            Content.instance?.refreshMineWorks();
        } catch (error) {
            console.error('[PopupPutIn] 投入矿场失败:', error);
        }
    }

    update(deltaTime: number) {
        
    }

    private static ensureInstance(): PopupPutIn | null {
        if (this.instance?.isValid) return this.instance;

        const scene = director.getScene();
        const popupNode = scene ? this.findNodeByName(scene, 'PopupPutIn') ?? this.findNodeByName(scene, 'popupPutIn') : null;
        const popup = popupNode?.getComponent(PopupPutIn) ?? null;
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

