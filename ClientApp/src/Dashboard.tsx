import React, { FormEvent } from 'react';
import './App.css';
import { useUser } from './hooks/useUser';
import { useGetDeckByIdQuery, useGetDeckMyDecksQuery, usePostApiUserLogoutMutation, usePostDeckJoinMutation, usePostDeckMutation } from './store/api';
import { useNavigate } from 'react-router-dom';
import { deckscribeApi } from './store/apiBase';
import { useAppDispatch } from './store/hooks';

export function Dashboard() {
  const { user } = useUser({ whenLoggedOutRedirectTo: '/' });

  const [triggerNewDeck, { isSuccess: isNewDeckSuccess, isLoading: isNewDeckLoading, isError: isNewDeckError, error: newDeckError }] = usePostDeckMutation();
  const [triggerJoinDeck, { isSuccess: isJoinDeckSuccess, isLoading: isJoinDeckLoading, isError: isJoinDeckError, error: joinDeckError }] = usePostDeckJoinMutation();

  const { data: myDeckIds, isLoading: isMyDecksLoading, isError: isMyDecksError, error: myDecksError, refetch } = useGetDeckMyDecksQuery(undefined, { refetchOnMountOrArgChange: true });

  const [triggerLogout] = usePostApiUserLogoutMutation();

  const navigate = useNavigate();

  const dispatch = useAppDispatch();

  if (!user) {
    return <div>Loading...</div>;
  }

  if (!('name' in user)) {
    return <div>User is logged out.</div>;
  }

  const newDeck = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await triggerNewDeck({
      inputDeck: {
        name: (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value,
      },
    }).unwrap();
    refetch();
  };

  const joinDeck = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await triggerJoinDeck({
      code: (e.currentTarget.elements.namedItem('deckcode') as HTMLInputElement).value,
    }).unwrap();
    refetch();
  };

  const logout = async () => {
    await triggerLogout().unwrap();
    dispatch(deckscribeApi.util.resetApiState());
    navigate('/');
  };

  return (
    <div className="wrapper">
      <div>
        <h1>WELCOME {user.name}!</h1>
        <div>
          <button onClick={logout}>Logout</button>
        </div>
        <div>
          <form onSubmit={newDeck}>
            Create new deck:
            <fieldset disabled={isNewDeckLoading || isJoinDeckLoading}>
              <label>Deck name: <input type="text" name="name" /></label>
              <button>Create</button>
            </fieldset>
          </form>
          <div>
            {isNewDeckSuccess && <div>Deck created!</div>}
            {isNewDeckError && <div>Error creating deck: {newDeckError?.message}</div>}
          </div>
        </div>
        <div>
          <form onSubmit={joinDeck}>
            Join deck via code:
            <fieldset disabled={isNewDeckLoading || isJoinDeckLoading}>
              <label>Deck code: <input type="text" name="deckcode" /></label>
              <button>Add</button>
            </fieldset>
          </form>
          <div>
            {isJoinDeckSuccess && <div>Deck joined!</div>}
            {isJoinDeckError && <div>Error joining deck: {joinDeckError?.message}</div>}
          </div>
        </div>
      </div>
      <div>
        <h1>My decks</h1>
        <div>
          {isMyDecksLoading ? 'Loading...' : myDeckIds?.map((deckId) => <DeckInfo key={deckId} deckId={deckId} />)}
          {isMyDecksError && <div>Error loading decks: {myDecksError?.message}</div>}
        </div>
      </div>
    </div>
  );
}

function DeckInfo({ deckId }: { deckId: number }) {
  const { data, isLoading, isError, error } = useGetDeckByIdQuery({ id: deckId });

  const navigate = useNavigate();

  const launch = () => {
    navigate(`/deckeditor/${deckId}`);
  }

  if (isLoading) {
    return <div>Loading deck {deckId}...</div>;
  }

  if (isError) {
    return <div>Error loading deck {deckId}: {error?.message}</div>;
  }

  return (
    <div>
      <hr />
      <h2>{data?.name}</h2>
      <button onClick={launch}>Launch Deck Editor</button>
      <div>Deck code: <span style={{ fontFamily: 'monospace' }}>{data?.deckCode}</span></div>
      <div>Last modified: {data?.updatedAt}</div>
    </div>
  );
}
