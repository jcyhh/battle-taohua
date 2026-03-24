import { _decorator, Animation, Component, Enum, Node, Vec2, Vec3, Tween, tween } from 'cc';
import { buildPath, MOVE_SPEED } from './RoomConfig';
import { GamePhase, GameStateManager } from '../Manager/GameStateManager';
const { ccclass, property } = _decorator;

export enum CharacterRoleType {
    Self = 0,
    Player = 1,
    Killer = 2,
}

@ccclass('Character')
export class Character extends Component {
    @property(Animation)
    anim: Animation = null!;

    @property({ type: Enum(CharacterRoleType) })
    roleType: CharacterRoleType = CharacterRoleType.Player;

    @property
    frontAnim = '';

    @property
    backAnim = '';

    @property
    standbyAnim = '';

    @property
    sideAnim = '';

    currentRoom: string | null = null;
    private pathQueue: Vec2[] = [];
    private activeTween: Tween<Node> | null = null;
    private targetRoom: string | null = null;
    private pendingTarget: string | null = null;
    private pendingStandBy: Vec2 | null = null;
    private departedRoom: string | null = null;
    private readonly baseScale = new Vec3();

    onLoad() {
        this.baseScale.set(this.node.scale);
        this.anim = this.anim ?? this.getComponent(Animation);
        this.playStandbyAnimation();
    }

    get isMoving(): boolean {
        return this.activeTween !== null;
    }

    get assignedRoom(): string | null {
        return this.pendingTarget ?? this.targetRoom ?? this.currentRoom;
    }

    moveTo(roomKey: string, standByPos: Vec2) {
        if (roomKey === this.currentRoom) return;

        if (this.shouldInstantMoveDuringCountdown()) {
            this.instantMoveTo(roomKey, standByPos);
            return;
        }

        if (this.activeTween) {
            this.pendingTarget = roomKey;
            this.pendingStandBy = standByPos;
            return;
        }

        this.startPathTo(roomKey, standByPos);
    }

    instantMoveTo(roomKey: string, standByPos: Vec2) {
        this.instantMoveToPosition(standByPos, roomKey);
    }

    instantMoveToPosition(targetPos: Vec2, targetRoom: string | null = null) {
        const nextScale = new Vec3(0, 0, this.baseScale.z || 1);
        Tween.stopAllByTarget(this.node);
        if (this.activeTween) {
            this.activeTween.stop();
            this.activeTween = null;
        }

        this.pathQueue = [];
        this.pendingTarget = null;
        this.pendingStandBy = null;
        this.targetRoom = targetRoom;
        this.departedRoom = null;

        const currentScale = this.node.scale.clone();
        this.activeTween = tween(this.node)
            .to(0.12, { scale: new Vec3(0, 0, currentScale.z || 1) })
            .call(() => {
                this.node.setPosition(targetPos.x, targetPos.y, 0);
                this.currentRoom = targetRoom;
                this.targetRoom = null;
                this.setFacingScaleX(1);
                this.playStandbyAnimation();
                this.node.setScale(nextScale);
            })
            .to(0.12, { scale: new Vec3(Math.abs(this.baseScale.x) || 1, this.baseScale.y || 1, this.baseScale.z || 1) })
            .call(() => {
                this.activeTween = null;
            })
            .start();
    }

    private startPathTo(roomKey: string, standByPos: Vec2) {
        const pos = this.node.position;
        const fromRoom = this.currentRoom ?? this.departedRoom;
        const path = buildPath(pos.x, pos.y, fromRoom, roomKey, standByPos.x, standByPos.y);

        this.departedRoom = this.currentRoom ?? this.departedRoom;
        this.currentRoom = null;
        this.targetRoom = roomKey;
        this.pendingTarget = null;
        this.pendingStandBy = null;
        this.pathQueue = path;
        this.moveNext();
    }

