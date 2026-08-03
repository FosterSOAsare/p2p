-- AlterEnum
-- A seller-cancelled order gets its own terminal status rather than reusing
-- `disbursed`, so cancelled deals stay filterable (?status=cancelled) and never
-- inflate the completed-deal / earnings counters that key off `disbursed`.
ALTER TYPE "EscrowStatus" ADD VALUE 'cancelled';
