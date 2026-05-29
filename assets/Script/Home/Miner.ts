import { _decorator, Animation, AnimationClip, Component, Node, resources, Sprite, SpriteFrame, tween, Tween, UIOpacity, Vec3 } from 'cc';
import { Api, MineWorkerItem } from '../Config/Api';
import { AudioManager } from '../Manager/AudioManager';
import { Content } from './Content';
import { PopupInfo } from './PopupInfo';
const { ccclass, property } = _decorator;

const MINER_STATUS_WORKING = 1;
const MINER_STATUS_WAIT_WATER = 2;

@ccclass('Miner')
export class Miner extends Component {
    @property(Node)
    roleNode: Node = null!;

    @property(Node)
    waterNode: Node = null!;

    @property(Node)
    tokenNode: Node = null!;

    private renderToken = 0;
    private data: MineWorkerItem | null = null;
    private isWorking = false;
    private tokenBasePosition = new Vec3(0, 90, 0);
    private waterBasePosition = new Vec3();
    private isDrinking = false;

    render(data: MineWorkerItem) {
        this.data = data;
        const minerId = this.normalizeMinerId(data);
        const status = Number(data.status);

        if (status === MINER_STATUS_WORKING) {
            this.isWorking = true;
            this.playWorkAnimation(minerId);
            return;
        }

        if (status === MINER_STATUS_WAIT_WATER) {
            this.isWorking = false;
            this.stopTokenEffect();
            this.showWaitWater(minerId);
        }
    }

    openInfoPopup() {
        if (!this.data) return;

        AudioManager.instance?.playClick();
        PopupInfo.open(this.data);
    }

    async drinkWater() {
        if (!this.data || this.isDrinking) return;
        if (Number(this.data.status) !== MINER_STATUS_WAIT_WATER) return;

        this.isDrinking = true;
        const minerId = this.normalizeMinerId(this.data);
        try {
            await Api.mineDrinkWater({ work_id: Number(this.data.id) });
            if (!this.node?.isValid) return;

            this.isWorking = false;
            if (this.waterNode?.isValid) {
            this.stopWaterFloatEffect();
                this.waterNode.active = false;
            }
            this.playDrinkAnimation(minerId, () => {
                Content.instance?.refreshMineWorks();
            });
            AudioManager.instance?.playDrinkOnce();
            Content.instance?.refreshBalance();
        } catch (error) {
            console.error('[Miner] 矿工喝水失败:', error);
        } finally {
            this.isDrinking = false;
        }
    }

    private playWorkAnimation(minerId: number) {
        this.renderToken += 1;
        const token = this.renderToken;

        if (this.waterNode) {
            this.stopWaterFloatEffect();
            this.waterNode.active = false;
        }

        resources.load(`role${minerId}/work${minerId}`, AnimationClip, (error, clip) => {
            if (token !== this.renderToken || error || !clip || !this.roleNode?.isValid) return;

            const animation = this.roleNode.getComponent(Animation) ?? this.roleNode.addComponent(Animation);
            if (!animation.getState(clip.name)) {
                animation.addClip(clip);
            }
            animation.defaultClip = clip;
            animation.play(clip.name);
        });
    }

    private playDrinkAnimation(minerId: number, onFinished?: () => void) {
        this.renderToken += 1;
        const token = this.renderToken;

        resources.load(`role${minerId}/drink${minerId}`, AnimationClip, (error, clip) => {
            if (token !== this.renderToken || !this.roleNode?.isValid) return;
            if (error || !clip) {
                onFinished?.();
                return;
            }

            const animation = this.roleNode.getComponent(Animation) ?? this.roleNode.addComponent(Animation);
            if (!animation.getState(clip.name)) {
                animation.addClip(clip);
            }
            animation.defaultClip = clip;
            animation.once(Animation.EventType.FINISHED, () => {
                if (token !== this.renderToken || !this.node?.isValid) return;
                onFinished?.();
            }, this);
            animation.play(clip.name);
        });
    }

    onLoad() {
        this.initTokenNode();
    }

    onDisable() {
        this.stopTokenEffect();
    }

    onDestroy() {
        this.isWorking = false;
    }

    private initTokenNode() {
        if (this.waterNode?.isValid) {
            this.waterBasePosition.set(this.waterNode.position);
        }

        if (!this.tokenNode) return;

        this.tokenBasePosition.set(this.tokenNode.position);
        this.hideTokenNode();
    }

    private stopTokenEffect() {
        this.hideTokenNode();
    }

