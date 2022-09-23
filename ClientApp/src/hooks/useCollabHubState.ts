import { HubConnectionState } from "@microsoft/signalr";
import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { DeckData, setDeckData } from "../store/collabSlice";
import { useCollabHub, UseCollabHubResult } from "./useCollabHub";

// export const useCollabHubState = (deckId: number | null): UseCollabHubResult => {
//     var dispatch = useDispatch();

//     var clientSetDeckData = useCallback((deckData: string) => {
//         dispatch(setDeckData({ deckData: JSON.parse(deckData) }));
//     }, [dispatch]);

//     const { status, serverMethods } = useCollabHub(deckId, { setDeckData: clientSetDeckData });

//     const { getDeckData } = serverMethods;

//     useEffect(() => {
//         if (deckId && status === HubConnectionState.Connected) {
//             getDeckData().then(clientSetDeckData);
//         }
//     }, [status, setDeckData, getDeckData]);

//     return { status, serverMethods };
// };
