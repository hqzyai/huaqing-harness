/** Locale-owned authentication and administration pages served outside user runtimes. */
import { randomBytes } from 'node:crypto'

const productTitle = '华清智言 · Huaqing Harness'

const zh = {
  title: productTitle, login: '登录', loginAccount: '账号', email: '邮箱', password: '密码', enterEmail: '请输入账号', invalidEmail: '请输入有效的邮箱地址', enterPassword: '请输入密码', showPassword: '显示密码', hidePassword: '隐藏密码', newPassword: '设置密码（15–128 个字符）',
  accept: '设置密码并激活账号', savedPassword: '密码已设置，请登录', account: '我的账号', admin: '管理后台',
  users: '团队成员', models: '模型服务', back: '返回工作台', logout: '退出登录', invite: '邀请成员',
  member: '普通成员', administrator: '管理员', role: '账号角色', active: '已激活', pending: '待激活', disabled: '已禁用',
  reset: '生成邀请 / 重置链接', disable: '禁用', enable: '启用', link: '一次性链接（仅显示本次，请复制后自行发送）',
  copy: '复制链接', copied: '已复制', serviceId: '服务标识（小写字母、数字、连字符）', serviceName: '服务名称',
  provider: '模型平台', endpoint: 'API 基础地址', key: 'API Key', enabled: '启用此服务',
  modelId: '模型 ID / 接入点 ID', modelName: '显示名称', context: '上下文总容量（Token）', output: '单次输出上限（Token）', vision: '图片输入能力',
  addModel: '添加模型', remove: '移除', save: '保存服务', create: '新增服务', edit: '编辑', saved: '已保存',
  noModels: '尚未配置模型服务。配置并启用后，成员可在会话输入框选择模型', loading: '正在加载',
  managed: '模型由管理员统一配置，请在会话中选择已启用的模型。修改密码请联系管理员生成一次性重置链接',
  loginHint: '使用管理员开通的团队账号登录', acceptHint: '链接限时且只能使用一次；设置密码后会退出该账号原有登录',
  confirmDisable: '禁用后将退出该用户的所有登录，并停止其运行环境。确定继续？',
  invalid: '邮箱、密码或输入内容无效，请核对后重试', forbidden: '没有操作权限，请使用有权限的账号登录',
  conflict: '账号已存在，或操作会禁用最后一位管理员', 'rate-limit': '操作过于频繁，请稍后重试',
  expired: '链接已失效，请联系管理员生成新链接', unavailable: '服务暂时不可用，请稍后重试或联系管理员',
  'account-disabled-stop-failed': '账号已禁用，但运行环境停止失败，请联系运维检查 Docker',
  'invalid-model-service': '请检查模型服务地址、模型 ID 和容量配置', 'missing-api-key': '首次配置需要填写 API Key',
  'platformVolcengine': '火山方舟',
  'platformQwen': '千问',
  'platformBailian': '阿里云百炼',
  'platformZhipu': '智谱',
  'modelSetupHint': '连接模型平台并读取目录，再选择提供给团队的模型',
  'stepConnection': '1. 连接模型平台',
  'stepModels': '2. 选择团队可用的模型',
  'serviceAdvanced': '高级设置',
  'modelAdvanced': '高级参数 · Token 容量与图片能力',
  'serviceIdHint': '系统自动生成，仅用于内部识别；编辑时保持不变',
  'platformGuide': '平台文档与模型 ID',
  'helpVolcengine': '填写方舟 API 地址与控制台的 ep- 接入点 ID',
  'helpAlibaba': '可使用 DashScope 或控制台的业务空间专属地址，保留 /compatible-mode/v1',
  'helpDeepseek': '填写 DeepSeek 官方 API 地址和完整模型 ID',
  'helpZhipu': '填写智谱 OpenAI 兼容 API 地址和官方模型 ID',
  'keyRequiredHint': '填写此平台的 API Key，仅在服务端加密保存',
  'keySavedHint': '已保存的密钥不会显示；留空继续使用，填写新值可替换',
  'enabledStatus': '已启用',
  'enabledHint': '启用后，普通成员可在会话输入框选择这些模型',
  'discover': '验证连接并读取模型',
  'discovering': '正在连接并读取模型…',
  'discoveryRead': '已读取 {count} 个模型，请选择团队可用的模型；此步骤不发送推理请求',
  'discoverHint': '验证连接后会在此显示模型，也可按平台文档手动添加',
  'selectionHint': '选择模型后填入平台提供的容量；显示名称可以修改',
  'searchModels': '搜索模型名称或 ID',
  'noMatchingModels': '没有匹配的模型，请更换搜索词',
  'listUnavailable': '平台未提供可读取的模型列表，请按文档手动添加',
  'manualReadingUnsupported': '此平台暂不支持用推理密钥读取目录，请按文档手动填写模型 ID 和能力；密钥尚未验证',
  'addManualModel': '手动添加模型',
  'manualModel': '手动配置模型',
  'modelIdHint': '填写平台完整模型 ID，例如 {example}，不要填写显示名称',
  'modelTooSmall': '低于工作台最低要求 {minimum} Token，请选择容量足够的模型，不要虚报容量',
  'catalogCapacity': '上下文总容量：{tokens} Token',
  'unknownCapacity': '平台未提供容量，选择后需核对高级参数',
  'capabilitiesUnknown': '平台未提供完整能力信息，请按官方文档填写并核对以下参数',
  'capabilitiesProvided': '已填入平台能力；输出上限为本服务的单次回复策略',
  'contextHint': '输入与输出的总容量，不是当前文本字数。工作台最低要求 {minimum} Token，请填平台真实容量',
  'outputHintKnown': '每次请求允许的最大输出量，不超过平台上限 {tokens} Token',
  'outputHintUnknown': '建议回复上限 {tokens} Token；平台未提供输出能力，请按文档核对',
  'chooseVision': '请选择并确认图片能力',
  'noImages': '仅文本，不接收图片',
  'acceptImages': '可接收图片',
  'visionHint': '仅模型支持图片输入时启用；此选项不会让文本模型获得图片能力',
  'confirmCapabilities': '我已按平台文档核对未提供的容量与图片能力',
  'keepOneModel': '至少保留一个模型，可以先添加替代模型',
  'modelLimit': '每个服务最多配置 100 个模型',
  'cancel': '关闭编辑',
  'editService': '编辑模型服务',
  'choose-models': '请先选择或手动添加至少一个模型',
  'duplicate-model': '模型 ID 重复，请保留一个或修改 ID',
  'model-context-too-small': '模型上下文低于工作台最低要求，请填写真实容量或换用其他模型',
  'discovery-unauthorized': '平台拒绝了密钥，请检查 API Key、地域和业务空间后重试',
  'discovery-forbidden': '平台拒绝访问，请检查模型权限或 IP 白名单后重试',
  'discovery-rate-limit': '平台请求过于频繁，请稍后点击验证重试',
  'discovery-timeout': '连接平台超时，请检查 API 地址和服务器网络后重试',
  'discovery-unavailable': '暂时无法连接模型平台，请检查平台状态后重试',
  'discovery-unsupported': '此平台暂不支持读取模型列表，请按文档手动添加',
  'discovery-invalid-response': '平台返回的模型信息暂时无法读取，请重试或手动添加',

  'capabilitiesSaved': '沿用已保存参数；更改连接、模型 ID 或能力后需重新读取或手动核对',
  'outputHintSaved': '沿用已保存的单次输出上限；修改前请核对平台能力',

  'outputAdjusted': '输出上限已按平台能力调整为 {tokens} Token',
  'discoveryInvalidConnection': '请检查所选平台的 API 基础地址和密钥后重试',
  'discoveryMissingKey': '请填写所选平台的 API Key；已保存密钥只能用于原平台',

  'manualSelectionHint': '手动添加模型，并按平台文档填写模型 ID 和能力',

}
const en: Record<keyof typeof zh, string> = {
  title: productTitle, login: 'Sign in', loginAccount: 'Account', email: 'Email', password: 'Password', enterEmail: 'Enter your email', invalidEmail: 'Enter a valid email address', enterPassword: 'Enter your password', showPassword: 'Show password', hidePassword: 'Hide password', newPassword: 'Set password (15–128 characters)',
  accept: 'Set password and activate', savedPassword: 'Password saved. Please sign in.', account: 'My account', admin: 'Administration',
  users: 'Team members', models: 'Model services', back: 'Back to workspace', logout: 'Sign out', invite: 'Invite member',
  member: 'Member', administrator: 'Administrator', role: 'Account role', active: 'Active', pending: 'Invited', disabled: 'Disabled',
  reset: 'Create invitation / reset link', disable: 'Disable', enable: 'Enable', link: 'One-time link (shown once; copy and deliver privately)',
  copy: 'Copy link', copied: 'Copied', serviceId: 'Service ID (lowercase letters, digits, hyphens)', serviceName: 'Service name',
  provider: 'Provider', endpoint: 'API base URL', key: 'API key', enabled: 'Enable service',
  modelId: 'Model / endpoint ID', modelName: 'Display name', context: 'Total context capacity (tokens)', output: 'Maximum output per request (tokens)', vision: 'Image input capability',
  addModel: 'Add model', remove: 'Remove', save: 'Save service', create: 'New service', edit: 'Edit', saved: 'Saved',
  noModels: 'No model services configured. Once enabled, members can select models in the conversation composer.', loading: 'Loading',
  managed: 'Models are managed centrally. Choose an enabled model in the conversation. Ask an administrator for a one-time password reset link.',
  loginHint: 'Sign in with your administrator-provisioned team account', acceptHint: 'This link expires and works once. Setting the password revokes existing sign-ins.',
  confirmDisable: 'This revokes all sign-ins and stops the user runtime. Continue?',
  invalid: 'Check the email, password, or submitted fields and retry.', forbidden: 'Sign in with an account allowed to perform this operation.',
  conflict: 'The account exists, or this would disable the last administrator.', 'rate-limit': 'Too many attempts. Please try again later.',
  expired: 'This link has expired. Ask an administrator for a new link.', unavailable: 'Service unavailable. Retry later or contact your administrator.',
  'account-disabled-stop-failed': 'Account disabled, but its runtime could not be stopped. Ask the operator to check Docker.',
  'invalid-model-service': 'Check the endpoint, model IDs, and model limits.', 'missing-api-key': 'An API key is required for a new service.',
  'platformVolcengine': 'Volcengine Ark',
  'platformQwen': 'Qwen',
  'platformBailian': 'Alibaba Cloud Model Studio',
  'platformZhipu': 'Zhipu',
  'modelSetupHint': 'Connect a provider, read its catalog, then select models for your team.',
  'stepConnection': '1. Connect a model provider',
  'stepModels': '2. Select models for the team',
  'serviceAdvanced': 'Advanced settings',
  'modelAdvanced': 'Advanced parameters · Token limits and images',
  'serviceIdHint': 'Generated for internal identification; retained when editing.',
  'platformGuide': 'Provider documentation and model IDs',
  'helpVolcengine': 'Use the Ark API URL and the ep- endpoint ID from its console.',
  'helpAlibaba': 'Use DashScope or a console workspace URL ending in /compatible-mode/v1.',
  'helpDeepseek': 'Use the official DeepSeek API URL and exact model ID.',
  'helpZhipu': 'Use the Zhipu OpenAI-compatible API URL and official model ID.',
  'keyRequiredHint': 'Enter this provider’s API key. It is encrypted and stored only on the server.',
  'keySavedHint': 'The saved key is never displayed. Leave blank to keep it, or enter a replacement.',
  'enabledStatus': 'Enabled',
  'enabledHint': 'When enabled, members can select these models in the conversation composer.',
  'discover': 'Verify connection and read models',
  'discovering': 'Connecting and reading models…',
  'discoveryRead': 'Read {count} models. Select models for your team; this step makes no inference request.',
  'discoverHint': 'Verify the connection to read models, or add them manually using provider documentation.',
  'selectionHint': 'Select models to fill in provider-reported limits. Display names can be changed.',
  'searchModels': 'Search model name or ID',
  'noMatchingModels': 'No matching models. Try another search.',
  'listUnavailable': 'The provider has no readable model list. Add models manually using its documentation.',
  'manualReadingUnsupported': 'This provider cannot list models with an inference key here. Enter the ID and capabilities from its documentation; the key has not been verified.',
  'addManualModel': 'Add a model manually',
  'manualModel': 'Manual model',
  'modelIdHint': 'Enter the exact provider ID, for example {example}, rather than a display name.',
  'modelTooSmall': 'Below the workspace minimum of {minimum} tokens. Choose a larger model; do not overstate its capacity.',
  'catalogCapacity': 'Total context capacity: {tokens} tokens',
  'unknownCapacity': 'Capacity not reported. Review advanced parameters after selecting.',
  'capabilitiesUnknown': 'The provider did not report all capabilities. Enter and confirm them using its documentation.',
  'capabilitiesProvided': 'Provider capabilities are filled in. The output limit is this service’s per-request reply policy.',
  'contextHint': 'Total input and output capacity, not current text length. The workspace requires at least {minimum} tokens; enter the real provider capacity.',
  'outputHintKnown': 'Maximum output allowed per request, within the provider limit of {tokens} tokens.',
  'outputHintUnknown': 'Suggested reply limit: {tokens} tokens. The provider did not report its maximum; check its documentation.',
  'chooseVision': 'Select and confirm image support',
  'noImages': 'Text only; no image input',
  'acceptImages': 'Accepts image input',
  'visionHint': 'Enable only if the model accepts images. This does not add image support to a text-only model.',
  'confirmCapabilities': 'I checked unreported limits and image support against provider documentation.',
  'keepOneModel': 'Keep at least one model. Add a replacement first.',
  'modelLimit': 'A service can contain at most 100 models.',
  'cancel': 'Close editor',
  'editService': 'Edit model service',
  'choose-models': 'Select or manually add at least one model.',
  'duplicate-model': 'Duplicate model ID. Keep one model or change its ID.',
  'model-context-too-small': 'The model context is below the workspace minimum. Enter its real capacity or choose another model.',
  'discovery-unauthorized': 'The provider rejected the key. Check the API key, region and workspace, then retry.',
  'discovery-forbidden': 'Access denied. Check model permissions or the provider IP allowlist, then retry.',
  'discovery-rate-limit': 'The provider is rate limiting requests. Wait, then verify again.',
  'discovery-timeout': 'Connection timed out. Check the API URL and server network, then retry.',
  'discovery-unavailable': 'Cannot connect to the provider. Check its status and retry.',
  'discovery-unsupported': 'Model listing is unavailable for this provider. Add models manually using its documentation.',
  'discovery-invalid-response': 'Cannot read the model information returned by the provider. Retry or add models manually.',

  'capabilitiesSaved': 'Using the saved parameters. Re-read or confirm them after changing the connection, model ID or capabilities.',
  'outputHintSaved': 'Using the saved per-request output limit. Check provider capabilities before changing it.',

  'outputAdjusted': 'Output limit adjusted to {tokens} tokens to fit provider capabilities.',
  'discoveryInvalidConnection': 'Check the selected provider’s API base URL and key, then retry.',
  'discoveryMissingKey': 'Enter the selected provider’s API key. A saved key can be reused only with its original provider.',

  'manualSelectionHint': 'Add a model manually and enter its ID and capabilities from provider documentation.',

}

