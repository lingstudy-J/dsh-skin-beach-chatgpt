/**
 * 海边 ChatGPT 娘 —— host 侧入口。
 *
 * 本插件是纯展示层的浏览器（client）插件：只改写 Web GUI 的样式与少量
 * 文档级属性，不注册服务、不发出 Cordis 事件、不触碰模型请求与会话数据。
 * 因此 host 侧是一个空实现的 Cordis 插件，仅用于让 profile 的装载器
 * 拥有一个可挂载的 entry（浏览器半由 `dsh.client` 声明在同一包内送达）。
 *
 * @module dsh-client-ui-skin-beach-chatgpt
 */

/** 挂载本插件。host 侧无需任何行为。 */
export function apply() {}
