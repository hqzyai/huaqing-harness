---
description: "在每个私有用户运行环境中使用中央团队模型与自建账号导航。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-team-worker

[English](README.md) | 中文

## 概述

内置 team-worker 配置让成员使用现有 Web 智能体，同时使用中央配置模型和自建账号导航。此配置层禁用直接 DeepSeek 账号与模型引导，并使用浏览器目录选择器。成员保留逐会话模型选择与私有工作区数据。控制端为每个容器提供专属代理能力令牌。

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

[团队部署](../../../deployments/team/README.zh.md)在受管用户容器内启动 `dsh --profile team-worker`。该内置配置在 `base` 和 `web-app` 后应用此配置包；成员无需安装。[中央桥接](../../host/team-runtime/README.zh.md)使用网关地址和专属启动令牌。个人安装使用普通 Web 配置。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

[补丁](cordis.patch.yml)禁用直接提供方账号条目与独立模型设置页，随后挂载中央模型桥接与账号菜单。它替换目录选择器提供方，并添加浏览器视图。现有会话选择和 Web 组件保留各自的实现所有者。

</details>

-----

<a id="further-exploration"></a>
## 进一步阅读

- [团队部署指南](../../../deployments/team/README.zh.md)——初始化、运维与恢复。
- [中央模型桥接](../../host/team-runtime/README.zh.md)——目录轮询与私有推理路由。
- [账号菜单](../../client/ui-team-account/README.zh.md)——账号导航与退出登录。

-----

<a id="model-experience"></a>
## 模型体验

### 运行环境模型选择

#### 模型看到什么

`team-worker` 配置层不贡献提示词或工具文本。中央桥接选择可用模型路由；组合中的智能体和适配器负责模型可见请求及现有持久化 Session 选择。

#### Token 影响

除组合中各包负责的行为外，此配置层不增加请求令牌。

#### KV Cache 影响

补丁不增加请求前缀。更改所选模型可能改变提供方缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 此配置层依赖其覆盖的 base 与 web-app 条目；它不是独立配置或直接提供方登录路径。
- 运行环境创建、文件系统隔离与 Docker 资源限制由控制端负责，不由此配置补丁负责。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作备注——点击展开</summary>

无。

</details>
