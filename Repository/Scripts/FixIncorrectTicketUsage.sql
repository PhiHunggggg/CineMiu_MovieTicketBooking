UPDATE t
SET
    t.is_used = 0,
    t.used_at = NULL,
    t.checked_by = NULL
FROM [dbo].[tickets] AS t
INNER JOIN [dbo].[bookings] AS b ON b.booking_id = t.booking_id
WHERE b.status IN (N'pending', N'confirmed', N'paid')
  AND t.is_used = 1;
