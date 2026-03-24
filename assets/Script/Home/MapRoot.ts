import { _decorator, Component, dragonBones, Event, EventTouch, instantiate, Label, Node, Prefab, Tween, tween, UIOpacity, UITransform, Vec2, Vec3 } from 'cc';
import { buildPath, getRoomNameById, LOWER_Y, MOVE_SPEED, ROOMS, ROOM_KEYS, UPPER_Y } from './RoomConfig';
import { Character, CharacterRoleType } from './Character';
import { GemBurst } from './GemBurst';
import { PopupAlert } from './PopupAlert';
import { RoomAsset } from './RoomAsset';
import { Api } from '../Config/Api';
import { AppBridge } from '../Utils/AppBridge';
import { AudioManager } from '../Manager/AudioManager';
import { GamePhase, GameStateManager, SocketRoomInfo, SocketUserInfo } from '../Manager/GameStateManager';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

const KILLER_START_X = 455;
const KILLER_START_Y = -360;
const KILLER_ATTACK_ANIM = '攻击';
const KILLER_WALK_ANIM = '走路';
const KILLER_ENTRY_DISTANCE = 70;
const KILLER_MOVE_SPEED_SCALE = 0.6;
const MAX_ROOM_CHARACTER_COUNT = 10;
const MAX_BORNAREA_CHARACTER_COUNT = 30;
const GEMS_PER_SURVIVOR_ROOM = 5;
const KILLER_DOUBLE_ENTRY_ROOMS = new Set(['room1', 'room2', 'room3']);
const KILLER_FACE_RIGHT_ROOMS = new Set(['room2', 'room3', 'room5', 'room6']);

type RenderedPlayer = {
    node: Node;
    character: Character;
    roomId: number;
    isSpawning: boolean;
};

@ccclass('MapRoot')
export class MapRoot extends Component {
    static instance: MapRoot | null = null;

    @property(Prefab)
    characterPrefab: Prefab = null!;

    @property(Node)
    selfNode: Node = null!;

    @property(Node)
    killerNode: Node = null!;

    @property(Node)
    bornNode: Node = null!;

    private readonly tempPosition = new Vec3();
    private readonly killerBaseScale = new Vec3();
    private minY = 0;
    private maxY = 0;

    private rooms: Map<string, Node> = new Map();
    private selectedRoom: string | null = null;
    private pendingSelfRoomKey: string | null = null;
    private playerCharacter: Character | null = null;
    private chooseTween: Tween<UIOpacity> | null = null;
    private killerTween: Tween<Node> | null = null;
    private killerTargetRoom: string | null = null;
    private isSubmittingRoomChange = false;
    private suppressSelfRoomSyncAfterReset = false;
    private readonly roomAssetLabels: Map<number, Label> = new Map();
    private readonly roomAssets: Map<number, RoomAsset> = new Map();
    private readonly renderedPlayers: Map<number, RenderedPlayer> = new Map();
    private readonly onGameChanged = () => {
        this.resetCurrentGameState();
    };
    private readonly onDtsDataChanged = (payload: {
        dtsData: {
            room_list?: SocketRoomInfo[];
            user_list?: SocketUserInfo[];
            user_id?: number | string;
            timer?: number | string;
        };
        currentPhase: GamePhase;
    }) => {
        if (!this.canChooseRoomByPhase(payload.currentPhase)) return;
        this.updateRoomAssetAmounts(payload.dtsData.room_list);
        this.syncSocketPlayers(payload.dtsData.user_list, payload.dtsData.user_id);
        this.snapCharactersForFinalCountdown(payload.dtsData.user_list, payload.currentPhase, payload.dtsData.timer);
    };
    private readonly onPhaseChanged = (payload: {
        currentPhase: GamePhase;
        dtsData: {
            room_list?: SocketRoomInfo[];
            user_list?: SocketUserInfo[];
            user_id?: number | string;
            killer_room?: number | string;
        };
    }) => {
        if (GameStateManager.instance.skipCurrentRoundVisuals) return;
        if (payload.currentPhase !== GamePhase.KillerAppearing) return;

        this.updateRoomAssetAmounts(payload.dtsData.room_list);
        this.syncSocketPlayers(payload.dtsData.user_list, payload.dtsData.user_id);

        const killerRoom = this.normalizeRoomId(payload.dtsData.killer_room);
        if (killerRoom >= 1 && killerRoom <= 8) {
            this.startKillerAttack(killerRoom);
        }
    };

    onLoad() {
        MapRoot.instance = this;
        AppBridge.init();
        this.refreshDragRange();
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.killerNode = this.killerNode ?? this.node.getChildByName('killer')!;
        if (this.killerNode) {
            this.killerBaseScale.set(this.killerNode.scale);
        }

        for (const key of ROOM_KEYS) {
            const roomNode = this.node.getChildByName(key);
            if (roomNode) {
                this.rooms.set(key, roomNode);
                const choose = roomNode.getChildByName('choose');
                if (choose) choose.active = false;
                roomNode.on(Node.EventType.TOUCH_END, () => this.onRoomClick(key), this);
            }
        }

        this.setupPlayerCharacter();
        this.cacheRoomAssetLabels();
        this.syncSelectedRoomWithSelf();
        GameStateManager.instance.onGameChanged(this.onGameChanged);
        GameStateManager.instance.onDtsDataChanged(this.onDtsDataChanged);
        GameStateManager.instance.onPhaseChanged(this.onPhaseChanged);
    }

