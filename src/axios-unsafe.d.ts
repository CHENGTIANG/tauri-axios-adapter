declare module 'axios/unsafe/core/buildFullPath.js' {
  import type { InternalAxiosRequestConfig } from 'axios';

  export default function buildFullPath(
    baseURL: string | undefined,
    requestedURL: string | undefined,
    allowAbsoluteUrls?: boolean,
    config?: InternalAxiosRequestConfig
  ): string;
}

declare module 'axios/unsafe/helpers/buildURL.js' {
  import type { InternalAxiosRequestConfig } from 'axios';

  export default function buildURL(
    url: string,
    params?: InternalAxiosRequestConfig['params'],
    paramsSerializer?: InternalAxiosRequestConfig['paramsSerializer']
  ): string;
}

declare module 'axios/unsafe/core/settle.js' {
  import type { AxiosResponse } from 'axios';

  export default function settle(
    resolve: (value: AxiosResponse) => void,
    reject: (reason?: unknown) => void,
    response: AxiosResponse
  ): void;
}

declare module 'axios/unsafe/helpers/composeSignals.js' {
  import type { GenericAbortSignal } from 'axios';

  export default function composeSignals(
    signals: Array<GenericAbortSignal | undefined | null | false>,
    timeout?: number | null
  ): (AbortSignal & { unsubscribe?: () => void }) | undefined;
}
