import React, { FormEvent, useEffect } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import { usePostApiUserLoginMutation, usePostApiUserRegisterMutation } from './store/api';
import { useUser } from './hooks/useUser';

export function App() {
  useUser({ whenLoggedInRedirectTo: '/dashboard' });

  const [triggerLogin, { isSuccess: loginSuccess, isLoading: loginLoading, isError: isLoginError, error: loginError }] = usePostApiUserLoginMutation();
  const [triggerRegister, { isSuccess: registerSuccess, isLoading: registerLoading, isError: registerError, error }] = usePostApiUserRegisterMutation();

  const navigate = useNavigate();

  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    triggerLogin({
      loginParams: {
        email: e.currentTarget.email.value,
        password: e.currentTarget.password.value,
      },
    });
  };

  const register = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    triggerRegister({
      registerParams: {
        name: e.currentTarget.username.value,
        email: e.currentTarget.email.value,
        password: e.currentTarget.password.value,
      },
    });
  };

  return (
    <div className='wrapper'>
      <div>
        <div>Login</div>
        <form onSubmit={login}>
          <fieldset disabled={loginLoading || registerLoading}>
            <div><label>Email: <input type="text" name="email" /></label></div>
            <div><label>Password: <input type="password" name="password" /></label></div>
            <div><button>Login</button></div>
          </fieldset>
        </form>
        <div>
          {isLoginError ? loginError?.message : null}
        </div>
      </div>
      <div>
        <div>Register</div>
        <form onSubmit={register}>
          <fieldset disabled={loginLoading || registerLoading}>
            <div><label>Username: <input type="text" name="username" /></label></div>
            <div><label>Email: <input type="text" name="email" /></label></div>
            <div><label>Password: <input type="password" name="password" /></label></div>
            <div><button>Register</button></div>
          </fieldset>
        </form>
        <div>
          {registerSuccess ? 'Registration successful, please login!' : null}
          {registerError ? error?.message : null}
        </div>
      </div>
    </div>
  );
}