const stylesheet = `
:root{color-scheme:light dark;--bg:#fff;--fg:#171717;--muted:#737373;--line:#e5e5e5;--surface:#fafafa;--accent:#171717;--on-accent:#fafafa}
@media(prefers-color-scheme:dark){:root{--bg:#0a0a0a;--fg:#fafafa;--muted:#a3a3a3;--line:#262626;--surface:#171717;--accent:#fafafa;--on-accent:#171717}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 Geist,"Noto Sans SC",sans-serif}
main{max-width:1080px;margin:48px auto;padding:0 24px}header,nav,.actions{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header{justify-content:space-between;margin-bottom:32px}h1,h2,h3{font-weight:500}h1{font-size:22px;margin:0}h2{font-size:18px}h3{font-size:15px}
a{color:inherit;text-underline-offset:4px}button,input,select{font:inherit}button,a{touch-action:manipulation}button{cursor:pointer;border:1px solid var(--line);border-radius:8px;padding:8px 12px;background:var(--surface);color:var(--fg)}
button[type=submit]{background:var(--accent);color:var(--on-accent)}button:disabled{opacity:.5;cursor:wait}input,select{width:100%;min-width:0;border:1px solid var(--line);border-radius:8px;padding:9px 12px;background:var(--bg);color:var(--fg)}
input[type=checkbox]{width:auto;accent-color:var(--accent)}label{display:grid;gap:6px}form{display:grid;gap:16px}.auth{max-width:420px;margin:12vh auto;border:1px solid var(--line);border-radius:12px;padding:24px}
section,.card{margin:24px 0;border:1px solid var(--line);border-radius:12px;padding:20px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
p,.hint{color:var(--muted)}[role=alert]{color:#dc2626;min-height:21px}.user{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
.check{display:flex;align-items:center;gap:8px;align-self:center}.check input{width:16px;height:16px;margin:0}.span-all,.status,[role=alert],form>button[type=submit]{grid-column:1/-1}.brand-head{display:flex;align-items:center;gap:10px}.user span{overflow-wrap:anywhere}.link{display:grid;gap:12px;padding:16px;border:1px solid var(--line);border-radius:8px}.brand{color:#009cff;font-weight:500}.status{min-height:24px}
:focus-visible{outline:2px solid #737373;outline-offset:3px}@media(max-width:640px){main{margin:24px auto;padding:0 16px}.grid{grid-template-columns:1fr}.auth{margin:32px auto;padding:20px}}
:root{--error:#dc2626}@media(prefers-color-scheme:dark){:root{--error:#f87171}}
[role=alert],.capacity-error{color:var(--error)}.hint{font-size:13px;overflow-wrap:anywhere}.field-hint{display:block}.field-hint a{display:inline-block}h4{font-size:14px;font-weight:500;margin:0;overflow-wrap:anywhere}
.model-editor{gap:24px}.editor-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.editor-heading h3{margin:0}.setup-step{border:0;padding:0;margin:0;min-width:0;display:grid;gap:16px}.setup-step legend{font-weight:500;font-size:15px;padding:0;margin-bottom:16px}.setup-step p{margin:0}.model-editor .status:empty{min-height:0}.model-editor [role=alert]:empty{display:none}
.model-catalog{display:grid;gap:0;max-height:320px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:4px}.model-catalog:empty{display:none}.catalog-option{display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:6px;cursor:pointer}.catalog-option input{flex:none;width:16px;height:16px;margin:4px 0 0}.catalog-copy{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}.catalog-option:has(input:checked){background:var(--surface)}.catalog-option:has(input:disabled){cursor:default}.catalog-option:has(input:disabled)>.catalog-copy{opacity:.8}.model-code{font-family:"Geist Mono",monospace}
.model-rows{display:grid;gap:16px}.model-card{border:1px solid var(--line);border-radius:8px;padding:16px;display:grid;gap:16px}.advanced{border:1px solid var(--line);border-radius:8px;padding:12px;min-width:0}.advanced summary{cursor:pointer;font-weight:500;overflow-wrap:anywhere}.advanced[open] summary{margin-bottom:16px}.advanced .hint{margin:0 0 16px}.advanced .field-hint{margin:0}.advanced .grid{margin:16px 0}.capability-confirm{margin-top:16px}.capability-confirm input{flex:none}.capacity-error{font-size:13px;margin-top:12px;overflow-wrap:anywhere}.capacity-error:empty{display:none}.visibility{display:grid;gap:6px}.visibility .hint{margin:0}.model-editor input[readonly]{background:var(--surface)}.model-editor input[aria-invalid=true]{border-color:var(--error)}.model-editor button:disabled{cursor:default}.model-editor [hidden]{display:none}
@media(hover:hover){.catalog-option:has(input:not(:disabled)):hover{background:var(--surface)}}@media(max-width:640px){section{padding:16px}.model-editor{padding:16px}.model-editor .actions>button{width:100%}.model-editor .editor-heading{gap:12px}.model-editor .field-hint a{margin-top:4px}}

.hq-auth {
  --hq-bg: #f5f7fb;
  --hq-surface: #fcfdff;
  --hq-text: #152641;
  --hq-subtle: #455772;
  --hq-border: #8493aa;
  --hq-accent: #1555bb;
  --hq-accent-hover: #104698;
  --hq-button-text: #f8fbff;
  --hq-error: #a62524;
  color-scheme: light;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 48px 24px;
  margin: 0;
  background: var(--hq-bg);
  color: var(--hq-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: normal;
}
.hq-auth *, .hq-auth *::before, .hq-auth *::after { box-sizing: border-box; }
.hq-auth .hq-auth-layout { width: min(100%, 388px); display: grid; gap: 30px; }
.hq-auth .hq-auth-heading {
  display: flex; align-items: center; gap: 10px; margin: 0; color: var(--hq-text);
  font: inherit; font-size: 15px; line-height: 23px; font-weight: 600;
}
.hq-auth .hq-auth-heading img { flex: none; width: 26px; height: 22px; object-fit: contain; }
.hq-auth .hq-auth-card { width: 100%; min-width: 0; margin: 0; }
.hq-auth h1 { margin: 0 0 32px; color: var(--hq-text); font: inherit; font-size: 42px; line-height: 1.18; font-weight: 600; letter-spacing: -.035em; }
.hq-auth .hq-auth-description { margin: 0 0 28px; color: var(--hq-subtle); font: inherit; }
.hq-auth form { display: grid; gap: 20px; padding: 0; margin: 0; }
.hq-auth .hq-auth-field { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; min-width: 0; padding: 0; margin: 0; }
.hq-auth .hq-auth-field > * { margin: 0 !important; }
.hq-auth label { display: block; padding: 0; margin: 0; color: var(--hq-text); font: inherit; font-weight: 500; line-height: 20px; }
.hq-auth label::before { content: none !important; }
.hq-auth input:not([type=checkbox]) {
  display: block;
  width: 100%;
  min-width: 0;
  height: 48px;
  min-height: 48px;
  padding: 11px 12px;
  margin: 0;
  border: 1px solid var(--hq-border);
  border-radius: 8px;
  background: var(--hq-surface);
  color: var(--hq-text);
  caret-color: var(--hq-text);
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: normal;
  box-shadow: none !important;
  appearance: none;
}
.hq-auth input::placeholder { color: var(--hq-subtle) !important; opacity: 1 !important; font: inherit; font-weight: 400; letter-spacing: normal; }
.hq-auth input:focus { border-color: var(--hq-border); }
.hq-auth input:focus-visible, .hq-auth button:focus-visible { outline: 2px solid var(--hq-accent); outline-offset: 2px; }
.hq-auth input:disabled, .hq-auth button:disabled { opacity: .6; cursor: not-allowed; }
.hq-auth .hq-auth-password { position: relative; width: 100%; }
.hq-auth .hq-auth-password input { padding-right: 48px !important; }
.hq-auth .hq-auth-password > button {
  position: absolute; inset: 0 0 auto auto; width: 44px; min-width: 44px; height: 48px; min-height: 48px;
  display: inline-flex; align-items: center; justify-content: center; padding: 0; margin: 0;
  border: 0; border-radius: 8px; background: transparent; color: var(--hq-subtle);
  box-shadow: none !important; transform: none; cursor: pointer; appearance: none;
}
.hq-auth .hq-auth-password > button svg { display: block; width: 18px; height: 18px; stroke-width: 1.75; }
.hq-auth .hq-auth-submit {
  display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; min-height: 48px;
  padding: 11px 12px; margin: 4px 0 0; border: 1px solid var(--hq-accent); border-radius: 8px;
  background: var(--hq-accent); color: var(--hq-button-text); font: inherit; font-weight: 500; line-height: 20px;
  letter-spacing: normal; box-shadow: none !important; cursor: pointer; appearance: none;
}
.hq-auth .hq-auth-submit:hover:not(:disabled) { background: var(--hq-accent-hover); border-color: var(--hq-accent-hover); }
.hq-auth .hq-auth-submit:active:not(:disabled) { transform: translateY(1px); }
.hq-auth .hq-auth-submit > span { font: inherit; }
.hq-auth .hq-auth-error { margin: 0; color: var(--hq-error); font: inherit; overflow-wrap: anywhere; }

.hq-auth .hq-auth-field-error { padding: 0; margin: 0; color: var(--hq-error); font: inherit; font-size: 14px; line-height: 20px; font-weight: 400; }
.hq-auth input[aria-invalid="true"] { border-color: var(--hq-error); }

@media (max-width: 767px) {
  .hq-auth { padding: 56px 24px 40px; align-items: start; }
  .hq-auth .hq-auth-layout { gap: 26px; }
  .hq-auth h1 { font-size: 34px; margin-bottom: 24px; }
}

@media (prefers-color-scheme: dark) {
  .hq-auth {
    color-scheme: dark;
    --hq-bg: #111b2b;
    --hq-surface: #182538;
    --hq-text: #edf3ff;
    --hq-subtle: #b0c1dc;
    --hq-border: #7589a7;
    --hq-accent: #8db9ff;
    --hq-accent-hover: #a9cbff;
    --hq-button-text: #11233b;
    --hq-error: #ffaaa8;
  }
}
main.hq-auth{width:100%;max-width:none}
.hq-auth section.hq-auth-card{border:0;padding:0}
.hq-auth [role=alert]:empty{display:none}
.hq-auth .hq-auth-heading{flex-wrap:nowrap;justify-content:flex-start}

`

