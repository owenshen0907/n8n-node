import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  Icon,
} from 'n8n-workflow';

export class StepFunApi implements ICredentialType {
  name = 'stepFunApi';
  displayName = 'Stepfun AI API Key';
  documentationUrl = 'https://platform.stepfun.ai/';
  icon: Icon = 'file:stepfun.png';
  supportedNodes = ['stepFunTts'];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '={{"Bearer " + $credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      method: 'GET',
      url: '={{$credentials.baseUrl}}/models',
    },
  };

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      default: '',
      required: true,
      typeOptions: {
        password: true,
      },
      description:
        'Your Stepfun.ai API Key. You can find your API Key at https://platform.stepfun.ai/interface-key',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.stepfun.ai/v1',
      required: true,
    },
  ];
}