    onDestroy() {
        if (MapRoot.instance === this) {
            MapRoot.instance = null;
        }
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        GameStateManager.instance.offGameChanged(this.onGameChanged);
        GameStateManager.instance.offDtsDataChanged(this.onDtsDataChanged);
        GameStateManager.instance.offPhaseChanged(this.onPhaseChanged);
        for (const [, roomNode] of this.rooms) {
            if (roomNode?.isValid) {
                roomNode.targetOff(this);
            }
        }
        this.rooms.clear();
    }

    private setupPlayerCharacter() {
        this.playerCharacter = this.selfNode?.getComponent(Character) ?? null;
    }

    public getSelfSelectedRoomId(): number {
        const roomKey = this.playerCharacter?.assignedRoom;
        if (!roomKey) return 0;

        const roomId = Number(roomKey.replace('room', ''));
        return Number.isInteger(roomId) ? roomId : 0;
    }

    private cacheRoomAssetLabels() {
        this.roomAssetLabels.clear();
        this.roomAssets.clear();
        const roomAssetRoot = this.node.getChildByName('roomAsset');
        if (!roomAssetRoot) return;

        for (let roomId = 1; roomId <= 8; roomId++) {
            const roomAssetNode = roomAssetRoot.getChildByName(`roomAsset${roomId}`);
            const roomAsset = roomAssetNode?.getComponent(RoomAsset) ?? null;
            if (roomAsset) {
                this.roomAssets.set(roomId, roomAsset);
            }

            const label = roomAssetNode?.getChildByName('Label')?.getComponent(Label) ?? null;
            if (label) {
                this.roomAssetLabels.set(roomId, label);
            }
        }
    }

    private updateRoomAssetAmounts(roomList?: SocketRoomInfo[]) {
        if (!roomList || roomList.length === 0) return;

        for (const roomInfo of roomList) {
            const roomId = Number(roomInfo.room_id);
            if (!Number.isInteger(roomId)) continue;

            const amount = Number(roomInfo.amount);
            const roomAsset = this.roomAssets.get(roomId);
            if (roomAsset && Number.isFinite(amount)) {
                roomAsset.count = amount;
                continue;
            }

            const label = this.roomAssetLabels.get(roomId);
            if (!label) continue;

            label.string = formatAmount(roomInfo.amount);
        }
    }

    private syncSocketPlayers(userList?: SocketUserInfo[], selfUserId?: number | string) {
        if (!userList || userList.length === 0) return;

        const localUserId = GameStateManager.instance.currentSelfUserId ?? this.normalizeUserId(selfUserId);
        const selfInfo = userList[0];
        if (selfInfo) {
            this.syncSelfPlayer(this.normalizeRoomId(selfInfo.room_id));
        }

        const visibleUsers = this.pickVisibleSocketUsers(userList, localUserId);
        const activeUserIds = new Set<number>();

        for (const userInfo of visibleUsers) {
            const userId = this.normalizeUserId(userInfo.user_id);
            if (userId !== null) {
                activeUserIds.add(userId);
            }
        }

        for (const [userId, renderedPlayer] of this.renderedPlayers) {
            if (activeUserIds.has(userId) && this.isRenderedPlayerValid(renderedPlayer)) continue;
            Tween.stopAllByTarget(renderedPlayer.node);
            renderedPlayer.character.stopMoving();
            renderedPlayer.node.destroy();
            this.renderedPlayers.delete(userId);
        }

        for (const userInfo of visibleUsers) {
            const userId = this.normalizeUserId(userInfo.user_id);
            if (userId === null) continue;

            const roomId = this.normalizeRoomId(userInfo.room_id);
            const existedPlayer = this.renderedPlayers.get(userId);
            if (existedPlayer && !this.isRenderedPlayerValid(existedPlayer)) {
                this.renderedPlayers.delete(userId);
            }
            const currentPlayer = this.renderedPlayers.get(userId);

            if (!currentPlayer) {
                this.createSocketPlayer(userId, userInfo.nickname || '', roomId);
                continue;
            }

            this.updatePlayerNickname(currentPlayer.node, userInfo.nickname || '');
            if (currentPlayer.roomId !== roomId) {
                currentPlayer.roomId = roomId;
                if (!currentPlayer.isSpawning) {
                    this.applyPlayerRoom(currentPlayer.node, currentPlayer.character, roomId);
                }
            }
        }
    }

