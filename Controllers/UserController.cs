using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Copper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace DeckScribe.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly ILogger<UserController> _logger;
    private readonly DeckScribeContext _db;

    public UserController(ILogger<UserController> logger, DeckScribeContext db)
    {
        _logger = logger;
        _db = db;
    }

    public class RegisterParams
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string Name { get; set; } = "";
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(MyUserInfo))]
    [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(string))]
    public async Task<IActionResult> Register(RegisterParams param)
    {
        if (param.Email == "")
        {
            return BadRequest("Missing email.");
        }

        if (param.Email.Length > 256)
        {
            return BadRequest("Email must be less than 256 characters.");
        }

        if (param.Password == "")
        {
            return BadRequest("Missing password.");
        }

        if (param.Password.Length < 12)
        {
            return BadRequest("Password must be at least 12 characters.");
        }

        if (param.Name == "")
        {
            return BadRequest("Missing name.");
        }

        if (param.Name.Length > 256)
        {
            return BadRequest("Name must be less than 256 characters.");
        }

        var passwordSalt = Crypto.GenerateSalt();

        var passwordHash = Crypto.HashPassword(password: param.Password, saltBase64: passwordSalt);

        var user = new User()
        {
            Email = param.Email,
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            Name = param.Name,
            CreatedAt = DateTimeOffset.UtcNow,
            Admin = false,
        };

        _db.Users.Add(user);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException e)
        {
            if (e.InnerException is PostgresException pge)
            {
                if (pge.SqlState == PostgresErrorCodes.UniqueViolation)
                {
                    return BadRequest("User with that email already exists.");
                }
            }
        }

        using var copper = await CopperSession.FromContext<DeckScribeToken>(HttpContext);

        copper.SetToken(new DeckScribeToken
        {
            Name = user.Name,
            UserId = user.Id,
        });

        return Ok(new MyUserInfo
        {
            IsLoggedIn = true,
            Admin = false,
            UserId = user.Id,
            Name = user.Name,
        });
    }

    public class LoginParams
    {
        public string? Email { get; set; }
        public string? Password { get; set; }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(MyUserInfo))]
    [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(string))]
    public async Task<IActionResult> Login(LoginParams param)
    {
        using var copper = await CopperSession.FromContext<DeckScribeToken>(HttpContext);

        if (param.Email == null)
        {
            copper.Destroy();
            return BadRequest("Email must not be null.");
        }

        if (param.Password == null)
        {
            copper.Destroy();
            return BadRequest("Password must not be null.");
        }

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == param.Email);

        if (user == null)
        {
            copper.Destroy();
            return BadRequest("User not found.");
        }

        var hashedPassword = Crypto.HashPassword(param.Password, user.PasswordSalt);

        if (user.PasswordHash != hashedPassword)
        {
            copper.Destroy();
            return BadRequest("Incorrect password.");
        }

        copper.SetToken(new DeckScribeToken
        {
            Name = user.Name,
            Roles = user.Admin ? new List<string> { "Admin" } : new List<string>(),
            UserId = user.Id,
        });

        return Ok(new MyUserInfo
        {
            IsLoggedIn = true,
            Admin = user.Admin,
            Name = user.Name,
            UserId = user.Id,
        });
    }

    [HttpGet("myuser")]
    [AllowAnonymous]
    public async Task<MyUserInfo> MyUser()
    {
        using var copper = await CopperSession.FromContext<DeckScribeToken>(HttpContext);

        var token = copper.GetToken();

        if (token != null)
        {
            return new MyUserInfo
            {
                IsLoggedIn = true,
                Admin = token.Roles.Contains("Admin"),
                Name = token.Name,
                UserId = token.UserId,
            };
        }
        else
        {
            return new MyUserInfo
            {
                IsLoggedIn = false,
            };
        }
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task Logout()
    {
        using var copper = await CopperSession.FromContext<DeckScribeToken>(HttpContext);

        copper.Destroy();
    }

    public class MyUserInfo
    {
        public bool IsLoggedIn { get; set; }
        public bool? Admin { get; set; }
        public int? UserId { get; set; }
        public string? Name { get; set; }
    }
}
