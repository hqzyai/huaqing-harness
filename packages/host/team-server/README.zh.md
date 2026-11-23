---
description: "运行自建团队登录与管理页面，将用户路由到隔离 Docker 环境，并授权中央配置的模型推理。"
kind: "package-reference"
---

# @deepseek-ai/dsh-host-team-server

[English](README.md) | 中文

## 概述

团队可以使用自建邮箱密码账号、邀请同事，并选择管理员配置的模型，无需提供方账号登录。管理员在网页门户中管理用户与模型服务。每位已认证用户访问独立 Docker 环境与私有数据卷。控制端保留提供方凭据并代理模型调用。部署要求单个控制进程和专用 Docker 守护进程。

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

使用内置 [team 配置](../../bundle/team-app/README.zh.md)及[部署指南](../../../deployments/team/README.zh.md)，一并设置 HTTP 载体、私有路径、来源、密钥与 Docker 镜像。插件注入 `webServer` 服务；控制端不挂载用户智能体或文件工具。[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-host-team-server)列出全部接受的部署字段。缺少密钥、无效来源或不支持的数据库版本会停止启动。

非回环来源默认要求 HTTPS。运维可设置 `allowInsecureHttp: true`，仅为 RFC1918 IPv4 字面地址（`10.0.0.0/8`、`172.16.0.0/12` 或 `192.168.0.0/16`）启用 HTTP；内置配置通过 `TEAM_ALLOW_INSECURE_HTTP=true` 读取此显式选项。HTTP 不对密码和会话 Cookie 进行传输加密。精确 Host/Origin 与 CSRF 检查继续生效；公网 HTTP 和使用域名的 HTTP 仍被拒绝。回环 HTTP 无需此选项即可使用。

管理员可以在保存服务前验证平台连接并读取模型目录。发现接口只返回平台提供的能力信息；缺失的能力必须明确手动填写。请求限制耗时、响应体大小和模型数量，停止服务时取消已接纳的发现操作。新的目录写入必须满足配置的最低上下文容量；门户显示 Token 单位，并区分总上下文和每次回复的输出上限。现有窗口过小的记录和更换平台的处理见[目录校验升级指南](../../../docs/upgrade-guide/v0.2.1-rc.2/team-model-catalog-validation/guide.zh.md)。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[路由所有者](src/index.ts)在执行账号或模型操作前检查自建会话、同源写入条件与管理员权限。[容器管理](src/containers.ts)从已认证用户标识分配运行环境；[HTTP 传输](src/http.ts)将运行环境的浏览器凭据保留在服务端。私有模型监听器绑定逐用户 Docker 网络中的具体地址。浏览器流持续检查撤销状态；每次推理请求都重新解析模型启用状态。停止时先拒绝新请求，取消活动传输与 Docker 启动，再等待已接纳的密码与数据库操作完成，最后关闭私有监听器和存储。

</details>

-----

<a id="further-exploration"></a>
## 进一步阅读

- [团队部署指南](../../../deployments/team/README.zh.md)——初始化、运维与恢复。
- [身份存储](../../identity/team-auth/README.zh.md)——账号与令牌语义。
- [模型目录](../../llm/team-models/README.zh.md)——凭据加密与支持的提供方。

-----

<a id="model-experience"></a>
## 模型体验

### 授权推理

#### 模型看到什么

`/team` 登录与管理不增加模型上下文。控制端将运行环境组装的请求转发到精确启用的模型路由，并替换提供方凭据，不添加提示词文本。

#### Token 影响

控制端不增加提示词令牌；上游用量属于所选提供方请求。

#### KV Cache 影响

凭据替换不改变请求前缀。不同模型路由可能改变提供方缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 部署支持单个控制端和单个 Docker 主机；不支持跨主机调度或自动镜像发布。
- 管理员手工交付一次性链接。不提供公开注册或 SMTP 投递。
- 运维负责入口暴露、专用 Docker 访问，以及私有数据库、密钥与用户数据卷的一致性备份。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作备注——点击展开</summary>

无。

</details>
