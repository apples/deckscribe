import { HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState } from "@microsoft/signalr";
import { useCallback, useEffect, useRef, useState } from "react";

export interface CollabHubClientMethods {
    refetch?: (version: string) => void;
}

export interface CollabHubServerMethods {
}

export interface UseCollabHubResult {
    serverMethods: CollabHubServerMethods;
    status: HubConnectionState;
};

export const useCollabHub = (deckId: number | null, clientMethods: CollabHubClientMethods): UseCollabHubResult => {
    const [connection, setConnection] = useState<HubConnection | null>(null);

    const clientMethodsRef = useRef(clientMethods);
    clientMethodsRef.current = clientMethods;

    const [, poke] = useState({});

    useEffect(() => {
        if (!deckId) {
            console.log("useCollabHub: deckId is null");
            return;
        }

        console.log("useCollabHub connecting to: /collabhub?deckId=" + deckId);

        if (connection != null) {
            console.log("useCollabHub: connection already exists");
        }

        const newConnection = new HubConnectionBuilder()
            .withUrl("/collabhub?deckId=" + deckId, HttpTransportType.WebSockets)
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);

        const wrapClientMethod = (methodFactory: () => ((...args: any[]) => void) | undefined) => {
            return (incomingDeckId: number, ...args: any[]) => {
                if (deckId === incomingDeckId) {
                    methodFactory()?.(...args);
                }
            };
        };

        newConnection.on("Refetch", wrapClientMethod(() => clientMethodsRef.current.refetch));

        newConnection.onclose(() => {
            console.log("useCollabHub: connection closed");
            poke({});
        });

        newConnection.onreconnected(() => {
            console.log("useCollabHub: connection reconnected");
            poke({});
        });

        newConnection.onreconnecting(() => {
            console.log("useCollabHub: connection reconnecting");
            poke({});
        });

        newConnection.start().then(() => {
            console.log("useCollabHub: connection started");
            poke({});
        });

        return () => {
            console.log("useCollabHub stopping");
            newConnection.stop();
        }
    }, [deckId]);

    const useServerMethod = <Result, Args extends any[]>(methodName: string) => useCallback(async (...args: Args) => {
        if (!connection) {
            throw new Error("Connection not yet established");
        }
        const result = await connection.invoke<Result>(methodName, deckId, ...args);
        return result;
    }, [deckId, connection]);

    return {
        serverMethods: { },
        status: connection?.state ?? HubConnectionState.Disconnected,
    };
};
