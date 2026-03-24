import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, tween } from 'cc';
import { RoomAsset } from './RoomAsset';
const { ccclass, property } = _decorator;

const BURST_RADIUS_MIN = 80;
const BURST_RADIUS_MAX = 150;
const BURST_DURATION = 0.75;
const FLY_DURATION = 0.5;
const FLY_STAGGER = 0.15;

type BurstTarget = {
    roomIndex: number;
    amount: number;
    gemCount: number;
};

@ccclass('GemBurst')
export class GemBurst extends Component {
    @property(SpriteFrame)
    stoneSf: SpriteFrame = null!;

    @property([RoomAsset])
    roomAssets: RoomAsset[] = [];

    /**
     * @param roomIndex 被选中房间的索引（0-7 对应 room1-room8）
     * @param sourcePos 爆发原点，MapRoot 本地坐标
     */
    burst(roomIndex: number, sourcePos: Vec3, targets: BurstTarget[], onComplete?: () => void) {
        const sourceAsset = this.roomAssets[roomIndex];
        if (sourceAsset) {
            sourceAsset.count = 0;
        }

        const resolvedTargets: Array<BurstTarget & { asset: RoomAsset; localPos: Vec3; finalAmount: number }> = [];
        for (const target of targets) {
            const asset = this.roomAssets[target.roomIndex];
            if (!asset) continue;
            const iconWorldPos = asset.iconNode.getComponent(UITransform)!
                .convertToWorldSpaceAR(Vec3.ZERO);
            const localPos = this.node.getComponent(UITransform)!
                .convertToNodeSpaceAR(iconWorldPos);
            resolvedTargets.push({
                ...target,
                asset,
                localPos,
                finalAmount: asset.count + target.amount,
            });
        }

        const parentLayer = this.node.layer;
        const gems: Node[] = [];
        const scatterPositions: Vec3[] = [];

        for (let t = 0; t < resolvedTargets.length; t++) {
            const target = resolvedTargets[t];
            for (let g = 0; g < target.gemCount; g++) {
                const gem = new Node(`gem_${t}_${g}`);
                gem.layer = parentLayer;
                const sp = gem.addComponent(Sprite);
                sp.spriteFrame = this.stoneSf;
                sp.sizeMode = Sprite.SizeMode.TRIMMED;
                gem.setPosition(sourcePos);
                gem.setScale(0.5, 0.5, 1);
                this.node.addChild(gem);

                const angle = Math.random() * Math.PI * 2;
                const radius = BURST_RADIUS_MIN + Math.random() * (BURST_RADIUS_MAX - BURST_RADIUS_MIN);
                const scatterPos = new Vec3(
                    sourcePos.x + Math.cos(angle) * radius,
                    sourcePos.y + Math.sin(angle) * radius,
                    0,
                );

                gems.push(gem);
                scatterPositions.push(scatterPos);
            }
        }

        if (gems.length === 0) {
            for (const target of resolvedTargets) {
                target.asset.count = target.finalAmount;
            }
            onComplete?.();
            return;
        }

        let finishedCount = 0;
        const totalGems = gems.length;

        for (let i = 0; i < gems.length; i++) {
            const gem = gems[i];
            const scatter = scatterPositions[i];
            const target = resolvedTargets[this.resolveTargetIndex(i, resolvedTargets)];
            const stagger = Math.random() * FLY_STAGGER;

            tween(gem)
                .to(BURST_DURATION, { position: scatter }, { easing: 'quadOut' })
                .delay(0.1 + stagger)
                .to(FLY_DURATION, { position: target.localPos, scale: new Vec3(0.3, 0.3, 1) }, { easing: 'quadIn' })
                .call(() => {
                    gem.destroy();
                    finishedCount += 1;
                    if (finishedCount >= totalGems) {
                        for (const resolvedTarget of resolvedTargets) {
                            resolvedTarget.asset.count = resolvedTarget.finalAmount;
                        }
                        onComplete?.();
                    }
                })
                .start();
        }
    }

    private resolveTargetIndex(gemIndex: number, targets: Array<BurstTarget & { asset: RoomAsset; localPos: Vec3; finalAmount: number }>): number {
        let offset = 0;
        for (let i = 0; i < targets.length; i++) {
            offset += targets[i].gemCount;
            if (gemIndex < offset) return i;
        }
        return Math.max(0, targets.length - 1);
    }
}