    private syncSelfPlayer(roomId: number) {
        if (!this.selfNode?.isValid || !this.playerCharacter) return;

        if (this.suppressSelfRoomSyncAfterReset) {
            if (roomId === 0) {
                this.suppressSelfRoomSyncAfterReset = false;
            } else {
                return;
            }
        }

        if (roomId >= 1 && roomId <= 8) {
            const roomKey = `room${roomId}`;
            this.pendingSelfRoomKey = null;
            if (this.playerCharacter.assignedRoom === roomKey) {
                if (this.selectedRoom !== roomKey) {
                    this.selectRoom(roomKey);
                }
                return;
            }

            this.selectRoom(roomKey);
            const standByPos = this.getRandomStandBy(roomKey);
            this.playerCharacter.moveTo(roomKey, standByPos);
            return;
        }

        if (this.pendingSelfRoomKey) {
            if (this.playerCharacter.assignedRoom !== this.pendingSelfRoomKey) {
                const standByPos = this.getRandomStandBy(this.pendingSelfRoomKey);
                this.playerCharacter.moveTo(this.pendingSelfRoomKey, standByPos);
            }
            if (this.selectedRoom !== this.pendingSelfRoomKey) {
                this.selectRoom(this.pendingSelfRoomKey);
            }
            return;
        }

        if (!this.playerCharacter.assignedRoom && !this.selectedRoom) {
            return;
        }

        this.clearSelectedRoom();
        this.playerCharacter.stopMoving();
        this.playerCharacter.resetState();
        this.playerCharacter.resetFacing();
        this.selfNode.setPosition(-200, -540, 0);
    }

    private createSocketPlayer(userId: number, nickname: string, roomId: number) {
        if (!this.characterPrefab) return;
        if (roomId >= 1 && roomId <= 8 && !this.canCreatePlayerInRoom(roomId)) return;
        if (roomId === 0 && !this.canCreatePlayerInBornArea()) return;

        const characterNode = instantiate(this.characterPrefab);
        characterNode.name = `player_${userId}`;
        this.node.addChild(characterNode);
        characterNode.setSiblingIndex(Math.max(0, this.node.children.length - 5));

        const character = characterNode.getComponent(Character);
        if (!character) {
            characterNode.destroy();
            return;
        }

        character.roleType = CharacterRoleType.Player;
        this.updatePlayerNickname(characterNode, nickname);
        const bornPos = this.getRandomBornPosition();
        characterNode.setPosition(bornPos.x, bornPos.y, 0);
        this.renderedPlayers.set(userId, {
            node: characterNode,
            character,
            roomId,
            isSpawning: true,
        });
        this.playPlayerSpawnAnim(userId, characterNode, character);
    }

    private canCreatePlayerInRoom(roomId: number): boolean {
        const roomKey = `room${roomId}`;
        return this.getRoomCharacterCount(roomKey) < MAX_ROOM_CHARACTER_COUNT;
    }

    private canCreatePlayerInBornArea(): boolean {
        return this.getBornAreaCharacterCount() < MAX_BORNAREA_CHARACTER_COUNT;
    }

    private updatePlayerNickname(characterNode: Node, nickname: string) {
        if (!characterNode?.isValid) return;
        const nameLabel = characterNode.getChildByPath('name/Label')?.getComponent(Label);
        if (nameLabel) {
            nameLabel.string = nickname;
        }
    }

    private isRenderedPlayerValid(renderedPlayer: RenderedPlayer): boolean {
        return !!renderedPlayer.node?.isValid && !!renderedPlayer.character?.node?.isValid;
    }

    private pickVisibleSocketUsers(userList: SocketUserInfo[], localUserId: number | null): SocketUserInfo[] {
        const selfRoomId = this.normalizeRoomId(userList[0]?.room_id);
        const groupedUsers = new Map<number, SocketUserInfo[]>();

        for (let i = 1; i < userList.length; i++) {
            const userInfo = userList[i];
            const userId = this.normalizeUserId(userInfo.user_id);
            if (userId === null) continue;
            if (localUserId !== null && userId === localUserId) continue;

            const roomId = this.normalizeRoomId(userInfo.room_id);
            const groupRoomId = roomId >= 1 && roomId <= 8 ? roomId : 0;
            const group = groupedUsers.get(groupRoomId) ?? [];
            group.push(userInfo);
            groupedUsers.set(groupRoomId, group);
        }

        const selectedUsers: SocketUserInfo[] = [];
        for (let roomId = 0; roomId <= 8; roomId++) {
            const users = groupedUsers.get(roomId) ?? [];
            if (users.length === 0) continue;

            const limit = roomId === 0
                ? MAX_BORNAREA_CHARACTER_COUNT
                : Math.max(0, MAX_ROOM_CHARACTER_COUNT - (selfRoomId === roomId ? 1 : 0));
            if (limit <= 0) continue;

            const selectedGroup = this.pickVisibleUsersForGroup(users, roomId, limit);
            selectedUsers.push(...selectedGroup);
        }

        return selectedUsers;
    }

