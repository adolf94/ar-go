using ArGo.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace ArGo.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {

				base.Database.EnsureCreatedAsync().Wait();
		}

    public required DbSet<LinkMetadata> Links { get; set; }
    public required DbSet<FileMetadata> FileMetadatas { get; set; }
    public required DbSet<DeletedLinkHistory> DeletionHistory { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LinkMetadata>()
            .ToContainer("Links")
            .HasPartitionKey(x => x.Id);

        modelBuilder.Entity<FileMetadata>()
            .ToContainer("Files")
            .HasPartitionKey(x => x.Id);

        modelBuilder.Entity<DeletedLinkHistory>()
            .ToContainer("ArGoHistory")
            .HasPartitionKey(x => x.Id);
            
        base.OnModelCreating(modelBuilder);
    }
}

