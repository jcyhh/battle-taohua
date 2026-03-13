import { _decorator, Component, EventTouch, Node, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;

@ccclass('MapRoot')
export class MapRoot extends Component {
    private readonly tempPosition = new Vec3();
    private minY = 0;
    private maxY = 0;

    onLoad() {
        this.refreshDragRange();
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
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
        if (this.minY === this.maxY) {
            return;
        }

        const deltaY = event.getUIDelta().y;
        const nextY = Math.min(this.maxY, Math.max(this.minY, this.node.position.y + deltaY));
        this.tempPosition.set(this.node.position.x, nextY, this.node.position.z);
        this.node.setPosition(this.tempPosition);
    }
}

