import { surfaceOutlined } from "./cards";
import { transitionColors } from "./states";

export const fieldBase: string = `w-full rounded-sm ${surfaceOutlined} px-3 py-2.5 text-small text-fg ${transitionColors} placeholder:text-fg-subtle focus:border-telha disabled:cursor-not-allowed disabled:bg-muted disabled:text-fg-subtle`;

export const fieldInvalid: string = "border-telha";

export const optionsBox: string = `flex flex-wrap rounded-sm ${surfaceOutlined} px-3 py-2.5`;
