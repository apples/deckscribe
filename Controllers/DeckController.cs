using Copper;
using DeckScribe.Hubs;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace DeckScribe.Controllers;

[ApiController]
[Route("[controller]")]
public class DeckController : ControllerBase
{
    private readonly ILogger<DeckController> _logger;
    private readonly DeckScribeContext _context;
    private readonly IHubContext<CollabHub> _hubContext;

    private string DefaultDeckData = @"{""cardDPI"":300,""cardWidth"":2.5,""cardHeight"":3.5,""scriptText"":"""",""imagePrefix"":""/"",""files"":{},""dataFilePath"":"""",""googleSheetsUrl"":"""",""googleSheetsSheet"":"""",""googleSheetsDestination"":""""}";

    public DeckController(ILogger<DeckController> logger, DeckScribeContext context, IHubContext<CollabHub> hubContext)
    {
        _logger = logger;
        _context = context;
        _hubContext = hubContext;
    }

    [HttpPost]
    public async Task<IActionResult> PostDeck(InputDeck input)
    {
        using var copper = await CopperSession.FromContext<DeckScribeToken>(HttpContext);
        var token = copper.GetToken();

        if (token == null)
        {
            return Unauthorized();
        }

        var existingDeck = await _context.Decks.FirstOrDefaultAsync(d => d.Name == input.Name);

        if (existingDeck != null)
        {
            return BadRequest("Deck with that name already exists.");
        }

        var user = await _context.Users.FindAsync(token.UserId);

        if (user == null)
        {
            return BadRequest("You must be logged in to join a deck.");
        }

        var deck = new Deck
        {
            Name = input.Name,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            DeckCode = Guid.NewGuid().ToString(),
            DeckData = DefaultDeckData,
        };

        user.Decks.Add(deck);

        await _context.SaveChangesAsync();

        return Created($"/api/deck/{{{deck.Id}}}", deck.Id);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(Deck))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDeck(int id)
    {
        var deck = await _context.Decks.FindAsync(id);

        if (deck == null)
        {
            return NotFound();
        }

        return Ok(deck);
    }

    [HttpGet("{id}/version")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(string))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDeckVersion(int id)
    {
        var version = await _context.Decks.Where(x => x.Id == id).Select(x => x.Version).FirstOrDefaultAsync();

        if (version == null)
        {
            return NotFound();
        }

        return Ok(version);
    }

    [HttpGet("{id}/name")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(string))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDeckName(int id)
    {
        var name = await _context.Decks.Where(x => x.Id == id).Select(x => x.Name).FirstOrDefaultAsync();

        if (name == null)
        {
            return NotFound();
        }

        return Ok(name);
    }

    [HttpPut("{id}/name")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PutDeckName(int id, string name)
    {
        var deck = await _context.Decks.FindAsync(id);

        if (deck == null)
        {
            return NotFound();
        }

        deck.Name = name;

        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("{id}/data")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(VersionedDeckData))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDeckData(int id)
    {
        var deck = await _context.Decks.FindAsync(id);

        if (deck == null)
        {
            return NotFound();
        }

        return Ok(new VersionedDeckData
        {
            Version = deck.Version,
            DeckData = deck.DeckData,
        });
    }

    [HttpPut("{id}/data")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict, Type = typeof(string))]
    public async Task<IActionResult> PutDeckData(int id, VersionedDeckData deckData)
    {
        var version = "";

        using (var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead))
        {
            var deck = await _context.Decks.FindAsync(id);

            if (deck == null)
            {
                return NotFound();
            }

            if (deck.Version != deckData.Version)
            {
                return Conflict("Version mismatch");
            }

            deck.DeckData = deckData.DeckData;
            deck.UpdatedAt = DateTimeOffset.UtcNow;
            deck.Version = (long.Parse(deck.Version) + 1).ToString();

            version = deck.Version;

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }

        await _hubContext.Clients.Group($"deck-{id}").SendAsync("Refetch", id, version);

        return Ok();
    }

    [HttpPatch("{id}/data")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(VersionedDeckData))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict, Type = typeof(string))]
    public async Task<IActionResult> PatchDeckData(int id, string version, [FromBody] JsonPatchDocument patchDoc)
    {
        var response = new VersionedDeckData();

        using (var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead))
        {
            var deck = await _context.Decks.FindAsync(id);

            if (deck == null)
            {
                return NotFound();
            }

            if (deck.Version != version)
            {
                return Conflict("Version mismatch");
            }

            var jsonObj = JsonConvert.DeserializeObject(deck.DeckData);
            patchDoc.ApplyTo(jsonObj);
            deck.DeckData = JsonConvert.SerializeObject(jsonObj);
            deck.UpdatedAt = DateTimeOffset.UtcNow;
            deck.Version = (long.Parse(deck.Version) + 1).ToString();

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            response.Version = deck.Version;
            response.DeckData = deck.DeckData;
        }

        await _hubContext.Clients.Group($"deck-{id}").SendAsync("Refetch", id, response.Version);

        return Ok(response);
    }

    [HttpGet("myDecks")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(int[]))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyDecks()
    {
        using var copper = await CopperSession.FromContext<DeckScribeToken>(HttpContext);
        var token = copper.GetToken();

        if (token == null)
        {
            return Unauthorized();
        }

        var deckIds = await _context.Decks
            .Where(d => d.Users.Any(u => u.Id == token.UserId))
            .Select(d => d.Id)
            .ToArrayAsync();

        return Ok(deckIds);
    }

    [HttpPost("join")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Join(string code)
    {
        var deck = await _context.Decks.SingleOrDefaultAsync(x => x.DeckCode == code);

        if (deck == null)
        {
            return BadRequest("Invalid code.");
        }

        using var copper = await CopperSession.FromContext<DeckScribeToken>(HttpContext);
        var token = copper.GetToken();

        if (token == null)
        {
            return BadRequest("You must be logged in to join a deck.");
        }

        var user = await _context.Users.FindAsync(token.UserId);

        if (user == null)
        {
            return BadRequest("You must be logged in to join a deck.");
        }

        deck.Users.Add(user);

        await _context.SaveChangesAsync();

        return Ok();
    }

    public class InputDeck
    {
        public string Name { get; set; } = "";
    }

    public class VersionedDeckData
    {
        public string Version { get; set; } = "";
        public string DeckData { get; set; } = "";
    }

}
