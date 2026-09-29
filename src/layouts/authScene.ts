import { createContext, useContext } from "react";
import type { MotionControl } from "../components/brand/particles/control";

/**
 * The login/register athlete's controls, shared by AuthLayout with the form inside it.
 * The form calls set("effort") while it is sending, set("fail") on an error and set("hold") for a small win;
 * typing in any field already gives the lifter energy (AuthLayout listens for input events).
 * On phones the athlete isn't drawn, so the calls simply have no visible effect there.
 */
export const AuthSceneContext = createContext<MotionControl | null>(null);

export function useAuthScene(): MotionControl | null {
  return useContext(AuthSceneContext);
}
