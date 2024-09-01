import { fetch } from "@tauri-apps/plugin-http";
import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig, type ResponseType } from "axios"
// @ts-ignore
import buildFullPath from "axios/unsafe/core/buildFullPath.js"
// @ts-ignore
import buildURL from "axios/unsafe/helpers/buildURL.js"
// @ts-ignore
import settle from "axios/unsafe/core/settle.js"

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
        fetchOptions } = config

    url = buildURL(buildFullPath(baseURL, url), params, paramsSerializer);

    responseType = responseType ? (responseType + '').toLowerCase() as ResponseType : 'text';

    if (data instanceof FormData) {
        headers.setContentType(null)
    }

    const request = new Request(url!, {
        ...fetchOptions,
        method: method!.toUpperCase(),
        body: data,
        headers: headers!.normalize(false).toJSON() as HeadersInit,
    })

    const fetchPromise = (async () => {
        try {
            const response = await fetch(request)
            const responseData = await getResponseData(response, responseType)
            return new Promise<AxiosResponse>((resolve, reject) => {
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
            throw AxiosError.from(err, err && (err as any).code, config, request)
        }
    })();

    if (timeout && timeout > 0) {
        const timeoutPromise = new Promise<AxiosResponse>((_, reject) =>
            setTimeout(() => {
                reject(new AxiosError(
                    `timeout of ${timeout}ms exceeded`,
                    AxiosError.ECONNABORTED,
                    config,
                    request
                ));
            }, timeout)
        );
        return await Promise.race([fetchPromise, timeoutPromise]);
    } else {
        return fetchPromise;
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

export default tauriAxiosAdapter