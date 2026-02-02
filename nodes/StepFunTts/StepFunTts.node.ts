import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const OUTPUT_FORMAT_MAP: Record<string, { mimeType: string; ext: string }> = {
  mp3: { mimeType: 'audio/mpeg', ext: 'mp3' },
  aac: { mimeType: 'audio/aac', ext: 'aac' },
  flac: { mimeType: 'audio/flac', ext: 'flac' },
  wav: { mimeType: 'audio/wav', ext: 'wav' },
  pcm: { mimeType: 'audio/pcm', ext: 'pcm' },
  opus: { mimeType: 'audio/opus', ext: 'opus' },
};

export class StepFunTts implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Stepfun.ai',
    name: 'stepFunTts',
    group: ['transform'],
    version: 1,
    description: 'Convert Text Into Speech using Stepfun.ai\'s Model (TTS)',
    subtitle: '={{$parameter["model"]}}',
    documentationUrl: 'https://platform.stepfun.ai/',
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
            url: 'https://platform.stepfun.ai/',
          },
        ],
      },
      alias: ['tts', 'text to speech', 'text-to-speech', 'speech synthesis', 'voice', 'stepfun'],
    },
    defaults: {
      name: 'Convert Text Into Speech',
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
        description: 'The text to convert to speech (max 1000 characters)',
        typeOptions: {
          rows: 4,
        },
      },
      {
        displayName: 'Voice',
        name: 'voice',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getVoices',
        },
        default: '',
        required: true,
        description: 'The voice to use for speech synthesis',
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'step-tts-2', value: 'step-tts-2' },
        ],
        default: 'step-tts-2',
        required: true,
        description: 'The TTS model to use',
      },
      {
        displayName: 'Output Format',
        name: 'outputFormat',
        type: 'options',
        options: [
          { name: 'MP3', value: 'mp3' },
          { name: 'AAC', value: 'aac' },
          { name: 'FLAC', value: 'flac' },
          { name: 'WAV', value: 'wav' },
          { name: 'PCM', value: 'pcm' },
          { name: 'Opus', value: 'opus' },
        ],
        default: 'mp3',
        description: 'The audio format for the output file',
      },
    ],
  };

  methods = {
    loadOptions: {
      async getVoices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials('stepFunApi');
        const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
        const apiKey = credentials.apiKey as string;

        try {
          const response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${baseUrl}/audio/system_voices?model=step-tts-mini`,
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          const parsed = typeof response === 'string' ? JSON.parse(response) : response;
          const voices: IDataObject[] = Array.isArray(parsed)
            ? parsed
            : (parsed.data ?? parsed.voices ?? []);

          return voices.map((voice: IDataObject) => ({
            name: (voice.name ?? voice.display_name ?? voice.id ?? '') as string,
            value: (voice.id ?? voice.voice_id ?? voice.name ?? '') as string,
          }));
        } catch {
          return [];
        }
      },
    },
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

        const voice = this.getNodeParameter('voice', itemIndex) as string;
        const model = this.getNodeParameter('model', itemIndex) as string;
        const outputFormat = this.getNodeParameter('outputFormat', itemIndex) as string;

        const formatInfo = OUTPUT_FORMAT_MAP[outputFormat] ?? OUTPUT_FORMAT_MAP.mp3;

        const body: IDataObject = {
          model,
          input: text,
          voice,
          response_format: outputFormat,
        };

        const requestOptions: IHttpRequestOptions = {
          method: 'POST',
          url: `${baseUrl}/audio/speech`,
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
        const fileName = `stepfun-tts.${formatInfo.ext}`;
        const binaryData = await this.helpers.prepareBinaryData(
          audioBuffer,
          fileName,
          formatInfo.mimeType,
        );

        returnData.push({
          json: {
            text,
            voice,
            model,
            outputFormat,
          },
          binary: {
            audio: binaryData,
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
