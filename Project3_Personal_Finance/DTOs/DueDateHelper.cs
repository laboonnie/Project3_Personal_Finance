namespace Project3_Personal_Finance.DTOs
{
    public record DueInfo(string Status, bool IsLocked, int? DaysUntilDue, string? Warning);

    public static class DueDateHelper
    {
        public const int WarningDays = 7;

        public const string Ok = "ok";
        public const string NoDeadline = "no-deadline";
        public const string Closed = "closed";
        public const string DueSoon = "due-soon";
        public const string Overdue = "overdue";

        /// <summary>
        /// Evaluates the due date. Overdue debts can be locked while overdue goals remain depositable.
        /// </summary>
        public static DueInfo Evaluate(DateOnly? dueDate, bool closed, bool lockWhenOverdue = true)
        {
            if (closed)
                return new DueInfo(Closed, false, null, null);
            if (dueDate == null)
                return new DueInfo(NoDeadline, false, null, null);

            var today = DateOnly.FromDateTime(DateTime.Today);
            var days = dueDate.Value.DayNumber - today.DayNumber;

            if (days < 0)
            {
                var overdueDays = Math.Abs(days);
                var dayUnit = overdueDays == 1 ? "day" : "days";
                return new DueInfo(Overdue, lockWhenOverdue, days,
                    lockWhenOverdue
                        ? $"This payment is {overdueDays} {dayUnit} overdue. It is locked."
                        : $"This goal is {overdueDays} {dayUnit} overdue. You can still make deposits.");
            }

            if (days <= WarningDays)
                return new DueInfo(DueSoon, false, days,
                    days == 0
                        ? "This is the due date. Please make your payment today."
                        : $"{days} {(days == 1 ? "day" : "days")} remain before the due date.");

            return new DueInfo(Ok, false, days, null);
        }
    }
}