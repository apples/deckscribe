import { deckscribeApi as api } from "./apiBase";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    postDeck: build.mutation<PostDeckApiResponse, PostDeckApiArg>({
      query: (queryArg) => ({
        url: `/Deck`,
        method: "POST",
        body: queryArg.inputDeck,
      }),
    }),
    getDeckById: build.query<GetDeckByIdApiResponse, GetDeckByIdApiArg>({
      query: (queryArg) => ({ url: `/Deck/${queryArg.id}` }),
    }),
    getDeckByIdVersion: build.query<
      GetDeckByIdVersionApiResponse,
      GetDeckByIdVersionApiArg
    >({
      query: (queryArg) => ({ url: `/Deck/${queryArg.id}/version` }),
    }),
    getDeckByIdName: build.query<
      GetDeckByIdNameApiResponse,
      GetDeckByIdNameApiArg
    >({
      query: (queryArg) => ({ url: `/Deck/${queryArg.id}/name` }),
    }),
    putDeckByIdName: build.mutation<
      PutDeckByIdNameApiResponse,
      PutDeckByIdNameApiArg
    >({
      query: (queryArg) => ({
        url: `/Deck/${queryArg.id}/name`,
        method: "PUT",
        params: { name: queryArg.name },
      }),
    }),
    getDeckByIdData: build.query<
      GetDeckByIdDataApiResponse,
      GetDeckByIdDataApiArg
    >({
      query: (queryArg) => ({ url: `/Deck/${queryArg.id}/data` }),
    }),
    putDeckByIdData: build.mutation<
      PutDeckByIdDataApiResponse,
      PutDeckByIdDataApiArg
    >({
      query: (queryArg) => ({
        url: `/Deck/${queryArg.id}/data`,
        method: "PUT",
        body: queryArg.versionedDeckData,
      }),
    }),
    patchDeckByIdData: build.mutation<
      PatchDeckByIdDataApiResponse,
      PatchDeckByIdDataApiArg
    >({
      query: (queryArg) => ({
        url: `/Deck/${queryArg.id}/data`,
        method: "PATCH",
        body: queryArg.body,
        params: { version: queryArg.version },
      }),
    }),
    getDeckMyDecks: build.query<
      GetDeckMyDecksApiResponse,
      GetDeckMyDecksApiArg
    >({
      query: () => ({ url: `/Deck/myDecks` }),
    }),
    postDeckJoin: build.mutation<PostDeckJoinApiResponse, PostDeckJoinApiArg>({
      query: (queryArg) => ({
        url: `/Deck/join`,
        method: "POST",
        params: { code: queryArg.code },
      }),
    }),
    postApiUserRegister: build.mutation<
      PostApiUserRegisterApiResponse,
      PostApiUserRegisterApiArg
    >({
      query: (queryArg) => ({
        url: `/api/user/register`,
        method: "POST",
        body: queryArg.registerParams,
      }),
    }),
    postApiUserLogin: build.mutation<
      PostApiUserLoginApiResponse,
      PostApiUserLoginApiArg
    >({
      query: (queryArg) => ({
        url: `/api/user/login`,
        method: "POST",
        body: queryArg.loginParams,
      }),
    }),
    getApiUserMyuser: build.query<
      GetApiUserMyuserApiResponse,
      GetApiUserMyuserApiArg
    >({
      query: () => ({ url: `/api/user/myuser` }),
    }),
    postApiUserLogout: build.mutation<
      PostApiUserLogoutApiResponse,
      PostApiUserLogoutApiArg
    >({
      query: () => ({ url: `/api/user/logout`, method: "POST" }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as deckscribeApi };
export type PostDeckApiResponse = unknown;
export type PostDeckApiArg = {
  inputDeck: InputDeck;
};
export type GetDeckByIdApiResponse = /** status 200 Success */ Deck;
export type GetDeckByIdApiArg = {
  id: number;
};
export type GetDeckByIdVersionApiResponse = /** status 200 Success */ string;
export type GetDeckByIdVersionApiArg = {
  id: number;
};
export type GetDeckByIdNameApiResponse = /** status 200 Success */ string;
export type GetDeckByIdNameApiArg = {
  id: number;
};
export type PutDeckByIdNameApiResponse = /** status 200 Success */ undefined;
export type PutDeckByIdNameApiArg = {
  id: number;
  name?: string;
};
export type GetDeckByIdDataApiResponse =
  /** status 200 Success */ VersionedDeckData;
export type GetDeckByIdDataApiArg = {
  id: number;
};
export type PutDeckByIdDataApiResponse = /** status 200 Success */ undefined;
export type PutDeckByIdDataApiArg = {
  id: number;
  versionedDeckData: VersionedDeckData;
};
export type PatchDeckByIdDataApiResponse =
  /** status 200 Success */ VersionedDeckData;
export type PatchDeckByIdDataApiArg = {
  id: number;
  version?: string;
  body: Operation[];
};
export type GetDeckMyDecksApiResponse = /** status 200 Success */ number[];
export type GetDeckMyDecksApiArg = void;
export type PostDeckJoinApiResponse = /** status 200 Success */ undefined;
export type PostDeckJoinApiArg = {
  code?: string;
};
export type PostApiUserRegisterApiResponse =
  /** status 200 Success */ MyUserInfo;
export type PostApiUserRegisterApiArg = {
  registerParams: RegisterParams;
};
export type PostApiUserLoginApiResponse = /** status 200 Success */ MyUserInfo;
export type PostApiUserLoginApiArg = {
  loginParams: LoginParams;
};
export type GetApiUserMyuserApiResponse = /** status 200 Success */ MyUserInfo;
export type GetApiUserMyuserApiArg = void;
export type PostApiUserLogoutApiResponse = unknown;
export type PostApiUserLogoutApiArg = void;
export type InputDeck = {
  name: string;
};
export type User = {
  id: number;
  createdAt: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  name: string;
  admin: boolean;
  decks: Deck[];
};
export type Deck = {
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  version: string;
  deckData: string;
  deckCode: string;
  users: User[];
};
export type ProblemDetails = {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
};
export type VersionedDeckData = {
  version: string;
  deckData: string;
};
export type OperationType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Operation = {
  operationType: OperationType;
  path?: string | null;
  op?: string | null;
  from?: string | null;
  value?: any | null;
};
export type MyUserInfo = {
  isLoggedIn: boolean;
  admin?: boolean | null;
  userId?: number | null;
  name?: string | null;
};
export type RegisterParams = {
  email: string;
  password: string;
  name: string;
};
export type LoginParams = {
  email?: string | null;
  password?: string | null;
};
export const {
  usePostDeckMutation,
  useGetDeckByIdQuery,
  useGetDeckByIdVersionQuery,
  useGetDeckByIdNameQuery,
  usePutDeckByIdNameMutation,
  useGetDeckByIdDataQuery,
  usePutDeckByIdDataMutation,
  usePatchDeckByIdDataMutation,
  useGetDeckMyDecksQuery,
  usePostDeckJoinMutation,
  usePostApiUserRegisterMutation,
  usePostApiUserLoginMutation,
  useGetApiUserMyuserQuery,
  usePostApiUserLogoutMutation,
} = injectedRtkApi;
