import { _decorator, Component, Node, Label, Button, Prefab, Sprite, tween, Vec3, instantiate } from 'cc';
const { ccclass, property } = _decorator;

const TAB_VALUES = [10, 30, 50, 100, 200, 500, 1000, 10000];

@ccclass('Picker')
export class Picker extends Component {
    @property(Node)
    pickerPop: Node = null!;

    @property(Label)
    countLabel: Label = null!;

    @property(Node)
    contentNode: Node = null!;

    @property(Prefab)
    tabPrefab: Prefab = null!;

    private selectedValue = 10;
    private isPopOpen = false;

    onLoad() {
        this.countLabel.string = this.selectedValue.toString();
        this.pickerPop.setScale(1, 0, 1);
        this.initTabs();
        this.node.on(Node.EventType.TOUCH_END, this.togglePop, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.togglePop, this);
    }

    private initTabs() {
        for (const value of TAB_VALUES) {
            const tab = instantiate(this.tabPrefab);
            tab.getComponentInChildren(Label)!.string = value.toString();
            this.contentNode.addChild(tab);
            tab.on(Button.EventType.CLICK, () => this.onTabClick(value));
        }
        this.scheduleOnce(() => {
            this.updateTabStates();
            this.pickerPop.active = false;
        });
    }

    private onTabClick(value: number) {
        if (value === this.selectedValue) return;

        this.selectedValue = value;
        this.updateTabStates();
        this.countLabel.string = value.toString();
        this.scheduleOnce(() => this.closePop(), 0.3);
    }

    private updateTabStates() {
        const children = this.contentNode.children;
        for (let i = 0; i < children.length; i++) {
            const btn = children[i].getComponent(Button)!;
            const selected = TAB_VALUES[i] === this.selectedValue;
            btn.interactable = !selected;
            const sprite = btn.target.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = selected ? btn.disabledSprite : btn.normalSprite;
            }
        }
    }

    private togglePop() {
        if (this.isPopOpen) {
            this.closePop();
        } else {
            this.openPop();
        }
    }

    private openPop() {
        if (this.isPopOpen) return;
        this.isPopOpen = true;
        this.pickerPop.active = true;
        this.pickerPop.setScale(1, 0, 1);
        tween(this.pickerPop)
            .to(0.15, { scale: new Vec3(1, 1.05, 1) })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private closePop() {
        if (!this.isPopOpen) return;
        this.isPopOpen = false;
        tween(this.pickerPop)
            .to(0.15, { scale: new Vec3(1, 0, 1) })
            .call(() => { this.pickerPop.active = false; })
            .start();
    }
}
