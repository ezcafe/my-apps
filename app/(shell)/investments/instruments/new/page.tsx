import dynamic from "next/dynamic";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

function InstrumentFormSkeleton() {
  return (
    <div
      className="grid min-w-0 gap-4 [&>*]:col-span-full"
      style={{
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
      }}
      role="status"
      aria-busy="true"
      aria-label="Loading instrument form"
    >
      <Field label="Symbol" required>
        <Input value="" disabled />
      </Field>
      <Field label="Contract size" required>
        <Input value="" disabled />
      </Field>
      <Field label="Yahoo symbol">
        <Input value="" disabled />
      </Field>
      <Button type="submit" disabled>
        Create instrument
      </Button>
    </div>
  );
}

const InvestmentInstrumentFormLazy = dynamic(
  () =>
    import("@/components/investment-instrument-form").then((mod) => ({
      default: mod.InvestmentInstrumentForm,
    })),
  { loading: () => <InstrumentFormSkeleton /> },
);

export default function InvestmentInstrumentNewPage() {
  return (
    <div className={SHELL_FULL_SPAN}>
      <InvestmentInstrumentFormLazy />
    </div>
  );
}
