import { _decorator, Component, Node, tween, Vec3, EventHandler } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Switch')
export class Switch extends Component {
    @property({ type: Node, tooltip: '圆球节点' })
    ball: Node | null = null;

    @property({ tooltip: '开启时圆球 X 坐标' })
    onX = 30;

    @property({ tooltip: '关闭时圆球 X 坐标' })
    offX = -30;

    @property({ tooltip: '动画时长(秒)' })
    duration = 0.15;

    @property({ tooltip: '默认是否开启' })
    isOn = true;

    @property({ type: Node, tooltip: '开启时显示的节点' })
    onNode: Node | null = null;

    @property({ type: Node, tooltip: '关闭时显示的节点' })
    offNode: Node | null = null;

    @property({ type: [EventHandler], tooltip: '状态变化回调' })
    onChanged: EventHandler[] = [];

    private isTweening = false;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.onClick, this);
    }

    setState(isOn: boolean, animate = false) {
        this.isOn = isOn;
        this.applyState(animate);
    }

    onClick() {
        if (this.isTweening) return;

        this.isOn = !this.isOn;
        this.applyState(true);
        EventHandler.emitEvents(this.onChanged, this.isOn);
    }

    private applyState(animate: boolean) {
        if (!this.ball) return;

        const targetX = this.isOn ? this.onX : this.offX;
        const pos = this.ball.position;

        if (animate) {
            this.isTweening = true;
            tween(this.ball)
                .to(this.duration, { position: new Vec3(targetX, pos.y, pos.z) }, { easing: 'cubicOut' })
                .call(() => { this.isTweening = false; })
                .start();
        } else {
            this.ball.setPosition(targetX, pos.y, pos.z);
        }

        if (this.onNode) this.onNode.active = this.isOn;
        if (this.offNode) this.offNode.active = !this.isOn;
    }
}
