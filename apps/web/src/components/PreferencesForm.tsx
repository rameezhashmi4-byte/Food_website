"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePreferencesAction, type PreferencesFormState } from "@/actions/preferences";
import {
  ACCESSIBILITY_FACILITY_OPTIONS,
  ATMOSPHERE_OPTIONS,
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  OCCASION_OPTIONS,
} from "@/lib/database/preferencesForm";
import type { UserPreferences, UserProfile } from "@/lib/database";
import { humanizeToken } from "@/lib/format";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initialState: PreferencesFormState = { status: "idle" };

function CheckboxGroup({
  legend,
  name,
  options,
  selected,
  labelFor = humanizeToken,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  selected: readonly string[];
  labelFor?: (value: string) => string;
}) {
  return (
    <fieldset className="rounded-bj border border-border px-4 py-3.5">
      <legend className="px-1 text-sm font-semibold text-text">{legend}</legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              name={name}
              value={option}
              defaultChecked={selected.includes(option)}
              className="h-4 w-4 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            {labelFor(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {pending ? "Saving..." : "Save preferences"}
    </Button>
  );
}

export default function PreferencesForm({
  current,
  profile,
}: {
  current: UserPreferences | undefined;
  profile: UserProfile | undefined;
}) {
  const [state, formAction] = useActionState(updatePreferencesAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField id="budgetPerPersonGbp" label="Typical budget per person (£)">
        <Input
          type="number"
          name="budgetPerPersonGbp"
          min={1}
          step="0.5"
          defaultValue={current?.budgetPerPersonGbp ?? ""}
          placeholder="e.g. 30"
        />
      </FormField>

      <FormField id="searchRadiusKm" label="Search radius (km)">
        <Input
          type="number"
          name="searchRadiusKm"
          min={1}
          max={50}
          step="0.5"
          defaultValue={current?.searchRadiusKm ?? ""}
          placeholder="e.g. 8"
        />
      </FormField>

      <CheckboxGroup legend="Favourite cuisines" name="favoriteCuisines" options={CUISINE_OPTIONS} selected={current?.favoriteCuisines ?? []} />
      <CheckboxGroup legend="Dietary requirements" name="dietaryNeeds" options={DIETARY_OPTIONS} selected={current?.dietaryNeeds ?? []} />

      <FormField id="foodPreferences" label="Food preferences" helperText="Comma-separated - whatever's meaningful to you, in your own words.">
        <Input
          type="text"
          name="foodPreferences"
          defaultValue={(current?.foodPreferences ?? []).join(", ")}
          placeholder="e.g. spicy, tasting menus, big portions"
        />
      </FormField>

      <FormField id="drinkPreferences" label="Drinks preferences">
        <Input
          type="text"
          name="drinkPreferences"
          defaultValue={(current?.drinkPreferences ?? []).join(", ")}
          placeholder="e.g. natural wine, good cocktails, non-alcoholic options"
        />
      </FormField>

      <CheckboxGroup
        legend="Preferred atmosphere"
        name="preferredAtmosphere"
        options={ATMOSPHERE_OPTIONS}
        selected={current?.preferredAtmosphere ?? []}
      />
      <CheckboxGroup legend="Favourite occasions" name="favoriteOccasions" options={OCCASION_OPTIONS} selected={current?.favoriteOccasions ?? []} />

      <fieldset className="rounded-bj border border-border px-4 py-3.5">
        <legend className="px-1 text-sm font-semibold text-text">Is parking important to you?</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="radio"
              name="parkingImportant"
              value="true"
              defaultChecked={current?.parkingImportant === true}
              className="h-4 w-4 border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="radio"
              name="parkingImportant"
              value="false"
              defaultChecked={current?.parkingImportant === false}
              className="h-4 w-4 border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            Not important
          </label>
        </div>
      </fieldset>

      <CheckboxGroup
        legend="Accessibility requirements"
        name="accessibilityNeeds"
        options={ACCESSIBILITY_FACILITY_OPTIONS}
        selected={current?.accessibilityNeeds ?? []}
      />

      <FormField id="homeArea" label="Home area">
        <Input type="text" name="homeArea" defaultValue={profile?.homeArea ?? ""} placeholder="e.g. Croydon" />
      </FormField>
      <FormField id="workArea" label="Work area">
        <Input type="text" name="workArea" defaultValue={profile?.workArea ?? ""} placeholder="e.g. Central London" />
      </FormField>

      <div>
        <SaveButton />
      </div>

      {state.status === "saved" && <Alert variant="success">{state.message}</Alert>}
      {state.status === "error" && <Alert variant="danger">{state.message}</Alert>}
    </form>
  );
}
