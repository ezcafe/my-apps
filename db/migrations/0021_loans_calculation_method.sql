CREATE TYPE "loan_calculation_method" AS ENUM (
  'nominal_monthly',
  'sc_vn_calculator',
  'sc_vn_actual_365'
);

ALTER TABLE "loan"
  ADD COLUMN "calculation_method" "loan_calculation_method" NOT NULL DEFAULT 'nominal_monthly';

ALTER TABLE "loan"
  ADD COLUMN "collateral_value_minor" bigint;
