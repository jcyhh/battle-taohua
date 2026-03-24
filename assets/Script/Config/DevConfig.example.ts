/**
 * 开发环境配置模板
 *
 * 使用方式：
 *   1. 复制此文件并重命名为 DevConfig.ts
 *   2. 填入你本地的开发环境地址和 Token
 *   3. DevConfig.ts 已被 .gitignore 忽略，不会提交到仓库
 */
export const DevConfig = {
    /** HTTP 接口基础地址 */
    apiUrl: 'http://localhost:3000',
    /** WebSocket 连接地址 */
    wsUrl: 'ws://localhost:3000/ws',
    /** 开发用的鉴权 Token */
    token: '',
};
