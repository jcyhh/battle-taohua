import { _decorator, AudioClip, AudioSource, Component, Director, director, resources } from 'cc';
import { Storage } from '../Utils/Storage';

const { ccclass, property } = _decorator;

const BGM_KEY = 'bgmOn';
const SFX_KEY = 'sfxOn';

const AUDIO_PATHS = {
    bgm: 'Audio/bgm',
    click: 'Audio/play',
    countdown: 'Audio/countdown',
    attack: 'Audio/attack',
    roomSelect: 'Audio/chooseRoom',
    coin: 'Audio/gold',
    settlement: 'Audio/win',
} as const;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ tooltip: '音效音量' })
    sfxVolume = 1.0;

    private bgmSource: AudioSource | null = null;
    private sfxSource: AudioSource | null = null;
    private bgmClip: AudioClip | null = null;
    private clickClip: AudioClip | null = null;
    private countdownClip: AudioClip | null = null;
    private attackClip: AudioClip | null = null;
    private roomSelectClip: AudioClip | null = null;
    private coinClip: AudioClip | null = null;
    private settlementClip: AudioClip | null = null;
    private preloadPromise: Promise<void> | null = null;

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
        director.addPersistRootNode(this.node);

        const sources = this.getComponents(AudioSource);
        this.bgmSource = sources[0] ?? this.node.addComponent(AudioSource);
        this.sfxSource = sources[1] ?? this.node.addComponent(AudioSource);
        this.bgmSource.playOnAwake = false;
        this.bgmSource.loop = true;

        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.ensureBgmPlayback, this);
        void this.preloadAudioAssets();
    }

    onDestroy() {
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
        director.off(Director.EVENT_AFTER_SCENE_LAUNCH, this.ensureBgmPlayback, this);
    }

    preloadAudioAssets() {
        if (this.preloadPromise) {
            return this.preloadPromise;
        }

        this.preloadPromise = Promise.all([
            this.loadClip(AUDIO_PATHS.bgm).then((clip) => { this.bgmClip = clip; }),
            this.loadClip(AUDIO_PATHS.click).then((clip) => { this.clickClip = clip; }),
            this.loadClip(AUDIO_PATHS.countdown).then((clip) => { this.countdownClip = clip; }),
            this.loadClip(AUDIO_PATHS.attack).then((clip) => { this.attackClip = clip; }),
            this.loadClip(AUDIO_PATHS.roomSelect).then((clip) => { this.roomSelectClip = clip; }),
            this.loadClip(AUDIO_PATHS.coin).then((clip) => { this.coinClip = clip; }),
            this.loadClip(AUDIO_PATHS.settlement).then((clip) => { this.settlementClip = clip; }),
        ]).then(() => {
            if (this.bgmSource && this.bgmClip) {
                this.bgmSource.clip = this.bgmClip;
            }
            this.ensureBgmPlayback();
        }).catch((error) => {
            console.error('[AudioManager] 音频异步加载失败:', error);
        });

        return this.preloadPromise;
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

    ensureBgmPlayback() {
        if (!this.bgmSource) return;
        if (!this.bgmClip) {
            void this.preloadAudioAssets();
            return;
        }

        if (!Storage.getBool(BGM_KEY, true)) {
            this.bgmSource.pause();
            return;
        }

        if (this.bgmSource.clip !== this.bgmClip) {
            this.bgmSource.clip = this.bgmClip;
        }
        if (!this.bgmSource.playing) {
            this.bgmSource.play();
        }
    }

    setBgmOn(isOn: boolean) {
        Storage.setBool(BGM_KEY, isOn);
        if (!this.bgmSource) return;

        if (isOn) {
            this.ensureBgmPlayback();
        } else {
            this.bgmSource.pause();
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

    private loadClip(path: string): Promise<AudioClip> {
        return new Promise((resolve, reject) => {
            resources.load(path, AudioClip, (error, clip) => {
                if (error || !clip) {
                    reject(error ?? new Error(`音频加载失败: ${path}`));
                    return;
                }
                resolve(clip);
            });
        });
    }
}