    private pickVisibleUsersForGroup(users: SocketUserInfo[], roomId: number, limit: number): SocketUserInfo[] {
        const reservedUsers: SocketUserInfo[] = [];
        const randomUsers: SocketUserInfo[] = [];

        for (const userInfo of users) {
            const userId = this.normalizeUserId(userInfo.user_id);
            if (userId === null) continue;

            const renderedPlayer = this.renderedPlayers.get(userId);
            if (renderedPlayer && this.isRenderedPlayerValid(renderedPlayer) && renderedPlayer.roomId === roomId) {
                reservedUsers.push(userInfo);
                continue;
            }

            randomUsers.push(userInfo);
        }

        const visibleUsers = reservedUsers.slice(0, limit);
        const remainCount = limit - visibleUsers.length;
        if (remainCount <= 0) {
            return visibleUsers;
        }

        const shuffledUsers = this.shuffleUsers(randomUsers);
        return visibleUsers.concat(shuffledUsers.slice(0, remainCount));
    }

    private shuffleUsers(users: SocketUserInfo[]): SocketUserInfo[] {
        const result = [...users];
        for (let i = result.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            const temp = result[i];
            result[i] = result[randomIndex];
            result[randomIndex] = temp;
        }
        return result;
    }

    private applyPlayerRoom(characterNode: Node, character: Character, roomId: number) {
        if (roomId >= 1 && roomId <= 8) {
            const roomKey = `room${roomId}`;
            const standByPos = this.getRandomStandBy(roomKey);
            character.moveTo(roomKey, standByPos);
            return;
        }

        if (!this.canCreatePlayerInBornArea()) {
            return;
        }

        character.stopMoving();
        character.resetState();
        character.resetFacing();
        const bornPos = this.getRandomBornPosition();
        if (this.shouldInstantTeleportDuringCountdown(GameStateManager.instance.currentPhase, GameStateManager.instance.currentDtsData?.timer)) {
            character.instantMoveToPosition(bornPos, null);
            return;
        }
        characterNode.setPosition(bornPos.x, bornPos.y, 0);
    }

    private snapCharactersForFinalCountdown(
        userList: SocketUserInfo[] | undefined,
        currentPhase: GamePhase,
        timer?: number | string,
    ) {
        if (!this.shouldInstantTeleportDuringCountdown(currentPhase, timer)) return;

        const selfRoomId = this.normalizeRoomId(userList?.[0]?.room_id);
        if (this.playerCharacter?.isMoving) {
            if (selfRoomId >= 1 && selfRoomId <= 8) {
                const roomKey = `room${selfRoomId}`;
                this.playerCharacter.instantMoveTo(roomKey, this.getRandomStandBy(roomKey));
            } else if (this.pendingSelfRoomKey) {
                this.playerCharacter.instantMoveTo(this.pendingSelfRoomKey, this.getRandomStandBy(this.pendingSelfRoomKey));
            } else {
                this.playerCharacter.instantMoveToPosition(new Vec2(-200, -540), null);
            }
        }

        for (const [, renderedPlayer] of this.renderedPlayers) {
            if (!this.isRenderedPlayerValid(renderedPlayer) || !renderedPlayer.character.isMoving) continue;

            if (renderedPlayer.roomId >= 1 && renderedPlayer.roomId <= 8) {
                const roomKey = `room${renderedPlayer.roomId}`;
                renderedPlayer.character.instantMoveTo(roomKey, this.getRandomStandBy(roomKey));
                continue;
            }

            renderedPlayer.character.instantMoveToPosition(this.getRandomBornPosition(), null);
        }
    }

    private shouldInstantTeleportDuringCountdown(currentPhase: GamePhase, timer?: number | string): boolean {
        if (currentPhase !== GamePhase.Starting) return false;
        const normalizedTimer = Number(timer);
        return Number.isFinite(normalizedTimer) && normalizedTimer < 6;
    }

    private playPlayerSpawnAnim(userId: number, characterNode: Node, character: Character) {
        const targetScale = characterNode.scale.clone();
        Tween.stopAllByTarget(characterNode);
        characterNode.setScale(0, 0, targetScale.z || 1);
        tween(characterNode)
            .to(0.2, { scale: new Vec3(targetScale.x, targetScale.y, targetScale.z) })
            .call(() => {
                const renderedPlayer = this.renderedPlayers.get(userId);
                if (!renderedPlayer || renderedPlayer.node !== characterNode) return;

                renderedPlayer.isSpawning = false;
                if (renderedPlayer.roomId >= 1 && renderedPlayer.roomId <= 8) {
                    this.applyPlayerRoom(characterNode, character, renderedPlayer.roomId);
                }
            })
            .start();
    }

    private normalizeUserId(userId?: number | string): number | null {
        const normalizedUserId = Number(userId);
        return Number.isInteger(normalizedUserId) ? normalizedUserId : null;
    }

    private normalizeRoomId(roomId?: number | string): number {
        const normalizedRoomId = Number(roomId);
        return Number.isInteger(normalizedRoomId) && normalizedRoomId >= 0 ? normalizedRoomId : 0;
    }

