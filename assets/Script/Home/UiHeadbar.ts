import { _decorator, Component } from 'cc';
import { AppBridge } from '../Utils/AppBridge';

const { ccclass } = _decorator;

@ccclass('UiHeadbar')
export class UiHeadbar extends Component {
    onLoad() {
        AppBridge.init();
    }

    onQuit() {
        AppBridge.postMessage('navBack', '');
    }
}
