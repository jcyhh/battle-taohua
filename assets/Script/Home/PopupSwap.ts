import { _decorator, Component, EditBox, Label } from 'cc';
import { Popup } from '../Common/Popup';
import { Toast } from '../Common/Toast';
import { Api } from '../Config/Api';
import { t } from '../Config/I18n';
import { formatAmount } from '../Utils/Format';
import { Content } from './Content';
const { ccclass, property } = _decorator;

@ccclass('PopupSwap')
export class PopupSwap extends Component {

    @property(Label)
    balanceLabel: Label = null!;

    @property(Label)
    amountLabel: Label = null!;

    @property(Label)
    feeLabel: Label = null!;

    @property(EditBox)
    inputEditBox: EditBox = null!;

    private xzPrice = 0;
    private requestVersion = 0;
    private isDestroyed = false;
    private isFormattingInput = false;
    private isSwapping = false;
    private popup: Popup | null = null;

    onLoad() {
        this.isDestroyed = false;
        this.popup = this.getComponent(Popup);
        this.inputEditBox?.node.on('text-changed', this.onInputChanged, this);
    }

    onEnable() {
        this.clearInput();

        const currentVersion = ++this.requestVersion;
        this.requestSwapConfig(currentVersion);
        this.requestUserBalance(currentVersion);
        this.updateAmountLabel();
    }

    onDisable() {
        this.requestVersion++;
    }

    onDestroy() {
        this.isDestroyed = true;
        this.requestVersion++;
        this.inputEditBox?.node.off('text-changed', this.onInputChanged, this);
    }

    private async requestSwapConfig(currentVersion: number) {
        try {
            const config = await Api.flashSwapConfig();
            if (this.isDestroyed || !this.node?.isValid || !this.node.activeInHierarchy || currentVersion !== this.requestVersion) {
                return;
            }

            this.xzPrice = this.toNumber(config.xz_price);
            if (this.feeLabel) {
                this.feeLabel.string = t('滑点 : {feeRate}%', {
                    feeRate: formatAmount(config.xz_fee_rate),
                });
            }
            this.updateAmountLabel();
        } catch (error) {
            console.error('[PopupSwap] 获取闪兑配置失败:', error);
        }
    }

    private async requestUserBalance(currentVersion: number) {
        try {
            const user = await Api.userMy();
            if (this.isDestroyed || !this.node?.isValid || !this.node.activeInHierarchy || currentVersion !== this.requestVersion) {
                return;
            }

            if (this.balanceLabel) {
                this.balanceLabel.string = t('灵石余额 : {amount}', {
                    amount: formatAmount(user.balance_fairy_stone),
                });
            }
        } catch (error) {
            console.error('[PopupSwap] 获取用户信息失败:', error);
        }
    }

    async swapXz() {
        if (this.isSwapping) return;

        const amountText = this.formatInputValue(this.inputEditBox?.string ?? '');
        const amount = this.toNumber(amountText);
        if (amount <= 0) {
            Toast.showFail(t('请输入兑换数量'));
            return;
        }

        this.isSwapping = true;
        try {
            await Api.flashSwapXz({ amount });
            if (this.isDestroyed || !this.node?.isValid) return;

            this.popup = this.popup ?? this.getComponent(Popup);
            this.popup?.close();
            Toast.showSuccess(t('兑换成功'));
            Content.instance?.refreshBalance();
        } catch (error) {
            console.error('[PopupSwap] 兑换失败:', error);
        } finally {
            this.isSwapping = false;
        }
    }

    private toNumber(value: string | number | null | undefined): number {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    }

    private onInputChanged() {
        if (this.isFormattingInput || !this.inputEditBox) return;

        const formattedValue = this.formatInputValue(this.inputEditBox.string);
        if (formattedValue !== this.inputEditBox.string) {
            this.isFormattingInput = true;
            this.inputEditBox.string = formattedValue;
            this.isFormattingInput = false;
        }

        this.updateAmountLabel(formattedValue);
    }

    private formatInputValue(value: string): string {
        let result = '';
        let hasDot = false;

        for (const char of value) {
            if (char >= '0' && char <= '9') {
                result += char;
                continue;
            }

            if (char === '.' && !hasDot) {
                result += char;
                hasDot = true;
            }
        }

        if (result.startsWith('.')) {
            result = `0${result}`;
        }

        const [intPart, decPart] = result.split('.');
        const normalizedInt = intPart.replace(/^0+(?=\d)/, '') || (hasDot ? '0' : '');
        return decPart === undefined ? normalizedInt : `${normalizedInt}.${decPart}`;
    }

    private updateAmountLabel(inputValue: string = this.inputEditBox?.string ?? '') {
        if (!this.amountLabel) return;

        const inputAmount = this.toNumber(inputValue);
        this.amountLabel.string = formatAmount(inputAmount * this.xzPrice);
    }

    private clearInput() {
        if (this.inputEditBox) {
            this.inputEditBox.string = '';
        }
        this.updateAmountLabel('');
    }
}

