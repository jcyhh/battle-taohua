import { _decorator, Component, director, Node } from 'cc';
import { Popup } from '../Common/Popup';

const { ccclass } = _decorator;

@ccclass('PopupUnstart')
export class PopupUnstart extends Component {
    static instance: PopupUnstart | null = null;

    private popup: Popup | null = null;

    static open() {
        this.ensureInstance()?.openPopup();
    }

    static close() {
        if (!this.instance?.isValid) return;
        this.instance.closePopup();
    }

    onLoad() {
        PopupUnstart.instance = this;
        this.popup = this.getComponent(Popup);
    }

    onDestroy() {
        if (PopupUnstart.instance === this) {
            PopupUnstart.instance = null;
        }
    }

    openPopup() {
        if (!this.node?.isValid) return;
        this.popup = this.popup ?? this.getComponent(Popup);
        if (this.node.active) return;
        this.popup?.open();
    }

    closePopup() {
        if (!this.node?.isValid) return;
        this.popup = this.popup ?? this.getComponent(Popup);
        this.popup?.close({ silent: true });
    }

    private static ensureInstance(): PopupUnstart | null {
        if (this.instance?.isValid) return this.instance;

        const scene = director.getScene();
        const popupNode = scene ? this.findNodeByName(scene, 'popupUnstart') : null;
        const popup = popupNode?.getComponent(PopupUnstart) ?? null;
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