// This browser program uses DOM text nodes for every server-owned value.
const browserProgram = String.raw`
const root=document.querySelector('main'), t=JSON.parse(document.querySelector('#copy').textContent), modelDefaults=JSON.parse(document.querySelector('#model-defaults').textContent);
let csrf='', linkToken=location.hash.slice(1), me;
if(linkToken) history.replaceState(null,'',location.pathname);
function el(tag,text,attrs={}){const n=document.createElement(tag);if(text!==null)n.textContent=text;for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n}
function append(parent,...children){parent.append(...children);return parent}
function field(form,label,type='text',value=''){const input=el('input',null,{type,'aria-label':label});input.value=value;const box=el('label',null,type==='checkbox'?{class:'check'}:{});if(type==='checkbox')append(box,input,el('span',label));else append(box,el('span',label),input);form.append(box);return input}
function button(label,fn,type='button'){const b=el('button',label,{type});if(fn)b.addEventListener('click',fn);return b}
function note(){const n=el('div','',{role:'alert'});root.append(n);return n}
function message(error){return t[error.code]||t.unavailable}
async function api(path,body,signal){const response=await fetch('/team/api/'+path,{signal,method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-hqzy-request':'1','x-hqzy-csrf':csrf},...(body===undefined?{}:{body:JSON.stringify(body)})});let result;try{result=await response.json()}catch{throw {code:'unavailable'}}if(!response.ok)throw {code:result.error||'unavailable'};return result}
function submit(form,label,operation){const error=el('div','',{role:'alert'}), b=button(label,null,'submit');append(form,error,b);form.addEventListener('submit',async e=>{e.preventDefault();b.disabled=true;error.textContent='';try{await operation()}catch(e){error.textContent=message(e)}finally{b.disabled=false}})}
function showLink(value){document.querySelector('.link')?.remove();const box=el('div',null,{class:'link',role:'status'}), input=el('input',null,{readonly:'', 'aria-label':t.link});input.value=value;const copy=button(t.copy,async()=>{try{await navigator.clipboard.writeText(value);copy.textContent=t.copied}catch{input.focus();input.select()}});append(box,el('span',t.link),input,copy);root.prepend(box)}
function loginPage(){
  root.className='hq-auth';
  const layout=el('div',null,{class:'hq-auth-layout'}), card=el('section',null,{class:'hq-auth-card','aria-labelledby':'login-title'}), form=el('form',null,{novalidate:''});
  const heading=append(el('header',null,{class:'hq-auth-heading'}),el('img',null,{src:'/team/logo.svg',alt:'',width:'26',height:'22'}),el('span',t.title));
  function loginField(id,label,type,placeholder,autocomplete){
    const errorId=id+'-error';
    const input=el('input',null,{id,type,placeholder,autocomplete,required:'','aria-describedby':errorId});
    const error=el('p','',{id:errorId,class:'hq-auth-field-error','aria-live':'polite'});
    form.append(append(el('div',null,{class:'hq-auth-field'}),el('label',label,{for:id}),input,error));
    const indicate=text=>{error.textContent=text;error.hidden=!text;input.setAttribute('aria-invalid',String(Boolean(text)))};
    indicate('');input.addEventListener('input',()=>indicate(''));
    return {input,indicate};
  }
  const {input:email,indicate:emailError}=loginField('team-login-email',t.loginAccount,'email',t.enterEmail,'username');
  const {input:password,indicate:passwordError}=loginField('team-login-password',t.password,'password',t.enterPassword,'current-password');
  password.maxLength=256;
  const toggle=button('',()=>{
    const visible=password.type==='password';password.type=visible?'text':'password';
    toggle.setAttribute('aria-label',visible?t.hidePassword:t.showPassword);
    toggle.setAttribute('aria-pressed',String(visible));slash.style.display=visible?'':'none';
  });
  toggle.setAttribute('aria-label',t.showPassword);toggle.setAttribute('aria-pressed','false');
  const eye=document.createElementNS('http://www.w3.org/2000/svg','svg');
  eye.setAttribute('viewBox','0 0 24 24');eye.setAttribute('fill','none');eye.setAttribute('stroke','currentColor');eye.setAttribute('aria-hidden','true');
  const line=(d)=>{const shape=document.createElementNS(eye.namespaceURI,'path');shape.setAttribute('d',d);eye.append(shape);return shape};
  line('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z');line('M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0');
  const slash=line('M3 3l18 18');slash.style.display='none';
  toggle.append(eye);
  const wrap=el('div',null,{class:'hq-auth-password'});
  password.replaceWith(wrap);wrap.append(password,toggle);
  const error=el('p','',{role:'alert',class:'hq-auth-error'}), login=button(t.login,null,'submit');
  login.className='hq-auth-submit';
  form.append(error,login);
  form.addEventListener('submit',async event=>{
    event.preventDefault();error.textContent='';
    const emailMessage=!email.value.trim()?t.enterEmail:email.validity.typeMismatch?t.invalidEmail:'';
    const passwordMessage=!password.value?t.enterPassword:'';
    emailError(emailMessage);passwordError(passwordMessage);
    if(emailMessage||passwordMessage){(emailMessage?email:password).focus();return}
    if(login.disabled)return;
    login.disabled=true;
    try{await api('login',{email:email.value,password:password.value});location.assign('/')}
    catch(e){error.textContent=message(e)}
    finally{login.disabled=false}
  });
  append(card,el('h1',t.login,{id:'login-title'}),form);
  if(new URL(location.href).searchParams.has('activated'))card.append(el('p',t.savedPassword,{role:'status'}));
  root.append(append(layout,heading,card));
}
function acceptPage(){const box=el('div',null,{class:'auth'}),form=el('form',null);append(box,el('img',null,{src:'/team/logo.svg',alt:'HQZY',width:'40',height:'32'}),el('h1',t.accept),el('p',t.acceptHint));const password=field(form,t.newPassword,'password');password.required=true;password.autocomplete='new-password';password.maxLength=256;password.minLength=15;submit(form,t.accept,async()=>{await api('accept',{token:linkToken,password:password.value});linkToken='';location.assign('/team/login?activated=1')});box.append(form);root.append(box)}
function header(){const head=el('header',null), nav=el('nav',null);append(nav,el('a',t.back,{href:'/'}),el('a',t.account,{href:'/team/account'}));if(me.user.role==='admin')nav.append(el('a',t.admin,{href:'/team/admin'}));nav.append(button(t.logout,async()=>{try{await api('logout',{});location.assign('/team/login')}catch(e){note().textContent=message(e)}}));append(head,append(el('div',null,{class:'brand-head'}),el('img',null,{src:'/team/logo.svg',alt:'HQZY',width:'36',height:'28'}),el('h1',t.title)),nav);root.append(head)}
async function usersPage(){const section=el('section',null);section.append(el('h2',t.users));const form=el('form',null,{class:'grid'}), email=field(form,t.email,'email'), role=el('select',null);email.required=true;append(role,el('option',t.member,{value:'member'}),el('option',t.administrator,{value:'admin'}));append(form,append(el('label',null),el('span',t.role),role));submit(form,t.invite,async()=>{const result=await api('invite',{email:email.value,role:role.value});email.value='';showLink(result.url);await refresh()});section.append(form);const list=el('div',null),notice=el('div','',{role:'alert'});section.append(list,notice);root.append(section);async function refresh(){const {users}=await api('users');list.replaceChildren();for(const user of users){const row=el('div',null,{class:'user'}), actions=el('div',null,{class:'actions'}), status=el('div','',{role:'alert'});const act=async(b,operation)=>{b.disabled=true;try{await operation();await refresh()}catch(e){await refresh();notice.textContent=message(e)}finally{b.disabled=false}};const reset=button(t.reset,()=>act(reset,async()=>{showLink((await api('reset',{id:user.id})).url)}));const toggle=button(user.disabled?t.enable:t.disable,()=>{if(!user.disabled&&!confirm(t.confirmDisable))return;return act(toggle,()=>api('disable',{id:user.id,disabled:!user.disabled}))});append(actions,reset,toggle);append(row,el('span',user.email+' · '+(user.role==='admin'?t.administrator:t.member)+' · '+(user.disabled?t.disabled:user.active?t.active:t.pending)),actions,status);list.append(row)}}await refresh()}
const bases={volcengine:'https://ark.cn-beijing.volces.com/api/v3',qwen:'https://dashscope.aliyuncs.com/compatible-mode/v1',bailian:'https://dashscope.aliyuncs.com/compatible-mode/v1',deepseek:'https://api.deepseek.com/v1',zhipu:'https://open.bigmodel.cn/api/paas/v4'};
const platforms={
  volcengine:{name:t.platformVolcengine,example:'ep-xxxxxxxx',help:t.helpVolcengine,docs:'https://ark.volcengine.com/region:cn-beijing/docs/model-list'},
  qwen:{name:t.platformQwen,example:'qwen-plus',help:t.helpAlibaba,docs:'https://help.aliyun.com/zh/model-studio/get-api-key'},
  bailian:{name:t.platformBailian,example:'qwen-plus',help:t.helpAlibaba,docs:'https://help.aliyun.com/zh/model-studio/get-api-key'},
  deepseek:{name:'DeepSeek',example:'deepseek-chat',help:t.helpDeepseek,docs:'https://api-docs.deepseek.com/'},
  zhipu:{name:t.platformZhipu,example:'glm-4.7',help:t.helpZhipu,docs:'https://docs.bigmodel.cn/cn/guide/start/model-overview'}
};
let fieldCounter=0;
function describe(input,parent,text){const hint=el('span',text,{class:'hint field-hint',id:'field-hint-'+(++fieldCounter)});input.setAttribute('aria-describedby',hint.id);parent.append(hint);return hint}
function randomServiceId(provider){return provider+'-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('')}
async function modelsPage(){
  const section=el('section',null),list=el('div',null),editor=el('div',null);
  let disposeEditor=()=>{};
  append(section,el('h2',t.models),el('p',t.modelSetupHint),button(t.create,()=>edit()),list,editor);
  root.append(section);
  async function refresh(){
    const {services}=await api('services');list.replaceChildren();
    if(!services.length)list.append(el('p',t.noModels));
    for(const service of services){
      const row=el('div',null,{class:'user'});
      append(row,el('span',service.name+' · '+service.models.map(x=>x.name).join(', ')+' · '+(service.enabled?t.enabledStatus:t.disabled)),button(t.edit,()=>edit(service)));
      list.append(row);
    }
  }
  function edit(initial){
    disposeEditor();editor.replaceChildren();
    let savedService=initial,revision=0,discovery,saveBusy=false,platformChanged=false,models=[],catalog=[],defaultOutput=modelDefaults.defaultMaxTokens;
    const form=el('form',null,{class:'card model-editor'}),heading=el('div',null,{class:'editor-heading'});
    const close=button(t.cancel,()=>{disposeEditor();editor.replaceChildren()});
    append(heading,el('h3',initial?t.editService:t.create),close);form.append(heading);
    const connection=el('fieldset',null,{class:'setup-step'}),connectionGrid=el('div',null,{class:'grid'});
    append(connection,el('legend',t.stepConnection),connectionGrid);form.append(connection);
    const provider=el('select',null,{'aria-label':t.provider}),providerLabel=el('label',null);
    for(const [value,platform] of Object.entries(platforms))provider.append(el('option',platform.name,{value}));
    provider.value=initial?.provider||'bailian';append(providerLabel,el('span',t.provider),provider);connectionGrid.append(providerLabel);
    const name=field(connectionGrid,t.serviceName,'text',initial?.name||platforms[provider.value].name);name.required=true;name.maxLength=100;
    const endpoint=field(connectionGrid,t.endpoint,'url',initial?.baseURL||bases[provider.value]);endpoint.required=true;endpoint.parentElement.classList.add('span-all');
    const endpointHint=describe(endpoint,endpoint.parentElement,'');
    const guide=el('a',t.platformGuide,{target:'_blank',rel:'noopener noreferrer'});
    endpointHint.append(guide);
    const key=field(connectionGrid,t.key,'password');key.autocomplete='new-password';key.maxLength=4096;key.parentElement.classList.add('span-all');
    const keyHint=describe(key,key.parentElement,'');
    const discoveryActions=el('div',null,{class:'actions span-all'}),discoverButton=button(t.discover,discover);
    const discoveryStatus=el('div','',{class:'status',role:'status'}),discoveryError=el('div','',{role:'alert'});
    append(discoveryActions,discoverButton);append(connectionGrid,discoveryActions,discoveryStatus,discoveryError);
    const selection=el('fieldset',null,{class:'setup-step'});append(selection,el('legend',t.stepModels),el('p',t.selectionHint));form.append(selection);
    const search=el('input',null,{type:'search','aria-label':t.searchModels,placeholder:t.searchModels});search.hidden=true;
    const catalogList=el('div',null,{class:'model-catalog'}),catalogEmpty=el('p',t.discoverHint,{class:'hint'}),rows=el('div',null,{class:'model-rows'});
    const manual=button(t.addManualModel,()=>{const record=add();record.mid.focus()});
    append(selection,search,catalogList,catalogEmpty,rows,manual);
    const advanced=el('details',null,{class:'advanced'});advanced.append(el('summary',t.serviceAdvanced));
    const internalId=field(advanced,t.serviceId,'text',initial?.id||randomServiceId(provider.value));internalId.readOnly=true;
    describe(internalId,internalId.parentElement,t.serviceIdHint);form.append(advanced);
    const visibility=el('div',null,{class:'visibility'}),enabled=field(visibility,t.enabled,'checkbox');enabled.checked=initial?.enabled??true;
    describe(enabled,visibility,t.enabledHint);form.append(visibility);
    const status=el('div','',{class:'status',role:'status'});
    function stopDiscovery(){revision++;discovery?.abort();discovery=undefined;discoverButton.disabled=saveBusy;discoverButton.textContent=t.discover;connection.removeAttribute('aria-busy')}
    disposeEditor=()=>{stopDiscovery()};
    function invalidateDiscovery(){stopDiscovery();catalog=[];catalogList.replaceChildren();search.hidden=true;search.value='';catalogEmpty.textContent=t.discoverHint;catalogEmpty.hidden=false;discoveryStatus.textContent='';discoveryError.textContent='';status.textContent='';updatePlatformCopy()}
    function updatePlatformCopy(){
      const platform=platforms[provider.value];endpointHint.replaceChildren(el('span',platform.help+' '),guide);guide.href=platform.docs;
      key.required=!savedService||platformChanged;
      keyHint.textContent=key.required?t.keyRequiredHint:t.keySavedHint;
      const canRead=['qwen','bailian','deepseek'].includes(provider.value);discoverButton.hidden=!canRead;
      if(!canRead){discoveryStatus.textContent=t.manualReadingUnsupported;catalogEmpty.textContent=t.manualSelectionHint}
    }
    provider.addEventListener('change',()=>{
      const previousName=provider.dataset.previousName||platforms[initial?.provider||'bailian'].name;
      if(!name.value.trim()||name.value===previousName)name.value=platforms[provider.value].name;
      provider.dataset.previousName=platforms[provider.value].name;
      endpoint.value=bases[provider.value];key.value='';platformChanged=true;if(!savedService)internalId.value=randomServiceId(provider.value);
      for(const record of models)record.box.remove();models=[];
      invalidateDiscovery();updatePlatformCopy();syncSelection();
    });
    endpoint.addEventListener('input',()=>{invalidateDiscovery();for(const record of models)record.invalidateCapabilities()});
    key.addEventListener('input',invalidateDiscovery);
    search.addEventListener('input',renderCatalog);
    function syncSelection(){
      const ids=new Set(models.map(record=>record.mid.value.trim()));
      for(const checkbox of catalogList.querySelectorAll('input[type=checkbox]'))checkbox.checked=ids.has(checkbox.value);
      for(const record of models)record.remove.disabled=models.length===1||saveBusy;
      manual.disabled=models.length>=100||saveBusy;
    }
    function renderCatalog(){
      catalogList.replaceChildren();const query=search.value.trim().toLowerCase();let shown=0;
      for(const model of catalog){
        if(query&&!(model.id+' '+model.name).toLowerCase().includes(query))continue;
        shown++;
        const lowCapacity=Number.isSafeInteger(model.contextWindow)&&model.contextWindow<modelDefaults.minimumContextWindow;
        const row=el('label',null,{class:'catalog-option'}),checkbox=el('input',null,{type:'checkbox',value:model.id}),copy=el('span',null,{class:'catalog-copy'});
        checkbox.disabled=lowCapacity||saveBusy;
        append(copy,el('span',model.name||model.id),el('span',model.id,{class:'hint model-code'}));
        const hint=el('span',lowCapacity?t.modelTooSmall.replace('{minimum}',String(modelDefaults.minimumContextWindow)):model.contextWindow?t.catalogCapacity.replace('{tokens}',String(model.contextWindow)):t.unknownCapacity,{class:lowCapacity?'capacity-error':'hint',id:'catalog-hint-'+(++fieldCounter)});
        checkbox.setAttribute('aria-describedby',hint.id);append(copy,hint);append(row,checkbox,copy);
        checkbox.addEventListener('change',()=>{
          if(checkbox.checked){
            if(models.length>=100){checkbox.checked=false;discoveryError.textContent=t.modelLimit;return}
            add({id:model.id,name:model.name||model.id,contextWindow:model.contextWindow,maxTokens:Math.min(defaultOutput,model.maxOutputTokens??Infinity,model.contextWindow??Infinity),vision:model.vision},model);
          }else{
            const record=models.find(record=>record.mid.value.trim()===model.id);
            if(record&&models.length>1){record.box.remove();models=models.filter(value=>value!==record)}
            else if(record){checkbox.checked=true;discoveryError.textContent=t.keepOneModel}
          }
          syncSelection();
        });
        catalogList.append(row);
      }
      catalogEmpty.hidden=shown>0;catalogEmpty.textContent=catalog.length?t.noMatchingModels:t.listUnavailable;
      syncSelection();
    }
    function add(model,metadata,savedParameters=false){
      const box=el('div',null,{class:'model-card'}),rowHead=el('div',null,{class:'editor-heading'}),title=el('h4',model?.name||model?.id||t.manualModel),remove=button(t.remove,()=>{if(models.length<=1)return;box.remove();models=models.filter(value=>value!==record);syncSelection()});
      append(rowHead,title,remove);box.append(rowHead);
      const primary=el('div',null,{class:'grid'}),mid=field(primary,t.modelId,'text',model?.id||''),mname=field(primary,t.modelName,'text',model?.name||model?.id||'');
      mid.required=true;mid.maxLength=200;mname.required=true;mname.maxLength=100;
      mid.placeholder=platforms[provider.value].example;describe(mid,mid.parentElement,t.modelIdHint.replace('{example}',platforms[provider.value].example));
      box.append(primary);
      const parameters=el('details',null,{class:'advanced model-parameters'}),parameterGrid=el('div',null,{class:'grid'}),capacityNote=el('p','',{class:'hint'});
      append(parameters,el('summary',t.modelAdvanced),capacityNote,parameterGrid);box.append(parameters);
      const context=field(parameterGrid,t.context,'number',model?.contextWindow===undefined?'':String(model.contextWindow)),output=field(parameterGrid,t.output,'number',String(model?.maxTokens??defaultOutput));
      context.required=true;context.step='1';context.min=String(modelDefaults.minimumContextWindow);output.required=true;output.min='1';output.step='1';
      describe(context,context.parentElement,t.contextHint.replace('{minimum}',String(modelDefaults.minimumContextWindow)));
      const outputHint=describe(output,output.parentElement,'');
      const vision=el('select',null),visionLabel=el('label',null,{class:'span-all'});append(vision,el('option',t.chooseVision,{value:''}),el('option',t.noImages,{value:'false'}),el('option',t.acceptImages,{value:'true'}));
      vision.required=true;vision.setAttribute('aria-label',t.vision);vision.value=typeof model?.vision==='boolean'?String(model.vision):'';append(visionLabel,el('span',t.vision),vision);describe(vision,visionLabel,t.visionHint);parameterGrid.append(visionLabel);
      const confirmLabel=el('label',null,{class:'check capability-confirm'}),confirmed=el('input',null,{type:'checkbox'});append(confirmLabel,confirmed,el('span',t.confirmCapabilities));parameters.append(confirmLabel);
      const adjustment=el('div','',{class:'hint',role:'status'}),capacityError=el('div','',{class:'capacity-error',role:'status'});parameters.append(adjustment,capacityError);
      let capability=metadata;confirmed.checked=savedParameters;
      const record={box,mid,mname,context,output,vision,remove,applyMetadata(info){
        savedParameters=false;confirmed.checked=false;capability=info;if(info.contextWindow!==undefined)context.value=String(info.contextWindow);
        const limit=Math.min(info.maxOutputTokens??Infinity,info.contextWindow??Infinity);
        if(Number(output.value)>limit){output.value=String(limit);adjustment.textContent=t.outputAdjusted.replace('{tokens}',String(limit))}
        if(info.vision===false||vision.value==='')vision.value=info.vision===undefined?'':String(info.vision);
        capacityState();
      },invalidateCapabilities(){capability=undefined;savedParameters=false;confirmed.checked=false;adjustment.textContent='';capacityState()},markSaved(){savedParameters=true;confirmed.checked=true;capacityState()}};models.push(record);rows.append(box);
      function capacityState(){
        const knownContext=Number.isSafeInteger(capability?.contextWindow),knownOutput=Number.isSafeInteger(capability?.maxOutputTokens),knownVision=typeof capability?.vision==='boolean';
        const needsConfirmation=!savedParameters&&(!capability||!knownContext||!knownOutput||!knownVision);
        context.readOnly=knownContext;vision.querySelector('option[value=true]').disabled=knownVision&&!capability.vision;
        confirmLabel.hidden=!needsConfirmation;confirmed.required=needsConfirmation;
        capacityNote.textContent=savedParameters&&!capability?t.capabilitiesSaved:needsConfirmation?t.capabilitiesUnknown:t.capabilitiesProvided;
        outputHint.textContent=savedParameters&&!knownOutput?t.outputHintSaved:knownOutput?t.outputHintKnown.replace('{tokens}',String(capability.maxOutputTokens)):t.outputHintUnknown.replace('{tokens}',String(defaultOutput));
        const numericContext=Number(context.value),limits=[numericContext,knownOutput?capability.maxOutputTokens:Infinity].filter(value=>value>0);
        if(limits.length)output.max=String(Math.min(...limits));else output.removeAttribute('max');
        const tooSmall=context.value!==''&&numericContext<modelDefaults.minimumContextWindow;
        context.setCustomValidity(tooSmall?t.modelTooSmall.replace('{minimum}',String(modelDefaults.minimumContextWindow)):'');
        capacityError.textContent=tooSmall?t.modelTooSmall.replace('{minimum}',String(modelDefaults.minimumContextWindow)):'';
        if(tooSmall||needsConfirmation)parameters.open=true;
      }
      mid.addEventListener('input',()=>{record.invalidateCapabilities();context.readOnly=false;capacityState();if(!mname.value.trim())mname.value=mid.value;title.textContent=mname.value||mid.value||t.manualModel;syncSelection()});
      mname.addEventListener('input',()=>{title.textContent=mname.value||mid.value||t.manualModel});
      context.addEventListener('input',()=>{savedParameters=false;confirmed.checked=false;capacityState()});
      output.addEventListener('input',()=>{savedParameters=false;confirmed.checked=false;adjustment.textContent='';capacityState()});vision.addEventListener('change',()=>{savedParameters=false;confirmed.checked=false;capacityState()});
      capacityState();syncSelection();return record;
    }
    async function discover(){
      if(!endpoint.reportValidity()||!key.reportValidity())return;
      stopDiscovery();const requestRevision=revision,controller=new AbortController();discovery=controller;discoverButton.disabled=true;discoverButton.textContent=t.discovering;connection.setAttribute('aria-busy','true');discoveryError.textContent='';discoveryStatus.textContent='';
      try{
        const result=await api('model-discovery',{...(savedService?{id:savedService.id}:{}),provider:provider.value,baseURL:endpoint.value,...(key.value?{apiKey:key.value}:{})},controller.signal);
        if(controller.signal.aborted||requestRevision!==revision||!form.isConnected)return;
        if(!Array.isArray(result.models))throw {code:'discovery-invalid-response'};
        catalog=result.models;defaultOutput=result.defaultMaxTokens;
        for(const record of models){const info=catalog.find(model=>model.id===record.mid.value.trim());if(info)record.applyMetadata(info)}
        search.hidden=catalog.length===0;renderCatalog();
        discoveryStatus.textContent=result.listUnavailable?t.listUnavailable:t.discoveryRead.replace('{count}',String(catalog.length));
      }catch(error){
        if(controller.signal.aborted||requestRevision!==revision||!form.isConnected)return;
        discoveryError.textContent=error.code==='invalid-model-service'?t.discoveryInvalidConnection:error.code==='missing-api-key'?t.discoveryMissingKey:message(error);
      }finally{
        if(requestRevision===revision&&form.isConnected){discovery=undefined;discoverButton.disabled=false;discoverButton.textContent=t.discover;connection.removeAttribute('aria-busy')}
      }
    }
    for(const model of initial?.models||[])add(model,undefined,true);
    form.addEventListener('invalid',event=>{event.target.closest('details')?.setAttribute('open','')},true);
    submit(form,t.save,async()=>{
      status.textContent='';if(!models.length)throw {code:'choose-models'};
      if(models.some(record=>Number(record.context.value)<modelDefaults.minimumContextWindow))throw {code:'model-context-too-small'};
      if(new Set(models.map(record=>record.mid.value.trim())).size!==models.length)throw {code:'duplicate-model'};
      const body={id:internalId.value,provider:provider.value,name:name.value,baseURL:endpoint.value,enabled:enabled.checked,...(key.value?{apiKey:key.value}:{}),models:models.map(record=>({id:record.mid.value.trim(),name:record.mname.value,contextWindow:Number(record.context.value),maxTokens:Number(record.output.value),vision:record.vision.value==='true'}))};
      stopDiscovery();saveBusy=true;
      const controls=Array.from(form.querySelectorAll('input,button,select')).map(input=>({input,disabled:input.disabled}));for(const {input} of controls)input.disabled=true;
      try{
        await api('services',body);
        if(!form.isConnected)return;
        savedService={id:body.id,provider:body.provider};platformChanged=false;for(const record of models)record.markSaved();key.value='';updatePlatformCopy();status.textContent=t.saved;await refresh();
      }finally{saveBusy=false;for(const {input,disabled} of controls)input.disabled=disabled;syncSelection()}
    });
    form.append(status);editor.append(form);updatePlatformCopy();syncSelection();
  }
  await refresh();
}
async function main(){if(location.pathname==='/team/login'){loginPage();return}if(location.pathname==='/team/accept'){acceptPage();return}try{me=await api('me');csrf=me.csrf}catch{location.assign('/team/login');return}header();if(location.pathname==='/team/admin'&&me.user.role==='admin'){await usersPage();await modelsPage()}else{root.append(el('h2',me.user.email),el('p',t.managed))}}
main().catch(error=>{note().textContent=message(error)});
`

