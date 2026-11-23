---
description: "为团队推理代理配置明确的云模型目录，并加密提供方 API Key。"
kind: "package-library"
---

# @deepseek-ai/dsh-team-models

[English](README.md) | 中文

## 概述

管理员可以维护火山、千问、百炼、DeepSeek 和智谱的启用模型服务，而模型发现结果不会暴露 API Key。调用方可以为推理解析精确的已启用服务与模型组合。保存的凭据使用独立管理的加密密钥。调用方可以在保存完整模型目录前准备临时提供方连接。模型标识和能力限制必须与部署模型一致。

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

[团队控制端](../../host/team-server/README.zh.md)使用私有 SQLite 路径和以 base64url 编码的 32 字节加密密钥打开 `TeamModels`。保存完整服务前须调用 `parseModelService` 校验管理员 JSON。`list` 不包含密钥；`route` 返回带凭据的结果，仅供控制端使用。无效写入报告 `TeamModelError`；错误加密密钥会拒绝启动。[源码](src/index.ts)定义接受的端点与字段。

发现模型目录时，`parseModelConnection` 校验提供方、端点、可选的已有服务 ID 和可选的新密钥，无需模型能力字段。`resolveConnection` 使用传入密钥，或已有服务在同一提供方下保存的密钥，返回内存中的带凭据连接。这两项操作均不发起网络请求，也不持久化编辑；只有 `save` 保存完整服务。省略密钥仅在提供方不变时保留原密钥。更换提供方时，解析连接和保存都要求新密钥；失败的尝试不会改变已保存服务。

千问和百炼接受已声明的 DashScope 端点，以及格式为 `https://{WorkspaceId}.{region}.maas.aliyuncs.com/compatible-mode/v1` 的业务空间地址。业务空间标识必须以 `ws-` 或 `llm-` 开头，仅包含小写 DNS 标签字符，且不超过 63 个字符。支持地域为 `cn-beijing`、`ap-southeast-1`、`eu-central-1`、`ap-northeast-1`、`cn-hongkong` 和 `us-east-1`。其他提供方不接受这些业务空间地址。`contextWindow` 填写部署模型输入与输出合计的完整上下文容量，`maxTokens` 填写选定的单次请求输出上限，单位均为 Token；两者表示不同限制。[控制端配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-host-team-server)负责发现请求限制与工作台最低容量策略。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

存储将公开配置与 AES-256-GCM 密文分开保存。每个加密凭据都使用其服务标识进行认证。公开列表返回独立配置；临时连接解析仅为调用方解密凭据，不更新目录。推理时重新解析启用状态，而不是信任浏览器选择。经过认证的元数据请求由控制端负责；此库不发起提供方网络调用。

</details>

-----

<a id="further-exploration"></a>
## 进一步阅读

- [团队部署指南](../../../deployments/team/README.zh.md)——初始化、运维与恢复。
- [推理代理](../../host/team-server/README.zh.md)——请求授权与上游传输。

-----

<a id="model-experience"></a>
## 模型体验

### 模型路由

#### 模型看到什么

`TeamModels` 为调用方提供模型元数据与凭据，不贡献提示词或工具文本。推理适配器和控制端负责发送给所选模型的请求。

#### Token 影响

模型目录不增加请求令牌。

#### KV Cache 影响

模型目录不重写请求前缀。选择不同提供方或模型可能改变提供方缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 仅接受解析器声明的云服务 HTTPS 端点。提供方元数据发现与推理验证由控制端负责；在此解析连接不代表密钥已验证。
- 必须将加密密钥与数据库一同备份。丢失密钥后，已保存的提供方凭据将无法读取。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作备注——点击展开</summary>

无。

</details>
