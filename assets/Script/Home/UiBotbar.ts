import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

@ccclass('UiBotbar')
export class UiBotbar extends Component {
    goRecordScene() {
        director.loadScene('Record');
    }

    goRankScene() {
        director.loadScene('Rank');
    }
}

