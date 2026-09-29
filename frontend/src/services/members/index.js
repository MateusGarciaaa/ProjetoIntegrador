import { env } from '../../config/env';
import { memberApi } from './memberApi';
import { memberMock } from '../mock/memberMock';

export const memberService = env.useMockApi ? memberMock : memberApi;
