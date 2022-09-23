using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Copper
{
    public class CopperTokenAuthenticationHandler<TToken> : AuthenticationHandler<CopperTokenAuthenticationOptions>
        where TToken : CopperSessionToken
    {
        public static readonly string AuthenticationScheme = "CopperTokenAuthentication";

        private readonly NullabilityInfoContext _nullabilityContext = new NullabilityInfoContext();
        private readonly ICopperTokenAuthenticationService<TToken> _service;
        private TToken? _token;
        public readonly JsonSerializerOptions jsonOptions = new JsonSerializerOptions
        {
            IgnoreReadOnlyProperties = true,
        };

        public TToken? Token => _token;

        public static async Task<CopperTokenAuthenticationHandler<TToken>> FromContext(HttpContext context)
        {
            var provider = context.RequestServices.GetService<IAuthenticationHandlerProvider>();

            if (provider == null)
            {
                throw new InvalidOperationException("IAuthenticationHandlerProvider not found.");
            }

            var handler = await provider.GetHandlerAsync(context, AuthenticationScheme) as CopperTokenAuthenticationHandler<TToken>;

            if (handler == null)
            {
                throw new InvalidOperationException("CopperTokenAuthenticationHandler not found.");
            }

            return handler;
        }

        public CopperTokenAuthenticationHandler(
            IOptionsMonitor<CopperTokenAuthenticationOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock,
            ICopperTokenAuthenticationService<TToken> service)
            : base(options, logger, encoder, clock)
        {
            if (service == null)
            {
                throw new ArgumentNullException("service");
            }

            _service = service;
        }

        public string Secret => Options.Secret ?? throw new InvalidOperationException("Missing Options.Secret");

        public string CookieName => "CuTok_" + Options.CookieSuffix;

        public void WriteToken(TToken tokenData)
        {
            tokenData.CreatedOn = DateTimeOffset.UtcNow;

            var json = JsonSerializer.Serialize(tokenData, jsonOptions);

            var seal = new CopperSeal(Secret);

            var token = seal.Seal(json);

            Response.Cookies.Append(CookieName, token, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = true,
                Expires = DateTimeOffset.UtcNow.AddSeconds(Options.InvalidAfterSecs),
            });

            _token = tokenData;
        }

        public void DestroyToken()
        {
            Response.Cookies.Delete(CookieName);
            _token = null;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            try
            {
                var result = await HandleAuthenticateAsyncImpl();

                if (!result.Succeeded)
                {
                    DestroyToken();
                }

                return result;
            }
            catch (Exception e)
            {
                DestroyToken();

                Logger.LogError(e, "Token authentication failed with exception.");
                return AuthenticateResult.Fail("Token authentication failed with exception.");
            }
        }

        private async Task<AuthenticateResult> HandleAuthenticateAsyncImpl()
        {
            _token = null;

            // Get token string from cookie

            var tokenCookie = Request.Cookies[CookieName];

            if (tokenCookie == null)
            {
                return AuthenticateResult.Fail("Missing token cookie");
            }

            var seal = new CopperSeal(Secret);

            var tokenData = seal.Unseal(tokenCookie);

            if (tokenData == null)
            {
                return AuthenticateResult.Fail("Cookie does not contain a valid token");
            }

            // Deserialize

            var token = JsonSerializer.Deserialize<TToken>(tokenData, jsonOptions);

            if (token == null)
            {
                return AuthenticateResult.Fail("Failed to deserialize token.");
            }

            // Check expiration

            var tokenAgeSecs = (DateTimeOffset.UtcNow - token.CreatedOn).TotalSeconds;

            if (tokenAgeSecs < 0 || tokenAgeSecs >= Options.InvalidAfterSecs)
            {
                return AuthenticateResult.Fail("Token is too old.");
            }

            if (tokenAgeSecs >= Options.RevalidateAfterSecs)
            {
                // Revalidate

                try
                {
                    var temp = token;
                    token = null;
                    token = await _service.Revalidate(temp);
                }
                catch (Exception e)
                {
                    Logger.LogError(e, "Token revalidation failed with exception.");
                }

                if (token == null)
                {
                    return AuthenticateResult.Fail("Token revalidation failed.");
                }

                WriteToken(token);
            }

            // Token successfully validated

            _token = token;

            // Populate claims

            var claims = new List<Claim>();

            foreach (var prop in typeof(TToken).GetProperties())
            {

                switch (prop.Name)
                {
                    case nameof(CopperSessionToken.Name):
                    {
                        if (token.Name  == null)
                        {
                            return AuthenticateResult.Fail("Name claim cannot be null.");
                        }

                        claims.Add(new Claim(ClaimTypes.Name, token.Name));
                        break;
                    }
                    case nameof(CopperSessionToken.Roles):
                        if (token.Roles == null)
                        {
                            token.Roles = new List<string>();
                        }

                        claims.AddRange(token.Roles.Select(role => new Claim(ClaimTypes.Role, role)));

                        break;
                    default:
                    {
                        var value = prop.GetValue(token);

                        var nullabilityInfo = _nullabilityContext.Create(prop);
                        if (nullabilityInfo.WriteState == NullabilityState.NotNull && value == null)
                        {
                            return AuthenticateResult.Fail("Claim property " + prop.Name + " cannot be set to null.");
                        }

                        if (value == null)
                        {
                            break;
                        }

                        claims.Add(value switch
                        {
                            string s => new Claim(prop.Name, s),
                            int x => new Claim(prop.Name, x.ToString(), ClaimValueTypes.Integer),
                            bool b => new Claim(prop.Name, b.ToString(), ClaimValueTypes.Boolean),
                            DateTime d => new Claim(prop.Name, d.ToString("o"), ClaimValueTypes.DateTime),
                            DateTimeOffset d => new Claim(prop.Name, d.ToString("o"), ClaimValueTypes.DateTime),
                            _ => new Claim(prop.Name, JsonSerializer.Serialize(value, value.GetType(), jsonOptions), "json"),
                        });

                        break;
                    }
                }
            }

            var identity = new ClaimsIdentity(claims, nameof(CopperTokenAuthenticationHandler<TToken>));
            var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), this.Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
    }
}
