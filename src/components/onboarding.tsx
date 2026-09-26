import { createCompanyAction } from "../app/actions";
import type { Dictionary } from "../i18n";

import { ActionForm } from "./action-form";
import { Field, TextArea, TextInput } from "./fields";

export function Onboarding({ t }: { readonly t: Dictionary }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-sm tracking-[0.2em] text-muted uppercase">{t.app.title}</h1>
        <p className="text-2xl leading-snug font-semibold text-ink">{t.app.tagline}</p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">{t.onboarding.heading}</h2>
          <p className="text-sm text-muted">{t.onboarding.intro}</p>
        </div>

        <ActionForm
          action={createCompanyAction}
          errors={t.errors}
          submitLabel={t.onboarding.submit}
          pendingLabel={t.onboarding.submitting}
        >
          <Field label={t.onboarding.name}>
            <TextInput name="name" required placeholder={t.onboarding.namePlaceholder} />
          </Field>
          <Field label={t.onboarding.description} hint={t.onboarding.optional}>
            <TextArea name="description" placeholder={t.onboarding.descriptionPlaceholder} />
          </Field>
        </ActionForm>
      </section>
    </main>
  );
}
