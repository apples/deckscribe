import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { useGetApiUserMyuserQuery } from '../store/api';
import { useNavigate } from 'react-router-dom';

type MyUserInfoLoggedIn = {
    isLoggedIn: true;
    admin: boolean;
    userId: number;
    name: string;
};

type MyUserInfoLoggedOut = {
    isLoggedIn: false | undefined;
};

export function useUser({
    whenLoggedOutRedirectTo = undefined,
    whenLoggedInRedirectTo = undefined,
}: {
    whenLoggedOutRedirectTo?: string,
    whenLoggedInRedirectTo?: string,
} = {}): { user: MyUserInfoLoggedIn | MyUserInfoLoggedOut | undefined } {
    const dispatch = useAppDispatch();

    const navigate = useNavigate();

    const { data: user, error } = useGetApiUserMyuserQuery(undefined, {
        pollingInterval: 1000 * 60,
        refetchOnMountOrArgChange: 30,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    useEffect(() => {
        if (error && whenLoggedOutRedirectTo) {
            navigate(whenLoggedOutRedirectTo);
            return;
        }

        // If user data not yet there (fetch in progress, logged in or not) then don't do anything yet.
        if (!user) return;

        if (user.isLoggedIn && whenLoggedInRedirectTo) {
            navigate(whenLoggedInRedirectTo);
        }
        else if (!user.isLoggedIn && whenLoggedOutRedirectTo) {
            navigate(whenLoggedOutRedirectTo);
        }
    }, [user, whenLoggedInRedirectTo, whenLoggedOutRedirectTo]);

    return { user: user as MyUserInfoLoggedIn | MyUserInfoLoggedOut | undefined };
}
