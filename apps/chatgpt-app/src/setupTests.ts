import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
// Only for its ambient `Assertion` type augmentation (toBeInTheDocument etc.)
// - imported for types, see the explicit runtime extend() below for why.
import "@testing-library/jest-dom/vitest";

// Extending manually (rather than relying solely on the import above) because
// this monorepo has two vitest installations (root vitest@2 for Node
// packages, this workspace's nested vitest@4 for jsdom/React); the import
// above resolves its own internal `vitest` from jest-dom's location, which
// can land on the wrong copy. Using `expect` imported directly here
// resolves correctly relative to this file, i.e. the instance actually
// running these tests.
expect.extend(matchers);
afterEach(() => cleanup());
