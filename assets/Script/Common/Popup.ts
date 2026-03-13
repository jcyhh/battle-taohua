import { _decorator, Component, Node, tween, Vec3 } from 'cc';
import { AudioManager } from '../Manager/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('Popup')
export class Popup extends Component {
    @property({ type: Node, tooltip: '弹窗内容节点(会做缩放动画)' })
    content: Node | null = null;

    @property({ type: Node, tooltip: '遮罩节点(打开时显示，关闭时隐藏)' })
    mask: Node | null = null;

    @property({ tooltip: '第一段缩放时长(秒)' })
    step1Duration = 0.12;

    @property({ tooltip: '第二段缩放时长(秒)' })
    step2Duration = 0.1;

    @property({ tooltip: '过冲缩放比例' })
    overshootScale = 1.1;

    @property({ tooltip: '点击遮罩是否关闭弹窗' })
    closeOnMaskClick = true;

    @property({ type: Node, tooltip: '父级弹窗节点(二级弹窗时设置)' })
    parentPopupNode: Node | null = null;

    private isTweening = false;

    private get parentPopup(): Popup | null {
        return this.parentPopupNode?.getComponent(Popup) ?? null;
    }

    open() {
        if (!this.content || this.isTweening) return;

        if (this.parentPopup?.mask) {
            this.parentPopup.mask.active = false;
        }

        this.isTweening = true;
        this.node.active = true;
        if (this.mask) {
            this.mask.active = true;
            if (this.closeOnMaskClick) {
                this.mask.once(Node.EventType.TOUCH_END, this.close, this);
            }
        }
        this.content.active = true;

        tween(this.content).stop();
        this.content.setScale(0, 0, 1);

        tween(this.content)
            .to(this.step1Duration, { scale: new Vec3(this.overshootScale, this.overshootScale, 1) }, { easing: 'cubicOut' })
            .to(this.step2Duration, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicInOut' })
            .call(() => {
                this.isTweening = false;
            })
            .start();
    }

    close() {
        if (!this.content || this.isTweening) return;

        AudioManager.instance?.playClick();
        this.isTweening = true;
        tween(this.content).stop();
        this.content.setScale(1, 1, 1);

        tween(this.content)
            .to(this.step1Duration, { scale: new Vec3(this.overshootScale, this.overshootScale, 1) }, { easing: 'cubicOut' })
            .to(this.step2Duration, { scale: new Vec3(0, 0, 1) }, { easing: 'cubicIn' })
            .call(() => {
                this.content!.active = false;
                if (this.mask) this.mask.active = false;
                this.node.active = false;
                this.isTweening = false;

                if (this.parentPopup?.mask) {
                    this.parentPopup.mask.active = true;
                }
            })
            .start();
    }
}