/** Operator-selected reply defaults and minimum model capacity shown by the portal. */
export interface PortalModelDefaults {
  /** Suggested per-request output ceiling; this is not a provider capability. */
  defaultMaxTokens: number
  /** Minimum actual model context capacity supported by this workspace. */
  minimumContextWindow: number
}

/** Produce a private page with nonce-scoped scripts/styles and no external dependencies.
 * @param language - requested browser language.
 * @param modelDefaults - deployment-owned reply ceiling and minimum actual context capacity.
 * @returns body and matching content security policy.
 */
export function portalPage(language: string, modelDefaults: PortalModelDefaults): { html: string; csp: string } {
  const chinese = language.toLowerCase().startsWith('zh')
  const copy = chinese ? zh : en
  const nonce = randomBytes(18).toString('base64')
  return {
    html: `<!doctype html><html lang="${chinese ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.title}</title><link rel="icon" href="/team/logo.svg"><link rel="stylesheet" href="/team/brand-font.css"><style nonce="${nonce}">${stylesheet}</style></head><body><main aria-live="polite"></main><script id="model-defaults" type="application/json" nonce="${nonce}">${JSON.stringify(modelDefaults).replace(/</g, '\\u003c')}</script><script id="copy" type="application/json" nonce="${nonce}">${JSON.stringify(copy).replace(/</g, '\\u003c')}</script><script nonce="${nonce}">${browserProgram}</script></body></html>`,
    csp: `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; font-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
  }
}
