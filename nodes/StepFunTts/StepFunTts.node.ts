import type { IExecuteFunctions } from 'n8n-workflow';
import type {
  IDataObject,
  IHttpRequestOptions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

function getFileExtensionFromMimeType(mimeType: string): string | undefined {
  if (!mimeType) return undefined;
  const normalized = mimeType.toLowerCase().trim();
  if (normalized === 'audio/mpeg' || normalized === 'audio/mp3') return 'mp3';
  if (normalized === 'audio/wav' || normalized === 'audio/wave') return 'wav';
  if (normalized === 'audio/ogg') return 'ogg';
  if (normalized === 'audio/webm') return 'webm';
  if (normalized === 'audio/flac') return 'flac';
  return undefined;
}

export class StepFunTts implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'StepFun TTS',
    name: 'stepFunTts',
    group: ['transform'],
    version: 1,
    description: 'Text-to-speech via StepFun',
    subtitle: '={{$parameter["model"]}}',
    documentationUrl: 'https://platform.stepfun.com/',
    icon: 'file:stepfun.svg',
    codex: {
      categories: ['AI', 'Audio'],
      subcategories: {
        AI: ['Text to Speech'],
        Audio: ['Synthesis'],
      },
      resources: {
        primaryDocumentation: [
          {
            url: 'https://platform.stepfun.com/',
          },
        ],
      },
      alias: ['tts', 'text to speech', 'text-to-speech', 'speech synthesis', 'voice'],
    },
    defaults: {
      name: 'StepFun TTS',
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
        displayName: 'Text',
        name: 'text',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Endpoint Path',
        name: 'endpointPath',
        type: 'string',
        default: '/audio/speech',
        required: true,
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'string',
        default: 'step-tts-mini',
        required: true,
      },
      {
        displayName: 'Voice',
        name: 'voice',
        type: 'string',
        default: '',
        placeholder: 'cixingnansheng',
      },
      {
        displayName: 'Speed',
        name: 'speed',
        type: 'number',
        default: 1,
        typeOptions: {
          minValue: 0.5,
          maxValue: 2,
          numberPrecision: 2,
        },
      },
      {
        displayName: 'Volume',
        name: 'volume',
        type: 'number',
        default: 1,
        typeOptions: {
          minValue: 0.1,
          maxValue: 2,
          numberPrecision: 2,
        },
      },
      {
        displayName: 'Response MIME Type',
        name: 'responseMimeType',
        type: 'options',
        options: [
          { name: 'MP3 (audio/mpeg)', value: 'audio/mpeg' },
          { name: 'WAV (audio/wav)', value: 'audio/wav' },
          { name: 'OGG (audio/ogg)', value: 'audio/ogg' },
          { name: 'WEBM (audio/webm)', value: 'audio/webm' },
          { name: 'FLAC (audio/flac)', value: 'audio/flac' },
          { name: 'Other (custom)', value: 'custom' },
        ],
        default: 'audio/mpeg',
      },
      {
        displayName: 'Custom Response MIME Type',
        name: 'customResponseMimeType',
        type: 'string',
        default: '',
        placeholder: 'audio/mpeg',
        displayOptions: {
          show: {
            responseMimeType: ['custom'],
          },
        },
      },
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'audio',
        required: true,
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: 'stepfun-tts',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = (await this.getCredentials('stepFunApi')) as unknown as { baseUrl: string };
    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const text = this.getNodeParameter('text', itemIndex) as string;
        if (!text?.trim()) {
          throw new NodeOperationError(this.getNode(), 'Text is required', { itemIndex });
        }

        const endpointPath = this.getNodeParameter('endpointPath', itemIndex) as string;
        const model = this.getNodeParameter('model', itemIndex) as string;
        const voice = this.getNodeParameter('voice', itemIndex) as string;
        const speed = this.getNodeParameter('speed', itemIndex) as number;
        const volume = this.getNodeParameter('volume', itemIndex) as number;
        const responseMimeTypeRaw = this.getNodeParameter('responseMimeType', itemIndex) as string;
        const customResponseMimeType = this.getNodeParameter('customResponseMimeType', itemIndex) as string;
        const responseMimeType =
          responseMimeTypeRaw === 'custom' ? (customResponseMimeType || 'audio/mpeg') : responseMimeTypeRaw;
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
        const fileNameBase = this.getNodeParameter('fileName', itemIndex) as string;

        const url = `${baseUrl}${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;

        const body: IDataObject = {
          model,
          input: text,
          speed,
          volume,
          response_format: responseMimeType,
        };
        if (voice) body.voice = voice;

        const requestOptions: IHttpRequestOptions = {
          method: 'POST',
          url,
          body,
          json: true,
          encoding: 'arraybuffer',
        };

        const audioArrayBuffer = (await this.helpers.httpRequestWithAuthentication.call(
          this,
          'stepFunApi',
          requestOptions,
        )) as ArrayBuffer;

        const audioBuffer = Buffer.from(audioArrayBuffer);

        const ext = getFileExtensionFromMimeType(responseMimeType);
        const fileName = ext ? `${fileNameBase}.${ext}` : fileNameBase;
        const binaryData = await this.helpers.prepareBinaryData(audioBuffer, fileName, responseMimeType);

        returnData.push({
          json: {
            model,
            voice,
            speed,
            volume,
            mimeType: responseMimeType,
            fileName,
          },
          binary: {
            [binaryPropertyName]: binaryData,
          },
          pairedItem: { item: itemIndex },
        });
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
