import { _decorator, Component } from 'cc';
import { Switch } from '../Common/Switch';
import { AudioManager } from '../Manager/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('PopupSetting')
export class PopupSetting extends Component {
    @property({ type: Switch, tooltip: '背景音乐开关' })
    bgmSwitch: Switch | null = null;

    @property({ type: Switch, tooltip: '音效开关' })
    sfxSwitch: Switch | null = null;

    onEnable() {
        const mgr = AudioManager.instance;
        if (this.bgmSwitch && mgr) {
            this.bgmSwitch.setState(mgr.isBgmOn);
        }
        if (this.sfxSwitch && mgr) {
            this.sfxSwitch.setState(mgr.isSfxOn);
        }
    }

    onBgmSwitchChanged(isOn: boolean) {
        AudioManager.instance?.setBgmOn(isOn);
    }

    onSfxSwitchChanged(isOn: boolean) {
        AudioManager.instance?.setSfxOn(isOn);
        if (isOn) {
            AudioManager.instance?.playClick();
        }
    }
}
