---
description: "从团队运行环境侧边栏打开自建账号管理或退出登录，同时保留现有设置入口。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-team-account

[English](README.md) | 中文

## 概述

成员可以通过侧边栏菜单打开团队账号页面、使用现有设置面板或退出登录。team-worker 配置使用这些自建账号操作替换提供方账号引导。菜单使用本地化标签，并适配折叠侧边栏。提供方凭据保留在浏览器之外。

## 目录

- [使用此包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用此包

[team-worker 配置包](../../bundle/team-worker/README.zh.md)挂载主机占位插件及其浏览器入口。浏览器要求现有 `slots`、`locale` 和 `connection` 服务，并向 `settings.launcher` 提供内容；此包不接受专属配置。账号导航使用 `/team/account`。退出登录会获取当前 CSRF 值，通过控制端撤销会话，且仅在成功后跳转登录页；失败时显示本地化重试提示。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[浏览器入口](src/client/index.ts)在其 Cordis 作用域注册语言字典和菜单操作。[菜单](src/client/menu.tsx)复用共享 Menu、Toast 和图标组件。忙碌状态防止重复选择退出登录，主机入口不存储身份。初次加载、连接丢失、窗口聚焦与页面可见性变化时会检查自建会话，且不会延长闲置有效期。确认收到 HTTP 401 时跳转团队登录；网络失败仍由传输恢复处理。

</details>

-----

<a id="further-exploration"></a>
## 进一步阅读

- [团队部署指南](../../../deployments/team/README.zh.md)——初始化、运维与恢复。
- [控制端](../../host/team-server/README.zh.md)——账号与会话权限。

-----

<a id="model-experience"></a>
## 模型体验

### 账号导航

#### 模型看到什么

`settings.launcher` 菜单只改变浏览器导航与认证状态，不贡献模型提示词、schema 或工具结果。

#### Token 影响

菜单不增加请求令牌。

#### KV Cache 影响

打开设置、账号管理或退出登录不重写模型请求前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 菜单要求同源团队门户；它不是其他配置可用的独立账号提供方。
- 密码设置、账号邀请与管理员操作由控制端页面负责。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作备注——点击展开</summary>

无。

</details>
