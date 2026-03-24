import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

@ccclass('RecordHeadbar')
export class RecordHeadbar extends Component {
    goHomeScene() {
        director.loadScene('Home');
    }
}

