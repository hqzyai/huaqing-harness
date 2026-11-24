---
description: "在单台 Linux Docker 主机上部署仅受邀用户可用的华清团队工作台。"
kind: "tutorial"
---

# 团队部署

[English](README.md) | 中文

此部署包含一个单网络入口代理、一个受信任的控制端，以及每位用户独立的 Docker 运行环境。账号属于华清，用户无需登录 DeepSeek 或提供模型服务密钥。管理员统一配置模型服务、邀请账号并生成密码重置链接；成员在原有会话输入框中选择启用的模型，选择按会话保存。

## 准备主机

使用 Linux、Node 24、Docker Engine 28 及以上、Compose 2.33.1 及以上和专用 rootless Docker 守护进程。默认入口使用 HTTPS 域名；仅内网 HTTP 需按下文显式启用。控制端持有该守护进程的 Unix socket，可管理其中的容器；不要连接共享或以主机 root 权限运行的守护进程。用户容器不挂载 Docker socket、主机源码、管理员密钥或其他用户的数据卷。为入口代理、控制端和各活跃运行环境预留资源，默认每用户限制为 2 CPU、2 GiB 内存和 256 个进程。配置外部防火墙；默认部署使用 TLS 反向代理。只有入口代理发布 `127.0.0.1:18410`；控制端不发布端口。

从此检出目录构建运行环境、控制端与入口代理三个镜像。主机 node_modules、编译产物和密钥文件均排除在构建上下文之外。

```sh
docker build --build-arg DSH_BUILD_COMMIT="$(git rev-parse HEAD)" --target worker -t huaqing-team-worker:0.2.1-rc.2 -f deployments/team/Dockerfile .
docker build --build-arg DSH_BUILD_COMMIT="$(git rev-parse HEAD)" --target gateway -t huaqing-team-gateway:0.2.1-rc.2 -f deployments/team/Dockerfile .
docker build -t huaqing-team-edge:0.2.1-rc.2 -f deployments/team/edge.Dockerfile .
```

## 初始化控制端

创建 `deployments/team/.env`，填写以下部署参数。socket 必须属于专用 rootless 守护进程，三个镜像也必须位于该守护进程的镜像存储中。选择不与主机或已有 Docker 网络重叠的控制子网。`TEAM_CONTROL_SUBNET` 默认为 `172.30.0.0/24`；`TEAM_EDGE_IP` 默认为 `172.30.0.2`，`TEAM_GATEWAY_IP` 默认为 `172.30.0.3`。两个地址必须不同、未占用且位于所选子网中。更改子网时一并更新两个地址。

```dotenv
DSH_BUILD_COMMIT=<source-commit>
TEAM_PUBLIC_ORIGIN=https://agent.example.com
TEAM_BOOTSTRAP_EMAIL=admin@example.com
TEAM_DOCKER_SOCKET=/run/user/1000/docker.sock
TEAM_CONTROL_SUBNET=172.30.0.0/24
TEAM_EDGE_IP=172.30.0.2
TEAM_GATEWAY_IP=172.30.0.3
TEAM_TRUSTED_PROXY_IPS=
```

将 `TEAM_TRUSTED_PROXY_IPS` 设置为入口代理所见的外层 TLS 代理实际连接来源 IP，使用 IP 字面值，以空格分隔。Compose 将该值以 `TEAM_EDGE_TRUSTED_PROXY_IPS` 传给入口代理；未设置或留空时只信任 `127.0.0.1 ::1`，不会信任整个桥接网络。入口代理仅接受这些来源的 `X-Real-IP`，并将发往上游的值覆盖为其解析出的客户端地址。控制端只信任固定的 `TEAM_EDGE_IP`，此值由 Compose 自动配置。未信任实际 TLS 代理来源时，登录 IP 限流会作用于代理地址，而非各客户端地址。

使用相同公开地址生成一次私有文件，然后启动控制端。生成器会保留已有加密密钥和运行环境令牌密钥；不要将这些文件提交到 Git，并将其复制到部署密钥存储中。

```sh
TEAM_PUBLIC_ORIGIN=https://agent.example.com node deployments/team/provision.mjs
docker compose --env-file deployments/team/.env -f deployments/team/compose.yml up -d
```