    private moveNext() {
        if (this.pendingTarget && this.pendingStandBy) {
            const target = this.pendingTarget;
            const standBy = this.pendingStandBy;
            this.pendingTarget = null;
            this.pendingStandBy = null;
            this.pathQueue = [];
            this.activeTween = null;
            this.startPathTo(target, standBy);
            return;
        }

        if (this.pathQueue.length === 0) {
            this.activeTween = null;
            this.currentRoom = this.targetRoom;
            this.targetRoom = null;
            this.departedRoom = null;
            this.playStandbyAnimation();
            return;
        }

        const next = this.pathQueue.shift()!;
        const pos = this.node.position;
        const dx = next.x - pos.x;
        const dy = next.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const duration = dist / this.getMoveSpeed();

        if (duration < 0.001) {
            this.moveNext();
            return;
        }

        this.playMoveAnimation(dx, dy);
        this.activeTween = tween(this.node)
            .to(duration, { position: new Vec3(next.x, next.y, 0) })
            .call(() => {
                this.activeTween = null;
                this.moveNext();
            })
            .start();
    }

    stopMoving() {
        if (this.activeTween) {
            this.activeTween.stop();
            this.activeTween = null;
        }
        this.pathQueue = [];
        this.pendingTarget = null;
        this.pendingStandBy = null;
        this.targetRoom = null;
        this.departedRoom = null;
        this.playStandbyAnimation();
    }

    resetState() {
        if (this.activeTween) {
            this.activeTween.stop();
            this.activeTween = null;
        }
        this.currentRoom = null;
        this.pathQueue = [];
        this.pendingTarget = null;
        this.pendingStandBy = null;
        this.targetRoom = null;
        this.departedRoom = null;
        this.playStandbyAnimation();
    }

    resetFacing() {
        const absX = Math.abs(this.baseScale.x) || 1;
        this.node.setScale(absX, this.baseScale.y || 1, this.baseScale.z || 1);
    }

    private playMoveAnimation(dx: number, dy: number) {
        if (Math.abs(dy) > 0.1) {
            this.setFacingScaleX(1);
            this.playAnim(dy > 0 ? this.resolveAnimName('back') : this.resolveAnimName('front'));
            return;
        }

        if (Math.abs(dx) > 0.1) {
            this.setFacingScaleX(dx > 0 ? 1 : -1);
            this.playAnim(this.resolveAnimName('side'));
        }
    }

    private getMoveSpeed(): number {
        return MOVE_SPEED;
    }

    private shouldInstantMoveDuringCountdown(): boolean {
        if (this.roleType === CharacterRoleType.Killer) return false;
        if (GameStateManager.instance.currentPhase !== GamePhase.Starting) return false;
        const timer = Number(GameStateManager.instance.currentDtsData?.timer);
        return Number.isFinite(timer) && timer < 6;
    }

    private playStandbyAnimation() {
        this.setFacingScaleX(1);
        this.playAnim(this.resolveAnimName('standby'));
    }

    private setFacingScaleX(direction: 1 | -1) {
        const absX = Math.abs(this.baseScale.x) || 1;
        this.node.setScale(absX * direction, this.baseScale.y || 1, this.baseScale.z || 1);
    }

    private playAnim(name: string) {
        if (!this.anim || !name) return;
        if (this.anim.defaultClip?.name === name && this.anim.getState(name)?.isPlaying) return;
        if (this.anim.getState(name)?.isPlaying) return;
        this.anim.play(name);
    }

    private resolveAnimName(kind: 'front' | 'back' | 'side' | 'standby'): string {
        if (this.roleType === CharacterRoleType.Killer) {
            return '';
        }

        const customName = this.getCustomAnimName(kind);
        if (customName) {
            return customName;
        }

        const prefix = this.roleType === CharacterRoleType.Self ? 'self' : 'player';
        switch (kind) {
        case 'front':
            return `${prefix}Front`;
        case 'back':
            return `${prefix}Back`;
        case 'side':
            return `${prefix}Side`;
        case 'standby':
            return `${prefix}Standby`;
        }
    }

    private getCustomAnimName(kind: 'front' | 'back' | 'side' | 'standby'): string {
        switch (kind) {
        case 'front':
            return this.frontAnim;
        case 'back':
            return this.backAnim;
        case 'side':
            return this.sideAnim;
        case 'standby':
            return this.standbyAnim;
        }
    }
}
