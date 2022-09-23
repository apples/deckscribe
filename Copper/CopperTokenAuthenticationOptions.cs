using System;
using Microsoft.AspNetCore.Authentication;

namespace Copper
{
    public class CopperTokenAuthenticationOptions : AuthenticationSchemeOptions
    {
        public string? Secret { get; set; }
        public string? CookieSuffix { get; set; }
        public int RevalidateAfterSecs { get; set; } = 5 * 60;
        public int InvalidAfterSecs { get; set; } = 7 * 24 * 60 * 60;

        public override void Validate()
        {
            base.Validate();

            if (string.IsNullOrEmpty(Secret))
            {
                throw new InvalidOperationException($"CopperTokenAuthentication: {nameof(Secret)} not provided.");
            }

            if (Secret.Length < CopperSeal.MinimumSecretLength)
            {
                throw new InvalidOperationException($"CopperTokenAuthentication: {nameof(Secret)} must be at least {CopperSeal.MinimumSecretLength} chars.");
            }

            if (string.IsNullOrEmpty(CookieSuffix))
            {
                throw new InvalidOperationException($"CopperTokenAuthentication: {nameof(CookieSuffix)} not provided.");
            }
        }
    }
}
