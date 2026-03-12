// ABOUTME: Main entry point for the Cart API application
// ABOUTME: Configures services, database context, authentication, and HTTP pipeline
using AGDevX.Cart.Api.Middleware;
using AGDevX.Cart.Auth;
using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.Configuration;
using AGDevX.Cart.Shared.Security;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

//== Service Configuration
builder.Services.AddOpenApi();
builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
                });

//== CORS Configuration
var corsSettings = builder.Configuration.GetSection("CorsSettings").Get<CorsSettings>()
    ?? new CorsSettings();
builder.Services.AddSingleton<ICorsSettings>(corsSettings);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsSettings.AllowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

//== Rate Limiting Configuration
builder.Services.AddRateLimiting();

//== Request Timeout Configuration
builder.Services.AddRequestTimeoutPolicies();

//== Cookie Configuration
var cookieSettings = builder.Configuration.GetSection("CookieSettings").Get<CookieSettings>()
    ?? new CookieSettings();
builder.Services.AddSingleton<ICookieSettings>(cookieSettings);

//== Authentication Configuration
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(options =>
                {
                    options.Cookie.Name = ".Cart.Auth";
                    options.Cookie.HttpOnly = true;
                    options.Cookie.SameSite = SameSiteMode.Lax;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                    options.SlidingExpiration = true;
                    options.ExpireTimeSpan = TimeSpan.FromMinutes(cookieSettings.SessionTimeoutMinutes);

                    //== Return 401/403 JSON for SPA instead of redirect
                    options.Events.OnRedirectToLogin = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        return Task.CompletedTask;
                    };
                    options.Events.OnRedirectToAccessDenied = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return Task.CompletedTask;
                    };
                });

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

//== Database Configuration
builder.Services.AddDbContext<CartDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

//== Repository registrations
builder.Services.AddScoped<IHouseholdRepository, HouseholdRepository>();
builder.Services.AddScoped<IStoreRepository, StoreRepository>();
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<ITripRepository, TripRepository>();
builder.Services.AddScoped<ITripItemRepository, TripItemRepository>();

//== Service registrations
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISecurityAuditLogger, SecurityAuditLogger>();
builder.Services.AddScoped<IHouseholdService, HouseholdService>();
builder.Services.AddScoped<IStoreService, StoreService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<ITripService, TripService>();
builder.Services.AddScoped<ITripItemService, TripItemService>();
builder.Services.AddSingleton<ITripEventService, TripEventService>(); //== Event broadcasting service (singleton for in-memory state)

var app = builder.Build();

//== Database Migration
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<CartDbContext>();
    dbContext.Database.Migrate();
}

//== HTTP Pipeline Configuration

//== Global exception handler (catches everything — must be first)
app.UseGlobalExceptionHandler();

//== Security headers on all responses
app.UseSecurityHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

//== CORS before rate limiter so 429 responses include CORS headers
app.UseCors();

//== Rate limiting
app.UseRateLimiter();

//== Request timeouts (after rate limiter, before auth)
app.UseRequestTimeouts();

app.UseAuthentication();
app.UseAuthorization();

//== API Endpoints
app.MapControllers();

app.Run();
