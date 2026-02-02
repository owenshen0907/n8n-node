# Stepfun.ai TTS for n8n

n8n 社区节点，集成 Stepfun.ai 文本转语音（TTS）能力。

## 快速开始

### 1. 安装

将编译产物复制到 n8n 自定义节点目录：

```bash
# 克隆并编译
git clone https://github.com/owenshen0907/n8n-node.git
cd n8n-node
npm install
npm run build

# 复制到 n8n 自定义目录
mkdir -p ~/.n8n/custom
cp package.json ~/.n8n/custom/
cp -r dist ~/.n8n/custom/

# 重启 n8n
# Docker: docker restart n8n
# 本地: 重新运行 n8n
```

### 2. 配置凭证

1. 进入 n8n → **Settings** → **Credentials** → **Add Credential**
2. 搜索 `Stepfun AI API Key`
3. 填写：
   - **API Key**: 你的 Stepfun API Key（获取地址：https://platform.stepfun.ai/interface-key）
   - **Base URL**: `https://api.stepfun.ai/v1`（默认值，一般无需修改）
4. 点击 **Save**，凭证会自动验证连通性

### 3. 使用节点

1. 在工作流编辑器中，点击 **+** 添加节点
2. 搜索 `Stepfun` 或 `TTS`
3. 选择 **Stepfun.ai** 节点（默认名称：Convert Text Into Speech）

## 节点参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Text | 字符串 | 是 | 要转换的文本，最大 1000 字符 |
| Voice | 下拉选择 | 是 | 音色（从 API 动态加载可用音色列表） |
| Model | 下拉选择 | 是 | TTS 模型，当前支持 `step-tts-2` |
| Output Format | 下拉选择 | 否 | 音频格式：MP3（默认）、AAC、FLAC、WAV、PCM、Opus |

## 输出

节点输出包含两部分：

**JSON 数据**：
```json
{
  "text": "输入的文本",
  "voice": "所选音色",
  "model": "step-tts-2",
  "outputFormat": "mp3"
}
```

**Binary 数据**：
- 属性名：`audio`
- 包含生成的音频文件（如 `stepfun-tts.mp3`）
- 可直接连接下游节点使用（如发送邮件、保存文件等）

## 测试流程

### 基本功能测试

1. **创建凭证** → 验证保存时是否提示连接成功
2. **新建工作流** → 添加 Manual Trigger + Stepfun.ai 节点
3. **配置节点**：
   - Text: `Hello, this is a test of Stepfun TTS.`
   - Voice: 从下拉列表中选择一个音色
   - Model: `step-tts-2`
   - Output Format: `MP3`
4. **执行工作流** → 检查输出：
   - JSON 中有 text、voice、model、outputFormat 字段
   - Binary 中有 audio 属性，可点击播放/下载

### 测试项清单

- [ ] 凭证创建并验证通过
- [ ] Voice 下拉列表能正常加载音色
- [ ] 输入中文文本，生成音频正常
- [ ] 输入英文文本，生成音频正常
- [ ] 切换不同 Output Format（MP3/WAV/FLAC/Opus/PCM），均能正常输出
- [ ] 文本为空时，报错提示合理
- [ ] API Key 错误时，报错提示合理
- [ ] 批量输入（多条 item）时，每条均正常生成音频

### 导入模板测试

也可以直接导入预置模板来测试：

1. 在 n8n 中点击 **Import from File**
2. 选择 `templates/stepfun-tts-basic.json`
3. 替换凭证中的 `REPLACE_ME` 为你的凭证 ID
4. 执行工作流

## 开发

```bash
npm install        # 安装依赖
npm run build      # 编译 TypeScript + 复制资源
npm run build:watch # 监听模式（仅 TypeScript 编译）
```

## 相关链接

- Stepfun 开放平台：https://platform.stepfun.ai/
- API Key 管理：https://platform.stepfun.ai/interface-key
- n8n 官网：https://n8n.io/