    public spawnCharacterAtBornAndEnterRandomRoom(): Character | null {
        if (!this.characterPrefab) return null;

        const availableRooms = ROOM_KEYS.filter((roomKey) => this.getRoomCharacterCount(roomKey) < MAX_ROOM_CHARACTER_COUNT);
        if (availableRooms.length === 0) return null;

        const roomKey = availableRooms[Math.floor(Math.random() * availableRooms.length)];

        const characterNode = instantiate(this.characterPrefab);
        this.node.addChild(characterNode);
        characterNode.setSiblingIndex(Math.max(0, this.node.children.length - 5));

        const bornPos = this.getRandomBornPosition();
        characterNode.setPosition(bornPos.x, bornPos.y, 0);

        const character = characterNode.getComponent(Character);
        if (!character || ROOM_KEYS.length === 0) {
            return character;
        }

        const standByPos = this.getRandomStandBy(roomKey);
        character.moveTo(roomKey, standByPos);
        return character;
    }

    public startKillerAttack(roomNoOrEvent?: number | Event, customEventData?: string) {
        let roomNo: number;
        if (typeof roomNoOrEvent === 'number') {
            roomNo = roomNoOrEvent;
        } else if (customEventData) {
            roomNo = Number(customEventData);
        } else {
            roomNo = Math.floor(Math.random() * ROOM_KEYS.length) + 1;
        }
        if (!Number.isInteger(roomNo) || roomNo < 1 || roomNo > 8 || !this.killerNode) return;

        const targetRoom = `room${roomNo}`;
        if (!ROOMS[targetRoom]) return;

        this.killerTargetRoom = targetRoom;
        this.stopKillerMovement();
        this.killerNode.setPosition(KILLER_START_X, KILLER_START_Y, 0);

        const killerTarget = this.getKillerAttackPoint(targetRoom);
        const path = buildPath(KILLER_START_X, KILLER_START_Y, null, targetRoom, killerTarget.x, killerTarget.y);
        this.playKillerAnimation(KILLER_WALK_ANIM, -1);
        this.moveKillerByPath(path);
    }

    public resetCurrentGameState(_event?: Event) {
        this.stopKillerMovement();
        this.killerTargetRoom = null;
        this.suppressSelfRoomSyncAfterReset = true;
        PopupAlert.close();

        for (const child of [...this.node.children]) {
            if (child.name.startsWith('gem_')) {
                Tween.stopAllByTarget(child);
                child.destroy();
                continue;
            }

            const character = child.getComponent(Character);
            if (!character) continue;

            if (character.roleType === CharacterRoleType.Player) {
                character.stopMoving();
                Tween.stopAllByTarget(child);
                child.destroy();
            } else if (child === this.selfNode) {
                child.active = true;
                character.resetState();
                character.resetFacing();
                child.setPosition(-200, -540, 0);
            }
        }

        this.renderedPlayers.clear();
        this.pendingSelfRoomKey = null;
        this.playerCharacter = this.selfNode?.getComponent(Character) ?? null;
        this.clearSelectedRoom();
        this.resetRoomEffects();
        this.resetKillerState();
    }

    private async onRoomClick(key: string) {
        if (!this.canChooseRoomByPhase()) return;
        if (!this.playerCharacter) return;
        if (this.playerCharacter.assignedRoom === key || this.isSubmittingRoomChange) return;

        this.suppressSelfRoomSyncAfterReset = false;
        if (this.pendingSelfRoomKey || !this.playerCharacter.assignedRoom) {
            this.pendingSelfRoomKey = key;
            AudioManager.instance?.playRoomSelect();
            this.selectRoom(key);
            const standByPos = this.getRandomStandBy(key);
            this.playerCharacter.moveTo(key, standByPos);
            return;
        }

        const gameId = GameStateManager.instance.currentGameId;
        const roomId = Number(key.replace('room', ''));
        if (!gameId || !Number.isInteger(roomId)) return;

        this.isSubmittingRoomChange = true;
        try {
            await Api.battleJoin({
                game_id: gameId,
                room_id: roomId,
                amount: 0,
            });

            AudioManager.instance?.playRoomSelect();
            this.selectRoom(key);
            const standByPos = this.getRandomStandBy(key);
            this.playerCharacter.moveTo(key, standByPos);
        } catch (e) {
            console.error('[MapRoot] 切换房间失败:', e);
        } finally {
            this.isSubmittingRoomChange = false;
        }
    }

    private canChooseRoomByPhase(phase: GamePhase = GameStateManager.instance.currentPhase): boolean {
        return phase === GamePhase.Gathering || phase === GamePhase.Starting;
    }

    update() {
        this.syncSelectedRoomWithSelf();
    }

    private getRandomBornPosition(): Vec2 {
        const bornTransform = this.bornNode.getComponent(UITransform);
        const bornPos = this.bornNode.position;
        let rx = bornPos.x;
        let ry = bornPos.y;
        if (bornTransform) {
            const hw = bornTransform.contentSize.width / 2;
            const hh = bornTransform.contentSize.height / 2;
            rx += (Math.random() * 2 - 1) * hw;
            ry += (Math.random() * 2 - 1) * hh;
        }
        return new Vec2(rx, ry);
    }

