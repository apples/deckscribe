using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Copper
{
    public interface ICopperTokenAuthenticationService<TToken>
        where TToken : CopperSessionToken
    {
        Task<TToken> Revalidate(TToken temp);
    }
}