参考 [Caddyfile](Caddyfile) 配置主机 HTTPS 反向代理，将 `TEAM_DOMAIN` 设置为实际域名。代理必须保留 Host、覆盖 `X-Real-IP` 并支持长响应。请求经回环入口代理，通过控制网络到达控制端；[入口代理配置](edge.caddyfile)保留原始 Host（包括非默认端口），并支持 WebSocket 与流式传输。入口代理在控制端健康检查通过后启动。开放成员访问前，确认已部署 TLS 代理的真实连接来源地址。在 24 小时内打开 `deployments/team/private/administrator-activation-url` 中保存的首位管理员激活链接，设置 15–128 个 Unicode 字符的密码。令牌通过 URL fragment 传递，激活页面打开后会从浏览器历史中移除，不会成为 HTTP 查询参数或 referrer；激活后请离线保存引导令牌。

## 显式启用内网 HTTP

默认配置要求 HTTPS。对于使用 RFC1918 IPv4 字面地址的内网入口，在同一 `.env` 中设置：

```dotenv
TEAM_PUBLIC_ORIGIN=http://192.168.2.11:18400
TEAM_ALLOW_INSECURE_HTTP=true
```

通过部署专用 Compose 覆盖配置，将入口代理的发布端口替换为 `192.168.2.11:18400:18410`，并将主机防火墙限制为实际使用的内网来源；控制端仍不发布端口。公开来源必须与浏览器的协议、IP 和端口完全一致。重新创建控制端和入口代理时始终加载同一覆盖配置；不要用 Docker Desktop 的本地覆盖替代专用 rootless Docker。

此选项只接受 `10.0.0.0/8`、`172.16.0.0/12` 和 `192.168.0.0/16` 内的 IPv4 字面地址；公网 HTTP、HTTP 域名及其他地址仍在启动时被拒绝。HTTP 不对密码和会话 Cookie 进行传输加密；同源、CSRF、账号权限与用户运行环境隔离检查保持启用。回环 HTTP 不需要此选项。

## 使用 Docker Desktop 本地体验

在 Mac 或 Windows 上仅通过回环地址体验时，在同一 `.env` 中填写 `TEAM_PUBLIC_ORIGIN=http://127.0.0.1:18410`、`TEAM_DOCKER_SOCKET=/var/run/docker.sock` 和管理员邮箱，使用该地址生成私有文件，再显式添加本地覆盖文件启动。只有公开地址为回环 HTTP 时，此覆盖文件才允许运行 Docker Desktop 虚拟机中的守护进程；生产入口仍强制要求 rootless Docker。

```sh
docker compose --env-file deployments/team/.env -f deployments/team/compose.yml -f deployments/team/compose.local.yml up -d
```

打开生成的管理员激活链接，并在开始会话前配置真实模型服务。管理员尚未保存启用的服务时，模型目录为空是预期行为。

## 邀请成员与配置模型

打开“账号与团队 → 管理后台”，创建账号并复制一次性激活链接，由管理员自行私下交付。邀请链接有效期 24 小时；密码重置链接有效期一小时，新链接替换旧链接，使用后撤销该账号的全部旧登录。禁用账号会立即撤销访问并停止其运行环境，同时保留数据。Docker 停止失败会单独报告；账号仍保持禁用，模型调用也会被拒绝。

### 连接模型服务

管理表单将平台连接与提供给成员的模型分开。新服务自动填写默认显示名并生成内部标识；管理员可以修改显示名，无需填写技术标识。

1. 选择火山、千问、百炼、DeepSeek 或智谱。确认建议的 API 地址，按支持的地域或业务空间调整，并填写提供方 API Key。千问和百炼共用 DashScope 兼容 API；不同服务可以使用不同凭据与模型目录。
2. 千问、百炼或 DeepSeek 可点击“验证连接并读取模型”。此操作读取经过认证的提供方元数据，不发送推理请求，也不保存服务。选择提供给成员的模型；平台实际返回的上下文容量与图片支持会填入对应字段，返回的输出能力用于约束建议的单次请求上限。目录请求成功不代表后续推理一定具有模型访问权限或一定成功。
3. 任一能力未知时，打开模型的高级参数。核对提供方文档，填写真实上下文容量与图片能力，在提供方额度内选择输出上限，并确认手工填写值。所有容量单位均为 Token：上下文为输入与输出合计容量，输出为单次请求上限。建议输出值是工作台偏好，不是提供方能力依据。低于工作台最低容量的模型不能选择或保存；应换用合适模型，不要虚报容量。
4. 核对所选模型并启用服务，点击“保存服务”。读取目录不会持久化密钥、端点或模型编辑。编辑已保存服务时，只有提供方不变，密钥留空才保留原密钥；更换提供方必须填写新密钥。