    private getRoomCharacterCount(roomKey: string): number {
        let count = 0;
        for (const child of this.node.children) {
            const character = child.getComponent(Character);
            if (!character || character.roleType === CharacterRoleType.Killer) continue;
            if (character.assignedRoom === roomKey) {
                count += 1;
            }
        }
        return count;
    }

    private getBornAreaCharacterCount(): number {
        let count = 0;
        for (const child of this.node.children) {
            const character = child.getComponent(Character);
            if (!character || character.roleType !== CharacterRoleType.Player) continue;
            if (!character.assignedRoom) {
                count += 1;
            }
        }
        return count;
    }

    private getKillerAttackPoint(key: string): Vec2 {
        const roomInfo = ROOMS[key];
        const roomNode = this.rooms.get(key)!;
        const standBy = roomNode.getChildByName('standBy');
        const corridorY = roomInfo.corridor === 'upper' ? UPPER_Y : LOWER_Y;
        const entryDistance = KILLER_DOUBLE_ENTRY_ROOMS.has(key) ? KILLER_ENTRY_DISTANCE * 1.5 : KILLER_ENTRY_DISTANCE;

        let roomCenterX = roomNode.position.x;
        let roomCenterY = roomNode.position.y;
        if (standBy) {
            roomCenterX += standBy.position.x;
            roomCenterY += standBy.position.y;
        }

        if (roomInfo.enterOrder === 'yx') {
            const dirY = roomCenterY >= corridorY ? 1 : -1;
            const targetX = key === 'room1' ? roomInfo.doorX - 10 : roomInfo.doorX;
            const targetY = corridorY + dirY * entryDistance - (key === 'room7' || key === 'room8' ? 20 : 0);
            return new Vec2(targetX, targetY);
        }

        const dirX = roomCenterX >= roomInfo.doorX ? 1 : -1;
        const targetY = corridorY - (key === 'room7' ? 20 : 0);
        return new Vec2(roomInfo.doorX + dirX * entryDistance, targetY);
    }

    private getRandomStandBy(key: string): Vec2 {
        const roomNode = this.rooms.get(key)!;
        const standBy = roomNode.getChildByName('standBy');
        if (!standBy) {
            return new Vec2(roomNode.position.x, roomNode.position.y);
        }

        const transform = standBy.getComponent(UITransform);
        let rx = 0;
        let ry = 0;
        if (transform) {
            rx = (Math.random() - 0.5) * transform.contentSize.width;
            ry = (Math.random() - 0.5) * transform.contentSize.height;
        }

        return new Vec2(
            roomNode.position.x + standBy.position.x + rx,
            roomNode.position.y + standBy.position.y + ry,
        );
    }

    private selectRoom(key: string) {
        if (this.selectedRoom) {
            const prev = this.rooms.get(this.selectedRoom);
            const prevChoose = prev?.getChildByName('choose');
            if (prevChoose) {
                this.stopChooseBreath(prevChoose);
                prevChoose.active = false;
            }
        }
        this.selectedRoom = key;
        const curr = this.rooms.get(key);
        const currChoose = curr?.getChildByName('choose');
        if (currChoose) {
            currChoose.active = true;
            this.startChooseBreath(currChoose);
        }
    }

    private clearSelectedRoom() {
        if (!this.selectedRoom) return;
        const prev = this.rooms.get(this.selectedRoom);
        const prevChoose = prev?.getChildByName('choose');
        if (prevChoose) {
            this.stopChooseBreath(prevChoose);
            prevChoose.active = false;
        }
        this.selectedRoom = null;
    }

    private syncSelectedRoomWithSelf() {
        const roomKey = this.playerCharacter?.assignedRoom ?? null;
        if (!roomKey) {
            this.clearSelectedRoom();
            return;
        }
        if (roomKey !== this.selectedRoom) {
            this.selectRoom(roomKey);
        }
    }

