---
kind: upgrade-guide
description: "团队模型目录写入拒绝过小的上下文窗口，更换平台时必须填写新的 API Key。"
---

# 团队模型目录校验

[English](guide.md) | 中文

## 变更

管理员写入模型目录时，上下文窗口不得小于控制端的 `modelMinimumContextWindow`，默认值为 16,384 Token。此前写入允许 1,024 Token。现有目录仍可读取，但编辑窗口过小的记录时必须修正容量。更换服务的平台时还必须提供新平台的 API Key；省略密钥不再复用其他平台的凭据。

## 迁移

1. 在管理员的模型设置中打开服务，从平台读取模型信息。无法自动读取时，从平台文档复制模型的真实上下文容量。选择满足配置最低要求的模型，不要将声明容量改得大于模型的真实上限。
2. 更换平台时填写新的 API Key。平台不变时，留空仍保留已保存的密钥。
3. 更新自动化的 `POST /team/api/services` 写入，填写真实的 `models[].contextWindow`，并在更改 `provider` 时提供新的 `apiKey`。窗口过小返回 `model-context-too-small`；缺少替换密钥返回 `missing-api-key`。
4. 确认服务能够保存，并在会话中生成完整回复。运维可在 team-server 配置中设置 `modelMinimumContextWindow`，但必须大于运行时预留的 4,096 Token。写入被拒绝时，之前的配置和密钥保留。
