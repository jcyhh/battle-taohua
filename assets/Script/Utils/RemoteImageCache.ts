import { assetManager, ImageAsset, SpriteFrame, Texture2D } from 'cc';

type CacheEntry = {
    url: string;
    refCount: number;
    lastUsedAt: number;
    loadingPromise: Promise<SpriteFrame> | null;
    spriteFrame: SpriteFrame | null;
    texture: Texture2D | null;
    imageAsset: ImageAsset | null;
};

const MAX_CACHE_SIZE = 40;
const MAX_IDLE_MS = 3 * 60 * 1000;

export class RemoteImageCache {
    private static readonly cache = new Map<string, CacheEntry>();

    static async load(url?: string | null): Promise<SpriteFrame | null> {
        const normalizedUrl = String(url ?? '').trim();
        if (!normalizedUrl) return null;

        let entry = this.cache.get(normalizedUrl);
        if (!entry) {
            entry = {
                url: normalizedUrl,
                refCount: 0,
                lastUsedAt: Date.now(),
                loadingPromise: null,
                spriteFrame: null,
                texture: null,
                imageAsset: null,
            };
            this.cache.set(normalizedUrl, entry);
        }

        entry.refCount += 1;
        entry.lastUsedAt = Date.now();

        if (entry.spriteFrame?.isValid) {
            this.trim();
            return entry.spriteFrame;
        }

        if (!entry.loadingPromise) {
            entry.loadingPromise = this.loadInternal(entry);
        }

        try {
            const spriteFrame = await entry.loadingPromise;
            entry.lastUsedAt = Date.now();
            this.trim();
            return spriteFrame;
        } catch (error) {
            this.cache.delete(normalizedUrl);
            throw error;
        }
    }

    static release(url?: string | null) {
        const normalizedUrl = String(url ?? '').trim();
        if (!normalizedUrl) return;

        const entry = this.cache.get(normalizedUrl);
        if (!entry) return;

        entry.refCount = Math.max(0, entry.refCount - 1);
        entry.lastUsedAt = Date.now();
        this.trim();
    }

    static clear() {
        for (const entry of this.cache.values()) {
            this.destroyEntry(entry);
        }
        this.cache.clear();
    }

    static trim(force = false) {
        const now = Date.now();
        const idleCandidates: CacheEntry[] = [];

        for (const entry of this.cache.values()) {
            if (entry.refCount > 0 || entry.loadingPromise) continue;
            if (force || now - entry.lastUsedAt >= MAX_IDLE_MS) {
                idleCandidates.push(entry);
            }
        }

        idleCandidates.sort((a, b) => a.lastUsedAt - b.lastUsedAt);

        for (const entry of idleCandidates) {
            if (!force && this.cache.size <= MAX_CACHE_SIZE) {
                break;
            }
            this.destroyEntry(entry);
            this.cache.delete(entry.url);
        }

        if (force) {
            return;
        }

        while (this.cache.size > MAX_CACHE_SIZE) {
            const removable = [...this.cache.values()]
                .filter((entry) => entry.refCount <= 0 && !entry.loadingPromise)
                .sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0];
            if (!removable) break;
            this.destroyEntry(removable);
            this.cache.delete(removable.url);
        }
    }

    private static loadInternal(entry: CacheEntry): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            assetManager.loadRemote<ImageAsset>(entry.url, { ext: this.getRemoteExt(entry.url) }, (error, imageAsset) => {
                if (error || !imageAsset) {
                    entry.loadingPromise = null;
                    reject(error ?? new Error(`远程图片加载失败: ${entry.url}`));
                    return;
                }

                const texture = new Texture2D();
                texture.image = imageAsset;

                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;

                entry.imageAsset = imageAsset;
                entry.texture = texture;
                entry.spriteFrame = spriteFrame;
                entry.loadingPromise = null;
                resolve(spriteFrame);
            });
        });
    }

    private static destroyEntry(entry: CacheEntry) {
        if (entry.spriteFrame?.isValid) {
            entry.spriteFrame.destroy();
        }
        if (entry.texture?.isValid) {
            entry.texture.destroy();
        }
        if (entry.imageAsset?.isValid) {
            assetManager.releaseAsset(entry.imageAsset);
        }
        entry.spriteFrame = null;
        entry.texture = null;
        entry.imageAsset = null;
        entry.loadingPromise = null;
    }

    private static getRemoteExt(url: string) {
        const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
        const ext = match?.[1]?.toLowerCase();
        if (!ext) return '.png';
        return `.${ext}`;
    }
}
