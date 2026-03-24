import { _decorator, Component, Label, Node, tween, Vec3 } from 'cc';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

@ccclass('RoomAsset')
export class RoomAsset extends Component {
    @property(Label)
    label: Label = null!;

    @property(Node)
    iconNode: Node = null!;

    private _count = 0;

    get count(): number {
        return this._count;
    }

    set count(val: number) {
        if (val === this._count) return;
        this._count = val;
        this.label.string = formatAmount(val);
        this.playBounce();
    }

    start() {
        this.label.string = formatAmount(this._count);
    }

    private playBounce() {
        tween(this.node)
            .to(0.1, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}
