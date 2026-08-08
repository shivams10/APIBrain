import ms, {StringValue} from "ms";

export const ACCESS_TOKEN_TTL = (process.env.ACCESS_TOKEN_TTL ?? "15m") as StringValue;
export const ACCESS_TOKEN_TTL_MS = ms(ACCESS_TOKEN_TTL );

export const REFRESH_TOKEN_TTL_DAYS = Number(
  process.env.REFRESH_TOKEN_TTL_DAYS ?? 30,
);
export const REFRESH_TOKEN_TTL_MS =
  REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
