using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
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
                "Server=MEICHAN;Database=CINEMIU_MovieTicketBooking;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=False";

            optionsBuilder.UseSqlServer(connectionString);

            return new SqlServerDbContext(optionsBuilder.Options);
        }

        private static string BuildSqlAuthConnectionString(string password)
        {
            var sqlConnection = new SqlConnectionStringBuilder
            {
                DataSource = Environment.GetEnvironmentVariable("CINEMIU_DB_SERVER") ?? "DESKTOP-FNMVI5L",
                InitialCatalog = Environment.GetEnvironmentVariable("CINEMIU_DB_NAME") ?? "BaseCoreBookingMovie",
                UserID = Environment.GetEnvironmentVariable("CINEMIU_DB_USER") ?? "sa",
                Password = password,
                IntegratedSecurity = false,
                TrustServerCertificate = true
            };
            sqlConnection["Encrypt"] = false;

            return sqlConnection.ConnectionString;
        }
    }
}
