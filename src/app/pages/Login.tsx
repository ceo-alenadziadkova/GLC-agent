import { motion, useReducedMotion } from 'motion/react';
import { ThemeToggle } from '../components/ThemeToggle';
import { SyncPathLoader } from '../components/SyncPathLoader';
import { BACKGROUND_VIDEO_CONFIG } from '../config/background-video';
import { useLoginController } from './login/hooks/useLoginController';
import { LoginBrandSection } from './login/sections/LoginBrandSection';
import { LoginAuthCardSection } from './login/sections/LoginAuthCardSection';
import { LoginAsideSection } from './login/sections/LoginAsideSection';

export function Login() {
  const reduceMotion = useReducedMotion();
  const controller = useLoginController();
  if (controller.isOAuthCallbackProcessing) {
    return <SyncPathLoader variant="indeterminate" loadingText="Signing you in..." />;
  }

  return (
    <main className="glc-login-main relative ds-marketing-layout-canvas">
      <div className="glc-login-theme-toggle absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="glc-login-bg-mesh absolute inset-0 pointer-events-none ds-login-mesh-backdrop" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={controller.motionPolicy.layoutEnter}
        className="glc-login-layout relative flex w-full flex-col gap-10 lg:grid lg:grid-cols-2 lg:gap-0"
      >
        <div className="glc-login-layout-video-layer" aria-hidden="true">
          {!reduceMotion && (
            <video
              className="glc-login-layout-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src={BACKGROUND_VIDEO_CONFIG.src} type="video/webm" />
            </video>
          )}
          <div
            className="glc-login-layout-video-overlay"
            style={{ opacity: BACKGROUND_VIDEO_CONFIG.overlayOpacity }}
          />
        </div>

        <motion.div
          className="glc-login-form-column w-full lg:order-1 lg:max-w-none lg:flex-shrink-0"
          initial={reduceMotion ? false : { opacity: 0, y: 12, clipPath: controller.formClosedClipPath }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, clipPath: controller.formOpenClipPath }}
          transition={controller.motionPolicy.formEnter}
        >
          <div className="glc-login-form-stack w-full">
          <LoginBrandSection
            loginTagline={controller.loginTagline}
            motionTransition={controller.motionPolicy.brandEnter}
          />

          <LoginAuthCardSection
            mode={controller.mode}
            activateMode={controller.activateMode}
            passwordRecoveryMode={controller.passwordRecoveryMode}
            user={controller.user}
            email={controller.email}
            password={controller.password}
            recoveryPassword={controller.recoveryPassword}
            recoveryConfirm={controller.recoveryConfirm}
            showPassword={controller.showPassword}
            loading={controller.loading}
            forgotSent={controller.forgotSent}
            isReady={controller.isReady}
            submitLabel={controller.submitLabel}
            fieldErrors={controller.fieldErrors}
            globalError={controller.globalError}
            authError={controller.authError}
            setEmail={controller.setEmail}
            setPassword={controller.setPassword}
            setRecoveryPassword={controller.setRecoveryPassword}
            setRecoveryConfirm={controller.setRecoveryConfirm}
            setShowPassword={controller.setShowPassword}
            setFieldErrors={controller.setFieldErrors}
            handleSubmit={controller.handleSubmit}
            handleForgotSubmit={controller.handleForgotSubmit}
            handleRecoverySubmit={controller.handleRecoverySubmit}
            handleGoogle={controller.handleGoogle}
            authTabIds={controller.authTabIds}
            errorIds={controller.errorIds}
            minPasswordLength={controller.minPasswordLength}
            motionPolicy={controller.motionPolicy}
            signupLegal={controller.signupLegal}
            onSignupLegalChange={controller.onSignupLegalChange}
          />

          </div>
        </motion.div>

        <LoginAsideSection
          reduceMotion={Boolean(reduceMotion)}
          motionTransition={{
            asideEnter: controller.motionPolicy.asideEnter,
            asideTitleEnter: controller.motionPolicy.asideTitleEnter,
          }}
        />
      </motion.div>
    </main>
  );
}
