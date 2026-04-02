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

    @property({ tooltip: '打开延迟(秒)' })
    openDelay = 0.3;

    @property({ type: Node, tooltip: '父级弹窗节点(二级弹窗时设置)' })
    parentPopupNode: Node | null = null;

    private isTweening = false;
    private isOpenScheduled = false;

    private get parentPopup(): Popup | null {
        return this.parentPopupNode?.getComponent(Popup) ?? null;
    }

    onDisable() {
        this.resetPopupState();
    }

    onDestroy() {
        this.resetPopupState();
    }

    open() {
        if (!this.content) return;

        this.resetPopupState();

        this.setParentMaskActive(false);

        this.isOpenScheduled = true;
        this.scheduleOnce(() => {
            if (!this.isValid || !this.content?.isValid) {
                this.resetPopupState();
                return;
            }

            this.isOpenScheduled = false;
            this.isTweening = true;
            this.node.active = true;
            if (this.mask) {
                this.mask.active = true;
                if (this.closeOnMaskClick) {
                    this.unschedule(this.bindMaskClose);
                    this.scheduleOnce(() => {
                        this.bindMaskClose();
                    }, 0);
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
        }, this.openDelay);
    }

    close() {
        if (!this.content) return;

        AudioManager.instance?.playClick();

        if (this.isOpenScheduled) {
            this.finishCloseImmediately();
            return;
        }

        this.unschedule(this.bindMaskClose);
        if (this.mask) {
            this.mask.off(Node.EventType.TOUCH_END, this.close, this);
        }

        this.isTweening = true;
        tween(this.content).stop();
        this.content.setScale(1, 1, 1);

        tween(this.content)
            .to(this.step1Duration, { scale: new Vec3(this.overshootScale, this.overshootScale, 1) }, { easing: 'cubicOut' })
            .to(this.step2Duration, { scale: new Vec3(0, 0, 1) }, { easing: 'cubicIn' })
            .call(() => {
                this.finishCloseImmediately();
            })
            .start();
    }

    private bindMaskClose = () => {
        if (!this.mask?.isValid || !this.node.active) return;
        this.mask.off(Node.EventType.TOUCH_END, this.close, this);
        this.mask.once(Node.EventType.TOUCH_END, this.close, this);
    };

    private finishCloseImmediately() {
        this.unscheduleAllCallbacks();
        this.isOpenScheduled = false;
        this.isTweening = false;

        if (this.content?.isValid) {
            tween(this.content).stop();
            this.content.active = false;
            this.content.setScale(0, 0, 1);
        }
        if (this.mask?.isValid) {
            this.mask.off(Node.EventType.TOUCH_END, this.close, this);
            this.mask.active = false;
        }
        if (this.node?.isValid) {
            this.node.active = false;
        }

        this.setParentMaskActive(true);
    }

    private resetPopupState() {
        this.unscheduleAllCallbacks();
        this.isOpenScheduled = false;
        this.isTweening = false;
        if (this.content?.isValid) {
            tween(this.content).stop();
        }
        if (this.mask?.isValid) {
            this.mask.off(Node.EventType.TOUCH_END, this.close, this);
        }
    }

    private setParentMaskActive(active: boolean) {
        if (this.parentPopup?.mask) {
            this.parentPopup.mask.active = active;
        }
    }
}
