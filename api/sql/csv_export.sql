select * from csv_export where created_by = ${userId} and is_deleted = false order by requested_timestamp desc