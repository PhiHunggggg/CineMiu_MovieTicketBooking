using Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;
using static Entities.Tickets;

namespace Repository
{
    public class SqlServerDbContext(DbContextOptions<SqlServerDbContext> options) : DbContext(options)
    {
        // Backwards-compatible DbSet aliases used by API_Service controllers (legacy 'Cinema*' names)
        public DbSet<Bookings.Booking> CinemaBookings { get; set; }
        public DbSet<Users> CinemaUsers { get; set; }
        public DbSet<ShowTime> CinemaShowtimes { get; set; }
        public DbSet<Movie> CinemaMovies { get; set; }
        public DbSet<Hall> CinemaHalls { get; set; }
        public DbSet<Tickets.Ticket> CinemaTickets { get; set; }
        public DbSet<Bookings.Payment> CinemaPayments { get; set; }
        public DbSet<Genre> CinemaGenres { get; set; }
        public DbSet<Chain> CinemaChains { get; set; }
        public DbSet<HallType> CinemaHallTypes { get; set; }
        public DbSet<SeatType> CinemaSeatTypes { get; set; }
        public DbSet<DayType> CinemaDayTypes { get; set; }
        public DbSet<ConcessionCategory> CinemaConcessionCategories { get; set; }
        public DbSet<ConcessionItem> CinemaConcessionItems { get; set; }
        public DbSet<Promotion> CinemaPromotions { get; set; }
        public DbSet<PromoUsage> CinemaPromoUsages { get; set; }
        public DbSet<Role> CinemaRoles { get; set; }
        public DbSet<Country> CinemaCountries { get; set; }
        public DbSet<PaymentMethod> CinemaPaymentMethods { get; set; }
        public DbSet<Seat> CinemaSeats { get; set; }
        public DbSet<Tickets.TicketPrice> CinemaTicketPrices { get; set; }
        public DbSet<Bookings.BookingConcession> CinemaBookingConcessions { get; set; }
        public DbSet<Bookings.SeatLock> CinemaSeatLocks { get; set; }
        public DbSet<PointTransaction> CinemaPointTransactions { get; set; }
        public DbSet<Notification> CinemaNotifications { get; set; }
        public DbSet<MovieGenre> CinemaMovieGenres { get; set; }
        public DbSet<Movie> CinemaMovie { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Users> Users { get; set; }
        public DbSet<Chain> Chains { get; set; }
        public DbSet<Cinema> Cinemas { get; set; }
        public DbSet<HallType> HallTypes { get; set; }
        public DbSet<Hall> Halls { get; set; }
        public DbSet<SeatType> SeatTypes { get; set; }
        public DbSet<Seat> Seats { get; set; }
        public DbSet<Genre> Genres { get; set; }
        public DbSet<Country> Countries { get; set; } 
        public DbSet<Movie> Movies { get; set; }
        public DbSet<MovieGenre> MovieGenres { get; set; }
        public DbSet<ShowTime> ShowTimes { get; set; }
        public DbSet<DayType> DayTypes { get; set; }
        public DbSet<Tickets.TicketPrice> TicketPrices { get; set; }
        public DbSet<ConcessionCategory> ConcessionCategories { get; set; }
        public DbSet<ConcessionItem> ConcessionItems { get; set; }
        public DbSet<Bookings.Booking> Bookings { get; set; }
        public DbSet<Tickets.Ticket> Tickets { get; set; }
        public DbSet<Bookings.BookingConcession> BookingConcessions { get; set; }
        public DbSet<PaymentMethod> PaymentMethods { get; set; }
        public DbSet<Bookings.Payment> Payments { get; set; }
        public DbSet<Promotion> Promotions { get; set; }
        public DbSet<PromoUsage> PromoUsages { get; set; }
        public DbSet<Bookings.SeatLock> SeatLocks { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<MemberTier> MemberTiers { get; set; }
        public DbSet<UserMembership> UserMemberships { get; set; }
        public DbSet<PointTransaction> PointTransactions { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            ConfigureCinemaBooking(modelBuilder);
        }

        private static void ConfigureCinemaBooking(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<MovieGenre>().HasKey(e => new { e.MovieId, e.GenreId });

            modelBuilder.Entity<Role>().HasIndex(e => e.RoleName).IsUnique();
            modelBuilder.Entity<Users>().HasIndex(e => e.Email).IsUnique();
            modelBuilder.Entity<Users>().HasIndex(e => e.Phone);
            modelBuilder.Entity<HallType>().HasIndex(e => e.TypeName).IsUnique();
            modelBuilder.Entity<SeatType>().HasIndex(e => e.TypeName).IsUnique();
            modelBuilder.Entity<Hall>().HasIndex(e => new { e.CinemaId, e.HallName }).IsUnique();
            modelBuilder.Entity<Seat>().HasIndex(e => new { e.HallId, e.SeatCode }).IsUnique();
            modelBuilder.Entity<Seat>().HasIndex(e => new { e.HallId, e.RowLabel });
            modelBuilder.Entity<Genre>().HasIndex(e => e.GenreName).IsUnique();
            modelBuilder.Entity<ShowTime>().HasIndex(e => new { e.MovieId, e.StartTime });
            modelBuilder.Entity<ShowTime>().HasIndex(e => new { e.HallId, e.StartTime });
            modelBuilder.Entity<DayType>().HasIndex(e => e.TypeName).IsUnique();
            modelBuilder.Entity<Bookings.Booking>().HasIndex(e => e.BookingCode).IsUnique();
            modelBuilder.Entity<Bookings.Booking>().HasIndex(e => e.UserId);
            modelBuilder.Entity<Bookings.Booking>().HasIndex(e => e.ShowtimeId);
            modelBuilder.Entity<Bookings.Booking>().HasIndex(e => new { e.Status, e.CreatedAt });
            modelBuilder.Entity<Tickets.Ticket>().HasIndex(e => e.QrCode).IsUnique();
            modelBuilder.Entity<Tickets.Ticket>().HasIndex(e => new { e.BookingId, e.SeatId }).IsUnique();
            modelBuilder.Entity<Tickets.TicketPrice>().HasIndex(e => new { e.CinemaId, e.HallTypeId, e.SeatTypeId, e.DayTypeId, e.TimeSlot });
            modelBuilder.Entity<ConcessionItem>().HasIndex(e => e.CatId);
            modelBuilder.Entity<Bookings.Payment>().HasIndex(e => e.BookingId);
            modelBuilder.Entity<Bookings.Payment>().HasIndex(e => e.TransactionRef);
            modelBuilder.Entity<Promotion>().HasIndex(e => e.PromoCode).IsUnique();
            modelBuilder.Entity<PromoUsage>().HasIndex(e => new { e.PromoId, e.UserId });
            modelBuilder.Entity<Bookings.SeatLock>().HasIndex(e => new { e.ShowtimeId, e.SeatId }).IsUnique();
            modelBuilder.Entity<Review>().HasIndex(e => new { e.MovieId, e.UserId }).IsUnique();
            modelBuilder.Entity<Review>().HasIndex(e => e.MovieId);
            modelBuilder.Entity<Notification>().HasIndex(e => new { e.UserId, e.IsRead });

            modelBuilder.Entity<Users>().Property(e => e.RoleId).HasDefaultValue((byte)1);
            modelBuilder.Entity<Users>().Property(e => e.CinemaId).HasDefaultValue(null);
            modelBuilder.Entity<Users>().Property(e => e.IsActive).HasDefaultValue(true);
            modelBuilder.Entity<Users>().Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            modelBuilder.Entity<Users>().Property(e => e.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
            modelBuilder.Entity<Cinema>().Property(e => e.IsActive).HasDefaultValue(true);

            modelBuilder.Entity<HallType>().Property(e => e.SurchargePct).HasPrecision(5, 2);
            modelBuilder.Entity<SeatType>().Property(e => e.PriceModifier).HasPrecision(8, 2);
            modelBuilder.Entity<Cinema>().Property(e => e.Latitude).HasPrecision(10, 7);
            modelBuilder.Entity<Cinema>().Property(e => e.Longitude).HasPrecision(10, 7);
            modelBuilder.Entity<Movie>().Property(e => e.ImdbRating).HasPrecision(3, 1);
            modelBuilder.Entity<Tickets.TicketPrice>().Property(e => e.BasePrice).HasPrecision(10, 2);
            modelBuilder.Entity<ConcessionItem>().Property(e => e.Price).HasPrecision(10, 2);
            modelBuilder.Entity<Bookings.Booking>().Property(e => e.TotalAmount).HasPrecision(12, 2);
            modelBuilder.Entity<Bookings.Booking>().Property(e => e.DiscountAmount).HasPrecision(12, 2);
            modelBuilder.Entity<Bookings.Booking>().Property(e => e.FinalAmount).HasPrecision(12, 2);
            modelBuilder.Entity<Tickets.Ticket>().Property(e => e.Price).HasPrecision(10, 2);
            modelBuilder.Entity<Bookings.BookingConcession>().Property(e => e.UnitPrice).HasPrecision(10, 2);
            modelBuilder.Entity<Bookings.BookingConcession>().Property(e => e.Subtotal).HasPrecision(10, 2);
            modelBuilder.Entity<Bookings.Payment>().Property(e => e.Amount).HasPrecision(12, 2);
            modelBuilder.Entity<Bookings.Payment>().Property(e => e.RefundAmount).HasPrecision(12, 2);
            modelBuilder.Entity<Promotion>().Property(e => e.DiscountValue).HasPrecision(10, 2);
            modelBuilder.Entity<Promotion>().Property(e => e.MinOrderAmt).HasPrecision(10, 2);
            modelBuilder.Entity<Promotion>().Property(e => e.MaxDiscount).HasPrecision(10, 2);

            modelBuilder.Entity<MemberTier>().HasIndex(e => e.MinPoints);

            modelBuilder.Entity<UserMembership>()
                .HasKey(e => e.UserId);

            modelBuilder.Entity<UserMembership>()
                .Property(e => e.UserId)
                .ValueGeneratedNever();

            modelBuilder.Entity<UserMembership>().HasIndex(e => e.TierId);

            modelBuilder.Entity<PointTransaction>().HasIndex(e => e.UserId);
            modelBuilder.Entity<PointTransaction>().HasIndex(e => e.BookingId);

            modelBuilder.Entity<MemberTier>()
                .Property(e => e.DiscountPercent)
                .HasPrecision(5, 2);

        }
    }
}

