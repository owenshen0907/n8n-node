import FormData from 'form-data';
import type {
  IDataObject,
  IHttpRequestOptions,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type StepFunApiCredentials = {
  baseUrl: string;
};

export class StepFunAsr implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'StepFun ASR',
    name: 'stepFunAsr',
    group: ['transform'],
    version: 1,
    description: 'Speech-to-text via StepFun',
    subtitle: '={{$parameter["model"]}}',
    documentationUrl: 'https://platform.stepfun.com/',
    icon: 'file:stepfun.svg',
    codex: {
      categories: ['AI', 'Audio'],
      subcategories: {
        AI: ['Speech Recognition'],
        Audio: ['Transcription'],
      },
      resources: {
        primaryDocumentation: [
          {
            url: 'https://platform.stepfun.com/',
          },
        ],
      },
      alias: ['asr', 'speech to text', 'speech-to-text', 'transcribe', 'transcription', 'stt'],
    },
    defaults: {
      name: 'StepFun ASR',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'stepFunApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Audio Source',
        name: 'audioSource',
        type: 'options',
        options: [
          { name: 'Binary', value: 'binary' },
          { name: 'URL', value: 'url' },
        ],
        default: 'binary',
      },
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
          show: {
            audioSource: ['binary'],
          },
        },
      },
      {
        displayName: 'Audio URL',
        name: 'audioUrl',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            audioSource: ['url'],
          },
        },
      },
      {
        displayName: 'Endpoint Path',
        name: 'endpointPath',
        type: 'string',
        default: '/audio/transcriptions',
        required: true,
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'string',
        default: 'step-asr-mini',
        required: true,
      },
      {
        displayName: 'Language',
        name: 'language',
        type: 'string',
        default: '',
        placeholder: 'zh',
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        default: '',
      },
      {
        displayName: 'Response Format',
        name: 'responseFormat',
        type: 'options',
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'Text', value: 'text' },
          { name: 'Verbose JSON', value: 'verbose_json' },
          { name: 'SRT', value: 'srt' },
          { name: 'VTT', value: 'vtt' },
        ],
        default: 'json',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = (await this.getCredentials('stepFunApi')) as unknown as StepFunApiCredentials;
    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const audioSource = this.getNodeParameter('audioSource', itemIndex) as 'binary' | 'url';
        const endpointPath = this.getNodeParameter('endpointPath', itemIndex) as string;
        const model = this.getNodeParameter('model', itemIndex) as string;
        const language = this.getNodeParameter('language', itemIndex) as string;
        const prompt = this.getNodeParameter('prompt', itemIndex) as string;
        const responseFormat = this.getNodeParameter('responseFormat', itemIndex) as string;

        const url = `${baseUrl}${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;

        let audioBuffer: Buffer;
        let filename = 'audio';
        let contentType = 'application/octet-stream';

        if (audioSource === 'binary') {
          const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
          const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
          audioBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
          filename = binaryData.fileName ?? filename;
          contentType = binaryData.mimeType ?? contentType;
        } else {
          const audioUrl = this.getNodeParameter('audioUrl', itemIndex) as string;
          const downloadRequest: IHttpRequestOptions = {
            method: 'GET',
            url: audioUrl,
            encoding: 'arraybuffer',
          };

          const downloaded = (await this.helpers.httpRequest(downloadRequest)) as ArrayBuffer;
          audioBuffer = Buffer.from(downloaded);
          filename = 'audio';
          contentType = 'application/octet-stream';
        }

        const form = new FormData();
        form.append('file', audioBuffer, { filename, contentType });
        form.append('model', model);
        if (language) form.append('language', language);
        if (prompt) form.append('prompt', prompt);
        if (responseFormat) form.append('response_format', responseFormat);

        const requestOptions: IHttpRequestOptions = {
          method: 'POST',
          url,
          body: form,
          encoding: responseFormat === 'json' || responseFormat === 'verbose_json' ? 'json' : 'text',
          json: responseFormat === 'json' || responseFormat === 'verbose_json',
        };

        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'stepFunApi', requestOptions);

        const json: IDataObject =
          typeof response === 'string'
            ? { text: response, responseFormat }
            : ({ ...(response as IDataObject), responseFormat } as IDataObject);

        returnData.push({ json, pairedItem: { item: itemIndex } });
      } catch (error) {
        const errorResponse: JsonObject =
          typeof error === 'object' && error !== null
            ? (error as JsonObject)
            : ({ message: String(error) } as JsonObject);
        throw new NodeApiError(this.getNode(), errorResponse, { itemIndex });
      }
    }

    return [returnData];
  }
}
