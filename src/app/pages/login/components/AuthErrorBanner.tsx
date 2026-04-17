type AuthErrorBannerProps = {
  message: string | null;
};

export function AuthErrorBanner({ message }: AuthErrorBannerProps) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" aria-live="assertive" className="text-center text-sm ds-text-score-1" >
      {message}
    </p>
  );
}