火山方舟与智谱使用手动模型流程，因为此集成尚不能使用其推理密钥可靠读取官方模型目录。表单明确提示密钥尚未验证。填写完整模型 ID 或方舟接入点 ID，并按提供方文档确认真实能力；保存手动服务不代表密钥已认证，也不会进行推理。

API Key 在控制端加密保存，不返回普通成员，也不放入用户容器环境变量。发现超时、响应与模型数量上限、并发请求限制及工作台模型默认值由[配置目录](../../docs/config-catalog.zh.md#deepseek-aidsh-host-team-server)中的部署设置管理。运行环境每 15 秒刷新已保存目录。推理代理逐次检查服务和模型是否启用、输出额度是否符合配置，绕过选择器直接请求也受限制。禁用服务阻止后续请求，已经接受的请求可以完成。

## 运维与恢复

账号和模型数据库位于 `team-control` 数据卷；各用户分别使用 `hqzy-<user-id>-home` 和 `hqzy-<user-id>-workspace` 数据卷。数据库应与加密密钥、运行环境令牌密钥一并备份，用户卷单独备份。备份数据库时停止写入或使用 SQLite 在线备份 API；不要只复制正在写入的 `.sqlite` 文件而遗漏 WAL。升级前验证恢复流程；数据库版本单调递增，遇到未知版本会停止启动。

浏览器登录最长七天或闲置十二小时后失效。退出登录撤销服务端会话，用户 HTTP 长响应与 Remote WebSocket 连接每秒检查访问状态。Docker 网络与容器身份仅从服务端用户 ID 派生。控制端加入各用户独立网络，并在具体网络地址绑定用户专属推理监听器，用户之间不共用网络桥；控制端的 HTTP 监听和健康检查绑定命名控制网络。入口代理只连接该网络，发布稳定的部署入口；控制端另行加入各用户网络。控制端重启后恢复活跃运行环境的访问，再报告就绪。镜像与资源额度属于部署配置，更改后需由运维替换运行环境并保留数据卷；轮换运行环境令牌签名密钥时也需按原数据卷替换容器。模型 API Key 可在管理页面轮换。

使用 `docker compose --env-file deployments/team/.env -f deployments/team/compose.yml logs edge` 查看代理日志，使用 `docker compose --env-file deployments/team/.env -f deployments/team/compose.yml logs gateway` 查看控制端日志，使用 `docker logs hqzy-<user-id>` 查看对应用户运行环境。如果首次激活链接在初始化前过期，运维可运行带 `--renew-bootstrap` 参数的生成器，然后重启控制端并使用新的激活文件。此恢复仅适用于唯一的首位管理员尚未激活时，不会覆盖活跃账号；不提供公开找回密码或注册接口。

## 验证重启恢复

部署运维在初始化和镜像升级后验证完整公开请求路径。Compose 初始健康依赖不能替代运行期间的这些检查。

1. 激活两个测试成员，分别打开会话，并保持两个运行环境活跃。选择已配置模型，确认各成员只能读取自己的工作区和会话。
2. 连续三次仅重启控制端。每次重启后，等待控制端健康，并通过公开地址向 `/team/health` 发起新请求。重新加载两个既有会话，确认保存的模型选择，再通过已配置模型服务发送新消息。
3. 第三次重启后再次检查访问与隔离。仅有容器健康还不够：入口代理、浏览器连接、已保存会话与推理路由都必须恢复。

## 部署范围

此配置面向单控制端、单 Docker 主机，不包含 SMTP 投递、公开注册、跨主机调度和自动镜像滚动更新。个人使用仍可运行原有 `dsh web` 配置；团队部署不会修改其模型凭据或既有会话。