    private startChooseBreath(node: Node) {
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) opacity = node.addComponent(UIOpacity);
        opacity.opacity = 255;
        this.chooseTween = tween(opacity)
            .repeatForever(
                tween()
                    .to(0.8, { opacity: 80 })
                    .to(0.8, { opacity: 255 })
            )
            .start() as Tween<UIOpacity>;
    }

    private stopChooseBreath(node: Node) {
        if (this.chooseTween) {
            this.chooseTween.stop();
            this.chooseTween = null;
        }
        const opacity = node.getComponent(UIOpacity);
        if (opacity) opacity.opacity = 255;
    }

    private refreshDragRange() {
        const selfTransform = this.node.getComponent(UITransform);
        const parentTransform = this.node.parent?.getComponent(UITransform);

        if (!selfTransform || !parentTransform) {
            this.minY = 0;
            this.maxY = 0;
            return;
        }

        const overflowHeight = Math.max(0, selfTransform.contentSize.height - parentTransform.contentSize.height);
        const halfOverflow = overflowHeight / 2;
        this.minY = -halfOverflow;
        this.maxY = halfOverflow;
        this.clampPosition();
    }

    private clampPosition() {
        const y = Math.min(this.maxY, Math.max(this.minY, this.node.position.y));
        this.tempPosition.set(this.node.position.x, y, this.node.position.z);
        this.node.setPosition(this.tempPosition);
    }

    private onTouchMove(event: EventTouch) {
        if (this.minY === this.maxY) return;
        const deltaY = event.getUIDelta().y;
        const nextY = Math.min(this.maxY, Math.max(this.minY, this.node.position.y + deltaY));
        this.tempPosition.set(this.node.position.x, nextY, this.node.position.z);
        this.node.setPosition(this.tempPosition);
    }

    private moveKillerByPath(path: Vec2[]) {
        const moveNext = () => {
            if (!this.killerNode) return;
            if (path.length === 0) {
                this.killerTween = null;
                this.playKillerAttackAnimation();
                return;
            }

            const next = path.shift()!;
            const pos = this.killerNode.position;
            const dx = next.x - pos.x;
            const dy = next.y - pos.y;
            const isFinalSegment = path.length === 0;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const duration = dist / (MOVE_SPEED * KILLER_MOVE_SPEED_SCALE);
            if (duration < 0.001) {
                moveNext();
                return;
            }

            if (isFinalSegment && this.killerTargetRoom) {
                this.setKillerFacing(this.killerTargetRoom);
            }

            this.killerTween = tween(this.killerNode)
                .to(duration, { position: new Vec3(next.x, next.y, 0) })
                .call(() => {
                    this.killerTween = null;
                    moveNext();
                })
                .start();
        };

        moveNext();
    }

    private playKillerAttackAnimation() {
        const display = this.getKillerDisplay();
        if (!display) {
            this.onKillerAttackComplete();
            return;
        }

        display.off(dragonBones.EventObject.COMPLETE, this.onKillerAttackComplete, this);
        display.timeScale = 1;
        display.once(dragonBones.EventObject.COMPLETE, this.onKillerAttackComplete, this);
        AudioManager.instance?.playAttack();
        display.playAnimation(KILLER_ATTACK_ANIM, 1);
    }

    private onKillerAttackComplete() {
        const display = this.getKillerDisplay();
        if (display) {
            display.off(dragonBones.EventObject.COMPLETE, this.onKillerAttackComplete, this);
            display.timeScale = 0;
        }

        const roomKey = this.killerTargetRoom;
        if (!roomKey) return;
        this.playKillerSettlementEffect(roomKey);
    }

    private killCharactersInRoom(roomKey: string, onComplete: () => void) {
        const victims: Node[] = [];
        for (const child of this.node.children) {
            const character = child.getComponent(Character);
            if (!character || character.roleType === CharacterRoleType.Killer) continue;
            if (character.currentRoom !== roomKey) continue;
            victims.push(child);
        }

        if (victims.length === 0) {
            onComplete();
            return;
        }

        for (const victim of victims) {
            victim.getComponent(Character)?.stopMoving();
            Tween.stopAllByTarget(victim);
            if (victim === this.selfNode) {
                this.playerCharacter = null;
                victim.active = false;
                continue;
            }
            victim.destroy();
        }
        onComplete();
    }

    private playRoomStoneAnimation(roomKey: string, onComplete?: () => void) {
        const roomStone = this.rooms.get(roomKey)?.getChildByName('stone');
        if (roomStone) {
            this.playStoneTween(roomStone, onComplete);
            return;
        }

        const roomIndex = ROOM_KEYS.indexOf(roomKey);
        if (roomIndex < 0) return;

        const roomAssetRoot = this.node.getChildByName('roomAsset');
        const roomAssetNode = roomAssetRoot?.getChildByName(`roomAsset${roomIndex + 1}`);
        const stoneNode = roomAssetNode?.getChildByName('stone') ?? roomAssetNode?.getChildByName('icon');
        if (stoneNode) {
            stoneNode.active = true;
            this.playStoneTween(stoneNode, onComplete);
            return;
        }

        onComplete?.();
    }

    private playGemBurstInRoom(
        roomKey: string,
        onComplete?: () => void,
        targets?: Array<{ roomIndex: number; amount: number; gemCount: number }>,
    ) {
        const roomIndex = ROOM_KEYS.indexOf(roomKey);
        if (roomIndex < 0) {
            onComplete?.();
            return;
        }

        const roomNode = this.rooms.get(roomKey);
        const gemBurst = this.getComponent(GemBurst);
        if (!roomNode || !gemBurst) {
            onComplete?.();
            return;
        }

        gemBurst.burst(
            roomIndex,
            new Vec3(roomNode.position.x, roomNode.position.y, 0),
            targets ?? this.buildGemBurstTargets(roomIndex),
            onComplete,
        );
    }

    private playStoneTween(target: Node, onComplete?: () => void) {
        const scale = target.scale.clone();
        Tween.stopAllByTarget(target);
        tween(target)
            .to(0.12, { scale: new Vec3(scale.x * 1.15, scale.y * 1.15, scale.z) })
            .to(0.12, { scale })
            .call(() => onComplete?.())
            .start();
    }

    private openKillerAttackPopup(roomKey: string) {
        const roomNo = ROOM_KEYS.indexOf(roomKey) + 1;
        if (roomNo <= 0) return;

        const roomName = getRoomNameById(roomNo);
        const dtsData = GameStateManager.instance.currentDtsData;
        PopupAlert.open(roomName, dtsData?.user_amount, dtsData?.user_bonus);
    }

    private playKillerSettlementEffect(roomKey: string) {
        const burstTargets = this.buildGemBurstTargets(ROOM_KEYS.indexOf(roomKey));
        if (burstTargets.length === 0) {
            this.killCharactersInRoom(roomKey, () => this.openKillerAttackPopup(roomKey));
            return;
        }

        let gemDone = false;
        let stoneDone = false;
        const tryOpenPopup = () => {
            if (gemDone && stoneDone) {
                this.openKillerAttackPopup(roomKey);
            }
        };

        AudioManager.instance?.playCoinBurst();
        this.playGemBurstInRoom(roomKey, () => {
            gemDone = true;
            tryOpenPopup();
        }, burstTargets);
        this.killCharactersInRoom(roomKey, () => this.playRoomStoneAnimation(roomKey, () => {
            stoneDone = true;
            tryOpenPopup();
        }));
    }

    private buildGemBurstTargets(eliminatedRoomIndex: number): Array<{ roomIndex: number; amount: number; gemCount: number }> {
        const dtsData = GameStateManager.instance.currentDtsData;
        const eliminatedRoomId = eliminatedRoomIndex + 1;
        const sourceAmount = this.getRoomAmountById(dtsData?.room_list, eliminatedRoomId);
        const distributableAmount = Math.max(0, sourceAmount * 0.9);
        const survivorRoomIds = this.getAliveBetRoomIds(dtsData?.user_list, eliminatedRoomId);
        if (survivorRoomIds.length === 0 || distributableAmount <= 0) {
            return [];
        }

        const shareAmount = distributableAmount / survivorRoomIds.length;

        return survivorRoomIds.map((roomId) => ({
            roomIndex: roomId - 1,
            amount: shareAmount,
            gemCount: GEMS_PER_SURVIVOR_ROOM,
        }));
    }

    private getRoomAmountById(roomList: SocketRoomInfo[] | undefined, roomId: number): number {
        if (!roomList) return 0;
        const roomInfo = roomList.find((item) => Number(item.room_id) === roomId);
        const amount = Number(roomInfo?.amount);
        return Number.isFinite(amount) ? amount : 0;
    }

    private getAliveBetRoomIds(userList: SocketUserInfo[] | undefined, eliminatedRoomId: number): number[] {
        if (!userList) return [];
        const roomIds = new Set<number>();

        for (const userInfo of userList) {
            const roomId = this.normalizeRoomId(userInfo.room_id);
            if (roomId < 1 || roomId > 8 || roomId === eliminatedRoomId) continue;
            roomIds.add(roomId);
        }

        return Array.from(roomIds.values()).sort((a, b) => a - b);
    }

    private playKillerAnimation(animName: string, playTimes: number) {
        const display = this.getKillerDisplay();
        if (!display) return;
        display.timeScale = 1;
        display.playAnimation(animName, playTimes);
    }

    private getKillerDisplay(): dragonBones.ArmatureDisplay | null {
        return this.killerNode?.getChildByName('fanpai_ske')?.getComponent(dragonBones.ArmatureDisplay) ?? null;
    }

    private setKillerFacing(roomKey: string) {
        if (!this.killerNode) return;
        const absX = Math.abs(this.killerBaseScale.x) || 1;
        const faceRight = KILLER_FACE_RIGHT_ROOMS.has(roomKey);
        this.killerNode.setScale(
            faceRight ? -absX : absX,
            this.killerBaseScale.y || 1,
            this.killerBaseScale.z || 1,
        );
    }

    private stopKillerMovement() {
        if (this.killerTween) {
            this.killerTween.stop();
            this.killerTween = null;
        }
        const display = this.getKillerDisplay();
        if (display) {
            display.off(dragonBones.EventObject.COMPLETE, this.onKillerAttackComplete, this);
        }
    }

    private resetKillerState() {
        if (!this.killerNode) return;
        this.killerNode.active = true;
        this.killerNode.setPosition(KILLER_START_X, KILLER_START_Y, 0);
        this.killerNode.setScale(
            Math.abs(this.killerBaseScale.x) || 1,
            this.killerBaseScale.y || 1,
            this.killerBaseScale.z || 1,
        );

        const display = this.getKillerDisplay();
        if (display) {
            display.timeScale = 0;
        }
    }

    private resetRoomEffects() {
        for (const roomNode of this.rooms.values()) {
            const stone = roomNode.getChildByName('stone');
            if (stone) {
                Tween.stopAllByTarget(stone);
                stone.active = false;
            }
        }
    }
}
