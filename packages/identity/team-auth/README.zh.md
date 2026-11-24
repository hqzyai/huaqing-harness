---
description: "为团队控制端提供受邀邮箱密码账号、可撤销会话，以及管理员签发的激活与重置链接。"
kind: "package-library"
---

# @deepseek-ai/dsh-team-auth

[English](README.md) | 中文

## 概述

团队成员可以激活受邀邮箱账号、使用密码登录，并通过管理员签发的链接重置访问权限。管理员可以邀请成员或其他管理员，也可在保留数据的情况下禁用账号。团队控制端使用此库在重启后保留账号状态。此库要求单个 SQLite 所有者，并显式配置登录限制与令牌有效期。

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

[团队控制端](../../host/team-server/README.zh.md)使用私有数据库路径和 `TeamAuthOptions` 构造 `TeamAuth`；此库没有配置层或插件入口。各项操作参见[源码声明](src/index.ts)。账号错误通过 `TeamAuthError` 类型化错误码交给调用方；数据库错误会停止依赖请求。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

SQLite 存储负责账号状态、令牌摘要、登录尝试窗口和审计记录。密码派生使用独立盐值的 scrypt，并限制并发。消费重置令牌时会在密码派生完成后再次检查令牌，并原子撤销旧会话。禁用账号也会撤销其未使用链接；运行环境停止由调用方负责。

</details>

-----

<a id="further-exploration"></a>
## 进一步阅读

- [团队部署指南](../../../deployments/team/README.zh.md)——初始化、运维与恢复。
- [控制端](../../host/team-server/README.zh.md)——HTTP 认证与运行环境停止。

-----

<a id="model-experience"></a>
## 模型体验

### 账号操作

#### 模型看到什么

`TeamAuth` 操作不贡献提示词、schema 或工具结果文本。此库不会将邮箱、密码或登录令牌放入模型上下文。

#### Token 影响

账号管理不增加请求令牌。

#### KV Cache 影响

账号操作不改变模型请求前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 数据库由单个控制端拥有；不支持多个活跃副本。
- 调用方必须交付激活与重置链接，并在请求结束后关闭存储。此库不发送邮件，也不停止容器。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作备注——点击展开</summary>

无。

</details>
