import { _decorator, Component, director, Label } from 'cc';
import { t } from '../Config/I18n';
const { ccclass } = _decorator;

@ccclass('Header')
export class Header extends Component {
    private titleLabel: Label | null = null;

    onLoad() {
        this.titleLabel = this.node.getChildByName('Label')?.getComponent(Label) ?? null;
        this.refreshTitle();
    }

    onQuit() {
        this.backHome();
    }

    backHome() {
        director.loadScene('Home');
    }

    private refreshTitle() {
        if (!this.titleLabel) return;
        this.titleLabel.string = t('灵泉水明细');
    }
}

