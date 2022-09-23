import { createSlice, original } from '@reduxjs/toolkit'
import { applyPatch, compare } from 'fast-json-patch';
import { Deck } from './api';

export interface DeckFileImage {
    fullPath: string;
    type: 'image';
    url: string;
    width: number;
    height: number;
}

export interface DeckFileText {
    fullPath: string;
    type: 'text';
    contents: string;
}

export interface DeckFileUnknown {
    fullPath: string;
    type: 'unknown';
}

export type DeckFile = DeckFileImage | DeckFileText | DeckFileUnknown;

export interface DeckData {
    cardDPI: number;
    cardWidth: number;
    cardHeight: number;
    scriptText: string;
    imagePrefix: string;
    files: {
        [key: string]: DeckFile;
    };
    dataFilePath: string;
    googleSheetsUrl: string;
    googleSheetsSheet: string;
    googleSheetsDestination: string;
    ttsFileNamePrefix: string;
};

interface CollabState {
    originalDeckData: DeckData | null;
    workingDeckData: DeckData | null;
    workingVersion: string | null;
    dirty: boolean;
}

const initialState: CollabState = {
    originalDeckData: null,
    workingDeckData: null,
    workingVersion: null,
    dirty: false,
};

export const collabSlice = createSlice({
    name: 'collab',
    initialState: initialState,
    reducers: {
        setDeckData: (state, { payload: { deckData, version } }: { payload: { deckData: DeckData | null, version: string | null } }) => {
            if (!state.originalDeckData || !state.workingDeckData || !state.workingVersion) {
                console.log('setDeckData: version ' + version);
                state.originalDeckData = deckData;
                state.workingDeckData = deckData;
                state.workingVersion = version;
                state.dirty = false;
            } else if (!deckData) {
                console.log('setDeckData: clear');
                state.originalDeckData = null;
                state.workingDeckData = null;
                state.workingVersion = null;
                state.dirty = false;
            } else if (version && +version > +state.workingVersion) {
                const patch = compare(state.originalDeckData, state.workingDeckData);
                console.log('setDeckData: version ' + version + ', patch working:', patch);
                const newDoc = applyPatch(deckData, patch, false, false).newDocument;
                state.originalDeckData = deckData;
                state.workingDeckData = newDoc;
                state.workingVersion = version;

                const workingPatch = compare(deckData, state.workingDeckData);
                state.dirty = workingPatch.length > 0;
            }
        },
        setDeckDataField: (state, { payload: { field, value } }: { payload: { field: string, value: any } }) => {
            if (state.workingDeckData == null) {
                throw new Error('Cannot set field on null deck');
            }
            (state.workingDeckData as any)[field] = value;
            state.dirty = true;
        },
        setWorkingDeckData: (state, { payload: { deckData } }: { payload: { deckData: DeckData } }) => {
            state.workingDeckData = deckData;
            state.dirty = true;
        },
        updateFiles: (state, { payload: { files } }: { payload: { files: DeckFile[] } }) => {
            if (state.workingDeckData == null) {
                throw new Error('Cannot update files on null deck');
            }
            for (const file of files) {
                state.workingDeckData.files[file.fullPath] = file;
            }
            state.dirty = true;
        },
    },
});

export const { setDeckData, setWorkingDeckData, setDeckDataField, updateFiles } = collabSlice.actions;