    playTokenEffect() {
        if (!this.isWorking || !this.tokenNode?.isValid) return;

        const opacity = this.tokenNode.getComponent(UIOpacity);
        if (!opacity) return;

        Tween.stopAllByTarget(this.tokenNode);
        Tween.stopAllByTarget(opacity);

        this.tokenNode.active = true;
        this.tokenNode.setScale(0.65, 0.65, 1);
        this.tokenNode.setPosition(this.tokenBasePosition);
        this.tokenNode.setRotationFromEuler(0, 0, 0);
        opacity.opacity = 0;

        const middlePosition = new Vec3(
            this.tokenBasePosition.x,
            this.tokenBasePosition.y + 8,
            this.tokenBasePosition.z,
        );
        const endPosition = new Vec3(
            this.tokenBasePosition.x,
            this.tokenBasePosition.y + 24,
            this.tokenBasePosition.z,
        );

        tween(this.tokenNode)
            .to(0.35, {
                scale: new Vec3(1, 1, 1),
                position: middlePosition,
                eulerAngles: new Vec3(0, 0, 8),
            })
            .to(0.45, {
                scale: new Vec3(0.8, 0.8, 1),
                position: endPosition,
                eulerAngles: new Vec3(0, 0, -8),
            })
            .call(() => {
                this.hideTokenNode();
            })
            .start();

        tween(opacity)
            .to(0.25, { opacity: 255 })
            .delay(0.2)
            .to(0.35, { opacity: 0 })
            .start();
    }

    private hideTokenNode() {
        if (!this.tokenNode?.isValid) return;

        const opacity = this.tokenNode.getComponent(UIOpacity);
        Tween.stopAllByTarget(this.tokenNode);
        if (opacity) {
            Tween.stopAllByTarget(opacity);
            opacity.opacity = 0;
        }
        this.tokenNode.active = false;
        this.tokenNode.setScale(0, 0, 1);
        this.tokenNode.setPosition(this.tokenBasePosition);
        this.tokenNode.setRotationFromEuler(0, 0, 0);
    }

    private showWaitWater(minerId: number) {
        this.renderToken += 1;
        const token = this.renderToken;

        this.roleNode?.getComponent(Animation)?.stop();
        this.playWaitWaterRoleAnimation(token);

        if (this.waterNode) {
            this.showWaterNode();
        }

        this.loadRoleSpriteFrame(minerId, token);
    }

    private showWaterNode() {
        if (!this.waterNode?.isValid) return;

        if (this.waterNode.active) {
            this.startWaterFloatEffect();
            return;
        }

        Tween.stopAllByTarget(this.waterNode);
        this.waterNode.active = true;
        this.waterNode.setScale(0, 0, 1);
        this.waterNode.setPosition(this.waterBasePosition);
        tween(this.waterNode)
            .to(0.15, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .call(() => this.startWaterFloatEffect())
            .start();
    }

    private playWaitWaterRoleAnimation(token: number) {
        resources.load('Anim/role', AnimationClip, (error, clip) => {
            if (token !== this.renderToken || error || !clip || !this.roleNode?.isValid) return;

            const animation = this.roleNode.getComponent(Animation) ?? this.roleNode.addComponent(Animation);
            if (!animation.getState(clip.name)) {
                animation.addClip(clip);
            }
            animation.defaultClip = clip;
            animation.play(clip.name);
        });
    }

    private startWaterFloatEffect() {
        if (!this.waterNode?.isValid) return;

        Tween.stopAllByTarget(this.waterNode);
        const upPosition = new Vec3(
            this.waterBasePosition.x,
            this.waterBasePosition.y + 6,
            this.waterBasePosition.z,
        );
        tween(this.waterNode)
            .repeatForever(
                tween(this.waterNode)
                    .to(1.2, { position: upPosition })
                    .to(1.2, { position: this.waterBasePosition })
            )
            .start();
    }

    private stopWaterFloatEffect() {
        if (!this.waterNode?.isValid) return;

        Tween.stopAllByTarget(this.waterNode);
        this.waterNode.setPosition(this.waterBasePosition);
    }

    private loadRoleSpriteFrame(minerId: number, token: number) {
        resources.load(`UI/Texture/role${minerId}/spriteFrame`, SpriteFrame, (error, spriteFrame) => {
            if (!error && spriteFrame) {
                this.applyRoleSpriteFrame(spriteFrame, token);
                return;
            }

            resources.load(`role${minerId}/work/1/spriteFrame`, SpriteFrame, (fallbackError, fallbackSpriteFrame) => {
                if (fallbackError || !fallbackSpriteFrame) return;
                this.applyRoleSpriteFrame(fallbackSpriteFrame, token);
            });
        });
    }

    private applyRoleSpriteFrame(spriteFrame: SpriteFrame, token: number) {
        if (token !== this.renderToken || !this.roleNode?.isValid) return;

        const sprite = this.roleNode.getComponent(Sprite) ?? this.roleNode.addComponent(Sprite);
        sprite.spriteFrame = spriteFrame;
    }

    private normalizeMinerId(data: MineWorkerItem): number {
        const minerId = Number(data.miner_id || data.mine_level);
        return Number.isInteger(minerId) && minerId >= 1 && minerId <= 6 ? minerId : 1;
    }

    start() {

    }

    update(deltaTime: number) {
        
    }
}

