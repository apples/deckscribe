using System.Threading.Tasks;
using Copper;

namespace DeckScribe
{
    public class DeckScribeCopperTokenService : ICopperTokenAuthenticationService<DeckScribeToken>
    {
        public async Task<DeckScribeToken> Revalidate(DeckScribeToken token)
        {
            return token;
        }
    }
}
