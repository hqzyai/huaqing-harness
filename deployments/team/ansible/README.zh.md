---
description: "在纳管的原 Harness 工作站发布仅涉及品牌的镜像更新。"
kind: "reference"
---

# 品牌发布

[English](README.md) | 中文

这些任务仅支持纳管的原工作站、其专用 rootless Docker、现有已展开的 `ops/compose.switch.json` 和 28003 端口。执行前将 playbook 和辅助脚本维护到控制端的 `audible` 仓库。任务保留当前 Switch 集成，只改变 gateway 镜像和 `TEAM_WORKER_IMAGE`；候选镜像层必须以当前部署镜像为基础。

## 检查与计划

先运行纳管的 Harness 状态任务。`read-brand-image.yml` 接受 inventory 中的 `brand_code_component` 和本机 `brand_code_destination`。任务在一次性、只读、禁用网络的容器中读取包名，只复制选定的分发代码；不启动应用入口，不挂载用户卷或运行密钥。归档记录源镜像身份、实际包路径和文件哈希。

`prepare-brand-payload.py` 校验两个已审计基底镜像清单和原模块哈希后，打包本机构建的两个提示词模块。`build-brand-images.yml` 在冻结镜像上应用其余产品文案变更，不复制整套应用 bundle；gateway 继承原镜像用户。在 `audible` 维护这些文件，以源码归档 SHA-256 和显式确认运行构建任务。

如果已停止的 edge 所声明地址被占用，`repair_harness_edge_address.yml` 为此工作站提供独立的计划式修复：只把 edge 从 `10.241.0.2` 移至已确认空闲的 `10.241.0.5`，并修改 gateway 对应的精确信任代理地址。任务保留镜像、发布端口、卷和 Switch，验证公开健康入口后再次停止 edge，供品牌发布使用。修复失败时恢复原配置和 edge 停止状态。

完成两个候选镜像的构建与验证后，以不可变镜像 ID 运行纳管的发布任务：

```sh
.venv/bin/ansible-playbook playbooks/harness_brand_release.yml --limit workstation_001 \
  -e brand_gateway_image=sha256:<gateway-image-id> \
  -e brand_worker_image=sha256:<worker-image-id>
```

默认 `plan` 操作要求原 edge 已停止且所有 worker 空闲，校验 inventory 镜像、候选继承关系、挂载源、worker 归属、私有网络和 Compose 语法。通过正常认证读取的 Session 不得存在运行中的轮次，进程检查必须仅有 worker 的 Node 主进程；无法读取活动或存在额外子进程时拒绝发布。任务在服务器保存私有回执和原始配置备份。edge 缺少网络连接时必须另行执行经过审查的恢复任务。`--check` 不生成发布计划，也不证明运行就绪。

## 应用与验证

使用返回的回执 ID，设置 `brand_release_action=apply`、`brand_release_receipt=<receipt-id>` 和 `brand_release_confirm=true`。任务仅停止 gateway 和受管 worker，保留原 worker 容器用于回滚，以相同环境变量、UID、资源限制、卷、网络地址和别名创建替代容器。新 gateway 恢复这些 worker。原 Harness edge 如已停止，仅按其确切 ID 启动；不改变 Switch 入口或端口。

`applied-awaiting-acceptance` 结果要求通过正常 Session API 或浏览器获得真实身份回复。`verify-brand.yml` 选择已配置模型，检查回复和已记录的系统身份，仅归档自身测试 Session；凭据留在 worker 内。`verify-public.yml` 从控制端直接检查公开登录品牌、健康状态和认证限制。应用验收后执行 `brand_release_action=verify`，核对运行设置保留与公开健康入口。重新巡检并审查 inventory 更新后，再使用纳管的导出任务归档当前镜像。

## 回滚

应用失败时任务尝试恢复原 Compose 配置、worker ID、网络连接和 edge 原始运行状态。对中断或已验收的发布，可使用同一回执和确认，显式执行 `brand_release_action=rollback`。运行状态漂移或恢复不完整时会报告，且保留证据。成功发布后保留停止的原 worker；回滚后保留停止的失败候选容器。任务不会删除卷、重置凭据、迁移数据库、清理 Docker 或重启无关服务。

## 带版本的镜像交付

`image-delivery.yml` 在 `audible/playbooks/harness_image_delivery.yml` 维护，用于现有原工作站。默认计划冻结当前三个镜像身份和每个已识别的旧镜像归档及侧文件。审查后以回执和显式确认执行 apply，复用已有完整验证的导出流程，发布 `huaqing-harness-0.1.0-linux-x86-<openssl rand -hex 16 生成的32位小写hex>-<Asia/Shanghai YYYYmmddHHMMSS>.tar.gz`，再将旧镜像文件移至 `images/del/<回执>/`。源码归档、其他服务及现有保留批次不参与文件选择。Workspace 根目录硬链接别名及侧文件跟随该批次保留旧下载入口。其他服务的通用导出继续使用 SHA256 命名。
