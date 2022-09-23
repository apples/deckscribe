using Copper;
using DeckScribe;
using DeckScribe.Hubs;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddNewtonsoftJson();

builder.Services.AddSignalR();

// In production, the React files will be served from this directory
builder.Services.AddSpaStaticFiles(configuration =>
{
    configuration.RootPath = "ClientApp/build";
});

builder.Services.AddDbContext<DeckScribeContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DeckScribeContext")));

builder.Services.AddSingleton<ICopperTokenAuthenticationService<DeckScribeToken>, DeckScribeCopperTokenService>();
builder.Services.AddAuthentication(CopperTokenAuthenticationHandler<DeckScribeToken>.AuthenticationScheme)
    .AddCopperToken<DeckScribeToken>(options => builder.Configuration.GetSection("CopperToken").Bind(options));

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SupportNonNullableReferenceTypes();
    options.SchemaFilter<RequiredNotNullableSchemaFilter>();
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
    app.UseHttpsRedirection();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    app.UseHttpLogging();
}

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllerRoute(
        name: "default",
        pattern: "{controller}/{action=Index}/{id?}");
});

app.UseSpaStaticFiles();
app.UseSpa(spa =>
{
    spa.Options.SourcePath = "ClientApp";

    if (app.Environment.IsDevelopment())
    {
        spa.UseReactDevelopmentServer(npmScript: "start");
    }
});

app.MapHub<CollabHub>("/collabhub", options =>
{
    options.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.WebSockets;
});

app.Run();
