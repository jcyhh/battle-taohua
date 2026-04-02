import { _decorator, Component, Label, RichText } from 'cc';
import { I18n, I18nParams, t } from '../Config/I18n';

const { ccclass, property } = _decorator;

@ccclass('I18nLabel')
export class I18nLabel extends Component {
    @property({ tooltip: '国际化 key，留空时使用当前文本作为 key' })
    textKey = '';

    @property({ tooltip: '参数 JSON，例如 {"count":1}' })
    paramsJson = '';

    private label: Label | null = null;
    private richText: RichText | null = null;
    private readonly onLangChanged = () => {
        this.applyText();
    };

    onLoad() {
        I18n.init();
        this.label = this.getComponent(Label);
        this.richText = this.getComponent(RichText);
        this.captureTextKey();
        this.applyText();
    }

    onEnable() {
        I18n.onChanged(this.onLangChanged);
        this.applyText();
    }

    onDisable() {
        I18n.offChanged(this.onLangChanged);
    }

    applyText() {
        if (!this.textKey) {
            return;
        }

        const translated = t(this.textKey, this.parseParams());
        if (this.label) {
            this.label.string = translated;
        }
        if (this.richText) {
            this.richText.string = translated;
        }
    }

    private captureTextKey() {
        if (this.textKey) {
            return;
        }

        if (this.label?.string) {
            this.textKey = this.label.string;
            return;
        }

        if (this.richText?.string) {
            this.textKey = this.richText.string;
        }
    }

    private parseParams(): I18nParams | undefined {
        if (!this.paramsJson) return undefined;
        try {
            return JSON.parse(this.paramsJson) as I18nParams;
        } catch (error) {
            console.warn('[I18nLabel] paramsJson 解析失败:', this.node.name, error);
            return undefined;
        }
    }
}
