import { createApi } from '@reduxjs/toolkit/dist/query/react';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { BaseQueryError, BaseQueryFn } from '@reduxjs/toolkit/dist/query/baseQueryTypes';
import { createAction, SerializedError } from '@reduxjs/toolkit';

type DeckScribeQueryArgs = {
    url: string;
    method?: AxiosRequestConfig['method'];
    body?: AxiosRequestConfig['data'];
    params?: AxiosRequestConfig['params'];
};

export type DeckScribeQueryFn = BaseQueryFn<DeckScribeQueryArgs, unknown, AxiosError>;

export type DeckScribeQueryError = SerializedError | BaseQueryError<DeckScribeQueryFn>;

export const deckscribeAxios = axios.create({
    baseURL: '/',
});

export const unauthorized = createAction<AxiosError>('deckscribeApi/UNAUTHORIZED');

export const deckscribeBaseQuery: DeckScribeQueryFn = async (args, api) => {
    try {
        const result = await deckscribeAxios.request({
            url: args.url,
            method: args.method,
            data: args.body,
            params: args.params,
        });

        return { data: result.data };
    } catch (axiosError) {
        const error = axiosError as AxiosError;

        if (error.response?.status === 401) {
            api.dispatch(unauthorized(error));
        }

        return { error };
    }
};

export const deckscribeApi = createApi({
    reducerPath: 'deckscribeApi',
    baseQuery: deckscribeBaseQuery,
    endpoints: () => ({}),
});
