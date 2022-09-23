using System;
using Microsoft.AspNetCore.Authentication;

namespace Copper
{
    public static class ServiceExtensions
    {
        public static AuthenticationBuilder AddCopperToken<TToken>(this AuthenticationBuilder builder, Action<CopperTokenAuthenticationOptions> configureOptions)
            where TToken: CopperSessionToken
        {
            return builder.AddScheme<CopperTokenAuthenticationOptions, CopperTokenAuthenticationHandler<TToken>>(
                CopperTokenAuthenticationHandler<TToken>.AuthenticationScheme,
                configureOptions
            );
        }
    }
}
