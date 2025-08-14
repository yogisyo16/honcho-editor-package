import axios, {AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";
import axiosRetry from 'axios-retry';
import {Observable} from "rxjs/internal/Observable";
import {catchError, from, map} from "rxjs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8080";

const apiConfig = (version: string) => {
    return axios.create({
        baseURL: `${BASE_URL}/${version}/`,
        timeout: 60000 * 2,
    })
}

export const api = axios.create({
    baseURL: `${BASE_URL}`,
    timeout: 60000 * 2,
});
axiosRetry(api, { retries: 3, retryDelay: axiosRetry.linearDelay() });

export interface ResponseData<T> {
    code?: number;
    message?: string;
    data?: T;
    error_message?: string;
}

export class ResponseError extends Error {
    code: number;
    error_message: string;
    isEmptyData: boolean = false;

    constructor(code: number, error_message: string, originalError?: Error, isEmptyData: boolean = false) {
        super(`${code}: ${error_message}`);
        this.code = code;
        this.error_message = error_message;
        this.isEmptyData = isEmptyData;
        if (originalError && originalError.stack) {
            this.stack += `\nCaused by: ${originalError.stack}`;
        }
        // we need to set prototype to make this object can check by
        // instanceof ResponseError
        Object.setPrototypeOf(this, ResponseError.prototype);
    }
}

export class EmptyDataError extends Error {
    constructor() {
        super("Data Empty, server not send any data in response");
        // we need to set prototype to make this object can check by
        // instanceof EmptyDataError
        Object.setPrototypeOf(this, EmptyDataError.prototype);
    }
}

// get data from response
export function handleResponse<T>(res: AxiosResponse<ResponseData<T>>): T {
    if (!res.data.data) {
        throw new EmptyDataError();
    }
    return res.data.data;
}

function mapError(error: any): ResponseData<any> {
    if (error.isAxiosError) {
        if (error.response) {
            if (typeof error.response.data === "string") {
                return {
                    code: error.response.status,
                    message: `${error.response.status}: ${error.response.statusText}`,
                    data: undefined,
                    error_message: error.response.data,
                }
            } else {
                return error.response?.data;
            }
        } else if (error.request) {
            return {
                code: 400,
                message: "`${error.name}: failed connect to server check your connection`",
                data: undefined,
                error_message: "failed connect to server",
            };
        } else {
            return {
                code: 400,
                message: error.message,
                data: undefined,
                error_message: error.message,
            };
        }
    } else {
        return {
            code: 500,
            message: String(error),
            data: undefined,
            error_message: String(error),
        }
    }
}

// handle error from response convert it and throw it as ResponseError
export function handleError(error: any): Observable<any> {
    if (error instanceof EmptyDataError) {
        // if data is empty just throw error
        throw new ResponseError(204, "Data Empty, server not send any data in response", error, true);
    }
    let response = mapError(error);
    throw new ResponseError(response.code || 500, response.error_message || "Unknown error", error);
}

export function isResponseError(error: any): Boolean {
    return !!((error.code) && (error.error_message));
}

/**
 * @deprecated use axiosGetObservable, axiosPostObservable, axiosPutObservable, axiosDeleteObservable instead
 * @param promise
 */
export function fromAxiosToObservable<T>(promise: Promise<AxiosResponse<ResponseData<T>>>): Observable<T> {
    return from(promise).pipe(
        map(handleResponse),
        catchError(handleError)
    );
}

export const apiV3 = apiConfig('v3')

export class BaseServices {
    protected axios: AxiosInstance;

    protected constructor(axios: AxiosInstance) {
        this.axios = axios;
    }

    protected axiosGetObservable<T>(url: string, params?: AxiosRequestConfig<any> | undefined): Observable<T> {
        return new Observable<AxiosResponse<ResponseData<T>>>(subscriber => {
            const controller = new AbortController();
            const paramsData = {signal: controller.signal, ...params};
            this.axios.get<ResponseData<T>>(url, paramsData)
                .then(res => {
                    console.debug({res, url, params}, "success GET request");
                    subscriber.next(res);
                    subscriber.complete();
                })
                .catch((error: AxiosError) => {
                    console.error({error, url, params}, "Failed GET request");
                    subscriber.error(error);
                });

            return () => {
                console.debug({url, params, method: "GET"}, "Abort request");
                controller.abort();
            }
        }).pipe(
            map(handleResponse),
            catchError(handleError)
        )
    }

    protected axiosPostObservable<T>(url: string, data: any, params?: AxiosRequestConfig<any> | undefined): Observable<T> {
        return new Observable<AxiosResponse<ResponseData<T>>>(subscriber => {
            const controller = new AbortController();
            const paramsData = {signal: controller.signal, ...params};
            this.axios.post<ResponseData<T>>(url, data, paramsData)
                .then(res => {
                    console.debug({res, url, params}, "success POST request");
                    subscriber.next(res);
                    subscriber.complete();
                })
                .catch((error: AxiosError) => {
                    console.error({error, url, params}, "Failed POST request");
                    subscriber.error(error);
                });

            return () => {
                console.debug({url, params, method: "POST"}, "Abort request");
                controller.abort();
            }
        }).pipe(
            map(handleResponse),
            catchError(handleError)
        )
    }

    protected axiosPutObservable<T>(url: string, data: any, params?: AxiosRequestConfig<any> | undefined): Observable<T> {
        return new Observable<AxiosResponse<ResponseData<T>>>(subscriber => {
            const controller = new AbortController();
            const paramsData = {signal: controller.signal, ...params};
            this.axios.put<ResponseData<T>>(url, data, paramsData)
                .then(res => {
                    console.debug({res, url, params}, "success PUT request");
                    subscriber.next(res);
                    subscriber.complete();
                })
                .catch((error: AxiosError) => {
                    console.error({error, url, params}, "Failed PUT request");
                    subscriber.error(error);
                });

            return () => {
                console.debug({url, params, method: "PUT"}, "Abort request");
                controller.abort();
            }
        }).pipe(
            map(handleResponse),
            catchError(handleError)
        )
    }

    protected axiosDeleteObservable<T>(url: string, params?: AxiosRequestConfig<any> | undefined): Observable<T> {
        return new Observable<AxiosResponse<ResponseData<T>>>(subscriber => {
            const controller = new AbortController();
            const paramsData = {signal: controller.signal, ...params};
            this.axios.delete<ResponseData<T>>(url, paramsData)
                .then(res => {
                    console.debug({res, url, params}, "success DELETE request");
                    subscriber.next(res);
                    subscriber.complete();
                })
                .catch((error: AxiosError) => {
                    console.error({error, url, params}, "Failed DELETE request");
                    subscriber.error(error);
                });

            return () => {
                console.debug({url, params, method: "DELETE"}, "Abort request");
                controller.abort();
            }
        }).pipe(
            map(handleResponse),
            catchError(handleError)
        )
    }
}

export interface Result<T> {
    getStatus(): "loading" | "success" | "error" | "not-found" | "idle";
    getData(): T;
    getDataOrNull(): T | null | undefined;
    getError(): any;
}

export class ResultImpl<T> implements Result<T> {
    private readonly status: "loading" | "success" | "error" | "not-found" | "idle" = "idle";
    private readonly data: T | null | undefined;
    private readonly error: any | null | undefined;

    getStatus(): "loading" | "success" | "error" | "not-found" | "idle" {
        return this.status;
    }

    getData(): T {
        if (this.data) return this.data;
        throw new Error("Data is not available");
    }

    getError(): any {
        if (this.error) return this.error;
        throw new Error("Error is not available");
    }

    getDataOrNull(): T | null | undefined{
        return this.data;
    }

    private constructor(status: "loading" | "success" | "error" | "not-found" | "idle", data?: T | null, error?: any | null) {
        this.status = status;
        this.data = data;
        this.error = error;
    }

    public static success<T>(data: T): Result<T> {
        return new ResultImpl<T>("success", data, null);
    }

    public static loading<T>(): Result<T> {
        return new ResultImpl<T>("loading");
    }

    public static error<T>(err: any): Result<T> {
        return new ResultImpl<T>("error", null, err);
    }

    public static notFound<T>(): Result<T> {
        return new ResultImpl<T>("not-found");
    }

    public static idle<T>(): Result<T> {
        return new ResultImpl<T>("idle");
    }
}

export function fromPromise<T>(promise: Promise<T>): Observable<T> {
    return new Observable(subscriber => {
        promise.then(value => {
            console.debug({value}, "Promise success");
            subscriber.next(value);
            subscriber.complete();
        }).catch(err => {
            console.error({err}, "Promise error");
            subscriber.error(err);
        });
    });
}