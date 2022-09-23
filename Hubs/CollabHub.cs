using Microsoft.AspNetCore.SignalR;

namespace DeckScribe.Hubs;

public class CollabHub : Hub
{
    private readonly ILogger<CollabHub> _logger;
    private readonly DeckScribeContext _context;

    public CollabHub(ILogger<CollabHub> logger, DeckScribeContext context)
    {
        _logger = logger;
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        var context = Context.GetHttpContext();

        if (context == null)
        {
            Context.Abort();
            return;
        }

        var group = context.Request.Query["deckId"].ToString();

        if (string.IsNullOrEmpty(group))
        {
            Context.Abort();
            return;
        }

        var deckId = int.Parse(group);

        var deck = await _context.Decks.FindAsync(deckId);

        if (deck == null)
        {
            Context.Abort();
            return;
        }

        _logger.LogCritical($"Connected to deck-{group}");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"deck-{group}");
        await base.OnConnectedAsync();
    }

}
