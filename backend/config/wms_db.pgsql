SELECT column_name
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN ('salary_paid', 'salary_paid_date');