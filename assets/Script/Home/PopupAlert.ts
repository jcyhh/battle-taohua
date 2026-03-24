import { _decorator, Component, director, Label, Node, RichText } from 'cc';
import { Popup } from '../Common/Popup';
import { AudioManager } from '../Manager/AudioManager';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

@ccclass('PopupAlert')
export class PopupAlert extends Component {
    static instance: PopupAlert | null = null;

    @property(RichText)
    titleRichText: RichText = null!;

    @property(Label)
    detailLabel: Label = null!;

    @property(Node)
    popupContent: Node = null!;

    private popup: Popup | null = null;

    static open(roomName: string, userAmount?: number | string, userBonus?: number | string) {
        this.ensureInstance()?.openAlert(roomName, userAmount, userBonus);
    }

    static close() {
        this.ensureInstance()?.closeAlert();
    }

    onLoad() {
        PopupAlert.instance = this;
        this.popup = this.getComponent(Popup);
        this.bindNodes();
    }

    onDestroy() {
        if (PopupAlert.instance === this) {
            PopupAlert.instance = null;
        }
    }

    openAlert(roomName: string, userAmount?: number | string, userBonus?: number | string) {
        this.popup = this.popup ?? this.getComponent(Popup);
        this.bindNodes();
        if (!this.titleRichText || !this.detailLabel) return;

        this.titleRichText.string = `<b>杀手攻击了<color=#FFCC00>${roomName}</color></b>`;
        this.detailLabel.string = `本期投入${formatAmount(userAmount)}灵石，获得${formatAmount(userBonus)}灵石`;
        this.popup?.open();
        AudioManager.instance?.playSettlement();
    }

    closeAlert() {
        if (!this.node.active) return;
        this.popup?.close();
    }

    private bindNodes() {
        this.popupContent = this.popupContent ?? this.node.getChildByName('popupContent')!;
        this.titleRichText = this.titleRichText ?? this.popupContent?.getChildByName('RichText')?.getComponent(RichText)!;
        this.detailLabel = this.detailLabel ?? this.popupContent?.getChildByName('Label')?.getComponent(Label)!;
    }

    private static ensureInstance(): PopupAlert | null {
        if (this.instance?.isValid) return this.instance;

        const scene = director.getScene();
        const popupNode = scene ? this.findNodeByName(scene, 'popupAlert') : null;
        const popup = popupNode?.getComponent(PopupAlert) ?? null;
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

