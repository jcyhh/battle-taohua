import { _decorator, Component, AudioClip, AudioSource } from 'cc';
import { Storage } from '../Utils/Storage';

const { ccclass, property } = _decorator;

const BGM_KEY = 'bgmOn';
const SFX_KEY = 'sfxOn';

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ type: AudioClip, tooltip: '点击音效' })
    clickClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: '倒计时音效' })
    countdownClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: '攻击音效' })
    attackClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: '选择房间音效' })
    roomSelectClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: '金币音效' })
    coinClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: '结算音效' })
    settlementClip: AudioClip | null = null;

    @property({ type: AudioSource, tooltip: '背景音乐 AudioSource(Play On Awake)' })
    bgmSource: AudioSource | null = null;

    @property({ tooltip: '音效音量' })
    sfxVolume = 1.0;

    private sfxSource: AudioSource | null = null;
    private loopSfxSource: AudioSource | null = null;

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
        this.loopSfxSource = this.node.addComponent(AudioSource);
        this.loopSfxSource.loop = true;
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

    playCountdownTick() {
        this.playSfx(this.countdownClip);
    }

    playAttack() {
        this.playSfxTimes(this.attackClip, 2);
    }

    playRoomSelect() {
        this.playSfx(this.roomSelectClip);
    }

    playCoinOnce() {
        this.playSfx(this.coinClip);
    }

    playCoinBurst() {
        this.playSfxBurst(this.coinClip, 3, 0.12);
    }

    playSettlement() {
        this.playSfx(this.settlementClip);
    }

    playSfx(clip: AudioClip | null) {
        if (!clip || !this.sfxSource) return;
        if (!Storage.getBool(SFX_KEY, true)) return;

        this.sfxSource.playOneShot(clip, this.sfxVolume);
    }

    private playSfxTimes(clip: AudioClip | null, times: number) {
        if (!clip || times <= 0) return;
        this.playSfx(clip);
        if (times <= 1) return;

        const duration = this.getClipDuration(clip);
        for (let i = 1; i < times; i++) {
            this.scheduleOnce(() => this.playSfx(clip), duration * i);
        }
    }

    private playSfxBurst(clip: AudioClip | null, times: number, delayStep: number) {
        if (!clip || times <= 0) return;
        for (let i = 0; i < times; i++) {
            this.scheduleOnce(() => this.playSfx(clip), delayStep * i);
        }
    }

    private getClipDuration(clip: AudioClip): number {
        const clipAny = clip as unknown as { getDuration?: () => number; duration?: number };
        const duration = typeof clipAny.getDuration === 'function' ? clipAny.getDuration() : clipAny.duration;
        if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
            return duration;
        }
        return 0.25;
    }

    startCoinLoop() {
        if (!this.loopSfxSource || !this.coinClip) return;
        if (!Storage.getBool(SFX_KEY, true)) return;
        if (this.loopSfxSource.playing && this.loopSfxSource.clip === this.coinClip) return;
        this.loopSfxSource.stop();
        this.loopSfxSource.clip = this.coinClip;
        this.loopSfxSource.volume = this.sfxVolume;
        this.loopSfxSource.loop = true;
        this.loopSfxSource.play();
    }

    stopCoinLoop() {
        if (!this.loopSfxSource) return;
        this.loopSfxSource.stop();
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
        if (!isOn) {
            this.stopCoinLoop();
        }
    }

    get isBgmOn(): boolean {
        return Storage.getBool(BGM_KEY, true);
    }

    get isSfxOn(): boolean {
        return Storage.getBool(SFX_KEY, true);
    }
}
