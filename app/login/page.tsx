import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  const errorMessage =
    typeof error === "string" ? error : Array.isArray(error) ? error[0] : undefined;

  return <LoginForm errorMessage={errorMessage} callbackFailed={Boolean(errorMessage)} />;
}
