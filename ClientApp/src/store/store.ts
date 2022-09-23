import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { deckscribeApi } from './api';
import { collabSlice } from './collabSlice';
// ...

const deckscribeApiWithTags = deckscribeApi.enhanceEndpoints({
    addTagTypes: ['User'],
    endpoints: {
        getApiUserMyuser: {
            providesTags: ['User'],
        },
        postApiUserLogin: {
            invalidatesTags: ['User'],
        },
        postApiUserLogout: {
            invalidatesTags: ['User'],
        },
        postApiUserRegister: {
            invalidatesTags: ['User'],
        },
    },
});

const reducer = combineReducers({
    [deckscribeApiWithTags.reducerPath]: deckscribeApiWithTags.reducer,
    [collabSlice.name]: collabSlice.reducer,
});

export const store = configureStore({
    reducer: reducer,
    middleware: (getDefaltMiddleware) => [
        ...getDefaltMiddleware(),
        deckscribeApiWithTags.middleware,
    ],
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
