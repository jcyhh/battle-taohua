import { _decorator, Component, AudioClip, AudioSource } from 'cc';
import { Storage } from '../Utils/Storage';

const { ccclass, property } = _decorator;

const BGM_KEY = 'bgmOn';
const SFX_KEY = 'sfxOn';

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ type: AudioClip, tooltip: '点击音效' })
    clickClip: AudioClip | null = null;

    @property({ type: AudioSource, tooltip: '背景音乐 AudioSource(Play On Awake)' })
    bgmSource: AudioSource | null = null;

    @property({ tooltip: '音效音量' })
    sfxVolume = 1.0;

    private sfxSource: AudioSource | null = null;

    private static _instance: AudioManager | null = null;
    static get instance(): AudioManager | null {
        return AudioManager._instance;
    }

    onLoad() {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;

        this.sfxSource = this.node.addComponent(AudioSource);
        this.initBgm();
    }

    onDestroy() {
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
    }

    private initBgm() {
        if (!this.bgmSource) return;

        if (!Storage.getBool(BGM_KEY, true)) {
            this.scheduleOnce(() => {
                this.bgmSource?.stop();
            }, 0);
        }
    }

    playClick() {
        this.playSfx(this.clickClip);
    }

    playSfx(clip: AudioClip | null) {
        if (!clip || !this.sfxSource) return;
        if (!Storage.getBool(SFX_KEY, true)) return;

        this.sfxSource.playOneShot(clip, this.sfxVolume);
    }

    setBgmOn(isOn: boolean) {
        Storage.setBool(BGM_KEY, isOn);
        if (!this.bgmSource) return;

        if (isOn) {
            this.bgmSource.stop();
            this.bgmSource.play();
        } else {
            this.bgmSource.stop();
        }
    }

    setSfxOn(isOn: boolean) {
        Storage.setBool(SFX_KEY, isOn);
    }

    get isBgmOn(): boolean {
        return Storage.getBool(BGM_KEY, true);
    }

    get isSfxOn(): boolean {
        return Storage.getBool(SFX_KEY, true);
    }
}
