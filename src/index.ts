import { fetch } from "@tauri-apps/plugin-http";
import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig, type ResponseType } from "axios"
import buildFullPath from "axios/unsafe/core/buildFullPath.js"
import buildURL from "axios/unsafe/helpers/buildURL.js"
import settle from "axios/unsafe/core/settle.js"
import composeSignals from "axios/unsafe/helpers/composeSignals.js"

const tauriAxiosAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    let {
        baseURL,
        url,
        params,
        paramsSerializer,
        method,
        data,
        timeout,
        responseType,
        headers,
        fetchOptions,
        signal,
        cancelToken,
    } = config

    url = buildURL(buildFullPath(baseURL, url, config.allowAbsoluteUrls, config), params, paramsSerializer);

    responseType = responseType ? (responseType + '').toLowerCase() as ResponseType : 'text';

    if (data instanceof FormData) {
        headers.setContentType(null)
    }

    const composedSignal = composeSignals(
        [signal, cancelToken && cancelToken.toAbortSignal()],
        timeout && timeout > 0 ? timeout : undefined
    );

    const unsubscribe = composedSignal?.unsubscribe;

    const requestInit: RequestInit = {
        ...fetchOptions,
        signal: composedSignal,
        method: method!.toUpperCase(),
        body: data,
        headers: headers!.normalize(false).toJSON() as HeadersInit,
    };

    let request: Request | undefined;

    try {
        request = new Request(url!, requestInit);
        const response = await fetch(url!, requestInit);
        const responseData = await getResponseData(response, responseType);
        unsubscribe?.();
        return await new Promise<AxiosResponse>((resolve, reject) => {
            const axiosResponse: AxiosResponse = {
                data: responseData,
                status: response.status,
                statusText: response.statusText,
                headers: AxiosHeaders.from(response.headers as any).normalize(false),
                config: config,
                request,
            }
            settle(resolve, reject, axiosResponse)
        })
    } catch (err) {
        unsubscribe?.();

        if (composedSignal?.aborted && composedSignal.reason instanceof AxiosError) {
            const canceledError = composedSignal.reason;
            canceledError.config = config;
            if (request) {
                canceledError.request = request;
            }
            throw canceledError;
        }

        throw AxiosError.from(err, err && (err as any).code, config, request)
    }

}

async function getResponseData(response: Response, responseType: ResponseType) {
    switch (responseType) {
        case "json":
            return response.json()
        case "blob":
            return new Blob([await response.blob()], { type: response.headers.get('content-type') ?? undefined })
        case "arraybuffer":
            return response.arrayBuffer()
    }
    return response.text()
}

export { tauriAxiosAdapter, tauriAxiosAdapter as default }