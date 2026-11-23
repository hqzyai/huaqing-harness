---
description: "启动可信团队控制端，提供自建登录、管理和隔离用户运行环境路由。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-team-app

[English](README.md) | 中文

## 概述

内置 team 配置提供登录与管理门户，并将已认证成员路由到各自的私有运行环境。此配置层加载 HTTP 载体与控制端包，不挂载用户智能体或文件工具。运维须在启动前配置部署环境和密钥。在打开部署资源前会先处理帮助和用法错误。个人 Web 与 headless 配置保留各自的提供方认证。

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

通过[团队部署指南](../../../deployments/team/README.zh.md)使用 `dsh --profile team`。内置配置已包含此配置包，无需额外安装。[补丁](cordis.patch.yml)中的环境值配置[控制端插件](../../host/team-server/README.zh.md)。此配置应与包含智能体的配置包分开；控制端凭据授予 Docker 管理与模型服务访问权限。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[补丁](cordis.patch.yml)插入命令行启动插件、HTTP 服务与团队服务。[启动入口](src/index.ts)先处理帮助与用法错误，再允许打开部署资源。插入的各包负责账号存储、路由与推理语义。

</details>

-----

<a id="further-exploration"></a>
## 进一步阅读

- [团队部署指南](../../../deployments/team/README.zh.md)——初始化、运维与恢复。
- [控制端](../../host/team-server/README.zh.md)——配置与运行时行为。

-----

<a id="model-experience"></a>
## 模型体验

### 控制端组合

#### 模型看到什么

`team` 配置不运行智能体，也不增加模型上下文。控制端包负责授权转发用户运行环境组装的请求。

#### Token 影响

此配置层不增加模型请求令牌。

#### KV Cache 影响

此配置层不贡献请求前缀；所选运行环境适配器负责提供方缓存行为。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 此配置层要求团队指南规定的部署环境和专用 Docker 访问；它不创建个人智能体工作区。
- 自定义配置补丁可以覆盖整行配置，因此运维必须保留必需的密钥和路由设置。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作备注——点击展开</summary>

无。

</details>
