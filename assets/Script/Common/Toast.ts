import { _decorator, Component, director, Label, Node, Tween, tween, UIOpacity, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Toast')
export class Toast extends Component {
    static instance: Toast | null = null;

    @property(Node)
    toastSuccess: Node = null!;

    @property(Node)
    toastFail: Node = null!;

    private successLabel: Label | null = null;
    private failLabel: Label | null = null;

    private hideTimer = 0;
    private currentToast: Node | null = null;
    private currentTween: Tween<Node | UIOpacity> | null = null;
    private initialized = false;

    static showSuccess(message: string) {
        const toast = this.ensureInstance();
        if (!toast) return;
        toast.presentSuccess(message);
    }

    static showFail(message: string) {
        const toast = this.ensureInstance();
        if (!toast) return;
        toast.presentFail(message);
    }

    onLoad() {
        Toast.instance = this;
        this.ensureInitialized();
    }

    onDestroy() {
        if (Toast.instance === this) {
            Toast.instance = null;
        }
    }

    update(deltaTime: number) {
        if (this.hideTimer <= 0) return;

        this.hideTimer -= deltaTime;
        if (this.hideTimer <= 0) {
            this.hideCurrentToast();
        }
    }

    private presentSuccess(message: string) {
        this.ensureInitialized();
        this.showToast(this.toastSuccess, this.successLabel, message);
    }

    private presentFail(message: string) {
        this.ensureInitialized();
        this.showToast(this.toastFail, this.failLabel, message);
    }

    private showToast(target: Node, label: Label | null, message: string) {
        if (!target || !label) return;

        this.hideAllImmediately();
        label.string = message;
        target.active = true;
        target.setScale(0, 1, 1);
        this.getOpacity(target).opacity = 255;
        this.currentToast = target;
        this.hideTimer = 1.2;
        this.currentTween = tween(target)
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private hideCurrentToast() {
        if (!this.currentToast) return;

        const target = this.currentToast;
        const opacity = this.getOpacity(target);
        this.stopCurrentTween(target);
        this.currentTween = tween(opacity)
            .to(0.2, { opacity: 0 })
            .call(() => {
                target.active = false;
                opacity.opacity = 255;
                if (this.currentToast === target) {
                    this.currentToast = null;
                }
            })
            .start();
    }

    private hideImmediately(target: Node | null) {
        if (!target) return;
        Tween.stopAllByTarget(target);
        target.active = false;
        target.setScale(0, 1, 1);
        this.getOpacity(target).opacity = 255;
        if (this.currentToast === target) {
            this.currentToast = null;
        }
        this.hideTimer = 0;
    }

    private hideAllImmediately() {
        this.hideImmediately(this.toastSuccess);
        this.hideImmediately(this.toastFail);
    }

    private ensureInitialized() {
        if (this.initialized) return;

        this.toastSuccess = this.toastSuccess ?? this.node.getChildByName('toastSuccess')!;
        this.toastFail = this.toastFail ?? this.node.getChildByName('toastFail')!;
        this.successLabel = this.toastSuccess?.getChildByName('Label')?.getComponent(Label) ?? null;
        this.failLabel = this.toastFail?.getChildByName('Label')?.getComponent(Label) ?? null;
        this.hideAllImmediately();
        this.initialized = true;
    }

    private stopCurrentTween(target: Node) {
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        Tween.stopAllByTarget(target);
        Tween.stopAllByTarget(this.getOpacity(target));
    }

    private getOpacity(target: Node): UIOpacity {
        return target.getComponent(UIOpacity) ?? target.addComponent(UIOpacity);
    }

    private static ensureInstance(): Toast | null {
        if (this.instance?.isValid) {
            this.instance.ensureInitialized();
            return this.instance;
        }

        const scene = director.getScene();
        const toastNode = scene ? this.findNodeByName(scene, 'Toast') : null;
        const toast = toastNode?.getComponent(Toast) ?? null;
        if (!toast) return null;

        toast.ensureInitialized();
        this.instance = toast;
        return toast;
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

