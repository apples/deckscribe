using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;

namespace DeckScribe
{
    public class DeckScribeContext : DbContext
    {
        public DbSet<User> Users => Set<User>();
        public DbSet<Deck> Decks => Set<Deck>();

        public DeckScribeContext(DbContextOptions<DeckScribeContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .HasIndex(u => new { u.Email })
                .IsUnique();
        }
    }

    public class User
    {
        public int Id { get; set; }

        public DateTimeOffset CreatedAt { get; set; }
        public string Email { get; set; } = "";
        public string PasswordSalt { get; set; } = "";
        public string PasswordHash { get; set; } = "";
        public string Name { get; set; } = "";
        public bool Admin { get; set; }

        public List<Deck> Decks { get; set; } = new List<Deck>();
    }

    public class Deck {
        public int Id { get; set; }

        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public string Name { get; set; } = "";
        public string Version { get; set; } = "1";
        public string DeckData { get; set; } = "";

        public string DeckCode { get; set; } = "";

        public List<User> Users { get; set; } = new List<User>();
    }
}
