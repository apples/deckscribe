using System;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Copper
{
    public static class CopperSession
    {
        public static async Task<CopperSession<TToken>> FromContext<TToken>(HttpContext context)
            where TToken : CopperSessionToken, new()
        {
            var handler = await CopperTokenAuthenticationHandler<TToken>.FromContext(context);

            return new CopperSession<TToken>(handler);
        }
    }

    public class CopperSession<TToken> : IDisposable
        where TToken : CopperSessionToken, new()
    {
        private readonly CopperTokenAuthenticationHandler<TToken> _handler;
        private TToken? _unsavedToken;
        private bool disposedValue;

        public CopperSession(CopperTokenAuthenticationHandler<TToken> handler)
        {
            if (handler == null)
            {
                throw new ArgumentNullException(nameof(handler));
            }

            _handler = handler;
        }

        public void SetToken(TToken claims)
        {
            _unsavedToken = claims;
        }

        public TToken? GetToken()
        {
            if (_unsavedToken != null)
            {
                return _unsavedToken;
            }

            return _handler.Token;
        }

        public void Destroy()
        {
            _unsavedToken = null;

            _handler.DestroyToken();
        }

        private void Save()
        {
            if (_unsavedToken != null)
            {
                _handler.WriteToken(_unsavedToken);
                _unsavedToken = null;
            }
        }

        protected virtual void Dispose(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    Save();
                }

                disposedValue = true;
            }
        }

        public void Dispose()
        {
            Dispose(disposing: true);
            GC.SuppressFinalize(this);
        }
    }
}
