import { InMemoryUserRepository } from "../inMemoryRepository.js";
import { runUserRepositoryContract } from "./userRepository.contract.js";

runUserRepositoryContract(
  () => new InMemoryUserRepository(),
  () => crypto.randomUUID(),
);
