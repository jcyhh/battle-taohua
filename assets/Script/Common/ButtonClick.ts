import { _decorator, Component, Node, tween, Vec3 } from 'cc';
import { AudioManager } from '../Manager/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('ButtonClick')
export class ButtonClick extends Component {
    @property({ tooltip: '是否启用点击动画' })
    enableAnim = true;

    @property({ tooltip: '缩小比例' })
    scaleDown = 0.85;

    @property({ tooltip: '缩小时长(秒)' })
    downDuration = 0.08;

    @property({ tooltip: '回弹时长(秒)' })
    upDuration = 0.12;

    private originScale = new Vec3();
    private isTweening = false;

    onLoad() {
        this.originScale.set(this.node.scale);
        this.node.on(Node.EventType.TOUCH_END, this.onClickUp, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onClickCancel, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.onClickUp, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onClickCancel, this);
    }

    private onClickUp() {
        if (this.isTweening) return;
        if (this.enableAnim) {
            this.playClickAnim();
        }
        AudioManager.instance?.playClick();
    }

    private onClickCancel() {
        if (this.enableAnim) {
            this.resetScale();
        }
    }

    private playClickAnim() {
        this.isTweening = true;
        const downScale = new Vec3(
            this.originScale.x * this.scaleDown,
            this.originScale.y * this.scaleDown,
            this.originScale.z
        );

        tween(this.node)
            .to(this.downDuration, { scale: downScale })
            .to(this.upDuration, { scale: this.originScale })
            .call(() => { this.isTweening = false; })
            .start();
    }

    private resetScale() {
        tween(this.node).stop();
        this.node.setScale(this.originScale);
        this.isTweening = false;
    }
}
