---
description: "在团队私有运行环境中发现中央配置模型，并将会话选择器连接到推理代理。"
kind: "package-reference"
---

# @deepseek-ai/dsh-host-team-runtime

[English](README.md) | 中文

## 概述

成员可以在现有会话输入框中选择中央启用的模型，无需配置提供方凭据。team-worker 配置加载中央目录，并保留现有的逐会话模型选择行为。管理员可以在不重建运行环境的情况下刷新可用路由。启动期间目录加载失败会拒绝就绪；后续刷新失败会保留旧目录，中央推理授权仍然生效。

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

在受管用户容器中使用内置的 [team-worker 配置包](../../bundle/team-worker/README.zh.md)。插件要求 `connection`、`webServer` 和 `llm` 服务、`gatewayURL`，以及用户专属的 `DSH_TEAM_TOKEN` 启动值。`refreshMs` 默认为 15000，`timeoutMs` 默认为 10000。[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-host-team-runtime)列出完整接受字段；容器设置由部署指南负责。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[桥接实现](src/index.ts)校验每次中央目录响应，并使用 `team-<service-id>` 提供方名称挂载现有 pi-ai 适配器。请求仅携带运行环境专属的代理能力令牌。插件等待适配器激活后才写入私有浏览器就绪令牌，目录轮询随 Cordis 作用域释放。

</details>

-----

<a id="further-exploration"></a>
## 进一步阅读

- [团队部署指南](../../../deployments/team/README.zh.md)——初始化、运维与恢复。
- [pi-ai 适配器](../../llm/llm-pi-ai/README.zh.md)——提供方请求构造。

-----

<a id="model-experience"></a>
## 模型体验

### 中央模型选择

#### 模型看到什么

桥接实现注册 `team-<service-id>` 模型路由，不添加提示词或工具文本。现有适配器为会话所选路由组装请求；提供方 API Key 留在控制端。

#### Token 影响

目录轮询不增加模型请求令牌。请求分词由所选适配器负责。

#### KV Cache 影响

桥接实现不修改已组装的请求前缀。切换模型路由可能改变提供方缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 目录更新通过轮询获取，因此运行环境可能短暂显示已禁用路由；控制端仍会拒绝该路由的新推理请求。
- 此插件要求私有团队网关和专属启动能力令牌；它不能直接向提供方认证。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作备注——点击展开</summary>

无。

</details>
