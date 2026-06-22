using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Repository
{
    public class SqlServerDbContextDFactory: IDesignTimeDbContextFactory<SqlServerDbContext>
    {
        public SqlServerDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<SqlServerDbContext>();

            // Used by "dotnet ef" when no startup project host is available.
            var connectionString =
                "Server=.\\SQLEXPRESS01;Database=CINEMIU_MovieTicketBooking;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=False";

            optionsBuilder.UseSqlServer(connectionString);

            return new SqlServerDbContext(optionsBuilder.Options);
        }
    }
}
