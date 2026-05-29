import { _decorator, Component, instantiate, Label, Node, Prefab, tween, Vec3 } from 'cc';
import { MineWorkItem } from '../Config/Api';
import { t } from '../Config/I18n';
import { formatAmount } from '../Utils/Format';
import { Miner } from './Miner';
import { MyWorkers } from './MyWorkers';
import { PopupPutIn } from './PopupPutIn';
const { ccclass, property } = _decorator;

@ccclass('PlantItem')
export class PlantItem extends Component {

    @property(Label)
    countLabel: Label = null!;

    @property(Node)
    RolesNode: Node = null!;

    @property(Prefab)
    MinerPrefab: Prefab = null!;

    private data: MineWorkItem | null = null;

    renderWorkInfo(data: MineWorkItem) {
        this.data = data;

        if (this.countLabel) {
            this.countLabel.string = t('{count} 正在挖矿', {
                count: formatAmount(data.working_count),
            });
        }

        this.renderMiners(data);
    }

    openPutInPopup() {
        if (!this.data) return;

        const availableAmount = MyWorkers.instance?.getWorkerAmount(this.data.mine_level) ?? 0;
        PopupPutIn.open(this.data, availableAmount);
    }

    private renderMiners(data: MineWorkItem) {
        const workers = data.workers ?? [];
        if (!this.RolesNode || !this.MinerPrefab) return;

        const extraNodes = this.RolesNode.children.slice(workers.length);
        for (const node of extraNodes) {
            node.removeFromParent();
            if (node.isValid) {
                node.destroy();
            }
        }

        while (this.RolesNode.children.length < workers.length) {
            const minerNode = instantiate(this.MinerPrefab);
            minerNode.setScale(0, 0, 1);
            this.RolesNode.addChild(minerNode);
            tween(minerNode)
                .to(0.2, { scale: new Vec3(1, 1, 1) })
                .start();
        }

        for (let i = 0; i < workers.length; i++) {
            const miner = this.RolesNode.children[i].getComponent(Miner);
            if (!miner) continue;

            miner.render(workers[i]);
        }
    }

    playWorkingMinerTokenEffects() {
        if (!this.RolesNode) return;

        for (const child of this.RolesNode.children) {
            child.getComponent(Miner)?.playTokenEffect();
        }
    }

    start() {

    }

    update(deltaTime: number) {
        
    }
}

